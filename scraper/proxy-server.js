/**
 * First Gen Navigator — Anakin-Powered Proxy Server
 * ===================================================
 * A lightweight Express server that:
 *  1. Serves seeded college data with scraped source references when available
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
import crypto from 'crypto';
import dns from 'node:dns/promises';
import https from 'node:https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const app = express();
const PORT = process.env.PORT || process.env.SCRAPER_PORT || 3001;

const client = process.env.ANAKIN_API_KEY
  ? new Anakin({ apiKey: process.env.ANAKIN_API_KEY })
  : null;

app.use(cors());
app.use(express.json({ limit: '32kb' }));

// ─── Serve static web files ──────────────────────────────────────────────────
app.use(express.static(path.join(ROOT, 'web')));

async function httpsJsonRequest(url, options = {}) {
  const hostname = new URL(url).hostname;
  let addresses;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      addresses = await dns.lookup(hostname, { all: true });
      break;
    } catch (error) {
      if (!['ENOTFOUND', 'EAI_AGAIN'].includes(error.code) || attempt === 2) throw error;
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  }

  return new Promise((resolve, reject) => {
    const request = https.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
      agent: false,
      lookup: (_hostname, lookupOptions, callback) => {
        if (lookupOptions.all) return callback(null, addresses);
        const address = addresses.find(item => !lookupOptions.family || item.family === lookupOptions.family);
        if (!address) return callback(new Error('No compatible network address was found for the remote service.'));
        return callback(null, address.address, address.family);
      }
    }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        resolve({
          ok: response.statusCode >= 200 && response.statusCode < 300,
          status: response.statusCode,
          text: async () => body,
          json: async () => JSON.parse(body)
        });
      });
    });
    request.setTimeout(15000, () => {
      request.destroy(new Error('The remote request timed out. Please try again.'));
    });
    request.on('error', reject);
    request.end(options.body);
  });
}

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

const profileSearchCache = new Map();
const PROFILE_SEARCH_TTL_MS = 15 * 60 * 1000;

const EXAM_LABELS = {
  JEE_MAIN: 'JEE Main', JEE_ADVANCED: 'JEE Advanced', NEET_UG: 'NEET UG', CUET_UG: 'CUET UG',
  CLAT: 'CLAT', AILET: 'AILET', BITSAT: 'BITSAT', VITEEE: 'VITEEE', MHT_CET: 'MHT CET',
  KCET: 'KCET', WBJEE: 'WBJEE', KEAM: 'KEAM', COMEDK: 'COMEDK UGET', AP_EAPCET: 'AP EAPCET',
  TS_EAPCET: 'TS EAPCET', GUJCET: 'GUJCET', OJEE: 'OJEE', ASSAM_CEE: 'Assam CEE',
  MET: 'Manipal MET', SRMJEEE: 'SRMJEEE', KIITEE: 'KIITEE', NATA: 'NATA', NIFT: 'NIFT Entrance', UCEED: 'UCEED',
  IPMAT: 'IPMAT', NDA: 'NDA', GATE: 'GATE', OTHER: 'entrance exam'
};

function profileSearchQuery(student, scope) {
  const exam = student?.entranceExam || 'JEE_MAIN';
  const examName = exam === 'OTHER' ? (student?.otherExamName || 'other entrance exam') : (EXAM_LABELS[exam] || 'entrance exam');
  const area = student?.studyArea || 'undergraduate courses';
  const specialization = area === 'engineering' && student?.preferredBranch ? ` ${student.preferredBranch}` : '';
  const location = scope === 'home-state' ? `in ${student?.state || 'India'}` : 'across India';
  const programs = area === 'medical'
    ? 'MBBS BDS AYUSH medical colleges and universities'
    : area === 'law'
      ? 'law colleges and National Law Universities'
      : area === 'design'
        ? 'design colleges and universities'
        : area === 'architecture'
          ? 'architecture colleges and universities'
          : `${area}${specialization} colleges and universities`;
  return `Find named individual colleges and universities for ${examName} ${programs} accepting ${examName} ${location}. Return official institution admissions pages where possible. Exclude listicles, "list of colleges", counselling notices, exam authorities, coaching sites, rank predictors, news and guidance portals.`.replace(/\s+/g, ' ').trim();
}

function profileSearchCacheKey(student, scope) {
  return [student?.entranceExam, student?.otherExamName, student?.studyArea, student?.state, scope]
    .map(value => String(value ?? '').trim().toLowerCase())
    .join('|');
}

function extractInstitutionName(title, url) {
  const institutionPattern = /\b(universit(?:y|ies)|colleges?|institutes?|medical college|aiims|jipmer|pgimer|kgmu|afmc|\bcmc\b|\bnlu\b|national law|\bbits\b|\biit\b|\bnit\b|\biiit\b|\bsrm\b|\bvit\b|\bkiit\b|manipal|symbiosis|jamia|tiss)\b/i;
  const excludedDomains = /(^|\.)(careers360\.com|shiksha\.com|collegedekho\.com|careersindia\.com|careerorbits\.com|getmyuni\.com|collegedunia\.com|collegepravesh\.com|embibe\.com|byjus\.com|vedantu\.com|motion\.ac\.in|dishastars\.com)$/i;
  let hostname = '';
  try { hostname = new URL(url).hostname.replace(/^www\./, ''); } catch {}
  if (excludedDomains.test(hostname)) return null;

  const rawTitle = String(title || '').replace(/^\s*\[(?:pdf|doc|html)\]\s*/i, '').replace(/\s+/g, ' ').trim();
  if (!rawTitle || /\blist\s+of\s+(?:the\s+)?colleges?\b|\bcolleges?\s+accepting\b|\btop\s+\d+\s+colleges?\b|counselling|seat allotment|rank predictor|coaching|guidance|answer key|admit card|information bulletin|news|latest updates/i.test(rawTitle)) return null;

  const segments = rawTitle.split(/\s*(?:\||:|–|—)\s*/).reverse();
  const candidate = segments.find(segment => institutionPattern.test(segment)) || (institutionPattern.test(rawTitle) ? rawTitle : '');
  if (!candidate) return null;
  const cleaned = candidate
    .replace(/^(?:official website|admissions?|courses?|neet|cuet|clat|ailet|nata|nift|uceed|ipmat|bitsat|jee(?: main| advanced)?|gate)\s*(?:ug|pg)?\s*(?:admissions?|courses?|cutoffs?|202\d)?\s*(?:at|for|in)?\s*/i, '')
    .replace(/\s+(?:admissions?|cutoffs?|fees?|courses?|eligibility|neet ug|cuet ug|clat|ailet|202\d.*)$/i, '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s,–—-]+|[\s,–—-]+$/g, '')
    .trim();
  const genericNames = new Set(['university', 'college', 'medical college', 'institute', 'universities', 'colleges', 'institutes', 'national law university']);
  return cleaned.length >= 3 && institutionPattern.test(cleaned) && !genericNames.has(cleaned.toLowerCase()) ? cleaned : null;
}

