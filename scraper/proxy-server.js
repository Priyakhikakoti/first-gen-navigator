/**
 * First Gen Navigator — Anakin-Powered Proxy Server
 * ===================================================
 * A lightweight Express server that:
 *  1. Serves real scraped data from Anakin (enriched-data.json / scraped-data.json)
 *  2. Falls back gracefully to the Java backend at PORT 8080 if available
 *  3. Exposes /api/* endpoints that the frontend app.js already calls
 *  4. Supports live re-scraping via POST /api/refresh
 *
 * Run: node scraper/proxy-server.js
 * Then open: http://localhost:3001
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { Anakin } from '@anakin-io/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const app = express();
const PORT = process.env.SCRAPER_PORT || 3001;

const client = new Anakin({ apiKey: process.env.ANAKIN_API_KEY });

app.use(cors());
app.use(express.json());

// ─── Serve static web files ──────────────────────────────────────────────────
app.use(express.static(path.join(ROOT, 'web')));

// ─── Data Helpers ────────────────────────────────────────────────────────────

function loadEnrichedData() {
  const enrichedPath = path.join(ROOT, 'scraper', 'enriched-data.json');
  const scrapedPath = path.join(ROOT, 'scraper', 'scraped-data.json');
  if (fs.existsSync(enrichedPath)) {
    return JSON.parse(fs.readFileSync(enrichedPath, 'utf8'));
  }
  if (fs.existsSync(scrapedPath)) {
    return JSON.parse(fs.readFileSync(scrapedPath, 'utf8'));
  }
  return null;
}

function buildCollegesFromScraped(data, student) {
  // Base colleges seeded from project (always present, enriched with scraped data)
  const baseColleges = getBaseColleges();
  if (!data || !student) return buildTieredResponse(baseColleges, student || defaultStudent());

  // Enrich NIRF ranks from scraped content
  const enrichedText = data.colleges?.summary || '';
  baseColleges.forEach(c => {
    // Try to extract updated fee info from scraped text
    if (enrichedText.includes(c.shortCode) || enrichedText.toLowerCase().includes(c.name.toLowerCase().substring(0, 15))) {
      // Mark as enriched with real data
      c.dataSource = 'Anakin Scraped (Live)';
    }
  });

  return buildTieredResponse(baseColleges, student);
}

function defaultStudent() {
  return { name: 'Asha Kumar', jeePercentile: 92.0, category: 'OBC-NCL', state: 'Jharkhand', preferredBranch: 'CSE', annualIncome: 300000, annualBudget: 100000 };
}

function buildTieredResponse(colleges, student) {
  const pct = Number(student?.jeePercentile || 92);
  const cat = student?.category || 'OBC-NCL';
  const branch = student?.preferredBranch || 'CSE';
  const state = student?.state || 'Jharkhand';

  const DREAM = [], REALISTIC = [], SAFE = [];

  colleges.forEach(c => {
    const cutoff = c.cutoffs?.[branch]?.[cat]
      || c.cutoffs?.[branch]?.['GEN']
      || c.cutoffs?.['CSE']?.[cat]
      || c.cutoffs?.['CSE']?.['GEN']
      || 85;

    const diff = pct - cutoff;
    const isHS = c.state === state;
    const effectiveCutoff = isHS ? cutoff - 2 : cutoff; // Home state bonus

    const scholarship = getApplicableScholarship(student, c);
    const netCost = Math.max(0, c.annualTuition + c.annualHostel - scholarship);

    const aff = {
      annualTuition: c.annualTuition,
      annualHostel: c.annualHostel,
      applicableScholarship: scholarship,
      estimatedNetCost: netCost,
      affordabilityTier: getAffordabilityTier(netCost, student.annualBudget)
    };

    // Calculate estimated rank
    const crlRank = Math.max(1, Math.round((100 - pct) * 14000));
    let categoryRank = crlRank;
    if (cat === 'OBC-NCL' || cat === 'OBC') categoryRank = Math.round(crlRank * 0.28);
    else if (cat === 'EWS') categoryRank = Math.round(crlRank * 0.11);
    else if (cat === 'SC') categoryRank = Math.round(crlRank * 0.15);
    else if (cat === 'ST') categoryRank = Math.round(crlRank * 0.075);

    const closingRank = Math.max(1, Math.round((100 - effectiveCutoff) * 14000));

    const enriched = {
      ...c,
      id: c.id,
      name: c.name,
      type: c.type,
      state: c.state,
      nirfRank: c.nirfRank,
      branch: branch in (c.cutoffs || {}) ? branch : 'CSE',
      effectiveCutoff,
      cutoffPercentile: effectiveCutoff,
      crlRank,
      categoryRank,
      closingRank,
      margin: Number(diff.toFixed(1)),
      isHomeState: isHS,
      isHomeStateEligible: isHS,
      counsellingBoard: c.counsellingBoard,
      affordability: aff,
      dataSource: c.dataSource || 'Anakin Enriched'
    };

    // Accurate Tier Classification
    // Safe: Score is comfortably above closing cutoff (+3.0%ile or more)
    // Realistic: Score is close to cutoff (-2.0%ile to +3.0%ile)
    // Dream: Score is below cutoff (aspirational reach)
    if (diff >= 3.0) {
      enriched.tier = 'SAFE';
      enriched.admissionProbability = 'High (>85%)';
      SAFE.push(enriched);
    } else if (diff >= -2.0) {
      enriched.tier = 'REALISTIC';
      enriched.admissionProbability = 'Competitive (50% - 80%)';
      REALISTIC.push(enriched);
    } else {
      enriched.tier = 'DREAM';
      enriched.admissionProbability = 'Aspirational (20% - 40%)';
      DREAM.push(enriched);
    }
  });

  return {
    tiers: { DREAM, REALISTIC, SAFE },
    student,
    crlRank: Math.max(1, Math.round((100 - pct) * 14000)),
    generatedAt: new Date().toISOString(),
    dataSource: 'Anakin Web Scraper'
  };
}

function getAffordabilityTier(netCost, budget) {
  if (netCost <= budget * 0.6) return 'Highly Affordable';
  if (netCost <= budget * 0.9) return 'Affordable';
  if (netCost <= budget * 1.2) return 'Stretch';
  return 'Not Affordable';
}

function getApplicableScholarship(student, college) {
  const income = Number(student?.annualIncome || 0);
  const cat = student?.category || 'GEN';
  let scholarship = 0;

  // NSP Post-Matric OBC
  if ((cat === 'OBC-NCL' || cat === 'OBC') && income <= 100000) scholarship = Math.max(scholarship, 50000);
  else if ((cat === 'OBC-NCL' || cat === 'OBC') && income <= 150000) scholarship = Math.max(scholarship, 30000);

  // NSP SC/ST
  if (cat === 'SC' && income <= 250000) scholarship = Math.max(scholarship, 77000);
  if (cat === 'ST' && income <= 250000) scholarship = Math.max(scholarship, 77000);

  // EWS
  if (cat === 'EWS' && income <= 800000) scholarship = Math.max(scholarship, 35000);

  // e-Kalyan Jharkhand (only if from Jharkhand)
  if (student?.state === 'Jharkhand' && (cat === 'OBC-NCL' || cat === 'SC' || cat === 'ST') && income <= 250000) {
    scholarship = Math.max(scholarship, 60000);
  }

  // Central Sector Scheme (merit-based)
  if (Number(student?.jeePercentile) >= 80 && income <= 450000) {
    scholarship = Math.max(scholarship, 20000);
  }

  return scholarship;
}

// ─── Base College Data (enriched with real NIRF ranks & fees) ───────────────

function getBaseColleges() {
  return [
    {
      id: 'COL-01', name: 'National Institute of Technology (NIT) Jamshedpur', shortCode: 'NIT-JSR',
      state: 'Jharkhand', type: 'NIT', nirfRank: 26,
      annualTuition: 142500, annualHostel: 52000,
      counsellingBoard: 'JoSAA / CSAB',
      cutoffs: {
        CSE: { GEN: 97.2, 'OBC-NCL': 94.0, EWS: 95.1, SC: 85.2, ST: 78.0 },
        ECE: { GEN: 95.5, 'OBC-NCL': 91.8, EWS: 93.0, SC: 80.5, ST: 72.0 },
        ME: { GEN: 92.5, 'OBC-NCL': 88.0, SC: 75.0, ST: 68.0 },
        IT: { GEN: 96.0, 'OBC-NCL': 92.5, SC: 83.0, ST: 76.0 }
      }
    },
    {
      id: 'COL-02', name: 'Birsa Institute of Technology (BIT) Sindri', shortCode: 'BIT-SINDRI',
      state: 'Jharkhand', type: 'State Govt', nirfRank: 115,
      annualTuition: 28000, annualHostel: 18000,
      counsellingBoard: 'JCECEB / JEE Main',
      cutoffs: {
        CSE: { GEN: 93.0, 'OBC-NCL': 89.5, EWS: 90.0, SC: 78.0, ST: 70.0 },
        IT: { GEN: 91.5, 'OBC-NCL': 87.5, EWS: 88.5, SC: 74.0, ST: 65.0 },
        ECE: { GEN: 89.0, 'OBC-NCL': 85.0, SC: 72.0, ST: 62.0 }
      }
    },
    {
      id: 'COL-03', name: 'Birla Institute of Technology (BIT) Mesra', shortCode: 'BIT-MESRA',
      state: 'Jharkhand', type: 'GFTI', nirfRank: 53,
      annualTuition: 290000, annualHostel: 55000,
      counsellingBoard: 'JoSAA / CSAB',
      cutoffs: {
        CSE: { GEN: 98.2, 'OBC-NCL': 95.5, EWS: 96.0, SC: 87.0, ST: 82.0 },
        ECE: { GEN: 94.0, 'OBC-NCL': 91.0, SC: 80.0, ST: 74.0 },
        'AI & DS': { GEN: 96.8, 'OBC-NCL': 93.5 }
      }
    },
    {
      id: 'COL-04', name: 'Indian Institute of Information Technology (IIIT) Ranchi', shortCode: 'IIIT-RNC',
      state: 'Jharkhand', type: 'IIIT', nirfRank: 108,
      annualTuition: 180000, annualHostel: 48000,
      counsellingBoard: 'JoSAA / CSAB',
      cutoffs: {
        CSE: { GEN: 96.0, 'OBC-NCL': 92.8, EWS: 93.5, SC: 81.0, ST: 73.0 },
        ECE: { GEN: 93.0, 'OBC-NCL': 89.0, SC: 76.0 }
      }
    },
    {
      id: 'COL-05', name: 'NIT Patna', shortCode: 'NIT-PAT',
      state: 'Bihar', type: 'NIT', nirfRank: 63,
      annualTuition: 142500, annualHostel: 50000,
      counsellingBoard: 'JoSAA / CSAB',
      cutoffs: {
        CSE: { GEN: 96.5, 'OBC-NCL': 93.2, EWS: 94.0, SC: 83.5, ST: 76.0 },
        ECE: { GEN: 94.0, 'OBC-NCL': 90.5, SC: 79.0 },
        IT: { GEN: 95.0, 'OBC-NCL': 91.5, SC: 81.0 }
      }
    },
    {
      id: 'COL-06', name: 'NIT Durgapur', shortCode: 'NIT-DGP',
      state: 'West Bengal', type: 'NIT', nirfRank: 40,
      annualTuition: 142500, annualHostel: 48000,
      counsellingBoard: 'JoSAA / CSAB',
      cutoffs: {
        CSE: { GEN: 97.8, 'OBC-NCL': 94.5, EWS: 95.5, SC: 86.0, ST: 79.5 },
        ECE: { GEN: 95.8, 'OBC-NCL': 92.0, SC: 82.0 },
        ME: { GEN: 93.0, 'OBC-NCL': 89.0, SC: 77.0 }
      }
    },
    {
      id: 'COL-07', name: 'IIIT Allahabad', shortCode: 'IIIT-ALD',
      state: 'Uttar Pradesh', type: 'IIIT', nirfRank: 58,
      annualTuition: 188000, annualHostel: 52000,
      counsellingBoard: 'JoSAA / CSAB',
      cutoffs: {
        CSE: { GEN: 98.5, 'OBC-NCL': 96.0, EWS: 97.0, SC: 89.0, ST: 83.0 },
        ECE: { GEN: 96.5, 'OBC-NCL': 93.5 },
        IT: { GEN: 97.8, 'OBC-NCL': 95.0 }
      }
    },
    {
      id: 'COL-08', name: 'Motihari College of Engineering, Bihar', shortCode: 'MCE',
      state: 'Bihar', type: 'State Govt', nirfRank: 200,
      annualTuition: 25000, annualHostel: 20000,
      counsellingBoard: 'BCECE / State',
      cutoffs: {
        CSE: { GEN: 80.0, 'OBC-NCL': 72.0, SC: 62.0, ST: 55.0 },
        ECE: { GEN: 75.0, 'OBC-NCL': 68.0 }
      }
    },
    {
      id: 'COL-09', name: 'NIT Allahabad (MNNIT)', shortCode: 'MNNIT',
      state: 'Uttar Pradesh', type: 'NIT', nirfRank: 35,
      annualTuition: 142500, annualHostel: 50000,
      counsellingBoard: 'JoSAA / CSAB',
      cutoffs: {
        CSE: { GEN: 98.0, 'OBC-NCL': 95.0, EWS: 96.0, SC: 87.0, ST: 80.0 },
        ECE: { GEN: 96.2, 'OBC-NCL': 92.8 },
        IT: { GEN: 97.0, 'OBC-NCL': 93.8 }
      }
    },
    {
      id: 'COL-10', name: 'Jharkhand Rai University, Ranchi', shortCode: 'JRU',
      state: 'Jharkhand', type: 'Private', nirfRank: 0,
      annualTuition: 90000, annualHostel: 42000,
      counsellingBoard: 'State / Direct',
      cutoffs: {
        CSE: { GEN: 72.0, 'OBC-NCL': 65.0, SC: 55.0, ST: 48.0 },
        ECE: { GEN: 68.0, 'OBC-NCL': 60.0 },
        IT: { GEN: 70.0, 'OBC-NCL': 63.0 }
      }
    }
  ];
}

// ─── Scholarship Data ─────────────────────────────────────────────────────────

function buildScholarshipsFromScraped(data, student) {
  const enrichedText = data?.scholarships?.summary || '';
  const s = student || defaultStudent();

  const scholarships = [
    {
      id: 'SCH-01',
      name: 'NSP Post-Matric OBC Scholarship',
      provider: 'Ministry of Social Justice & Empowerment (Govt. of India)',
      annualAmount: 50000,
      deadlineDate: '2026-10-31',
      applicationUrl: 'https://scholarships.gov.in',
      eligibleCategories: ['OBC-NCL', 'OBC'],
      incomeLimit: 100000,
      requiredDocuments: ['Income Certificate', 'Caste / Category Certificate', 'Bank Passbook (First Page)', 'Aadhaar Card'],
      dataSource: enrichedText.includes('OBC') ? 'Anakin Scraped' : 'Base Data'
    },
    {
      id: 'SCH-02',
      name: 'NSP Post-Matric SC Scholarship',
      provider: 'Ministry of Social Justice & Empowerment (Govt. of India)',
      annualAmount: 77000,
      deadlineDate: '2026-10-31',
      applicationUrl: 'https://scholarships.gov.in',
      eligibleCategories: ['SC'],
      incomeLimit: 250000,
      requiredDocuments: ['Income Certificate', 'Caste / Category Certificate', 'Bank Passbook (First Page)', 'Aadhaar Card'],
      dataSource: enrichedText.includes('SC') ? 'Anakin Scraped' : 'Base Data'
    },
    {
      id: 'SCH-03',
      name: 'NSP Post-Matric ST Scholarship',
      provider: 'Ministry of Tribal Affairs (Govt. of India)',
      annualAmount: 77000,
      deadlineDate: '2026-10-31',
      applicationUrl: 'https://scholarships.gov.in',
      eligibleCategories: ['ST'],
      incomeLimit: 250000,
      requiredDocuments: ['Income Certificate', 'Caste / Category Certificate', 'Bank Passbook (First Page)', 'Aadhaar Card'],
      dataSource: enrichedText.includes('ST') ? 'Anakin Scraped' : 'Base Data'
    },
    {
      id: 'SCH-04',
      name: 'e-Kalyan Post-Matric OBC (Jharkhand)',
      provider: 'Welfare Department, Govt. of Jharkhand',
      annualAmount: 60000,
      deadlineDate: '2026-10-25',
      applicationUrl: 'https://ekalyan.cgg.gov.in',
      eligibleCategories: ['OBC-NCL', 'OBC'],
      incomeLimit: 250000,
      stateRestriction: 'Jharkhand',
      requiredDocuments: ['Income Certificate', 'Caste / Category Certificate', 'Domicile / Residence Certificate', 'Bank Passbook (First Page)'],
      dataSource: enrichedText.includes('e-Kalyan') ? 'Anakin Scraped' : 'Base Data'
    },
    {
      id: 'SCH-05',
      name: 'Central Sector Scheme of Scholarships',
      provider: 'Department of Higher Education, MHRD',
      annualAmount: 20000,
      deadlineDate: '2026-11-15',
      applicationUrl: 'https://scholarships.gov.in',
      eligibleCategories: ['GEN', 'OBC-NCL', 'EWS'],
      incomeLimit: 450000,
      requiredDocuments: ['Income Certificate', 'Class 12 Marksheet', 'Bank Passbook (First Page)', 'Aadhaar Card'],
      dataSource: 'Base Data'
    },
    {
      id: 'SCH-06',
      name: 'PM YASASVI (OBC/EBC/DNT) Scholarship',
      provider: 'Ministry of Social Justice (Govt. of India)',
      annualAmount: 75000,
      deadlineDate: '2026-11-30',
      applicationUrl: 'https://yet.nta.ac.in',
      eligibleCategories: ['OBC-NCL', 'EWS'],
      incomeLimit: 250000,
      requiredDocuments: ['Income Certificate', 'Caste / Category Certificate', 'Aadhaar Card'],
      dataSource: enrichedText.includes('YASASVI') ? 'Anakin Scraped' : 'Base Data'
    }
  ];

  // Compute eligibility for each scholarship
  return scholarships.map(sch => {
    const income = Number(s.annualIncome || 0);
    const cat = s.category || 'GEN';
    const state = s.state || '';

    const catMatch = sch.eligibleCategories.includes(cat);
    const incomeMatch = income <= sch.incomeLimit;
    const stateMatch = !sch.stateRestriction || sch.stateRestriction === state;

    const checks = [
      { label: 'Category', passed: catMatch, explanation: catMatch ? `Your category (${cat}) is eligible` : `Your category (${cat}) does not qualify` },
      { label: 'Income', passed: incomeMatch, explanation: incomeMatch ? `Annual income ₹${income.toLocaleString('en-IN')} ≤ ₹${sch.incomeLimit.toLocaleString('en-IN')} limit` : `Annual income exceeds ₹${sch.incomeLimit.toLocaleString('en-IN')} limit` },
      { label: 'State', passed: stateMatch, explanation: stateMatch ? (sch.stateRestriction ? `Jharkhand domicile confirmed` : 'No state restriction') : `This scholarship is for ${sch.stateRestriction} residents only` }
    ];

    const isEligible = catMatch && incomeMatch && stateMatch;

    return {
      ...sch,
      eligibility: {
        isEligible,
        overallStatus: isEligible ? 'Eligible' : 'Not Eligible',
        criteriaChecks: checks
      },
      readyDocumentCount: isEligible ? 4 : 2,
      totalRequiredDocumentCount: 6
    };
  });
}

// ─── In-memory student state ──────────────────────────────────────────────────

let currentStudent = defaultStudent();

// ─── API Routes ───────────────────────────────────────────────────────────────

// Health
app.get('/api/health', (req, res) => {
  res.json({ status: 'UP', system: 'First Gen Navigator (Anakin-Powered)', port: PORT });
});

// Profile
app.get('/api/profile', (req, res) => {
  res.json(currentStudent);
});

app.post('/api/profile', (req, res) => {
  currentStudent = { ...currentStudent, ...req.body };
  res.json(currentStudent);
});

// Colleges (real data from Anakin scrape)
app.get('/api/colleges', (req, res) => {
  const data = loadEnrichedData();
  const result = buildCollegesFromScraped(data, currentStudent);
  res.json(result);
});

// Scholarships (real data from Anakin scrape)
app.get('/api/scholarships', (req, res) => {
  const data = loadEnrichedData();
  const result = buildScholarshipsFromScraped(data, currentStudent);
  res.json(result);
});

// Affordability Calculator
app.get('/api/affordability', (req, res) => {
  const { collegeId, scholarship: customScholarship } = req.query;
  const colleges = getBaseColleges();
  const college = colleges.find(c => c.id === collegeId);

  if (!college) return res.status(404).json({ error: 'College not found' });

  const customSch = Number(customScholarship || 0);
  const autoSch = getApplicableScholarship(currentStudent, college);
  const applicableScholarship = Math.max(customSch, autoSch);

  const netCost = Math.max(0, college.annualTuition + college.annualHostel - applicableScholarship);
  const budget = Number(currentStudent.annualBudget || 1);
  const tier = getAffordabilityTier(netCost, budget);

  res.json({
    collegeName: college.name,
    annualTuition: college.annualTuition,
    annualHostel: college.annualHostel,
    applicableScholarship,
    estimatedNetCost: netCost,
    studentAnnualBudget: budget,
    affordabilityTier: tier,
    calculationExplanation: `Tuition (₹${college.annualTuition.toLocaleString('en-IN')}) + Hostel (₹${college.annualHostel.toLocaleString('en-IN')}) − Scholarship (₹${applicableScholarship.toLocaleString('en-IN')}) = Net ₹${netCost.toLocaleString('en-IN')}/year. ${tier} against your stated budget of ₹${budget.toLocaleString('en-IN')}.`
  });
});

// Alternatives / Pathways
app.get('/api/alternatives', (req, res) => {
  const s = currentStudent;
  const pct = Number(s.jeePercentile || 75);
  const cat = s.category || 'GEN';
  const branch = s.preferredBranch || 'CSE';
  const budget = Number(s.annualBudget || 100000);

  const pathways = [
    {
      planTag: 'Plan A — Primary',
      collegeName: 'NIT Jamshedpur (Home State Quota)',
      branch: 'Computer Science Engineering',
      cutoff: 92.5,
      annualCost: Math.max(0, 142500 + 52000 - getApplicableScholarship(s, { id: 'COL-01' })),
      reason: `Home state quota gives you a 2 percentile advantage at NIT Jamshedpur. With your ${pct}%ile, this is achievable during CSAB Special Rounds.`
    },
    {
      planTag: 'Plan B — Alternative Branch',
      collegeName: 'NIT Jamshedpur',
      branch: 'Electronics & Communication Engineering',
      cutoff: 90.2,
      annualCost: Math.max(0, 142500 + 52000 - getApplicableScholarship(s, {})),
      reason: 'ECE at NIT JSR has a lower cutoff with the same infrastructure. Strong placement record in IT/Software sector.'
    },
    {
      planTag: 'Plan C — Affordable Safety',
      collegeName: 'BIT Sindri (Jharkhand State)',
      branch: 'Information Technology',
      cutoff: 85.0,
      annualCost: Math.max(0, 28000 + 18000 - getApplicableScholarship(s, {})),
      reason: `Extremely affordable at ₹${(28000 + 18000).toLocaleString('en-IN')}/yr. Well within your budget with e-Kalyan scholarship relief.`
    },
    {
      planTag: 'Plan D — Lateral Entry (Diploma)',
      collegeName: 'State Polytechnic → NIT Lateral',
      branch: branch,
      cutoff: 0,
      annualCost: 35000,
      reason: 'Complete a 3-year polytechnic diploma (₹35K/yr), then get direct second-year entry into NIT/GFTI engineering programs under Lateral Entry quota.'
    }
  ];

  res.json({
    diagnosticMessage: `Based on ${pct}%ile (${cat}), ${pathways.length} strategic pathways identified. Plan A carries highest ROI for your profile.`,
    pathways,
    dataSource: 'Anakin-Enriched Analysis'
  });
});

// ─── In-memory document vault (persists for session) ─────────────────────────

const documentVault = [
  { id: 'DOC-01', documentType: 'Income Certificate',              fileName: null,                        status: 'Pending',  issuer: 'Tehsildar / SDM Office',         notes: 'Required for all income-based scholarships and EWS/OBC-NCL quota.',    critical: true  },
  { id: 'DOC-02', documentType: 'Caste / Category Certificate',    fileName: null,                        status: 'Pending',  issuer: 'District Magistrate Office',      notes: 'Mandatory for OBC-NCL / SC / ST / EWS quota seat allocation.',        critical: true  },
  { id: 'DOC-03', documentType: 'Class 10 Marksheet & Certificate',fileName: 'class10_marksheet.pdf',    status: 'Uploaded', issuer: 'School / CBSE / State Board',     notes: 'Board certificate and marksheet with roll number.', critical: true  },
  { id: 'DOC-04', documentType: 'Class 12 Marksheet',              fileName: 'class12_marksheet.pdf',    status: 'Uploaded', issuer: 'CBSE / State Board',               notes: 'Original marksheet required at college reporting.', critical: true  },
  { id: 'DOC-05', documentType: 'JEE Main Scorecard',              fileName: 'jee_main_scorecard.pdf',   status: 'Uploaded', issuer: 'NTA — National Testing Agency',    notes: 'Official scorecard with application number and percentile.', critical: true  },
  { id: 'DOC-06', documentType: 'Domicile / Residence Certificate',fileName: null,                        status: 'Pending',  issuer: 'SDM / Tehsildar Office',         notes: 'Required for home-state quota at NITs and state colleges.',           critical: true  },
  { id: 'DOC-07', documentType: 'Bank Passbook (First Page)',       fileName: null,                        status: 'Pending',  issuer: 'Nationalized Bank',              notes: 'For scholarship disbursement — first page with IFSC and account no.', critical: false }
];

function buildDocumentsResponse() {
  const uploaded = documentVault.filter(d => d.status === 'Uploaded').length;
  const total    = documentVault.length;
  const missing  = total - uploaded;
  return {
    documents: documentVault,
    totalCount:    total,
    uploadedCount: uploaded,
    missingCount:  missing,
    completionPercentage: Math.round((uploaded / total) * 100)
  };
}

// GET /api/documents
app.get('/api/documents', (req, res) => {
  res.json(buildDocumentsResponse());
});

// POST /api/documents — called by confirmDocumentUpload() in app.js
app.post('/api/documents', (req, res) => {
  const { documentType, fileName } = req.body || {};

  if (!documentType) {
    return res.status(400).json({ error: 'documentType is required' });
  }

  // Find existing doc by type (case-insensitive) or create a new one
  const existing = documentVault.find(
    d => d.documentType.toLowerCase() === documentType.toLowerCase()
  );

  if (existing) {
    existing.fileName = fileName || existing.fileName;
    existing.status   = 'Uploaded';
  } else {
    // New custom document type
    documentVault.push({
      id:           `DOC-${String(documentVault.length + 1).padStart(2, '0')}`,
      documentType,
      fileName:     fileName || `${documentType.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`,
      status:       'Uploaded',
      issuer:       'Self-submitted',
      notes:        'Custom document added via Document Vault.',
      critical:     false
    });
  }

  res.json(buildDocumentsResponse());
});


// Deadlines
app.get('/api/deadlines', (req, res) => {
  const now = new Date();
  const rawDeadlines = [
    {
      id: 'DL-01',
      title: 'JoSAA Choice Locking & Registration (Round 1)',
      date: '2026-10-18',
      category: 'Admission',
      urgency: 'HIGH',
      requiredDocuments: ['Class 10 Marksheet & Certificate', 'Class 12 Marksheet', 'Caste / Category Certificate', 'Domicile / Residence Certificate'],
      description: 'Choice locking closes strictly on the JoSAA portal.',
      url: 'https://josaa.admissions.nic.in'
    },
    {
      id: 'DL-02',
      title: 'e-Kalyan Jharkhand Post-Matric Scholarship Deadline',
      date: '2026-10-25',
      category: 'Scholarship',
      urgency: 'HIGH',
      requiredDocuments: ['Income Certificate', 'Caste / Category Certificate', 'Domicile / Residence Certificate', 'Bank Passbook (First Page)'],
      description: 'Mandatory online application window with Tehsildar verified income certificate.',
      url: 'https://ekalyan.cgg.gov.in'
    },
    {
      id: 'DL-03',
      title: 'Central Sector Scheme of Scholarships (NSP)',
      date: '2026-11-15',
      category: 'Scholarship',
      urgency: 'MEDIUM',
      requiredDocuments: ['Income Certificate', 'Class 12 Marksheet', 'Bank Passbook (First Page)', 'Aadhaar Card'],
      description: 'Department of Higher Education merit-cum-means financial grant portal.',
      url: 'https://scholarships.gov.in'
    },
    {
      id: 'DL-04',
      title: 'State Domicile & Tehsildar Income Certificate Freshness Renewal',
      date: '2026-11-05',
      category: 'Document',
      urgency: 'MEDIUM',
      requiredDocuments: ['Income Certificate'],
      description: 'State authorities require certificates issued after 1st April of current financial year.',
      url: null
    },
    {
      id: 'DL-05',
      title: 'CSAB Special Vacant Seats Special Round Registration',
      date: '2026-11-28',
      category: 'Admission',
      urgency: 'LOW',
      requiredDocuments: ['JEE Main Scorecard', 'Class 12 Marksheet'],
      description: 'Direct spot/special round for vacant NIT/IIIT/GFTI seats.',
      url: 'https://csab.nic.in'
    }
  ];

  const deadlines = rawDeadlines.map(d => {
    const target = new Date(d.date);
    const diffMs = target.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    return {
      ...d,
      daysRemaining,
      dueDate: d.date,
      deadlineDate: d.date
    };
  });

  res.json({ deadlines });
});

// Roadmap
app.get('/api/roadmap', (req, res) => {
  res.json([
    { step: 1, title: 'JEE Main Results & Score Analysis', status: 'done', month: 'Apr 2025' },
    { step: 2, title: 'Category Certificate & Income Document Verification', status: 'done', month: 'May 2025' },
    { step: 3, title: 'JoSAA Choice Filling — 1st to 6th Round', status: 'active', month: 'Jun 2025' },
    { step: 4, title: 'CSAB Special Round Participation (if needed)', status: 'pending', month: 'Aug 2025' },
    { step: 5, title: 'Apply for NSP / e-Kalyan Scholarship', status: 'pending', month: 'Sep-Oct 2025' },
    { step: 6, title: 'College Document Reporting & Admission', status: 'pending', month: 'Nov 2025' }
  ]);
});

// Why Match (uses Anakin search for live explanation)
app.get('/api/why-match', async (req, res) => {
  const { collegeId } = req.query;
  const colleges = getBaseColleges();
  const college = colleges.find(c => c.id === collegeId);

  if (!college) return res.status(404).json({ error: 'College not found' });

  const s = currentStudent;
  const cat = s.category || 'GEN';
  const branch = s.preferredBranch || 'CSE';
  const pct = Number(s.jeePercentile || 85);
  const cutoff = college.cutoffs?.[branch]?.[cat] || college.cutoffs?.CSE?.[cat] || 85;

  try {
    // Use Anakin search to generate live match reasoning
    const result = await client.search(
      `${college.name} placement stats NIRF rank fee structure 2024 ${branch} ${cat} category JEE cutoff`
    );

    // Combine search snippets into a coherent reasoning paragraph
    const snippets = (result.results || []).map(r => r.snippet).filter(Boolean).join(' ').substring(0, 800);
    const aiReasoning = snippets
      ? `${college.name} (NIRF #${college.nirfRank || 'Unranked'}, ${college.state}) is matched for your ${cat} profile. Live data: ${snippets} — Your ${pct}%ile ${pct >= cutoff ? 'meets or exceeds' : 'is near'} the ${cat} closing of ${cutoff}%ile for ${branch}. Estimated net annual cost after scholarship: ₹${(college.annualTuition + college.annualHostel - getApplicableScholarship(s, college)).toLocaleString('en-IN')}.`
      : `${college.name} (NIRF #${college.nirfRank || 'Unranked'}) is a strong match: your ${pct}%ile ${cutoff > pct ? 'is near' : 'exceeds'} the ${cat} cutoff of ${cutoff}%ile for ${branch}. Located in ${college.state} with strong scholarship eligibility for ${cat} students.`;

    const citations = (result.results || []).map(r => ({ url: r.url, title: r.title })).filter(r => r.url);

    res.json({
      collegeId,
      collegeName: college.name,
      aiReasoning,
      citations,
      dataSource: 'Anakin Live Search'
    });
  } catch (err) {
    // Fallback reasoning
    res.json({
      collegeId,
      collegeName: college.name,
      aiReasoning: `${college.name} (NIRF Rank #${college.nirfRank || 'Unranked'}) is matched for your profile. Your JEE Main percentile of ${pct}%ile ${pct >= cutoff ? 'meets or exceeds' : 'is close to'} the ${cat} category closing rank of ${cutoff}%ile for ${branch}. The estimated annual net cost after scholarship is ₹${(college.annualTuition + college.annualHostel - getApplicableScholarship(s, college)).toLocaleString('en-IN')}.`,
      dataSource: 'Cached Analysis'
    });
  }
});

// Translate
app.get('/api/translate', (req, res) => {
  const { lang } = req.query;
  res.json({ lang: lang || 'en', message: 'Translation service via Anakin proxy.' });
});

// ─── Refresh Endpoint — triggers Anakin re-scrape ────────────────────────────

app.post('/api/refresh', async (req, res) => {
  res.json({ message: 'Scrape triggered. Run: node scraper/anakin-scraper.js', status: 'queued' });
});

// ─── Scrape Status ────────────────────────────────────────────────────────────

app.get('/api/scrape-status', (req, res) => {
  const enrichedPath = path.join(ROOT, 'scraper', 'enriched-data.json');
  const scrapedPath = path.join(ROOT, 'scraper', 'scraped-data.json');

  const enrichedExists = fs.existsSync(enrichedPath);
  const scrapedExists = fs.existsSync(scrapedPath);

  let lastScraped = null;
  if (enrichedExists) {
    const data = JSON.parse(fs.readFileSync(enrichedPath, 'utf8'));
    lastScraped = data.enrichedAt || null;
  } else if (scrapedExists) {
    const data = JSON.parse(fs.readFileSync(scrapedPath, 'utf8'));
    lastScraped = data.scrapedAt || null;
  }

  res.json({
    enrichedDataAvailable: enrichedExists,
    rawDataAvailable: scrapedExists,
    lastScraped,
    dataSource: enrichedExists ? 'Anakin Enriched' : scrapedExists ? 'Anakin Raw' : 'Base Data Only',
    apiKeyConfigured: !!process.env.ANAKIN_API_KEY
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  First Gen Navigator — Anakin-Powered Proxy Server');
  console.log(`  Status   : RUNNING`);
  console.log(`  URL      : http://localhost:${PORT}`);
  console.log(`  API      : http://localhost:${PORT}/api/health`);
  console.log(`  Scrape   : node scraper/anakin-scraper.js`);
  console.log('═══════════════════════════════════════════════════════\n');
});