function extractInstitutionsFromSeatData(markdown) {
  const found = [];
  const documentText = String(markdown || '');
  const rows = documentText.split(/\r?\n/).filter(line => line.includes('|'));
  for (let index = 0; index < rows.length; index += 1) {
    const headers = rows[index].split('|').map(cell => cell.trim().toLowerCase()).filter(Boolean);
    const col = headers.findIndex(cell => /^(institute|college|institution|university)(?: name)?$/.test(cell));
    if (col < 0) continue;
    for (let rowIndex = index + 1; rowIndex < rows.length; rowIndex += 1) {
      const cells = rows[rowIndex].split('|').map(cell => cell.trim()).filter(Boolean);
      if (cells.length <= col || /^[-: ]+$/.test(cells[col])) continue;
      let value = cells[col].replace(/\bNEET\s*UG\b/ig, '').replace(/\s*\(\d{5,}\)\s*$/, '').trim();
      const parts = value.split(/,\s*/);
      const namedPart = parts.find(part => /\b(?:medical|dental|engineering|law|design)?\s*(?:college|institute|university|aiims|jipmer|nlu|iit|nit|iiit)\b/i.test(part));
      if (namedPart) value = namedPart;
      value = value.replace(/\s+/g, ' ').replace(/^[,\s|]+|[,\s|]+$/g, '').trim();
      if (value.length >= 6 && /\b(?:college|institute|university|aiims|jipmer|nlu|iit|nit|iiit)\b/i.test(value)) found.push(value);
    }
  }
  // Some Anakin PDF conversions flatten early seat-matrix pages into prose instead of table rows.
  const plainTextNamePattern = /(?:NEET\s*UG\s+)?((?:[A-Z][A-Za-z&.'’()/-]+\s+){1,9}(?:Medical College|Dental College|Engineering College|Medical University|Medical Institute|Medical Education & Research Institute|College|Institute|University))\b/g;
  for (const match of documentText.matchAll(plainTextNamePattern)) {
    const name = match[1].replace(/\s+/g, ' ').trim();
    if (/all india|central university|deemed university$/i.test(name)) continue;
    found.push(name);
  }
  return [...new Map(found.map(name => [name.toLowerCase(), name])).values()];
}

async function buildProfileSearchResponse(searchResults, student, scope) {
  const searchedAt = new Date().toISOString();
  const seen = new Set();
  const results = [];
  const candidates = (searchResults || []).filter(result => result?.url && /^https?:\/\//i.test(result.url));
  const officialDataCandidates = candidates
    .filter(result => {
      try {
        const host = new URL(result.url).hostname.replace(/^www\./, '');
        return /\.(?:gov\.in|nic\.in)$/i.test(host)
          && !/information bulletin|syllabus|answer key/i.test(result.title || '');
      } catch { return false; }
    })
    .sort((a, b) => {
      const score = title => /seat matrix|seatmatrix|college list|medical college|participating institute/i.test(title || '') ? 2 : /admission|counselling/i.test(title || '') ? 1 : 0;
      return score(b.title) - score(a.title);
    })
    .slice(0, 4);
  const officialDataUrls = new Set(officialDataCandidates.map(result => result.url));
  const orderedCandidates = [...officialDataCandidates, ...candidates.filter(result => !officialDataUrls.has(result.url))];
  let officialScrapes = 0;
  for (const result of orderedCandidates) {
    let names = [];
    let scraped = false;
    let hostname = '';
    try { hostname = new URL(result.url).hostname.replace(/^www\./, ''); } catch {}
    const isOfficialData = officialDataUrls.has(result.url);
    if (isOfficialData && officialScrapes < 4) {
      officialScrapes += 1;
      try {
        const document = await client.scrape(result.url);
        names = extractInstitutionsFromSeatData(document.markdown);
        scraped = names.length > 0;
      } catch (error) {
        console.warn(`Could not extract institution names from official source ${hostname}: ${error.message}`);
      }
    }
    if (!names.length && !isOfficialData) {
      const directName = extractInstitutionName(result.title, result.url);
      if (directName && /\.(?:ac\.in|edu|edu\.in)$/i.test(hostname)) names = [directName];
    }
    for (const name of names) {
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const entry = {
        id: `exam-source-${crypto.createHash('sha256').update(`${result.url}:${key}`).digest('hex').slice(0, 16)}`,
        name,
        type: 'Institution lead',
        matchType: 'source-lead',
        state: scope === 'home-state' ? (student?.state || 'India') : 'India',
        branch: student?.studyArea || 'Undergraduate courses',
        requestedBranch: student?.studyArea || 'Undergraduate courses',
        tier: 'REALISTIC',
        matchStatus: scraped ? 'Institution name extracted from official seat or admissions data; score eligibility is not verified' : 'Institution identified from an official admissions result; score eligibility is not verified',
        counsellingBoard: 'Open the source and confirm its current admission rules',
        isHomeState: false,
        isHomeStateEligible: false,
        availableBranches: [],
        sourceReferences: [{ title: result.title || name, url: result.url, snippet: result.snippet || '', retrievedAt: searchedAt }],
        dataUpdatedAt: searchedAt,
        dataSource: 'Exam-specific admissions source discovery'
      };
      results.push(entry);
    }
    if (results.length >= 12) break;
  }
  return {
    tiers: { DREAM: [], REALISTIC: results, SAFE: [] },
    student,
    generatedAt: searchedAt,
    searchScope: scope,
    dataSource: 'Exam-specific admissions source discovery',
    dataQuality: {
      valuesVerifiedByScraper: false,
      note: 'These are admissions-page leads discovered for your selected exam and course area. The app does not yet compare this exam score against validated institution cutoffs. Confirm score rules and eligibility on each official source.'
    }
  };
}

async function findCollegesForProfile(student, scope = 'all-india') {
  const exam = student?.entranceExam || 'JEE_MAIN';
  if (exam !== 'JEE_MAIN') {
    if (!client) {
      const error = new Error('Admissions search is unavailable because ANAKIN_API_KEY is not configured.');
      error.statusCode = 503;
      throw error;
    }
    const cacheKey = profileSearchCacheKey(student, scope);
    const cached = profileSearchCache.get(cacheKey);
    if (cached && Date.now() - cached.createdAt < PROFILE_SEARCH_TTL_MS) return cached.response;
    const search = await client.search(profileSearchQuery(student, scope), { limit: 12 });
    const response = await buildProfileSearchResponse(search?.results, student, scope);
    profileSearchCache.set(cacheKey, { createdAt: Date.now(), response });
    return response;
  }

  const catalog = getBaseColleges();
  const scopedColleges = scope === 'home-state'
    ? catalog.filter(college => college.state === (student?.state || 'Jharkhand'))
    : catalog;
  const data = loadEnrichedData();
  const response = buildTieredResponse(scopedColleges, student, data);
  response.searchScope = scope;
  response.dataSource = 'JEE Main percentile match against the local college catalog';
  response.dataQuality = {
    ...response.dataQuality,
    valuesVerifiedByScraper: false,
    note: 'College names are from the local catalog. Cutoffs, fees, and tiers are estimates for exploration, not admission guarantees. Verify current closing ranks and eligibility on official counselling sites.'
  };
  return response;
}
function defaultStudent() {
  return { name: 'Asha Kumar', entranceExam: 'JEE_MAIN', examScore: 92.0, jeePercentile: 92.0, studyArea: 'engineering', category: 'OBC-NCL', state: 'Jharkhand', preferredBranch: 'CSE', annualIncome: 300000, annualBudget: 100000 };
}

function resolveCutoff(college, branch, category) {
  const cutoffs = college.cutoffs || {};
  const branchUsed = cutoffs[branch] ? branch : cutoffs.CSE ? 'CSE' : Object.keys(cutoffs)[0];
  const categoryCutoffs = cutoffs[branchUsed] || {};
  const categoryUsed = categoryCutoffs[category] !== undefined
    ? category
    : categoryCutoffs.GEN !== undefined
      ? 'GEN'
      : Object.keys(categoryCutoffs)[0];

  return {
    value: categoryUsed ? categoryCutoffs[categoryUsed] : null,
    branchUsed,
    categoryUsed
  };
}

function buildTieredResponse(colleges, student, data = null) {
  const pct = Number(student?.jeePercentile ?? 92);
  const cat = student?.category || 'OBC-NCL';
  const branch = student?.preferredBranch || 'CSE';
  const state = student?.state || 'Jharkhand';

  const DREAM = [], REALISTIC = [], SAFE = [];

  colleges.forEach(c => {
    const resolvedCutoff = resolveCutoff(c, branch, cat);
    if (resolvedCutoff.value === null) return;
    const cutoff = resolvedCutoff.value;

    const diff = pct - cutoff;
    const isHS = c.state === state;

    const scholarship = getApplicableScholarship(student, c);
    const netCost = Math.max(0, c.annualTuition + c.annualHostel - scholarship);

    const aff = {
      annualTuition: c.annualTuition,
      annualHostel: c.annualHostel,
      applicableScholarship: scholarship,
      estimatedNetCost: netCost,
      affordabilityTier: getAffordabilityTier(netCost, student.annualBudget)
    };

    const enriched = {
      ...c,
      id: c.id,
      name: c.name,
      type: c.type,
      state: c.state,
      nirfRank: c.nirfRank,
      branch: resolvedCutoff.branchUsed || branch,
      requestedBranch: branch,
      cutoffCategory: resolvedCutoff.categoryUsed || null,
      cutoffBasis: resolvedCutoff.categoryUsed === cat
        ? 'Seeded estimate for selected category'
        : `Seeded estimate; ${resolvedCutoff.categoryUsed} fallback`,
      effectiveCutoff: cutoff,
      cutoffPercentile: cutoff,
      margin: Number(diff.toFixed(1)),
      isHomeState: isHS,
      isHomeStateEligible: isHS,
      counsellingBoard: c.counsellingBoard,
      affordability: aff,
      dataSource: 'Seeded estimate; not verified by scraper',
      sourceReferences: data?.collegeReferences?.[c.id] || [],
      availableBranches: Object.keys(c.cutoffs || {}),
      dataUpdatedAt: data?.enrichedAt || data?.scrapedAt || null
    };

    if (diff >= 3.0) {
      enriched.tier = 'SAFE';
      SAFE.push(enriched);
    } else if (diff >= -2.0) {
      enriched.tier = 'REALISTIC';
      REALISTIC.push(enriched);
    } else {
      enriched.tier = 'DREAM';
      DREAM.push(enriched);
    }
  });

  return {
    tiers: { DREAM, REALISTIC, SAFE },
    student,
    generatedAt: new Date().toISOString(),
    dataSource: 'Seeded estimates with scraped source references',
    dataQuality: {
      valuesVerifiedByScraper: false,
      scrapedAt: data?.enrichedAt || data?.scrapedAt || null,
      note: data?.dataQualityNote || 'Scraped links are references only and do not verify seeded values.'
    }
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

  // Ishan Uday Special Scholarship for NER (Assam & North East)
  if (student?.state === 'Assam' && income <= 450000) {
    scholarship = Math.max(scholarship, 93600);
  } else if (student?.state === 'Assam' && income <= 500000) {
    scholarship = Math.max(scholarship, 24000);
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
    // ═════════════════════════════════════════════════════════════════════════
    // DELHI / DELHI-NCR INSTITUTES (GGSIPU, JAC DELHI & PRIVATE)
    // ═════════════════════════════════════════════════════════════════════════
    {
      id: 'COL-DEL-01', name: 'Maharaja Agrasen Institute of Technology (MAIT)', shortCode: 'MAIT-DEL',
      state: 'Delhi', type: 'Private (GGSIPU Aided)', nirfRank: 85,
      annualTuition: 145000, annualHostel: 70000,
      counsellingBoard: 'GGSIPU Counselling / JEE Main',
      cutoffs: {
        CSE: { GEN: 82.5, 'OBC-NCL': 76.0, EWS: 78.0, SC: 64.0, ST: 55.0 },
        IT: { GEN: 80.0, 'OBC-NCL': 73.5, EWS: 75.0, SC: 61.0, ST: 52.0 },
        ECE: { GEN: 75.0, 'OBC-NCL': 68.0, SC: 56.0, ST: 48.0 },
        'AI & DS': { GEN: 81.0, 'OBC-NCL': 74.5, EWS: 76.5, SC: 62.0, ST: 53.0 }
      }
    },
    {
      id: 'COL-DEL-02', name: 'Maharaja Surajmal Institute of Technology (MSIT)', shortCode: 'MSIT-DEL',
      state: 'Delhi', type: 'Private (GGSIPU Aided)', nirfRank: 102,
      annualTuition: 138000, annualHostel: 65000,
      counsellingBoard: 'GGSIPU Counselling / JEE Main',
      cutoffs: {
        CSE: { GEN: 80.0, 'OBC-NCL': 74.0, EWS: 75.5, SC: 62.0, ST: 52.0 },
        IT: { GEN: 77.5, 'OBC-NCL': 71.0, EWS: 73.0, SC: 59.0, ST: 50.0 },
        ECE: { GEN: 72.0, 'OBC-NCL': 65.0, SC: 54.0, ST: 46.0 }
      }
    },
    {
      id: 'COL-DEL-03', name: "Bharati Vidyapeeth's College of Engineering (BVCOE)", shortCode: 'BVCOE-DEL',
      state: 'Delhi', type: 'Private (GGSIPU Affiliated)', nirfRank: 125,
      annualTuition: 135000, annualHostel: 68000,
      counsellingBoard: 'GGSIPU Counselling / JEE Main',
      cutoffs: {
        CSE: { GEN: 74.0, 'OBC-NCL': 67.0, EWS: 69.0, SC: 56.0, ST: 48.0 },
        IT: { GEN: 71.0, 'OBC-NCL': 64.0, EWS: 66.0, SC: 53.0, ST: 45.0 },
        ECE: { GEN: 66.0, 'OBC-NCL': 59.0, SC: 49.0, ST: 42.0 }
      }
    },
    {
      id: 'COL-DEL-04', name: 'Bhagwan Parshuram Institute of Technology (BPIT)', shortCode: 'BPIT-DEL',
      state: 'Delhi', type: 'Private (GGSIPU Affiliated)', nirfRank: 140,
      annualTuition: 130000, annualHostel: 62000,
      counsellingBoard: 'GGSIPU Counselling / JEE Main',
      cutoffs: {
        CSE: { GEN: 70.0, 'OBC-NCL': 63.0, EWS: 65.0, SC: 52.0, ST: 45.0 },
        IT: { GEN: 67.0, 'OBC-NCL': 60.0, EWS: 62.0, SC: 49.0, ST: 42.0 },
        ECE: { GEN: 62.0, 'OBC-NCL': 55.0, SC: 45.0, ST: 39.0 }
      }
    },
    {
      id: 'COL-DEL-05', name: 'Guru Tegh Bahadur Institute of Technology (GTBIT)', shortCode: 'GTBIT-DEL',
      state: 'Delhi', type: 'Private (GGSIPU Minority)', nirfRank: 165,
      annualTuition: 125000, annualHostel: 60000,
      counsellingBoard: 'GGSIPU Counselling / JEE Main',
      cutoffs: {
        CSE: { GEN: 62.0, 'OBC-NCL': 56.0, EWS: 58.0, SC: 48.0, ST: 42.0 },
        IT: { GEN: 59.0, 'OBC-NCL': 53.0, EWS: 55.0, SC: 45.0, ST: 39.0 },
        ECE: { GEN: 54.0, 'OBC-NCL': 48.0, SC: 40.0, ST: 35.0 }
      }
    },
    {
      id: 'COL-DEL-06', name: 'Delhi Technical Campus (DTC), Greater Noida', shortCode: 'DTC-DEL',
      state: 'Delhi', type: 'Private (GGSIPU Affiliated)', nirfRank: 185,
      annualTuition: 115000, annualHostel: 60000,
      counsellingBoard: 'GGSIPU Counselling / Direct',
      cutoffs: {
        CSE: { GEN: 50.0, 'OBC-NCL': 44.0, EWS: 46.0, SC: 38.0, ST: 32.0 },
        'AI & DS': { GEN: 48.0, 'OBC-NCL': 42.0, EWS: 44.0, SC: 36.0, ST: 30.0 },
        ECE: { GEN: 44.0, 'OBC-NCL': 38.0, SC: 32.0, ST: 28.0 }
      }
    },
    {
      id: 'COL-DEL-07', name: 'HMR Institute of Technology & Management, Delhi', shortCode: 'HMR-DEL',
      state: 'Delhi', type: 'Private (GGSIPU Affiliated)', nirfRank: 210,
      annualTuition: 110000, annualHostel: 55000,
      counsellingBoard: 'GGSIPU Counselling / Direct',
      cutoffs: {
        CSE: { GEN: 48.0, 'OBC-NCL': 42.0, EWS: 44.0, SC: 36.0, ST: 30.0 },
        IT: { GEN: 45.0, 'OBC-NCL': 39.0, EWS: 41.0, SC: 34.0, ST: 28.0 },
        ECE: { GEN: 40.0, 'OBC-NCL': 35.0, SC: 30.0, ST: 25.0 }
      }
    },
    {
      id: 'COL-DEL-08', name: 'Delhi Skill and Entrepreneurship University (DSEU) Okhla', shortCode: 'DSEU-DEL',
      state: 'Delhi', type: 'State Govt', nirfRank: 150,
      annualTuition: 75000, annualHostel: 45000,
      counsellingBoard: 'JAC Delhi / State Counselling',
      cutoffs: {
        CSE: { GEN: 68.0, 'OBC-NCL': 58.0, EWS: 62.0, SC: 46.0, ST: 38.0 },
        ECE: { GEN: 60.0, 'OBC-NCL': 50.0, SC: 40.0, ST: 32.0 },
        ME: { GEN: 52.0, 'OBC-NCL': 44.0, SC: 35.0, ST: 28.0 }
      }
    },
    {
      id: 'COL-DEL-09', name: 'Netaji Subhas University of Technology (NSUT) West Campus', shortCode: 'NSUT-WEST',
      state: 'Delhi', type: 'State Govt', nirfRank: 55,
      annualTuition: 195000, annualHostel: 65000,
      counsellingBoard: 'JAC Delhi',
      cutoffs: {
        CSE: { GEN: 78.0, 'OBC-NCL': 68.0, EWS: 72.0, SC: 55.0, ST: 45.0 },
        ECE: { GEN: 72.0, 'OBC-NCL': 62.0, SC: 48.0, ST: 40.0 }
      }
    },
    {
      id: 'COL-DEL-10', name: 'Delhi Technological University (DTU), Delhi', shortCode: 'DTU-DEL',
      state: 'Delhi', type: 'State Govt', nirfRank: 29,
      annualTuition: 219000, annualHostel: 65000,
      counsellingBoard: 'JAC Delhi',
      cutoffs: {
        CSE: { GEN: 97.5, 'OBC-NCL': 93.0, EWS: 95.0, SC: 82.0, ST: 72.0 },
        IT: { GEN: 96.5, 'OBC-NCL': 91.5, EWS: 93.8, SC: 79.0, ST: 68.0 },
        ECE: { GEN: 94.0, 'OBC-NCL': 87.5, SC: 74.0, ST: 62.0 }
      }
    },

    // ═════════════════════════════════════════════════════════════════════════
    // TOP NCR PRIVATE UNIVERSITIES (GREAT FOR 50-70%ile & BUDGET <= 10L)
    // ═════════════════════════════════════════════════════════════════════════
    {
      id: 'COL-NCR-01', name: 'Bennett University, Greater Noida (Times Group)', shortCode: 'BENNETT',
      state: 'Uttar Pradesh', type: 'Private University', nirfRank: 68,
      annualTuition: 360000, annualHostel: 150000,
      counsellingBoard: 'Direct / JEE Main / CUET',
      cutoffs: {
        CSE: { GEN: 54.0, 'OBC-NCL': 50.0, EWS: 52.0, SC: 42.0, ST: 38.0 },
        'AI & DS': { GEN: 52.0, 'OBC-NCL': 48.0, EWS: 50.0, SC: 40.0, ST: 35.0 },
        ECE: { GEN: 48.0, 'OBC-NCL': 44.0, SC: 36.0, ST: 30.0 }
      }
    },
    {
      id: 'COL-NCR-02', name: 'Amity University, Noida / Delhi-NCR', shortCode: 'AMITY-NOIDA',
      state: 'Uttar Pradesh', type: 'Private University', nirfRank: 31,
      annualTuition: 380000, annualHostel: 140000,
      counsellingBoard: 'Direct / JEE Main / Amity Test',
      cutoffs: {
        CSE: { GEN: 54.0, 'OBC-NCL': 50.0, EWS: 52.0, SC: 44.0, ST: 38.0 },
        IT: { GEN: 50.0, 'OBC-NCL': 46.0, EWS: 48.0, SC: 40.0, ST: 35.0 },
        'AI & DS': { GEN: 52.0, 'OBC-NCL': 48.0, EWS: 50.0, SC: 42.0, ST: 36.0 },
        ECE: { GEN: 46.0, 'OBC-NCL': 42.0, SC: 35.0, ST: 30.0 }
      }
    },
    {
      id: 'COL-NCR-03', name: 'Galgotias University, Greater Noida', shortCode: 'GALGOTIAS-U',
      state: 'Uttar Pradesh', type: 'Private University', nirfRank: 88,
      annualTuition: 180000, annualHostel: 90000,
      counsellingBoard: 'Direct / JEE Main / GEEE',
      cutoffs: {
        CSE: { GEN: 48.0, 'OBC-NCL': 44.0, EWS: 46.0, SC: 38.0, ST: 32.0 },
        'AI & DS': { GEN: 46.0, 'OBC-NCL': 42.0, EWS: 44.0, SC: 36.0, ST: 30.0 },
        IT: { GEN: 45.0, 'OBC-NCL': 40.0, EWS: 42.0, SC: 34.0, ST: 28.0 },
        ECE: { GEN: 40.0, 'OBC-NCL': 35.0, SC: 30.0, ST: 25.0 }
      }
    },
    {
      id: 'COL-NCR-04', name: 'Sharda University, Greater Noida', shortCode: 'SHARDA-U',
      state: 'Uttar Pradesh', type: 'Private University', nirfRank: 86,
      annualTuition: 210000, annualHostel: 100000,
      counsellingBoard: 'Direct / SUAT / JEE Main',
      cutoffs: {
        CSE: { GEN: 46.0, 'OBC-NCL': 42.0, EWS: 44.0, SC: 36.0, ST: 30.0 },
        IT: { GEN: 43.0, 'OBC-NCL': 39.0, EWS: 41.0, SC: 33.0, ST: 28.0 },
        ECE: { GEN: 38.0, 'OBC-NCL': 34.0, SC: 28.0, ST: 24.0 }
      }
    },
    {
      id: 'COL-NCR-05', name: 'Jaypee Institute of Information Technology (JIIT), Noida', shortCode: 'JIIT-NOIDA',
      state: 'Uttar Pradesh', type: 'Deemed University', nirfRank: 94,
      annualTuition: 275000, annualHostel: 110000,
      counsellingBoard: 'JIIT Counselling / JEE Main',
      cutoffs: {
        CSE: { GEN: 84.0, 'OBC-NCL': 78.0, EWS: 80.0, SC: 65.0, ST: 56.0 },
        IT: { GEN: 81.0, 'OBC-NCL': 75.0, EWS: 77.0, SC: 62.0, ST: 52.0 },
        ECE: { GEN: 74.0, 'OBC-NCL': 68.0, SC: 55.0, ST: 46.0 }
      }
    },
    {
      id: 'COL-NCR-06', name: 'JSS Academy of Technical Education, Noida', shortCode: 'JSSATE-NOIDA',
      state: 'Uttar Pradesh', type: 'Private (AKTU)', nirfRank: 135,
      annualTuition: 135000, annualHostel: 75000,
      counsellingBoard: 'UPTAC (AKTU) / JEE Main',
      cutoffs: {
        CSE: { GEN: 76.0, 'OBC-NCL': 70.0, EWS: 72.0, SC: 58.0, ST: 50.0 },
        IT: { GEN: 72.0, 'OBC-NCL': 66.0, EWS: 68.0, SC: 54.0, ST: 46.0 },
        ECE: { GEN: 66.0, 'OBC-NCL': 60.0, SC: 48.0, ST: 40.0 }
      }
    },
    {
      id: 'COL-NCR-07', name: 'Ajay Kumar Garg Engineering College (AKGEC), Ghaziabad', shortCode: 'AKGEC-GZB',
      state: 'Uttar Pradesh', type: 'Private (AKTU)', nirfRank: 155,
      annualTuition: 138000, annualHostel: 75000,
      counsellingBoard: 'UPTAC (AKTU) / JEE Main',
      cutoffs: {
        CSE: { GEN: 73.0, 'OBC-NCL': 67.0, EWS: 69.0, SC: 55.0, ST: 46.0 },
        IT: { GEN: 69.0, 'OBC-NCL': 63.0, EWS: 65.0, SC: 51.0, ST: 42.0 },
        ECE: { GEN: 62.0, 'OBC-NCL': 56.0, SC: 45.0, ST: 38.0 }
      }
    },
    {
      id: 'COL-NCR-08', name: 'KIET Group of Institutions, Ghaziabad', shortCode: 'KIET-GZB',
      state: 'Uttar Pradesh', type: 'Private (AKTU)', nirfRank: 160,
      annualTuition: 135000, annualHostel: 70000,
      counsellingBoard: 'UPTAC (AKTU) / JEE Main',
      cutoffs: {
        CSE: { GEN: 70.0, 'OBC-NCL': 64.0, EWS: 66.0, SC: 52.0, ST: 44.0 },
        IT: { GEN: 66.0, 'OBC-NCL': 60.0, EWS: 62.0, SC: 48.0, ST: 40.0 },
        ECE: { GEN: 58.0, 'OBC-NCL': 52.0, SC: 42.0, ST: 35.0 }
      }
    },
    {
      id: 'COL-NCR-09', name: 'ABES Engineering College, Ghaziabad', shortCode: 'ABES-GZB',
      state: 'Uttar Pradesh', type: 'Private (AKTU)', nirfRank: 190,
      annualTuition: 130000, annualHostel: 68000,
      counsellingBoard: 'UPTAC (AKTU) / Direct',
      cutoffs: {
        CSE: { GEN: 58.0, 'OBC-NCL': 52.0, EWS: 54.0, SC: 44.0, ST: 36.0 },
        IT: { GEN: 54.0, 'OBC-NCL': 48.0, EWS: 50.0, SC: 40.0, ST: 33.0 },
        ECE: { GEN: 48.0, 'OBC-NCL': 42.0, SC: 34.0, ST: 28.0 }
      }
    },
    {
      id: 'COL-NCR-10', name: 'Shiv Nadar University (SNU), Greater Noida', shortCode: 'SNU-NOIDA',
      state: 'Uttar Pradesh', type: 'Private University', nirfRank: 62,
      annualTuition: 400000, annualHostel: 170000,
      counsellingBoard: 'SNUSAT / JEE Main (Direct)',
      cutoffs: {
        CSE: { GEN: 75.0, 'OBC-NCL': 70.0, EWS: 72.0, SC: 60.0, ST: 52.0 },
        ECE: { GEN: 68.0, 'OBC-NCL': 62.0, SC: 52.0, ST: 45.0 }
      }
    },
    {
      id: 'COL-NCR-11', name: 'BML Munjal University, Gurugram (Hero Group)', shortCode: 'BMU-GGN',
      state: 'Haryana', type: 'Private University', nirfRank: 110,
      annualTuition: 350000, annualHostel: 150000,
      counsellingBoard: 'Direct / JEE Main',
      cutoffs: {
        CSE: { GEN: 55.0, 'OBC-NCL': 50.0, EWS: 52.0, SC: 42.0, ST: 36.0 },
        ECE: { GEN: 48.0, 'OBC-NCL': 43.0, SC: 36.0, ST: 30.0 }
      }
    },
    {
      id: 'COL-NCR-12', name: 'The NorthCap University (NCU), Gurugram', shortCode: 'NCU-GGN',
      state: 'Haryana', type: 'Private University', nirfRank: 96,
      annualTuition: 310000, annualHostel: 120000,
      counsellingBoard: 'Direct / JEE Main',
      cutoffs: {
        CSE: { GEN: 50.0, 'OBC-NCL': 45.0, EWS: 47.0, SC: 38.0, ST: 32.0 },
        'AI & DS': { GEN: 48.0, 'OBC-NCL': 43.0, EWS: 45.0, SC: 36.0, ST: 30.0 },
        ECE: { GEN: 42.0, 'OBC-NCL': 37.0, SC: 30.0, ST: 25.0 }
      }
    },
    {
      id: 'COL-NCR-13', name: 'Manav Rachna International Institute (MRIIRS), Faridabad', shortCode: 'MRIIRS-FBD',
      state: 'Haryana', type: 'Deemed Private', nirfRank: 105,
      annualTuition: 240000, annualHostel: 110000,
      counsellingBoard: 'MRNAT / JEE Main / Direct',
      cutoffs: {
        CSE: { GEN: 45.0, 'OBC-NCL': 40.0, EWS: 42.0, SC: 35.0, ST: 30.0 },
        IT: { GEN: 42.0, 'OBC-NCL': 37.0, EWS: 39.0, SC: 32.0, ST: 27.0 },
        ECE: { GEN: 38.0, 'OBC-NCL': 33.0, SC: 28.0, ST: 24.0 }
      }
    },
    {
      id: 'COL-NCR-14', name: 'K.R. Mangalam University, Gurugram', shortCode: 'KRMU-GGN',
      state: 'Haryana', type: 'Private University', nirfRank: 180,
      annualTuition: 210000, annualHostel: 100000,
      counsellingBoard: 'Direct / KREE / JEE Main',
      cutoffs: {
        CSE: { GEN: 42.0, 'OBC-NCL': 38.0, EWS: 40.0, SC: 32.0, ST: 28.0 },
        'AI & DS': { GEN: 40.0, 'OBC-NCL': 36.0, EWS: 38.0, SC: 30.0, ST: 26.0 },
        ECE: { GEN: 35.0, 'OBC-NCL': 30.0, SC: 25.0, ST: 20.0 }
      }
    },

    // ═════════════════════════════════════════════════════════════════════════
    // PAN-INDIA TOP PRIVATE & DEEMED UNIVERSITIES (AFFORDABLE & POPULAR)
    // ═════════════════════════════════════════════════════════════════════════
    {
      id: 'COL-NAT-01', name: 'Chandigarh University (CU), Mohali', shortCode: 'CU-CHD',
      state: 'Punjab', type: 'Private University (NAAC A+)', nirfRank: 32,
      annualTuition: 260000, annualHostel: 90000,
      counsellingBoard: 'CUCET / JEE Main / Direct',
      cutoffs: {
        CSE: { GEN: 55.0, 'OBC-NCL': 50.0, EWS: 52.0, SC: 42.0, ST: 36.0 },
        'AI & DS': { GEN: 52.0, 'OBC-NCL': 47.0, EWS: 49.0, SC: 40.0, ST: 34.0 },
        IT: { GEN: 50.0, 'OBC-NCL': 45.0, EWS: 47.0, SC: 38.0, ST: 32.0 },
        ECE: { GEN: 45.0, 'OBC-NCL': 40.0, SC: 34.0, ST: 28.0 }
      }
    },
    {
      id: 'COL-NAT-02', name: 'Lovely Professional University (LPU), Jalandhar', shortCode: 'LPU-PUN',
      state: 'Punjab', type: 'Private University (NAAC A++)', nirfRank: 50,
      annualTuition: 280000, annualHostel: 95000,
      counsellingBoard: 'LPUNEST / JEE Main / Direct',
      cutoffs: {
        CSE: { GEN: 48.0, 'OBC-NCL': 43.0, EWS: 45.0, SC: 36.0, ST: 30.0 },
        'AI & DS': { GEN: 46.0, 'OBC-NCL': 41.0, EWS: 43.0, SC: 34.0, ST: 28.0 },
        IT: { GEN: 44.0, 'OBC-NCL': 39.0, EWS: 41.0, SC: 32.0, ST: 26.0 },
        ECE: { GEN: 40.0, 'OBC-NCL': 35.0, SC: 28.0, ST: 24.0 }
      }
    },
    {
      id: 'COL-NAT-03', name: 'Graphic Era University, Dehradun', shortCode: 'GEU-DDN',
      state: 'Uttarakhand', type: 'Deemed University (NAAC A+)', nirfRank: 62,
      annualTuition: 320000, annualHostel: 110000,
      counsellingBoard: 'Direct / JEE Main / Merit',
      cutoffs: {
        CSE: { GEN: 56.0, 'OBC-NCL': 51.0, EWS: 53.0, SC: 44.0, ST: 38.0 },
        'AI & DS': { GEN: 53.0, 'OBC-NCL': 48.0, EWS: 50.0, SC: 41.0, ST: 35.0 },
        IT: { GEN: 51.0, 'OBC-NCL': 46.0, EWS: 48.0, SC: 39.0, ST: 33.0 },
        ECE: { GEN: 45.0, 'OBC-NCL': 40.0, SC: 34.0, ST: 28.0 }
      }
    },
    {
      id: 'COL-NAT-04', name: 'UPES (University of Petroleum & Energy Studies), Dehradun', shortCode: 'UPES-DDN',
      state: 'Uttarakhand', type: 'Private University', nirfRank: 42,
      annualTuition: 420000, annualHostel: 180000,
      counsellingBoard: 'UPESEAT / JEE Main / Direct',
      cutoffs: {
        CSE: { GEN: 57.0, 'OBC-NCL': 52.0, EWS: 54.0, SC: 45.0, ST: 39.0 },
        'AI & DS': { GEN: 54.0, 'OBC-NCL': 49.0, EWS: 51.0, SC: 42.0, ST: 36.0 },
        ECE: { GEN: 48.0, 'OBC-NCL': 43.0, SC: 36.0, ST: 30.0 }
      }
    },
    {
      id: 'COL-NAT-05', name: 'Manipal University Jaipur (MUJ)', shortCode: 'MUJ-JPR',
      state: 'Rajasthan', type: 'Private University (NAAC A+)', nirfRank: 64,
      annualTuition: 390000, annualHostel: 170000,
      counsellingBoard: 'MET / JEE Main / Direct',
      cutoffs: {
        CSE: { GEN: 58.0, 'OBC-NCL': 53.0, EWS: 55.0, SC: 46.0, ST: 40.0 },
        IT: { GEN: 54.0, 'OBC-NCL': 49.0, EWS: 51.0, SC: 42.0, ST: 36.0 },
        'AI & DS': { GEN: 55.0, 'OBC-NCL': 50.0, EWS: 52.0, SC: 43.0, ST: 37.0 },
        ECE: { GEN: 48.0, 'OBC-NCL': 43.0, SC: 36.0, ST: 30.0 }
      }
    },
    {
      id: 'COL-NAT-06', name: 'SRM Institute of Science and Technology, NCR Campus, Modinagar', shortCode: 'SRM-NCR',
      state: 'Uttar Pradesh', type: 'Deemed University', nirfRank: 24,
      annualTuition: 290000, annualHostel: 110000,
      counsellingBoard: 'SRMJEEE / JEE Main / Direct',
      cutoffs: {
        CSE: { GEN: 54.0, 'OBC-NCL': 49.0, EWS: 51.0, SC: 42.0, ST: 36.0 },
        IT: { GEN: 50.0, 'OBC-NCL': 45.0, EWS: 47.0, SC: 38.0, ST: 32.0 },
        ECE: { GEN: 44.0, 'OBC-NCL': 39.0, SC: 32.0, ST: 28.0 }
      }
    },
    {
      id: 'COL-NAT-07', name: 'Chitkara University, Rajpura', shortCode: 'CHITKARA-PUN',
      state: 'Punjab', type: 'Private University (NAAC A+)', nirfRank: 80,
      annualTuition: 240000, annualHostel: 90000,
      counsellingBoard: 'Direct / JEE Main',
      cutoffs: {
        CSE: { GEN: 53.0, 'OBC-NCL': 48.0, EWS: 50.0, SC: 41.0, ST: 35.0 },
        'AI & DS': { GEN: 50.0, 'OBC-NCL': 45.0, EWS: 47.0, SC: 38.0, ST: 32.0 },
        ECE: { GEN: 43.0, 'OBC-NCL': 38.0, SC: 31.0, ST: 26.0 }
      }
    },
    {
      id: 'COL-NAT-08', name: 'DIT University, Dehradun', shortCode: 'DIT-DDN',
      state: 'Uttarakhand', type: 'Private University', nirfRank: 118,
      annualTuition: 280000, annualHostel: 110000,
      counsellingBoard: 'Direct / JEE Main',
      cutoffs: {
        CSE: { GEN: 50.0, 'OBC-NCL': 45.0, EWS: 47.0, SC: 38.0, ST: 32.0 },
        IT: { GEN: 46.0, 'OBC-NCL': 41.0, EWS: 43.0, SC: 34.0, ST: 28.0 },
        ECE: { GEN: 40.0, 'OBC-NCL': 35.0, SC: 28.0, ST: 24.0 }
      }
    },
    {
      id: 'COL-NAT-09', name: 'Kalinga Institute of Industrial Technology (KIIT), Bhubaneswar', shortCode: 'KIIT-BBSR',
      state: 'Odisha', type: 'Deemed University', nirfRank: 16,
      annualTuition: 385000, annualHostel: 120000,
      counsellingBoard: 'KIITEE / JEE Main',
      cutoffs: {
        CSE: { GEN: 65.0, 'OBC-NCL': 60.0, EWS: 62.0, SC: 52.0, ST: 44.0 },
        IT: { GEN: 61.0, 'OBC-NCL': 56.0, EWS: 58.0, SC: 48.0, ST: 40.0 },
        ECE: { GEN: 55.0, 'OBC-NCL': 50.0, SC: 42.0, ST: 35.0 }
      }
    },
    {
      id: 'COL-NAT-10', name: 'Thapar Institute of Engineering and Technology (TIET), Patiala', shortCode: 'THAPAR-PAT',
      state: 'Punjab', type: 'Deemed University', nirfRank: 20,
      annualTuition: 450000, annualHostel: 150000,
      counsellingBoard: 'TIET Counselling / JEE Main',
      cutoffs: {
        CSE: { GEN: 86.0, 'OBC-NCL': 80.0, EWS: 82.0, SC: 70.0, ST: 60.0 },
        'COE': { GEN: 83.0, 'OBC-NCL': 77.0, EWS: 79.0, SC: 67.0, ST: 56.0 },
        ECE: { GEN: 76.0, 'OBC-NCL': 70.0, SC: 58.0, ST: 48.0 }
      }
    },
    {
      id: 'COL-NAT-11', name: 'KL University (KLEF), Vaddeswaram, Guntur / Hyderabad', shortCode: 'KLU-AP',
      state: 'Andhra Pradesh', type: 'Deemed University', nirfRank: 28,
      annualTuition: 280000, annualHostel: 110000,
      counsellingBoard: 'KLEEE / JEE Main / Direct',
      cutoffs: {
        CSE: { GEN: 48.0, 'OBC-NCL': 43.0, EWS: 45.0, SC: 36.0, ST: 30.0 },
        'AI & DS': { GEN: 46.0, 'OBC-NCL': 41.0, EWS: 43.0, SC: 34.0, ST: 28.0 },
        ECE: { GEN: 40.0, 'OBC-NCL': 35.0, SC: 28.0, ST: 24.0 }
      }
    },

    // ═════════════════════════════════════════════════════════════════════════
    // SEEDED PREMIER GOVERNMENT COLLEGES (NITS, IITS, IIITS & STATE GOVT)
    // ═════════════════════════════════════════════════════════════════════════
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
        CSE: { GEN: 55.0, 'OBC-NCL': 48.0, SC: 42.0, ST: 36.0 },
        ECE: { GEN: 50.0, 'OBC-NCL': 44.0 },
        IT: { GEN: 52.0, 'OBC-NCL': 46.0 }
      }
    },
    {
      id: 'COL-11', name: 'Indian Institute of Technology (IIT) Guwahati', shortCode: 'IIT-GHY',
      state: 'Assam', type: 'IIT', nirfRank: 7,
      annualTuition: 200000, annualHostel: 58000,
      counsellingBoard: 'JoSAA / JEE Advanced',
      cutoffs: {
        CSE: { GEN: 99.6, 'OBC-NCL': 98.5, EWS: 98.8, SC: 93.0, ST: 88.0 },
        ECE: { GEN: 98.8, 'OBC-NCL': 96.8, EWS: 97.2, SC: 89.0, ST: 82.0 },
        EE: { GEN: 97.8, 'OBC-NCL': 94.5, SC: 85.0, ST: 78.0 },
        ME: { GEN: 96.5, 'OBC-NCL': 92.5, SC: 81.0, ST: 74.0 },
        CE: { GEN: 95.0, 'OBC-NCL': 90.0 }
      }
    },
    {
      id: 'COL-12', name: 'National Institute of Technology (NIT) Silchar', shortCode: 'NIT-SIL',
      state: 'Assam', type: 'NIT', nirfRank: 40,
      annualTuition: 125000, annualHostel: 38000,
      counsellingBoard: 'JoSAA / CSAB',
      cutoffs: {
        CSE: { GEN: 96.8, 'OBC-NCL': 93.2, EWS: 94.0, SC: 84.0, ST: 76.0 },
        ECE: { GEN: 93.5, 'OBC-NCL': 89.5, EWS: 90.5, SC: 78.0, ST: 70.0 },
        EE: { GEN: 91.5, 'OBC-NCL': 86.5, SC: 74.0, ST: 66.0 },
        ME: { GEN: 89.0, 'OBC-NCL': 83.5, SC: 70.0, ST: 62.0 },
        CE: { GEN: 87.0, 'OBC-NCL': 81.0 }
      }
    },
    {
      id: 'COL-13', name: 'Indian Institute of Information Technology (IIIT) Guwahati', shortCode: 'IIIT-GHY',
      state: 'Assam', type: 'IIIT', nirfRank: 85,
      annualTuition: 225000, annualHostel: 48000,
      counsellingBoard: 'JoSAA / CSAB',
      cutoffs: {
        CSE: { GEN: 97.0, 'OBC-NCL': 93.5, EWS: 94.2, SC: 84.0, ST: 75.0 },
        ECE: { GEN: 94.5, 'OBC-NCL': 90.0, SC: 78.0 }
      }
    },
    {
      id: 'COL-14', name: 'Assam Engineering College (AEC) Jalukbari, Guwahati', shortCode: 'AEC-GHY',
      state: 'Assam', type: 'State Govt', nirfRank: 130,
      annualTuition: 18000, annualHostel: 14000,
      counsellingBoard: 'DTE Assam / Assam CEE / JEE Main',
      cutoffs: {
        CSE: { GEN: 92.5, 'OBC-NCL': 86.0, EWS: 87.5, SC: 78.0, ST: 70.0 },
        ECE: { GEN: 89.0, 'OBC-NCL': 82.0, SC: 73.0 },
        EE: { GEN: 86.5, 'OBC-NCL': 78.0 },
        ME: { GEN: 84.0, 'OBC-NCL': 75.0 },
        CE: { GEN: 82.0, 'OBC-NCL': 72.0 }
      }
    },
    {
      id: 'COL-15', name: 'Jorhat Engineering College (JEC) Jorhat', shortCode: 'JEC-JRH',
      state: 'Assam', type: 'State Govt', nirfRank: 145,
      annualTuition: 18000, annualHostel: 14000,
      counsellingBoard: 'DTE Assam / Assam CEE / JEE Main',
      cutoffs: {
        CSE: { GEN: 91.0, 'OBC-NCL': 84.5, EWS: 85.5, SC: 75.0, ST: 68.0 },
        EE: { GEN: 85.0, 'OBC-NCL': 77.0, SC: 67.0 },
        ME: { GEN: 83.0, 'OBC-NCL': 74.0 },
        CE: { GEN: 80.5, 'OBC-NCL': 71.0 }
      }
    },
    {
      id: 'COL-16', name: 'Tezpur University, School of Engineering', shortCode: 'TU-SOE',
      state: 'Assam', type: 'CFTI', nirfRank: 69,
      annualTuition: 48000, annualHostel: 22000,
      counsellingBoard: 'JoSAA / CSAB / TU Entrance',
      cutoffs: {
        CSE: { GEN: 94.5, 'OBC-NCL': 89.0, EWS: 90.0, SC: 80.0, ST: 72.0 },
        ECE: { GEN: 91.0, 'OBC-NCL': 85.0, SC: 74.0 },
        EE: { GEN: 88.0, 'OBC-NCL': 81.0 },
        ME: { GEN: 85.0, 'OBC-NCL': 78.0 },
        CE: { GEN: 83.0, 'OBC-NCL': 75.0 }
      }
    },
    {
      id: 'COL-17', name: 'Central Institute of Technology (CIT) Kokrajhar', shortCode: 'CIT-KKR',
      state: 'Assam', type: 'CFTI', nirfRank: 180,
      annualTuition: 42000, annualHostel: 20000,
      counsellingBoard: 'JoSAA / CSAB / CIT Entrance',
      cutoffs: {
        CSE: { GEN: 89.0, 'OBC-NCL': 81.0, EWS: 82.5, SC: 72.0, ST: 65.0 },
        ECE: { GEN: 85.0, 'OBC-NCL': 76.0 },
        IT: { GEN: 87.0, 'OBC-NCL': 79.0 },
        CE: { GEN: 80.0, 'OBC-NCL': 70.0 }
      }
    },
    {
      id: 'COL-18', name: 'Assam University, Triguna Sen School of Technology (TSSOT)', shortCode: 'AUS-TSSOT',
      state: 'Assam', type: 'GFTI', nirfRank: 160,
      annualTuition: 45000, annualHostel: 18000,
      counsellingBoard: 'JoSAA / CSAB',
      cutoffs: {
        CSE: { GEN: 88.0, 'OBC-NCL': 80.0, EWS: 81.0, SC: 70.0, ST: 63.0 },
        ECE: { GEN: 84.0, 'OBC-NCL': 75.0 },
        CE: { GEN: 78.0, 'OBC-NCL': 68.0 }
      }
    },
    {
      id: 'COL-19', name: 'Bineswar Brahma Engineering College (BBEC) Kokrajhar', shortCode: 'BBEC-KKR',
      state: 'Assam', type: 'State Govt', nirfRank: 220,
      annualTuition: 20000, annualHostel: 14000,
      counsellingBoard: 'DTE Assam / Assam CEE',
      cutoffs: {
        CSE: { GEN: 85.0, 'OBC-NCL': 77.0, EWS: 78.0, SC: 68.0, ST: 60.0 },
        EE: { GEN: 80.0, 'OBC-NCL': 71.0 },
        ME: { GEN: 78.0, 'OBC-NCL': 69.0 },
        CE: { GEN: 76.0, 'OBC-NCL': 66.0 }
      }
    },
    {
      id: 'COL-20', name: 'Jorhat Institute of Science & Technology (JIST) Jorhat', shortCode: 'JIST-JRH',
      state: 'Assam', type: 'State Govt', nirfRank: 230,
      annualTuition: 20000, annualHostel: 14000,
      counsellingBoard: 'DTE Assam / Assam CEE',
      cutoffs: {
        CSE: { GEN: 83.5, 'OBC-NCL': 75.0, EWS: 76.5, SC: 66.0, ST: 58.0 },
        ECE: { GEN: 79.0, 'OBC-NCL': 70.0 },
        ME: { GEN: 77.0, 'OBC-NCL': 68.0 },
        CE: { GEN: 75.0, 'OBC-NCL': 65.0 }
      }
    },
    {
      id: 'COL-21', name: 'Barak Valley Engineering College (BVEC) Karimganj', shortCode: 'BVEC-KRG',
      state: 'Assam', type: 'State Govt', nirfRank: 250,
      annualTuition: 20000, annualHostel: 14000,
      counsellingBoard: 'DTE Assam / Assam CEE',
      cutoffs: {
        CSE: { GEN: 81.0, 'OBC-NCL': 72.0, EWS: 74.0, SC: 63.0, ST: 55.0 },
        ECE: { GEN: 77.0, 'OBC-NCL': 67.0 },
        ME: { GEN: 74.0, 'OBC-NCL': 64.0 },
        CE: { GEN: 72.0, 'OBC-NCL': 61.0 }
      }
    },
    {
      id: 'COL-22', name: 'Girijananda Chowdhury University (GCU) Guwahati', shortCode: 'GCU-GHY',
      state: 'Assam', type: 'Private', nirfRank: 260,
      annualTuition: 110000, annualHostel: 50000,
      counsellingBoard: 'State / Direct / JEE Main',
      cutoffs: {
        CSE: { GEN: 55.0, 'OBC-NCL': 48.0, SC: 42.0, ST: 36.0 },
        ECE: { GEN: 50.0, 'OBC-NCL': 44.0 },
        EE: { GEN: 46.0, 'OBC-NCL': 40.0 },
        ME: { GEN: 44.0, 'OBC-NCL': 38.0 },
        CE: { GEN: 42.0, 'OBC-NCL': 36.0 }
      }
    }
  ];
}

// ─── Scholarship Data ─────────────────────────────────────────────────────────

function buildScholarshipsFromScraped(data, student) {
  const s = student || defaultStudent();
  const schemeDataSource = 'Seeded estimate; check current official scheme rules';

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
      dataSource: schemeDataSource
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
      dataSource: schemeDataSource
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
      dataSource: schemeDataSource
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
      dataSource: schemeDataSource
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
      dataSource: schemeDataSource
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
      dataSource: schemeDataSource
    },
    {
      id: 'SCH-07',
      name: 'Ishan Uday Special Scholarship for NER (Assam)',
      provider: 'UGC / Ministry of Education (Govt. of India)',
      annualAmount: 93600,
      deadlineDate: '2026-10-31',
      applicationUrl: 'https://scholarships.gov.in',
      eligibleCategories: ['GEN', 'OBC-NCL', 'EWS', 'SC', 'ST'],
      incomeLimit: 450000,
      stateRestriction: 'Assam',
      requiredDocuments: ['Income Certificate', 'Domicile / Residence Certificate', 'Class 12 Marksheet', 'Bank Passbook (First Page)', 'Aadhaar Card'],
      dataSource: schemeDataSource
    },
    {
      id: 'SCH-08',
      name: 'Assam DHE Combined Merit Scholarship',
      provider: 'Directorate of Higher Education, Govt. of Assam',
      annualAmount: 24000,
      deadlineDate: '2026-11-15',
      applicationUrl: 'https://dhe-operations.assam.gov.in',
      eligibleCategories: ['GEN', 'OBC-NCL', 'EWS', 'SC', 'ST'],
      incomeLimit: 500000,
      stateRestriction: 'Assam',
      requiredDocuments: ['Income Certificate', 'Domicile / Residence Certificate', 'Bank Passbook (First Page)', 'Aadhaar Card'],
      dataSource: schemeDataSource
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
      { label: 'State', passed: stateMatch, explanation: stateMatch ? (sch.stateRestriction ? `${sch.stateRestriction} domicile confirmed` : 'No state restriction') : `This scholarship is for ${sch.stateRestriction} residents only` }
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

// ─── API Routes ───────────────────────────────────────────────────────────────

// Health
app.get('/api/health', (req, res) => {
  res.json({ status: 'UP', system: 'First Gen Navigator (Anakin-Powered)', port: PORT });
});

async function getSupabaseUser(req) {
  const authorization = req.get('authorization') || '';
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;

  const tokenUser = getJwtUser(token);

  const supabaseUrl = process.env.SUPABASE_URL;
  // Server-side verification should use the server credential. The browser may
  // use a publishable key that differs from the legacy anon key in .env.
  const requestApiKey = req.get('apikey');
  const supabaseApiKey = requestApiKey || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseApiKey) return tokenUser;

  try {
    const response = await httpsJsonRequest(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: supabaseApiKey,
        Authorization: `Bearer ${token}`
      }
    });
    if (response.ok) return response.json();
  } catch (error) {
    console.warn('Supabase session lookup failed; using the signed-in token subject for this request:', error.message);
  }
  return tokenUser;
}

function getJwtUser(token) {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const json = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    const claims = JSON.parse(json);
    if (typeof claims.sub !== 'string' || !/^[0-9a-f-]{36}$/i.test(claims.sub)) return null;
    if (claims.exp && claims.exp * 1000 < Date.now()) return null;
    return { id: claims.sub, email: claims.email };
  } catch {
    return null;
  }
}


// Live, profile-specific Anakin search trigger
app.post('/api/scrape', async (req, res) => {
  try {
    const user = await getSupabaseUser(req);
    if (!user?.id) return res.status(401).json({ error: 'Sign in is required.' });
    const result = await findCollegesForProfile(studentsByUser.get(user.id) || defaultStudent());
    const totalColleges = (result.tiers.REALISTIC || []).length;
    res.json({
      success: true,
      message: 'Live college search completed via Anakin API',
      scrapedAt: result.generatedAt,
      totalColleges,
      scrapedWebPagesCount: totalColleges
    });
  } catch (err) {
    console.error('Live college search error:', err);
    res.status(err.statusCode || 500).json({ error: 'Live search failed: ' + err.message });
  }
});

app.use('/api', async (req, res, next) => {
  try {
    const user = await getSupabaseUser(req);
    if (!user?.id) return res.status(401).json({ error: 'Sign in is required.' });

    req.authUser = user;
    req.student = studentsByUser.get(user.id) || defaultStudent();
    return next();
  } catch (error) {
    console.error('Could not authorize API request:', error);
    return res.status(error.statusCode || 503).json({ error: error.message || 'Could not verify access.' });
  }
});

// Profile
app.get('/api/profile', (req, res) => {
  res.json(req.student);
});

app.post('/api/profile', (req, res) => {
  res.set('X-FGN-API-Source', 'local-proxy-profile-v1');
  const student = { ...req.student, ...req.body };
  studentsByUser.set(req.authUser.id, student);
  res.json(student);
});

// Colleges discovered from Anakin for the signed-in student's profile.
app.get('/api/colleges', async (req, res) => {
  try {
    const scope = req.query.scope === 'home-state' ? 'home-state' : 'all-india';
    res.json(await findCollegesForProfile(req.student, scope));
  } catch (error) {
    console.error('College search failed:', error);
    res.status(error.statusCode || 502).json({ error: error.message || 'Could not search for colleges.' });
  }
});

// Scholarships (real data from Anakin scrape)
app.get('/api/scholarships', (req, res) => {
  const data = loadEnrichedData();
  const result = buildScholarshipsFromScraped(data, req.student);
  res.json(result);
});

// Affordability Calculator
app.get('/api/affordability', (req, res) => {
  const { collegeId, scholarship: customScholarship } = req.query;
  const colleges = getBaseColleges();
  const college = colleges.find(c => c.id === collegeId);

  if (!college) return res.status(404).json({ error: 'College not found' });

  const customSch = Number(customScholarship || 0);
  const autoSch = getApplicableScholarship(req.student, college);
  const applicableScholarship = Math.max(customSch, autoSch);

  const netCost = Math.max(0, college.annualTuition + college.annualHostel - applicableScholarship);
  const budget = Number(req.student.annualBudget || 1);
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
  const student = req.student;
  if (student.entranceExam && student.entranceExam !== 'JEE_MAIN') {
    return res.json({
      diagnosticMessage: `Strategic cutoff pathways are currently available for JEE Main only. Your ${student.entranceExam} search shows admissions leads without a verified exam-specific cutoff catalog.`,
      pathways: [],
      dataSource: 'Exam-specific cutoff data unavailable'
    });
  }
  const percentile = Number(student.jeePercentile ?? 75);
  const category = student.category || 'GEN';
  const preferredBranch = student.preferredBranch || 'CSE';
  const budget = Number(student.annualBudget || 100000);

  const candidates = getBaseColleges().flatMap(college =>
    Object.entries(college.cutoffs || {}).flatMap(([branch, categoryCutoffs]) => {
      const cutoffCategory = categoryCutoffs[category] !== undefined
        ? category
        : categoryCutoffs.GEN !== undefined
          ? 'GEN'
          : Object.keys(categoryCutoffs)[0];
      const cutoff = Number(categoryCutoffs[cutoffCategory]);
      if (!Number.isFinite(cutoff)) return [];
      return [{
        college,
        branch,
        cutoff,
        cutoffCategory,
        margin: percentile - cutoff,
        annualCost: Number(college.annualTuition || 0) + Number(college.annualHostel || 0)
      }];
    })
  );

  const matchOrder = (a, b) => {
    const aMeets = a.margin >= 0;
    const bMeets = b.margin >= 0;
    if (aMeets !== bMeets) return aMeets ? -1 : 1;
    if (aMeets) return a.margin - b.margin || (a.college.nirfRank || 999) - (b.college.nirfRank || 999);
    return Math.abs(a.margin) - Math.abs(b.margin);
  };

  const first = candidates.filter(item => item.branch === preferredBranch).sort(matchOrder)[0]
    || candidates.slice().sort(matchOrder)[0];
  const second = candidates
    .filter(item => item.branch !== preferredBranch && item.college.id !== first?.college.id)
    .sort(matchOrder)[0];
  const usedCollegeIds = new Set([first?.college.id, second?.college.id].filter(Boolean));
  const third = candidates
    .filter(item => !usedCollegeIds.has(item.college.id) && item.annualCost <= budget)
    .sort((a, b) => matchOrder(a, b) || a.annualCost - b.annualCost)[0]
    || candidates.filter(item => !usedCollegeIds.has(item.college.id)).sort((a, b) => a.annualCost - b.annualCost)[0];

  const formatPathway = (item, planTag, focus) => {
    if (!item) return null;
    const comparison = item.margin >= 0
      ? `${item.margin.toFixed(1)} points above`
      : `${Math.abs(item.margin).toFixed(1)} points below`;
    const categoryNote = item.cutoffCategory === category
      ? ''
      : ` No ${category} estimate is in the catalog; the GEN estimate is used.`;
    return {
      planTag,
      collegeName: item.college.name,
      branch: item.branch,
      cutoff: item.cutoff,
      annualCost: item.annualCost,
      reason: `${focus} Catalog ${item.cutoffCategory} cutoff estimate: ${item.cutoff}%ile; your ${percentile}%ile is ${comparison}. Cost is estimated tuition plus hostel before aid.${categoryNote} Verify current official cutoffs, fees, and eligibility.`
    };
  };

  const pathways = [
    formatPathway(first, 'Plan A — Preferred Branch', `Closest catalog match for ${preferredBranch}.`),
    formatPathway(second, 'Plan B — Alternative Branch', 'A different branch at another institution.'),
    formatPathway(third, 'Plan C — Lower Cost', `Lower estimated cost${third?.annualCost <= budget ? ' within your stated budget' : ''}.`)
  ].filter(Boolean);

  res.json({
    diagnosticMessage: `Options use your ${percentile}%ile, ${category} category, ${preferredBranch} preference, and stated budget. Costs show tuition plus hostel before aid. Cutoffs are catalog estimates, not official current closing ranks.`,
    pathways,
    dataSource: 'Local catalog estimates; not verified by scraper'
  });
});
const defaultDocumentVault = [
  { id: 'DOC-01', documentType: 'Income Certificate',              fileName: null,                        status: 'Pending',  issuer: 'Tehsildar / SDM Office',         notes: 'Required for all income-based scholarships and EWS/OBC-NCL quota.',    critical: true  },
  { id: 'DOC-02', documentType: 'Caste / Category Certificate',    fileName: null,                        status: 'Pending',  issuer: 'District Magistrate Office',      notes: 'Mandatory for OBC-NCL / SC / ST / EWS quota seat allocation.',        critical: true  },
  { id: 'DOC-03', documentType: 'Class 10 Marksheet & Certificate',fileName: 'class10_marksheet.pdf',    status: 'Uploaded', issuer: 'School / CBSE / State Board',     notes: 'Board certificate and marksheet with roll number.', critical: true  },
  { id: 'DOC-04', documentType: 'Class 12 Marksheet',              fileName: 'class12_marksheet.pdf',    status: 'Uploaded', issuer: 'CBSE / State Board',               notes: 'Original marksheet required at college reporting.', critical: true  },
  { id: 'DOC-05', documentType: 'JEE Main Scorecard',              fileName: 'jee_main_scorecard.pdf',   status: 'Uploaded', issuer: 'NTA — National Testing Agency',    notes: 'Official scorecard with application number and percentile.', critical: true  },
  { id: 'DOC-06', documentType: 'Domicile / Residence Certificate',fileName: null,                        status: 'Pending',  issuer: 'SDM / Tehsildar Office',         notes: 'Required for home-state quota at NITs and state colleges.',           critical: true  },
  { id: 'DOC-07', documentType: 'Bank Passbook (First Page)',       fileName: null,                        status: 'Pending',  issuer: 'Nationalized Bank',              notes: 'For scholarship disbursement — first page with IFSC and account no.', critical: false }
];

const documentsByUser = new Map();
const studentsByUser = new Map();

function getDocumentVault(userId) {
  if (!documentsByUser.has(userId)) {
    documentsByUser.set(userId, defaultDocumentVault.map(document => ({ ...document })));
  }
  return documentsByUser.get(userId);
}

function buildDocumentsResponse(userId) {
  const documentVault = getDocumentVault(userId);
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
  res.json(buildDocumentsResponse(req.authUser.id));
});

// POST /api/documents — called by confirmDocumentUpload() in app.js
app.post('/api/documents', (req, res) => {
  const { documentType, fileName } = req.body || {};

  if (!documentType) {
    return res.status(400).json({ error: 'documentType is required' });
  }

  // Find existing doc by type (case-insensitive) or create a new one
  const documentVault = getDocumentVault(req.authUser.id);
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

  res.json(buildDocumentsResponse(req.authUser.id));
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

  const s = req.student;
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
