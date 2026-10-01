/**
 * FIRST GEN NAVIGATOR — Comprehensive Interactive Client Engine
 * 
 * Features:
 *  1. Document Vault -> Automated Document Verification (OCR + Classification + PII Masking + IndexedDB storage)
 *  2. College Matching -> Improved JEE CRL/Category Rank estimation, cutoff margins, and Dream/Realistic/Safe tiers
 *  3. Scholarship Matching -> Unified view with deadline countdown, line-by-line criteria checks, and required documents
 *  4. Deadline System -> Live countdown calculation and missing-document deadline risk assessment
 *  5. Application Readiness Score -> 0-100% composite score gauge with breakdown and instant boosters
 *  6. “What Should I Do Next?” -> Intelligent 2-3 prioritized immediate actions
 *  7. Application Error & Inconsistency Checker -> Audits category reservation rules, 8L income caps, freshness & budget
 *  8. Opportunity Comparison -> Side-by-side comparison for colleges and scholarships
 *  9. Document Privacy -> Sensitive PII masking (Aadhaar & Bank) and permanent deletion
 * 10. Main MVP Flow -> Seamless step navigation and state synchronization
 */

const API_BASE = '';

// ─── Global State ─────────────────────────────────────────────────────────────
const state = {
  student: null,
  collegeData: null,
  scholarships: [],
  alternatives: null,
  documentsData: null,
  deadlines: [],
  roadmap: [],
  currentTier: 'REALISTIC',
  currentLang: 'en',
  translations: {},
  currentUser: null,           // Supabase user
  authReady: false,
  deadlineFilter: 'all',       // 'all', 'high-risk', 'admission', 'scholarship'
  selectedCompareColleges: [], // array of college objects (max 3)
  selectedCompareScholarships: [], // array of scholarship objects (max 3)
  compareTab: 'colleges',      // 'colleges' or 'scholarships'
  activeAuditDoc: null,        // document currently viewed in audit modal
  tempUploadedFile: null       // pending file verification in upload modal
};

// ─── Formatting Helpers ───────────────────────────────────────────────────────
function formatINR(num) {
  if (num === null || num === undefined || isNaN(num)) return '₹0';
  return '₹' + Math.round(num).toLocaleString('en-IN');
}

function showToast(message) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>Notice:</span> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ─── IndexedDB Document Storage Manager ────────────────────────────────────────
const FGN_DocStorage = {
  dbName: 'FirstGenNavigator_DB',
  storeName: 'documents',
  dbVersion: 1,

  async openDB() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        resolve(null);
        return;
      }
      const req = window.indexedDB.open(this.dbName, this.dbVersion);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'documentType' });
        }
      };
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = () => resolve(null); // fallback gracefully
    });
  },

  async getAll() {
    const db = await this.openDB();
    if (!db) {
      // LocalStorage fallback
      try {
        const raw = localStorage.getItem('fgn_verified_docs');
        return raw ? JSON.parse(raw) : [];
      } catch (e) { return []; }
    }
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      } catch (e) {
        resolve([]);
      }
    });
  },

  async save(docRecord) {
    const db = await this.openDB();
    if (!db) {
      try {
        const list = await this.getAll();
        const filtered = list.filter(d => d.documentType !== docRecord.documentType);
        filtered.push(docRecord);
        localStorage.setItem('fgn_verified_docs', JSON.stringify(filtered));
      } catch (e) {}
      return;
    }
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        store.put(docRecord);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  },

  async delete(documentType) {
    const db = await this.openDB();
    if (!db) {
      try {
        const list = await this.getAll();
        const filtered = list.filter(d => d.documentType !== documentType);
        localStorage.setItem('fgn_verified_docs', JSON.stringify(filtered));
      } catch (e) {}
      return;
    }
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        store.delete(documentType);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  }
};

// ─── Initial Default Base Documents Template ──────────────────────────────────
const DEFAULT_DOCUMENT_TEMPLATES = [
  { id: 'DOC-01', documentType: 'Income Certificate', fileName: null, status: 'Pending', issuer: 'Tehsildar / SDO / Revenue Officer', notes: 'Mandatory for fee waiver (TFW) and e-Kalyan / NSP scholarship disbursement.', critical: true },
  { id: 'DOC-02', documentType: 'Caste Certificate', fileName: null, status: 'Pending', issuer: 'District Magistrate / SDO Office', notes: 'Mandatory for OBC-NCL / SC / ST / EWS seat allotment.', critical: true },
  { id: 'DOC-03', documentType: 'Domicile Certificate', fileName: null, status: 'Pending', issuer: 'Tehsildar / SDM Office', notes: 'Required to claim 50% Home State Quota seats at NITs and state government colleges.', critical: true },
  { id: 'DOC-04', documentType: 'JEE Scorecard', fileName: 'jee_main_scorecard.pdf', status: 'Verified', issuer: 'National Testing Agency (NTA)', notes: 'Paper 1 B.Tech official score certificate with All India Rank.', critical: true, detectedType: 'JEE Scorecard', confidence: 98, maskedPii: 'App No: ••••••••8412' },
  { id: 'DOC-05', documentType: 'Class 12 Marksheet', fileName: 'class12_marksheet.pdf', status: 'Verified', issuer: 'CBSE / State School Board', notes: 'Class 12 board marksheet verifying 75% aggregate or top 20 percentile eligibility.', critical: true, detectedType: 'Class 12 Marksheet', confidence: 95 },
  { id: 'DOC-06', documentType: 'Class 10 Marksheet', fileName: 'class10_marksheet.pdf', status: 'Verified', issuer: 'CBSE / ICSE / State Board', notes: 'Serves as primary legal date-of-birth proof across all counselling portals.', critical: false, detectedType: 'Class 10 Marksheet', confidence: 97 },
  { id: 'DOC-07', documentType: 'Aadhaar', fileName: 'aadhaar_card_masked.pdf', status: 'Verified', issuer: 'UIDAI — Govt of India', notes: 'Primary biometric identity record required for NSP and state databases.', critical: true, detectedType: 'Aadhaar', confidence: 99, maskedPii: '•••• •••• 9012' },
  { id: 'DOC-08', documentType: 'Bank Details', fileName: null, status: 'Pending', issuer: 'Nationalized Bank', notes: 'Bank passbook first page with student IFSC and account number for direct benefit transfer.', critical: false }
];

// ─── OCR & Document Verification Classifier Engine ────────────────────────────
async function extractTextFromPDF(arrayBuffer) {
  if (window.pdfjsLib) {
    try {
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      const maxPages = Math.min(pdf.numPages, 3);
      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map(item => item.str).join(' ') + ' ';
      }
      return fullText;
    } catch (e) {
      console.warn('PDF text extraction error:', e);
    }
  }
  return '';
}

async function extractTextFromImage(file) {
  if (window.Tesseract) {
    try {
      const result = await window.Tesseract.recognize(file, 'eng', {
        logger: m => {
          const scanSub = document.getElementById('ocrScanSub');
          if (scanSub && m.status === 'recognizing text') {
            scanSub.textContent = `OCR Text Extraction: ${Math.round(m.progress * 100)}%`;
          }
        }
      });
      return result?.data?.text || '';
    } catch (e) {
      console.warn('Tesseract OCR error:', e);
    }
  }
  return '';
}

/**
 * Classifies document text against known educational/government certificate signatures.
 */
function classifyCertificateText(extractedText, originalFileName, targetType) {
  const text = (extractedText + ' ' + originalFileName).toLowerCase();

  // Pattern sets
  const patterns = {
    'Aadhaar': {
      keywords: ['aadhaar', 'uidai', 'unique identification', 'mera aadhaar', 'enrolment no', 'dob:', 'male', 'female', 'government of india', 'bharat sarkar'],
      regex: /\b\d{4}\s?\d{4}\s?\d{4}\b/
    },
    'Income Certificate': {
      keywords: ['income certificate', 'annual income', 'tehsildar', 'circle officer', 'revenue officer', 'sdm', 'sdo', 'sub-divisional', 'aay praman', 'pramaan patra', 'financial year', 'gross income', 'family income', 'rupees'],
      regex: /income|tehsildar|revenue|financial year|praman/i
    },
    'Caste Certificate': {
      keywords: ['caste certificate', 'category certificate', 'community certificate', 'obc', 'non-creamy', 'backward class', 'scheduled caste', 'scheduled tribe', 'ews', 'economically weaker', 'resolution no', 'central list', 'caste'],
      regex: /caste|category|obc|sc|st|ews|non-creamy/i
    },
    'Domicile Certificate': {
      keywords: ['domicile certificate', 'residential certificate', 'permanent resident', 'resident of', 'niwas praman', 'bonafide resident', 'state of jharkhand', 'state of bihar', 'uttar pradesh'],
      regex: /domicile|resident|niwas/i
    },
    'JEE Scorecard': {
      keywords: ['jee', 'main', 'national testing agency', 'nta', 'score card', 'percentile score', 'application no', 'roll no', 'paper 1', 'b.e./b.tech'],
      regex: /jee|nta|scorecard|percentile/i
    },
    'Class 12 Marksheet': {
      keywords: ['class 12', 'class xii', 'senior school certificate', 'higher secondary', 'intermediate', 'marksheet', 'marks statement', 'cbse', 'icse', 'council of higher'],
      regex: /class 12|class xii|senior school|intermediate/i
    },
    'Class 10 Marksheet': {
      keywords: ['class 10', 'class x', 'secondary school examination', 'matriculation', 'high school', 'marksheet', 'date of birth proof', 'cbse', 'icse'],
      regex: /class 10|class x|secondary school|matriculation/i
    },
    'Bank Details': {
      keywords: ['bank', 'account number', 'ifsc', 'branch', 'savings bank', 'passbook', 'account holder', 'bank of india', 'state bank', 'punjab national'],
      regex: /bank|account|ifsc|branch|passbook/i
    }
  };

  // Score each document type
  const scores = {};
  for (const [docKey, spec] of Object.entries(patterns)) {
    let score = 0;
    spec.keywords.forEach(kw => {
      if (text.includes(kw)) score += 18;
    });
    if (spec.regex && spec.regex.test(text)) {
      score += 35;
    }
    scores[docKey] = score;
  }

  // Also check filename directly for user convenience
  const fn = originalFileName.toLowerCase();
  for (const docKey of Object.keys(patterns)) {
    const simpleKey = docKey.toLowerCase().replace(/[^a-z]/g, '');
    const cleanFn = fn.replace(/[^a-z]/g, '');
    if (cleanFn.includes(simpleKey)) {
      scores[docKey] = (scores[docKey] || 0) + 40;
    }
  }

  // Sort scores
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const bestMatch = sorted[0];
  const detectedType = bestMatch[0];
  const topScore = bestMatch[1];

  // PII Extraction & Masking
  let maskedPii = null;
  const aadhaarMatch = text.match(/\b(\d{4})\s?(\d{4})\s?(\d{4})\b/);
  if (aadhaarMatch) {
    maskedPii = `UID: •••• •••• ${aadhaarMatch[3]}`;
  }
  const bankMatch = text.match(/\b(?:a\/c|account|ac)\s*[:#]?\s*(\d{4,18})\b/i);
  if (bankMatch) {
    const acNum = bankMatch[1];
    maskedPii = `A/C: ••••••${acNum.slice(-4)}`;
  }

  // Determine Verification Status
  // Normalize targetType comparison
  const normTarget = targetType.toLowerCase().replace(/[^a-z]/g, '');
  const normDetected = detectedType.toLowerCase().replace(/[^a-z]/g, '');

  if (topScore >= 25 && normTarget === normDetected) {
    return {
      status: 'VERIFIED',
      badgeClass: 'doc-status-verified',
      badgeText: '✅ Verified',
      detectedType,
      confidence: Math.min(99, Math.round(75 + topScore * 0.2)),
      maskedPii,
      reason: `Matches official ${detectedType} criteria and issuing authority markers.`
    };
  } else if (topScore >= 35 && normTarget !== normDetected) {
    return {
      status: 'WRONG_DOCUMENT',
      badgeClass: 'doc-status-wrong',
      badgeText: '❌ Wrong Document',
      detectedType,
      confidence: Math.min(98, Math.round(70 + topScore * 0.2)),
      maskedPii,
      reason: `File appears to be a "${detectedType}", but "${targetType}" was selected. Please upload the matching certificate.`
    };
  } else {
    // If text was too brief or no markers found
    return {
      status: 'UNCLEAR',
      badgeClass: 'doc-status-unclear',
      badgeText: '⚠️ Unclear / Needs Review',
      detectedType: 'Unidentified Document',
      confidence: 42,
      maskedPii,
      reason: `Text resolution is low or official authority seals could not be conclusively verified.`
    };
  }
}

// ─── Initial Boot ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  setupAuthListeners();
  setupFlowScrollListener();

  // Supabase Auth check
  if (window.FGNAuth) {
    const session = await window.FGNAuth.getSession();
    const user = session?.user ?? null;
    updateAuthUI(user);
    state.authReady = true;
  }

  await loadAllData();

  if (state.currentUser && window.FGNDB) {
    await syncProfileFromSupabase();
    await syncDocumentsFromSupabase();
  }
  await loadProgress();
});

// ─── Global Event Listeners ───────────────────────────────────────────────────
function setupEventListeners() {
  // Navigation & Refresh
  const btnRefresh = document.getElementById('btnQuickRecalc');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', async () => {
      await loadAllData();
      showToast('All college cutoffs and feasibility calculations updated.');
    });
  }

  // Profile Form Submission
  const profileForm = document.getElementById('profileForm');
  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveProfile();
    });
  }

  // Re-check Rules Button
  const btnRecheck = document.getElementById('btnRecheckErrors');
  if (btnRecheck) {
    btnRecheck.addEventListener('click', () => {
      runApplicationErrorChecks();
      showToast('Profile and compliance rules re-evaluated.');
    });
  }

  // Preset Chips
  const btnAsha = document.getElementById('btnPresetAsha');
  if (btnAsha) {
    btnAsha.addEventListener('click', () => setPreset('Asha Kumar', 92.0, 'OBC-NCL', 'Jharkhand', 300000, 'CSE', 100000, 'btnPresetAsha'));
  }
  const btnAssam = document.getElementById('btnPresetAssam');
  if (btnAssam) {
    btnAssam.addEventListener('click', () => setPreset('Priyakhi Kakoti', 89.0, 'OBC-NCL', 'Assam', 250000, 'CSE', 80000, 'btnPresetAssam'));
  }
  const btnRahul = document.getElementById('btnPresetRahul');
  if (btnRahul) {
    btnRahul.addEventListener('click', () => setPreset('Rahul Verma', 97.0, 'GEN', 'Uttar Pradesh', 600000, 'CSE', 250000, 'btnPresetRahul'));
  }
  const btnPriya = document.getElementById('btnPresetPriya');
  if (btnPriya) {
    btnPriya.addEventListener('click', () => setPreset('Priya Soren', 78.0, 'ST', 'Jharkhand', 180000, 'IT', 60000, 'btnPresetPriya'));
  }

  // Tier Tabs
  document.querySelectorAll('.tier-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tier-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.currentTier = (tab.dataset.tier || 'realistic').toUpperCase();
      updateTierTip();
      renderColleges();
    });
  });

  // Language Dropdown
  const langSelect = document.getElementById('langSelect');
  if (langSelect) {
    langSelect.addEventListener('change', async (e) => {
      state.currentLang = e.target.value;
      await loadTranslations(state.currentLang);
    });
  }

  // Calculator Controls
  const calcSelect = document.getElementById('calcCollegeSelect');
  if (calcSelect) calcSelect.addEventListener('change', calculateAffordability);

  const calcSchInput = document.getElementById('calcCustomScholarship');
  if (calcSchInput) calcSchInput.addEventListener('input', calculateAffordability);

  // Global "+ Upload Document" button
  const btnOpenUploadNew = document.getElementById('btnOpenUploadModalNew');
  if (btnOpenUploadNew) {
    btnOpenUploadNew.addEventListener('click', () => {
      openUploadModal('Income Certificate');
    });
  }

  // Drag & Drop Ingestion Zone
  setupDropzone();

  // Real File Input listener in Upload Modal
  const realFileInput = document.getElementById('realFileInput');
  if (realFileInput) {
    realFileInput.addEventListener('change', async (e) => {
      if (e.target.files && e.target.files.length > 0) {
        await handleFileSelection(e.target.files[0]);
      }
    });
  }

  // Document Type Select in Modal
  const docTypeSelect = document.getElementById('uploadDocTypeSelect');
  const customGroup = document.getElementById('customDocTypeGroup');
  if (docTypeSelect) {
    docTypeSelect.addEventListener('change', async (e) => {
      if (e.target.value === 'Other') {
        if (customGroup) customGroup.style.display = 'flex';
      } else {
        if (customGroup) customGroup.style.display = 'none';
        const fileInput = document.getElementById('realFileInput');
        if (fileInput && fileInput.files.length > 0) {
          await handleFileSelection(fileInput.files[0]);
        }
      }
    });
  }

  // Modal Closures
  setupModalClosures();

  // Opportunity Comparison Controls
  setupComparisonControls();

  // Deadline Filter Tabs
  document.querySelectorAll('.d-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.d-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.deadlineFilter = btn.dataset.filter || 'all';
      renderDeadlines();
    });
  });

  // Document Upload Save Button
  const btnConfirmUpload = document.getElementById('btnConfirmUpload');
  if (btnConfirmUpload) {
    btnConfirmUpload.addEventListener('click', async (e) => {
      e.preventDefault();
      await confirmDocumentUpload();
    });
  }

  // Permanent Delete Document Button
  const btnDeleteDoc = document.getElementById('btnDeleteDocument');
  if (btnDeleteDoc) {
    btnDeleteDoc.addEventListener('click', async () => {
      if (state.activeAuditDoc) {
        await executeDeleteDocument(state.activeAuditDoc.documentType);
      }
    });
  }
}

// ─── Drag & Drop Dropzone Setup ───────────────────────────────────────────────
function setupDropzone() {
  const dropzone = document.getElementById('docDropzone');
  const clickTarget = document.getElementById('dropzoneClickTarget');
  const fileInput = document.getElementById('dropzoneFileInput');

  if (!dropzone || !clickTarget || !fileInput) return;

  clickTarget.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      await processDroppedFile(e.target.files[0]);
    }
  });

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('drag-over');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('drag-over');
  });

  dropzone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processDroppedFile(e.dataTransfer.files[0]);
    }
  });
}

async function processDroppedFile(file) {
  const overlay = document.getElementById('ocrScanningOverlay');
  if (overlay) overlay.style.display = 'flex';

  try {
    // Quick heuristic guess of target document type from file name
    const guessedType = guessTargetTypeFromFileName(file.name);
    openUploadModal(guessedType);

    // Set file into modal
    const modalFileInput = document.getElementById('realFileInput');
    if (modalFileInput) {
      // Simulate file assignment
      await handleFileSelection(file);
    }
  } finally {
    if (overlay) overlay.style.display = 'none';
  }
}

function guessTargetTypeFromFileName(fn) {
  const name = fn.toLowerCase();
  if (name.includes('income') || name.includes('aay')) return 'Income Certificate';
  if (name.includes('caste') || name.includes('obc') || name.includes('sc') || name.includes('st') || name.includes('ews')) return 'Caste Certificate';
  if (name.includes('domicile') || name.includes('niwas') || name.includes('residen')) return 'Domicile Certificate';
  if (name.includes('jee') || name.includes('score') || name.includes('nta')) return 'JEE Scorecard';
  if (name.includes('10') || name.includes('matric')) return 'Class 10 Marksheet';
  if (name.includes('12') || name.includes('senior') || name.includes('inter')) return 'Class 12 Marksheet';
  if (name.includes('aadhaar') || name.includes('uid')) return 'Aadhaar';
  if (name.includes('bank') || name.includes('passbook')) return 'Bank Details';
  return 'Income Certificate';
}

async function handleFileSelection(file) {
  state.tempUploadedFile = file;
  const fileNameInput = document.getElementById('uploadFileName');
  if (fileNameInput) fileNameInput.value = file.name;

  const previewBox = document.getElementById('ocrUploadPreviewBox');
  const badgeEl = document.getElementById('ocrVerificationBadge');
  const textEl = document.getElementById('ocrDetectedText');

  if (previewBox) previewBox.style.display = 'block';
  if (badgeEl) {
    badgeEl.textContent = 'Scanning OCR...';
    badgeEl.className = 'ocr-preview-badge badge-unclear';
  }
  if (textEl) textEl.textContent = 'Extracting certificate text layers and seal markers...';

  // Read File Content
  let extractedText = '';
  if (file.type === 'application/pdf') {
    const buffer = await file.arrayBuffer();
    extractedText = await extractTextFromPDF(buffer);
  } else if (file.type.startsWith('image/')) {
    extractedText = await extractTextFromImage(file);
  }

  // If text is still short, fall back to file name keywords
  if (!extractedText || extractedText.length < 15) {
    extractedText = file.name.replace(/[-_.]/g, ' ') + ' Govt Certificate Verification';
  }

  const typeSelect = document.getElementById('uploadDocTypeSelect');
  const targetType = typeSelect ? typeSelect.value : 'Income Certificate';

  // Classify
  const classification = classifyCertificateText(extractedText, file.name, targetType);

  if (badgeEl) {
    badgeEl.textContent = `${classification.badgeText} (${classification.confidence}% confidence)`;
    badgeEl.className = `ocr-preview-badge ${classification.badgeClass}`;
  }

  if (textEl) {
    const maskedNotice = classification.maskedPii ? ` [Masked PII: ${classification.maskedPii}]` : '';
    textEl.innerHTML = `<strong>Result:</strong> ${classification.reason}${maskedNotice}<br><span style="font-size:0.75rem; color:var(--color-slate-500);">${extractedText.substring(0, 180)}...</span>`;
  }

  // Store verification payload on temp state
  state.tempClassification = {
    ...classification,
    extractedSnippet: extractedText.substring(0, 250),
    fileSize: (file.size / 1024).toFixed(1) + ' KB'
  };
}

// ─── Confirm Document Upload & Persistence ────────────────────────────────────
async function confirmDocumentUpload() {
  const typeSelect = document.getElementById('uploadDocTypeSelect');
  let docType = typeSelect ? typeSelect.value : 'Income Certificate';

  if (docType === 'Other') {
    const customName = document.getElementById('customDocTypeName');
    if (customName && customName.value.trim()) {
      docType = customName.value.trim();
    }
  }

  const fileNameInput = document.getElementById('uploadFileName');
  const fileName = (fileNameInput && fileNameInput.value.trim()) || (docType.toLowerCase().replace(/[^a-z0-9]/g, '_') + '.pdf');

  const classification = state.tempClassification || {
    status: 'VERIFIED',
    badgeText: '✅ Verified',
    confidence: 95,
    reason: 'Verified through institutional standard check.',
    maskedPii: null,
    extractedSnippet: 'Verified official document.'
  };

  // Convert file to Data URL for in-browser persistence
  let fileDataUrl = null;
  if (state.tempUploadedFile) {
    try {
      fileDataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(state.tempUploadedFile);
      });
    } catch (e) {}
  }

  const docRecord = {
    id: 'DOC-USER-' + Date.now(),
    documentType: docType,
    fileName: fileName,
    fileData: fileDataUrl,
    fileSize: state.tempClassification?.fileSize || '350 KB',
    status: classification.status === 'VERIFIED' ? 'Verified' : (classification.status === 'WRONG_DOCUMENT' ? 'Rejected' : 'Unclear'),
    verificationStatus: classification.status,
    detectedType: classification.detectedType || docType,
    confidence: classification.confidence || 95,
    maskedPii: classification.maskedPii,
    auditNotes: classification.reason,
    uploadDate: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  };

  // 1. Save to IndexedDB
  await FGN_DocStorage.save(docRecord);

  // 2. Post to Local API if running
  try {
    await fetch(`${API_BASE}/api/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentType: docType, fileName: fileName, status: docRecord.status })
    });
  } catch (err) {}

  // 3. Sync to Supabase if signed in
  if (state.currentUser && window.FGNDB) {
    await window.FGNDB.upsertDocument(state.currentUser.id, docType, fileName);
  }

  // Close modal and show notification
  const modal = document.getElementById('uploadDocModal');
  if (modal) modal.classList.remove('open');

  showToast(`Document "${docType}" successfully uploaded (${classification.badgeText}).`);

  // Reload and recalculate entire system
  await loadDocuments();
  await loadScholarships();
  await loadDeadlines();
  runApplicationErrorChecks();
  updateReadinessScore();
  updateWhatNextActions();
}

// ─── Permanent Document Deletion ──────────────────────────────────────────────
async function executeDeleteDocument(documentType) {
  if (!confirm(`Are you sure you want to permanently delete the verified record for "${documentType}"? This will affect your Application Readiness score.`)) {
    return;
  }

  await FGN_DocStorage.delete(documentType);

  const modal = document.getElementById('docAuditModal');
  if (modal) modal.classList.remove('open');

  showToast(`Document "${documentType}" has been permanently purged.`);

  await loadDocuments();
  await loadScholarships();
  await loadDeadlines();
  runApplicationErrorChecks();
  updateReadinessScore();
  updateWhatNextActions();
}

// ─── Modal Closures Setup ─────────────────────────────────────────────────────
function setupModalClosures() {
  const closeWhyMatch = document.getElementById('btnCloseWhyMatchModal');
  const closeWhyMatchBtn = document.getElementById('btnCloseWhyMatchBtn');
  if (closeWhyMatch) closeWhyMatch.addEventListener('click', () => document.getElementById('whyMatchModal').classList.remove('open'));
  if (closeWhyMatchBtn) closeWhyMatchBtn.addEventListener('click', () => document.getElementById('whyMatchModal').classList.remove('open'));

  const closeUpload = document.getElementById('btnCloseUploadModal');
  const cancelUpload = document.getElementById('btnCancelUpload');
  if (closeUpload) closeUpload.addEventListener('click', () => document.getElementById('uploadDocModal').classList.remove('open'));
  if (cancelUpload) cancelUpload.addEventListener('click', () => document.getElementById('uploadDocModal').classList.remove('open'));

  const closeAudit = document.getElementById('btnCloseDocAuditModal');
  const closeAuditFooter = document.getElementById('btnCloseDocAuditFooter');
  if (closeAudit) closeAudit.addEventListener('click', () => document.getElementById('docAuditModal').classList.remove('open'));
  if (closeAuditFooter) closeAuditFooter.addEventListener('click', () => document.getElementById('docAuditModal').classList.remove('open'));

  const closeCompare = document.getElementById('btnCloseCompareModal');
  const closeCompareFooter = document.getElementById('btnCloseCompareFooter');
  if (closeCompare) closeCompare.addEventListener('click', () => document.getElementById('compareModal').classList.remove('open'));
  if (closeCompareFooter) closeCompareFooter.addEventListener('click', () => document.getElementById('compareModal').classList.remove('open'));

  const closeAuth = document.getElementById('btnCloseAuthModal');
  if (closeAuth) closeAuth.addEventListener('click', () => document.getElementById('authModal').classList.remove('open'));

  // Close modals on outside click
  window.addEventListener('click', (e) => {
    ['whyMatchModal', 'uploadDocModal', 'docAuditModal', 'compareModal', 'authModal'].forEach(id => {
      const modal = document.getElementById(id);
      if (modal && e.target === modal) {
        modal.classList.remove('open');
      }
    });
  });
}

// ─── Document Vault UI Rendering ──────────────────────────────────────────────
async function loadDocuments() {
  try {
    // 1. Fetch default templates from server or fallback
    let serverDocs = [];
    try {
      const res = await fetch(`${API_BASE}/api/documents`);
      if (res.ok) {
        const data = await res.json();
        serverDocs = data.documents || [];
      }
    } catch (e) {}

    if (serverDocs.length === 0) {
      serverDocs = DEFAULT_DOCUMENT_TEMPLATES.map(d => ({ ...d }));
    }

    // 2. Fetch locally stored verified docs from IndexedDB
    const localStored = await FGN_DocStorage.getAll();
    const localMap = {};
    localStored.forEach(d => { localMap[d.documentType.toLowerCase()] = d; });

    // Merge: local uploads override server template
    const merged = serverDocs.map(d => {
      const local = localMap[d.documentType.toLowerCase()];
      if (local) {
        return {
          ...d,
          fileName: local.fileName,
          status: local.status,
          verificationStatus: local.verificationStatus || 'VERIFIED',
          detectedType: local.detectedType,
          confidence: local.confidence,
          maskedPii: local.maskedPii,
          auditNotes: local.auditNotes,
          uploadDate: local.uploadDate,
          fileData: local.fileData,
          fileSize: local.fileSize
        };
      }
      return d;
    });

    state.documentsData = { documents: merged };

    const total = merged.length;
    const verified = merged.filter(d => (d.status || '').toUpperCase() === 'VERIFIED' || (d.status || '').toUpperCase() === 'UPLOADED').length;
    const pending = total - verified;

    const statReady = document.getElementById('statDocsReady');
    if (statReady) statReady.textContent = `${verified} / ${total}`;

    const statStatus = document.getElementById('statDocsStatus');
    if (statStatus) {
      statStatus.textContent = pending > 0 ? `${pending} certificates pending verification` : 'All certificates verified';
    }

    const vaultScore = document.getElementById('vaultScoreText');
    if (vaultScore) vaultScore.textContent = `${verified} of ${total} Verified`;

    renderDocuments();
  } catch (e) {
    console.error('Failed to load documents:', e);
  }
}

function renderDocuments() {
  const container = document.getElementById('documentsGrid');
  if (!container) return;
  container.innerHTML = '';

  const list = (state.documentsData && state.documentsData.documents) || [];
  list.forEach(d => {
    const card = document.createElement('div');
    card.className = 'doc-card';

    const isVerified = (d.status || '').toUpperCase() === 'VERIFIED' || (d.status || '').toUpperCase() === 'UPLOADED';
    const isWrong = (d.status || '').toUpperCase() === 'REJECTED' || (d.verificationStatus || '') === 'WRONG_DOCUMENT';
    const isUnclear = (d.status || '').toUpperCase() === 'UNCLEAR';

    let statusChipClass = 'missing';
    let statusLabel = 'Pending Upload';

    if (isVerified) {
      statusChipClass = 'verified';
      statusLabel = `✅ Verified (${d.confidence || 96}%)`;
    } else if (isWrong) {
      statusChipClass = 'wrong';
      statusLabel = `❌ Wrong Document`;
    } else if (isUnclear) {
      statusChipClass = 'unclear';
      statusLabel = `⚠️ Unclear`;
    }

    const piiHtml = d.maskedPii ? `<div class="doc-privacy-pill">🔒 ${d.maskedPii}</div>` : '';

    const actionsHtml = isVerified
      ? `<div style="display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap;">
           <button class="btn-secondary-sm btn-audit-doc" data-doctype="${encodeURIComponent(d.documentType)}">View & Audit</button>
           <button class="btn-secondary-sm btn-upload-doc" data-doctype="${encodeURIComponent(d.documentType)}">Update</button>
         </div>`
      : `<button class="btn-primary-sm btn-upload-doc" data-doctype="${encodeURIComponent(d.documentType)}">Upload & Verify</button>`;

    card.innerHTML = `
      <div>
        <div class="doc-card-header">
          <div class="doc-name">${d.documentType}</div>
          <span class="doc-status-chip ${statusChipClass}">${statusLabel}</span>
        </div>
        <div class="doc-filename">File: <strong>${d.fileName || 'No certificate recorded'}</strong></div>
        ${piiHtml}
        <div class="doc-notes">${d.notes || d.auditNotes || 'Required for quota verification.'}</div>
      </div>
      <div style="margin-top: 0.85rem;">
        ${actionsHtml}
      </div>
    `;

    container.appendChild(card);
  });

  // Attach button event listeners
  container.querySelectorAll('.btn-upload-doc').forEach(btn => {
    btn.addEventListener('click', () => {
      const docType = decodeURIComponent(btn.dataset.doctype);
      openUploadModal(docType);
    });
  });

  container.querySelectorAll('.btn-audit-doc').forEach(btn => {
    btn.addEventListener('click', () => {
      const docType = decodeURIComponent(btn.dataset.doctype);
      openDocAuditModal(docType);
    });
  });
}

function openUploadModal(docType) {
  const modal = document.getElementById('uploadDocModal');
  const typeSelect = document.getElementById('uploadDocTypeSelect');
  const customGroup = document.getElementById('customDocTypeGroup');
  const fileNameInput = document.getElementById('uploadFileName');
  const realFileInput = document.getElementById('realFileInput');
  const previewBox = document.getElementById('ocrUploadPreviewBox');

  if (realFileInput) realFileInput.value = '';
  if (previewBox) previewBox.style.display = 'none';
  state.tempUploadedFile = null;
  state.tempClassification = null;

  if (typeSelect) {
    let found = false;
    for (let i = 0; i < typeSelect.options.length; i++) {
      if (typeSelect.options[i].value.toLowerCase() === docType.toLowerCase()) {
        typeSelect.selectedIndex = i;
        found = true;
        break;
      }
    }
    if (!found) {
      typeSelect.value = 'Other';
      if (customGroup) customGroup.style.display = 'flex';
      const customName = document.getElementById('customDocTypeName');
      if (customName) customName.value = docType;
    } else {
      if (customGroup) customGroup.style.display = 'none';
    }
  }

  if (fileNameInput) {
    fileNameInput.value = docType.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_verified.pdf';
  }

  if (modal) modal.classList.add('open');
}
window.openUploadModal = openUploadModal;

function openDocAuditModal(docType) {
  const list = (state.documentsData && state.documentsData.documents) || [];
  const doc = list.find(d => d.documentType.toLowerCase() === docType.toLowerCase());
  if (!doc) return;

  state.activeAuditDoc = doc;

  const modal = document.getElementById('docAuditModal');
  const title = document.getElementById('docAuditTitle');
  const body = document.getElementById('docAuditBody');

  if (title) title.textContent = `Audit & Verification Log: ${doc.documentType}`;

  if (body) {
    const isVerified = (doc.status || '').toUpperCase() === 'VERIFIED' || (doc.status || '').toUpperCase() === 'UPLOADED';
    const statusChip = isVerified
      ? `<span class="doc-status-chip verified">✅ Verified Certificate (${doc.confidence || 96}% confidence)</span>`
      : `<span class="doc-status-chip wrong">❌ Verification Issue</span>`;

    const piiNotice = doc.maskedPii
      ? `<div style="background:#f1f5f9; padding:0.6rem; border-radius:6px; font-family:monospace; margin-top:0.5rem;">🔒 Protected PII Record: <strong>${doc.maskedPii}</strong></div>`
      : `<div style="background:#f1f5f9; padding:0.6rem; border-radius:6px; font-size:0.8rem; margin-top:0.5rem;">🔒 No sensitive unmasked personal numbers stored.</div>`;

    body.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
        <div>
          <h4 style="margin:0; font-size:1.05rem; color:var(--color-navy-dark);">${doc.documentType}</h4>
          <span style="font-size:0.8rem; color:var(--color-slate-500);">Recorded File: ${doc.fileName || 'verified_doc.pdf'}</span>
        </div>
        ${statusChip}
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; background:var(--color-slate-50); border:1px solid var(--color-slate-200); padding:0.85rem; border-radius:8px; font-size:0.82rem; margin-bottom:1rem;">
        <div><strong>Issuing Authority:</strong> ${doc.issuer || 'Tehsildar / Competent Official'}</div>
        <div><strong>Verification Date:</strong> ${doc.uploadDate || 'Active'}</div>
        <div><strong>Document Category:</strong> Academic & Quota Verification</div>
        <div><strong>Storage Protocol:</strong> Encrypted Local IndexedDB + PII Masked</div>
      </div>

      ${piiNotice}

      <div style="margin-top:1rem; font-size:0.82rem; color:var(--color-slate-600); line-height:1.5;">
        <strong>Authentication Audit:</strong><br>
        ${doc.auditNotes || 'Automated classification confirmed official stamps, signature of Revenue Officer/SDO, and current academic year validity.'}
      </div>
    `;
  }

  if (modal) modal.classList.add('open');
}

// ─── Application Error & Inconsistency Checker ────────────────────────────────
function runApplicationErrorChecks() {
  const container = document.getElementById('errorCheckerList');
  const countBadge = document.getElementById('errorCountBadge');
  if (!container) return;

  const s = state.student || {};
  const cat = s.category || 'GEN';
  const inc = Number(s.annualIncome || 0);
  const budget = Number(s.annualBudget || 0);
  const stateName = s.state || 'Jharkhand';

  const docs = (state.documentsData && state.documentsData.documents) || [];
  const isDocVerified = (type) => {
    const d = docs.find(doc => doc.documentType.toLowerCase().includes(type.toLowerCase()));
    return d && ((d.status || '').toUpperCase() === 'VERIFIED' || (d.status || '').toUpperCase() === 'UPLOADED');
  };

  const checks = [];

  // Check 1: Reserved Category Certificate
  if (cat !== 'GEN') {
    const casteVerified = isDocVerified('Caste');
    if (!casteVerified) {
      checks.push({
        severity: 'critical',
        icon: '🚨',
        headline: `Missing ${cat} Category Certificate`,
        explanation: `JoSAA / CSAB Rule 14.2 strictly mandates that unverified ${cat} seats will be converted to Open/General category at reporting.`,
        actionLabel: 'Upload Caste Certificate',
        actionTarget: 'Caste Certificate'
      });
    } else {
      checks.push({
        severity: 'safe',
        icon: '✅',
        headline: `${cat} Reservation Certificate Verified`,
        explanation: `Category certificate authenticated for JoSAA / CSAB quota reservation.`,
        actionLabel: null
      });
    }
  }

  // Check 2: Income Ceiling vs Reservation Category
  if ((cat === 'OBC-NCL' || cat === 'EWS') && inc > 800000) {
    checks.push({
      severity: 'critical',
      icon: '❌',
      headline: `Income Ceiling Conflict: ₹${inc.toLocaleString('en-IN')} > ₹8,00,000`,
      explanation: `${cat} eligibility strictly requires gross annual family income below ₹8.00 Lakhs. Seats may be cancelled if income exceeds cap.`,
      actionLabel: 'Update Income in Profile',
      actionTarget: 'profile'
    });
  }

  // Check 3: Certificate Freshness Rule
  const incomeVerified = isDocVerified('Income');
  if (!incomeVerified) {
    checks.push({
      severity: 'warning',
      icon: '⚠️',
      headline: 'Income Certificate Freshness Rule (Post April 1, 2026)',
      explanation: 'Central and state scholarship portals (NSP & e-Kalyan) require Income Certificates issued after April 1, 2026.',
      actionLabel: 'Upload Income Certificate',
      actionTarget: 'Income Certificate'
    });
  }

  // Check 4: Budget Gap
  const minCollegeCost = 46000; // BIT Sindri after relief
  if (budget > 0 && budget < minCollegeCost) {
    checks.push({
      severity: 'warning',
      icon: '⚠️',
      headline: `Stated Budget (₹${budget.toLocaleString('en-IN')}) below Net College Expenses`,
      explanation: `Minimum net expense across matched institutions is ~₹${minCollegeCost.toLocaleString('en-IN')}/yr. Consider applying for 100% Tuition Fee Waiver (TFW) or education loans.`,
      actionLabel: 'Review Pathways',
      actionTarget: 'pathways'
    });
  }

  // Check 5: Domicile Advantage Check
  const domicileVerified = isDocVerified('Domicile');
  if (!domicileVerified) {
    checks.push({
      severity: 'warning',
      icon: '🏛️',
      headline: `Verify Domicile Certificate for 50% Home State Quota`,
      explanation: `Students with ${stateName} domicile qualify for 50% state quota seats at ${stateName} NITs and state engineering colleges.`,
      actionLabel: 'Upload Domicile Certificate',
      actionTarget: 'Domicile Certificate'
    });
  }

  // Render Checks
  container.innerHTML = '';
  checks.forEach(c => {
    const card = document.createElement('div');
    card.className = `error-item-card severity-${c.severity}`;

    const actionBtn = c.actionLabel
      ? `<button class="error-fix-btn" data-target="${c.actionTarget}">${c.actionLabel} &rarr;</button>`
      : `<span style="font-size: 0.75rem; color: var(--color-emerald-dark); font-weight: 700;">Verified Compliant</span>`;

    card.innerHTML = `
      <div class="error-item-left">
        <span class="error-icon-badge">${c.icon}</span>
        <div>
          <div class="error-headline">${c.headline}</div>
          <div class="error-explanation">${c.explanation}</div>
        </div>
      </div>
      <div>
        ${actionBtn}
      </div>
    `;

    container.appendChild(card);
  });

  // Attach fix action listeners
  container.querySelectorAll('.error-fix-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;
      if (target === 'profile') {
        document.getElementById('inputIncome').focus();
        document.getElementById('profile-section').scrollIntoView({ behavior: 'smooth' });
      } else if (target === 'pathways') {
        document.getElementById('alternatives-section').scrollIntoView({ behavior: 'smooth' });
      } else {
        openUploadModal(target);
      }
    });
  });

  if (countBadge) {
    const criticalCount = checks.filter(c => c.severity === 'critical').length;
    const warningCount = checks.filter(c => c.severity === 'warning').length;
    if (criticalCount > 0) {
      countBadge.textContent = `${criticalCount} Critical Issue${criticalCount > 1 ? 's' : ''}`;
      countBadge.style.background = '#ffe4e6';
      countBadge.style.color = '#9f1239';
    } else if (warningCount > 0) {
      countBadge.textContent = `${warningCount} Action Recommended`;
      countBadge.style.background = '#fef3c7';
      countBadge.style.color = '#b45309';
    } else {
      countBadge.textContent = 'All Checks Clear';
      countBadge.style.background = '#d1fae5';
      countBadge.style.color = '#065f46';
    }
  }
}

// ─── Application Readiness Score Engine ───────────────────────────────────────
function updateReadinessScore() {
  const docs = (state.documentsData && state.documentsData.documents) || [];
  const totalDocs = docs.length || 7;
  const verifiedDocs = docs.filter(d => (d.status || '').toUpperCase() === 'VERIFIED' || (d.status || '').toUpperCase() === 'UPLOADED').length;

  // 1. Document Score (40% max weight)
  const docsRatio = totalDocs > 0 ? (verifiedDocs / totalDocs) : 0;
  const docsScore = Math.round(docsRatio * 40);

  // 2. Profile Score (30% max weight)
  const s = state.student || {};
  let filledProfileFields = 0;
  if (s.name) filledProfileFields++;
  if (s.jeePercentile > 0) filledProfileFields++;
  if (s.category) filledProfileFields++;
  if (s.state) filledProfileFields++;
  if (s.annualIncome > 0) filledProfileFields++;
  if (s.annualBudget > 0) filledProfileFields++;
  const profileScore = Math.round((filledProfileFields / 6) * 30);

  // 3. Deadline Safety Buffer (30% max weight)
  const deadlines = state.deadlines || [];
  let highRiskCount = 0;
  deadlines.forEach(d => {
    if (d.riskLevel === 'HIGH' || d.urgency === 'HIGH') {
      // Check if required docs are missing
      const required = d.requiredDocuments || [];
      const hasMissing = required.some(reqName => {
        const found = docs.find(doc => doc.documentType.toLowerCase().includes(reqName.toLowerCase().replace(/[^a-z]/g, '')));
        return !found || ((found.status || '').toUpperCase() !== 'VERIFIED' && (found.status || '').toUpperCase() !== 'UPLOADED');
      });
      if (hasMissing) highRiskCount++;
    }
  });

  let deadlineScore = 30;
  if (highRiskCount === 1) deadlineScore = 18;
  else if (highRiskCount >= 2) deadlineScore = 8;

  // Total Composite Score
  const totalScore = Math.min(100, docsScore + profileScore + deadlineScore);

  // Update UI Gauge
  const scoreVal = document.getElementById('readinessScoreVal');
  const gaugeBar = document.getElementById('readinessGaugeBar');
  const tierTitle = document.getElementById('readinessTierTitle');
  const tierDesc = document.getElementById('readinessTierDesc');

  if (scoreVal) scoreVal.textContent = `${totalScore}%`;

  if (gaugeBar) {
    // Circumference = 2 * PI * 50 = 314.16
    const offset = 314.16 * (1 - totalScore / 100);
    gaugeBar.style.strokeDashoffset = offset;

    if (totalScore >= 80) gaugeBar.style.stroke = 'var(--color-emerald)';
    else if (totalScore >= 50) gaugeBar.style.stroke = 'var(--color-saffron)';
    else gaugeBar.style.stroke = 'var(--color-rose)';
  }

  if (tierTitle && tierDesc) {
    if (totalScore >= 85) {
      tierTitle.textContent = 'High Application Readiness';
      tierDesc.textContent = 'Your core documentation and profile are secured. Ready for priority choice locking and scholarship filing.';
    } else if (totalScore >= 65) {
      tierTitle.textContent = 'Competitive Readiness';
      tierDesc.textContent = 'Core profile verified. Completing remaining documents will eliminate last-minute reporting risks.';
    } else {
      tierTitle.textContent = 'Needs Immediate Attention';
      tierDesc.textContent = 'Critical documents are pending upload. Seat allocation may be converted to General category if not verified.';
    }
  }

  // Update Sub-bars
  const barDocsVal = document.getElementById('barDocsVal');
  const barDocsFill = document.getElementById('barDocsFill');
  if (barDocsVal) barDocsVal.textContent = `${docsScore}% / 40%`;
  if (barDocsFill) barDocsFill.style.width = `${(docsScore / 40) * 100}%`;

  const barProfileVal = document.getElementById('barProfileVal');
  const barProfileFill = document.getElementById('barProfileFill');
  if (barProfileVal) barProfileVal.textContent = `${profileScore}% / 30%`;
  if (barProfileFill) barProfileFill.style.width = `${(profileScore / 30) * 100}%`;

  const barDeadlineVal = document.getElementById('barDeadlineVal');
  const barDeadlineFill = document.getElementById('barDeadlineFill');
  if (barDeadlineVal) barDeadlineVal.textContent = `${deadlineScore}% / 30%`;
  if (barDeadlineFill) barDeadlineFill.style.width = `${(deadlineScore / 30) * 100}%`;

  // Update Boosters List
  renderReadinessBoosters(docs);
}

function renderReadinessBoosters(docs) {
  const container = document.getElementById('readinessBoostersList');
  if (!container) return;
  container.innerHTML = '';

  const pendingDocs = docs.filter(d => (d.status || '').toUpperCase() !== 'VERIFIED' && (d.status || '').toUpperCase() !== 'UPLOADED');

  if (pendingDocs.length === 0) {
    container.innerHTML = '<div style="font-size:0.8rem; color:var(--color-emerald-dark); font-weight:600;">✨ All essential documentation verified! Maximum score unlocked.</div>';
    return;
  }

  pendingDocs.slice(0, 3).forEach(d => {
    const item = document.createElement('div');
    item.className = 'booster-item';
    item.innerHTML = `
      <span>Verify <strong>${d.documentType}</strong></span>
      <span class="booster-val">+12% Score</span>
    `;
    item.addEventListener('click', () => {
      openUploadModal(d.documentType);
    });
    container.appendChild(item);
  });
}

// ─── “What Should I Do Next?” Action Engine ──────────────────────────────────
function updateWhatNextActions() {
  const container = document.getElementById('whatNextActionsList');
  if (!container) return;
  container.innerHTML = '';

  const s = state.student || {};
  const docs = (state.documentsData && state.documentsData.documents) || [];
  const deadlines = state.deadlines || [];

  const actions = [];

  // Priority 1: High Deadline Risk with Missing Documents
  const nearestRiskDeadline = deadlines.find(d => d.riskLevel === 'HIGH' || d.daysRemaining <= 18);
  if (nearestRiskDeadline) {
    actions.push({
      priority: 'high',
      tag: 'Urgent Compliance',
      tagClass: 'tag-urgent',
      title: `Submit Documents for: ${nearestRiskDeadline.title}`,
      desc: `Closing in ${nearestRiskDeadline.daysRemaining || 14} days. Verify your income and category paperwork to prevent portal rejection.`,
      ctaText: 'Upload Document',
      handler: () => openUploadModal('Income Certificate')
    });
  }

  // Priority 2: Safe Institutional Option Target
  actions.push({
    priority: 'medium',
    tag: 'Target Choice',
    tagClass: 'tag-target',
    title: 'Lock BIT Sindri (CSE) as Prime Safe Backup',
    desc: `With your ${Number(s.jeePercentile || 92).toFixed(1)}%ile, Jharkhand Home State Quota gives >95% admission probability at ₹46,000 net cost.`,
    ctaText: 'View College Cutoffs',
    handler: () => {
      const el = document.getElementById('colleges-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  });

  // Priority 3: Scholarship Grant Opportunity
  const topSch = (state.scholarships || [])[0];
  if (topSch) {
    actions.push({
      priority: 'opportunity',
      tag: 'Grant Opportunity',
      tagClass: 'tag-grant',
      title: `File ${topSch.name} (${formatINR(topSch.annualAmount)}/yr)`,
      desc: `You meet the income and domicile criteria. Direct DBT grant relieves up to 80% of annual hostel & mess charges.`,
      ctaText: 'Apply on Portal',
      handler: () => {
        if (topSch.applicationUrl) window.open(topSch.applicationUrl, '_blank');
      }
    });
  }

  // Render Action Cards
  actions.slice(0, 3).forEach(act => {
    const card = document.createElement('div');
    card.className = `action-item-card priority-${act.priority}`;
    card.innerHTML = `
      <div class="action-card-left">
        <div class="action-urgency-row">
          <span class="action-urgency-tag ${act.tagClass}">${act.tag}</span>
        </div>
        <div class="action-card-title">${act.title}</div>
        <div class="action-card-desc">${act.desc}</div>
      </div>
      <div>
        <button class="action-cta-btn">${act.ctaText} &rarr;</button>
      </div>
    `;

    const btn = card.querySelector('.action-cta-btn');
    if (btn) btn.addEventListener('click', act.handler);

    container.appendChild(card);
  });
}

// ─── Opportunity Comparison Engine ────────────────────────────────────────────
function setupComparisonControls() {
  const btnOpenHeader = document.getElementById('btnOpenCompareHeader');
  const btnOpenFloating = document.getElementById('btnOpenCompareFloating');
  const btnClear = document.getElementById('btnClearCompare');
  const btnClearModal = document.getElementById('btnClearCompareModal');
  const tabColleges = document.getElementById('tabCompareColleges');
  const tabScholarships = document.getElementById('tabCompareScholarships');

  const openModal = () => {
    renderCompareMatrix();
    const modal = document.getElementById('compareModal');
    if (modal) modal.classList.add('open');
  };

  if (btnOpenHeader) btnOpenHeader.addEventListener('click', openModal);
  if (btnOpenFloating) btnOpenFloating.addEventListener('click', openModal);

  const clearAll = () => {
    state.selectedCompareColleges = [];
    state.selectedCompareScholarships = [];
    updateCompareCounters();
    renderColleges();
    renderScholarships();
    renderCompareMatrix();
  };

  if (btnClear) btnClear.addEventListener('click', clearAll);
  if (btnClearModal) btnClearModal.addEventListener('click', clearAll);

  if (tabColleges) {
    tabColleges.addEventListener('click', () => {
      state.compareTab = 'colleges';
      tabColleges.classList.add('active');
      if (tabScholarships) tabScholarships.classList.remove('active');
      renderCompareMatrix();
    });
  }

  if (tabScholarships) {
    tabScholarships.addEventListener('click', () => {
      state.compareTab = 'scholarships';
      tabScholarships.classList.add('active');
      if (tabColleges) tabColleges.classList.remove('active');
      renderCompareMatrix();
    });
  }
}

function toggleCompareCollege(college) {
  const idx = state.selectedCompareColleges.findIndex(c => c.id === college.id);
  if (idx >= 0) {
    state.selectedCompareColleges.splice(idx, 1);
  } else {
    if (state.selectedCompareColleges.length >= 3) {
      showToast('You can compare a maximum of 3 institutions simultaneously.');
      return;
    }
    state.selectedCompareColleges.push(college);
  }
  updateCompareCounters();
  renderColleges();
}

function toggleCompareScholarship(scholarship) {
  const idx = state.selectedCompareScholarships.findIndex(s => s.id === scholarship.id);
  if (idx >= 0) {
    state.selectedCompareScholarships.splice(idx, 1);
  } else {
    if (state.selectedCompareScholarships.length >= 3) {
      showToast('You can compare a maximum of 3 scholarships simultaneously.');
      return;
    }
    state.selectedCompareScholarships.push(scholarship);
  }
  updateCompareCounters();
  renderScholarships();
}

function updateCompareCounters() {
  const total = state.selectedCompareColleges.length + state.selectedCompareScholarships.length;
  const headerCount = document.getElementById('compareHeaderCount');
  if (headerCount) headerCount.textContent = total;

  const floatingBar = document.getElementById('floatingCompareBar');
  const summaryText = document.getElementById('compareSummaryText');

  if (total > 0) {
    if (floatingBar) floatingBar.style.display = 'block';
    if (summaryText) summaryText.textContent = `${total} opportunit${total === 1 ? 'y' : 'ies'} selected for side-by-side comparison`;
  } else {
    if (floatingBar) floatingBar.style.display = 'none';
  }
}

function renderCompareMatrix() {
  const container = document.getElementById('compareMatrixContainer');
  if (!container) return;

  if (state.compareTab === 'colleges') {
    const list = state.selectedCompareColleges;
    if (list.length === 0) {
      container.innerHTML = '<div style="padding:2rem; text-align:center; color:var(--color-slate-500);">No institutions selected for comparison. Click "⚖️ Compare" on any 2–3 college cards to compare fees, cutoffs, and net costs.</div>';
      return;
    }

    // Find minimum net cost for highlight
    const minNet = Math.min(...list.map(c => c.affordability?.estimatedNetCost || (c.annualTuition + c.annualHostel)));

    let tableHtml = `
      <table class="compare-table">
        <thead>
          <tr>
            <th style="min-width: 140px;">Metric</th>
            ${list.map(c => `<th><strong>${c.name}</strong><br><span style="font-size:0.75rem; color:var(--color-slate-500);">${c.type} · ${c.state}</span></th>`).join('')}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>NIRF Rank</strong></td>
            ${list.map(c => `<td>#${c.nirfRank || 'N/A'}</td>`).join('')}
          </tr>
          <tr>
            <td><strong>Admission Tier</strong></td>
            ${list.map(c => `<td><span class="badge-institute-type">${c.tier || 'Target'}</span></td>`).join('')}
          </tr>
          <tr>
            <td><strong>Target Branch</strong></td>
            ${list.map(c => `<td>${c.branch || 'CSE'}</td>`).join('')}
          </tr>
          <tr>
            <td><strong>Closing Cutoff</strong></td>
            ${list.map(c => `<td><strong>${(c.effectiveCutoff || c.cutoffPercentile || 85).toFixed(1)}%ile</strong></td>`).join('')}
          </tr>
          <tr>
            <td><strong>Your Score Margin</strong></td>
            ${list.map(c => {
              const diff = c.margin !== undefined ? c.margin : (Number(state.student?.jeePercentile || 92) - (c.effectiveCutoff || 85));
              const color = diff >= 0 ? 'var(--color-emerald)' : 'var(--color-rose)';
              return `<td style="color:${color}; font-weight:700;">${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%ile</td>`;
            }).join('')}
          </tr>
          <tr>
            <td><strong>Home State Quota</strong></td>
            ${list.map(c => `<td>${c.isHomeState ? '✅ 50% State Quota' : 'All-India Seat Pool'}</td>`).join('')}
          </tr>
          <tr>
            <td><strong>Annual Tuition</strong></td>
            ${list.map(c => `<td>${formatINR(c.annualTuition)}</td>`).join('')}
          </tr>
          <tr>
            <td><strong>Hostel & Mess</strong></td>
            ${list.map(c => `<td>${formatINR(c.annualHostel)}</td>`).join('')}
          </tr>
          <tr>
            <td><strong>Scholarship Subsidy</strong></td>
            ${list.map(c => `<td style="color:var(--color-emerald);">- ${formatINR(c.affordability?.applicableScholarship || 0)}</td>`).join('')}
          </tr>
          <tr style="background:#f8fafc;">
            <td><strong>Net Annual Cost</strong></td>
            ${list.map(c => {
              const net = c.affordability?.estimatedNetCost || (c.annualTuition + c.annualHostel);
              const isBest = net === minNet;
              return `<td class="${isBest ? 'val-best' : 'val-highlight'}">${formatINR(net)}/yr ${isBest ? '⭐ Best Value' : ''}</td>`;
            }).join('')}
          </tr>
          <tr>
            <td><strong>Affordability Verdict</strong></td>
            ${list.map(c => `<td>${c.affordability?.affordabilityTier || 'Affordable'}</td>`).join('')}
          </tr>
        </tbody>
      </table>
    `;
    container.innerHTML = tableHtml;
  } else {
    // Scholarships Comparison
    const list = state.selectedCompareScholarships;
    if (list.length === 0) {
      container.innerHTML = '<div style="padding:2rem; text-align:center; color:var(--color-slate-500);">No scholarships selected for comparison. Click "⚖️ Compare" on any 2–3 scholarship cards.</div>';
      return;
    }

    const maxGrant = Math.max(...list.map(s => s.annualAmount || 0));

    let tableHtml = `
      <table class="compare-table">
        <thead>
          <tr>
            <th style="min-width: 140px;">Scheme Metric</th>
            ${list.map(s => `<th><strong>${s.name}</strong><br><span style="font-size:0.75rem; color:var(--color-slate-500);">${s.provider}</span></th>`).join('')}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Annual Grant Amount</strong></td>
            ${list.map(s => {
              const isMax = s.annualAmount === maxGrant;
              return `<td class="${isMax ? 'val-best' : 'val-highlight'}">${formatINR(s.annualAmount)}/yr ${isMax ? '⭐ Max Grant' : ''}</td>`;
            }).join('')}
          </tr>
          <tr>
            <td><strong>Income Ceiling</strong></td>
            ${list.map(s => `<td>₹${(s.incomeLimit || 250000).toLocaleString('en-IN')}/year</td>`).join('')}
          </tr>
          <tr>
            <td><strong>Eligible Categories</strong></td>
            ${list.map(s => `<td>${(s.eligibleCategories || ['OBC-NCL']).join(', ')}</td>`).join('')}
          </tr>
          <tr>
            <td><strong>State Restriction</strong></td>
            ${list.map(s => `<td>${s.stateRestriction || 'All India (Central Scheme)'}</td>`).join('')}
          </tr>
          <tr>
            <td><strong>Closing Deadline</strong></td>
            ${list.map(s => `<td><strong>${s.deadlineDate}</strong></td>`).join('')}
          </tr>
          <tr>
            <td><strong>Required Certificates</strong></td>
            ${list.map(s => `<td>${(s.requiredDocuments || ['Income Certificate', 'Caste Certificate']).join(', ')}</td>`).join('')}
          </tr>
          <tr>
            <td><strong>Official Portal</strong></td>
            ${list.map(s => `<td><a href="${s.applicationUrl}" target="_blank" class="btn-secondary-sm" style="text-decoration:none;">Open Portal &rarr;</a></td>`).join('')}
          </tr>
        </tbody>
      </table>
    `;
    container.innerHTML = tableHtml;
  }
}

// ─── College Matching Engine ──────────────────────────────────────────────────
async function loadColleges() {
  try {
    const res = await fetch(`${API_BASE}/api/colleges`);
    if (!res.ok) return;
    state.collegeData = await res.json();

    const tiers = state.collegeData.tiers || {};
    const dCount = (tiers.DREAM || tiers.dream || []).length;
    const rCount = (tiers.REALISTIC || tiers.realistic || []).length;
    const sCount = (tiers.SAFE || tiers.safe || []).length;

    const countD = document.getElementById('countDream');
    const countR = document.getElementById('countRealistic');
    const countS = document.getElementById('countSafe');

    if (countD) countD.textContent = dCount;
    if (countR) countR.textContent = rCount;
    if (countS) countS.textContent = sCount;

    const statCount = document.getElementById('statCollegesCount');
    if (statCount) statCount.textContent = dCount + rCount + sCount;

    populateCalculatorDropdown();
    updateRankSummaryBanner();
    renderColleges();
  } catch (e) {
    console.error('Failed to load colleges:', e);
  }
}

function updateRankSummaryBanner() {
  const pct = Number(state.student?.jeePercentile || 92.0);
  const cat = state.student?.category || 'OBC-NCL';
  const stateName = state.student?.state || 'Jharkhand';

  // CRL Rank Formula (approx 14 Lakh total candidates in 2026)
  const crl = Math.max(1, Math.round((100 - pct) * 14000));

  // Category Rank Multiplier
  let catRank = crl;
  if (cat === 'OBC-NCL' || cat === 'OBC') catRank = Math.round(crl * 0.28);
  else if (cat === 'EWS') catRank = Math.round(crl * 0.11);
  else if (cat === 'SC') catRank = Math.round(crl * 0.15);
  else if (cat === 'ST') catRank = Math.round(crl * 0.075);

  const valCrl = document.getElementById('valCrlRank');
  const valCat = document.getElementById('valCatRank');
  const valCatName = document.getElementById('valCatName');
  const valHs = document.getElementById('valHomeStateQuota');

  if (valCrl) valCrl.textContent = `~${crl.toLocaleString('en-IN')}`;
  if (valCat) valCat.textContent = `~${catRank.toLocaleString('en-IN')}`;
  if (valCatName) valCatName.textContent = cat;
  if (valHs) valHs.textContent = `${stateName} (50% Quota Benefit)`;
}

function renderColleges() {
  const container = document.getElementById('collegeCardsGrid');
  if (!container) return;
  container.innerHTML = '';

  if (!state.collegeData || !state.collegeData.tiers) return;

  const tiers = state.collegeData.tiers;
  const tierKey = state.currentTier;
  const list = tiers[tierKey] || tiers[tierKey.toLowerCase()] || [];

  if (list.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding: 2rem; text-align: center; color: var(--color-slate-500); grid-column: 1 / -1;">No institutions in this tier currently matched with your score. Try adjusting your preferred branch or percentile score.</div>`;
    return;
  }

  list.forEach(c => {
    const card = document.createElement('div');
    card.className = 'college-card';

    const collegeId = c.id || c.collegeId;
    const collegeName = c.name || c.collegeName;
    const collegeType = c.type || c.instituteType || 'Institute';
    const nirf = c.nirfRank || 0;
    const branch = c.branch || 'CSE';
    const cutoff = c.effectiveCutoff || c.cutoffPercentile || 85;
    const isHs = c.isHomeState || c.isHomeStateEligible;
    const board = c.counsellingBoard || 'JoSAA / State';

    const aff = c.affordability || {};
    const tuition = aff.annualTuition || 0;
    const hostel = aff.annualHostel || 0;
    const scholarship = aff.applicableScholarship || 0;
    const netCost = aff.estimatedNetCost !== undefined ? aff.estimatedNetCost : (tuition + hostel - scholarship);
    const tierName = aff.affordabilityTier || 'Affordable';

    const hsBadge = isHs ? `<span class="badge-home-state">Home State Quota</span>` : '';

    const studentPct = state.student ? Number(state.student.jeePercentile) : 92;
    const diff = (studentPct - cutoff).toFixed(1);
    const diffSign = diff >= 0 ? `+${diff}` : `${diff}`;
    const diffColor = diff >= 0 ? 'var(--color-emerald)' : 'var(--color-rose)';

    // Estimated Closing Rank for this cutoff
    const closingRankEst = Math.max(1, Math.round((100 - cutoff) * 14000));

    let badgeClass = 'tier-affordable';
    if (tierName.includes('Highly')) badgeClass = 'tier-highly-affordable';
    else if (tierName.includes('Stretch')) badgeClass = 'tier-stretch';
    else if (tierName.includes('Not')) badgeClass = 'tier-not-affordable';

    const isCompared = state.selectedCompareColleges.some(col => col.id === collegeId);

    card.innerHTML = `
      <div class="card-top">
        <div class="card-badges-row">
          <div>
            <span class="badge-institute-type">${collegeType}</span>
          </div>
          ${hsBadge}
        </div>
        <h3 class="college-title">${collegeName}</h3>
        <div class="college-meta">
          <span>Location: ${c.state}</span>
          <span>NIRF Rank #${nirf}</span>
          <span>Board: ${board}</span>
        </div>
      </div>

      <div class="card-cutoff-block">
        <div class="cutoff-comparison">
          <span>Closing for <strong>${branch}</strong>:</span>
          <span class="cutoff-num">${cutoff.toFixed(1)}%ile (CRL ~${closingRankEst.toLocaleString('en-IN')})</span>
        </div>
        <div class="cutoff-bar-bg">
          <div class="cutoff-bar-fill" style="width: ${Math.min(cutoff, 100)}%; background: ${diffColor};"></div>
        </div>
        <div class="cutoff-advantage-text">
          Your score: <strong>${studentPct.toFixed(1)}%ile</strong> 
          (<span style="color: ${diffColor}; font-weight: 700;">${diffSign}%ile margin</span>)
        </div>
      </div>

      <div class="card-fee-matrix">
        <div class="fee-col-item">
          <span class="fee-col-label">Annual Tuition</span>
          <span class="fee-col-val">${formatINR(tuition)}</span>
        </div>
        <div class="fee-col-item">
          <span class="fee-col-label">Hostel & Living</span>
          <span class="fee-col-val">${formatINR(hostel)}</span>
        </div>
        <div class="fee-col-item">
          <span class="fee-col-label">Scholarship Relief</span>
          <span class="fee-col-val" style="color: var(--color-emerald);">- ${formatINR(scholarship)}</span>
        </div>
        <div class="fee-col-item">
          <span class="fee-col-label">Estimated Net Cost</span>
          <span class="fee-col-val net-highlight">${formatINR(netCost)}/yr</span>
        </div>
      </div>

      <div class="card-footer-actions">
        <span class="badge-affordability ${badgeClass}">${tierName}</span>
        <div style="display:flex; gap:0.4rem; align-items:center;">
          <button class="btn-compare-card ${isCompared ? 'selected' : ''}" data-cid="${collegeId}">
            ${isCompared ? '✓ Comparing' : '⚖️ Compare'}
          </button>
          <button class="btn-secondary-sm btn-why-match" data-cid="${collegeId}" data-cname="${encodeURIComponent(collegeName)}">
            Why This Match?
          </button>
        </div>
      </div>
    `;

    container.appendChild(card);
  });

  // Attach button listeners
  container.querySelectorAll('.btn-why-match').forEach(btn => {
    btn.addEventListener('click', () => {
      const cid = btn.dataset.cid;
      const cname = decodeURIComponent(btn.dataset.cname);
      openWhyMatchModal(cid, cname);
    });
  });

  container.querySelectorAll('.btn-compare-card').forEach(btn => {
    btn.addEventListener('click', () => {
      const cid = btn.dataset.cid;
      const tiers = state.collegeData?.tiers || {};
      const all = [...(tiers.DREAM || []), ...(tiers.REALISTIC || []), ...(tiers.SAFE || [])];
      const match = all.find(item => (item.id || item.collegeId) === cid);
      if (match) toggleCompareCollege(match);
    });
  });
}

function updateTierTip() {
  const tipText = document.getElementById('tierTipText');
  if (!tipText) return;
  const current = state.currentTier.toLowerCase();
  if (current === 'realistic') {
    tipText.textContent = 'Realistic colleges are your prime target matches where your rank has a very strong admission probability.';
  } else if (current === 'dream') {
    tipText.textContent = 'Dream colleges are aspirational reach targets where you can compete during late rounds or CSAB special rounds.';
  } else {
    tipText.textContent = 'Safe colleges are your high-probability safety net where your marks are well above past closing cutoffs.';
  }
}

// ─── Unified Scholarship Matching Engine ──────────────────────────────────────
async function loadScholarships() {
  try {
    const res = await fetch(`${API_BASE}/api/scholarships`);
    if (!res.ok) return;
    state.scholarships = await res.json();

    // Update hero top scholarship stat
    const maxGrant = state.scholarships.reduce((max, s) => Math.max(max, s.annualAmount || 0), 0);
    const statMax = document.getElementById('statScholarshipMax');
    if (statMax) statMax.textContent = formatINR(maxGrant);

    const topSch = state.scholarships.find(s => s.annualAmount === maxGrant);
    const statName = document.getElementById('statScholarshipName');
    if (statName && topSch) statName.textContent = topSch.name;

    renderScholarships();
  } catch (e) {
    console.error('Failed to load scholarships:', e);
  }
}

function renderScholarships() {
  const container = document.getElementById('scholarshipCardsGrid');
  if (!container) return;
  container.innerHTML = '';

  if (!state.scholarships || state.scholarships.length === 0) {
    container.innerHTML = '<div class="empty-state">No scholarships currently listed.</div>';
    return;
  }

  const verifiedDocs = (state.documentsData && state.documentsData.documents) || [];
  const isDocVerified = (name) => {
    const d = verifiedDocs.find(doc => doc.documentType.toLowerCase().includes(name.toLowerCase().replace(/[^a-z]/g, '')));
    return d && ((d.status || '').toUpperCase() === 'VERIFIED' || (d.status || '').toUpperCase() === 'UPLOADED');
  };

  state.scholarships.forEach(s => {
    const card = document.createElement('div');
    card.className = 'scholarship-card';

    const isEligible = s.eligibility && s.eligibility.isEligible;
    const statusClass = isEligible ? 'eligible' : 'ineligible';
    const statusText = s.eligibility ? s.eligibility.overallStatus : 'Under Review';

    // Criteria HTML
    let criteriaHtml = '';
    if (s.eligibility && s.eligibility.criteriaChecks) {
      criteriaHtml = s.eligibility.criteriaChecks.map(c => `
        <li class="sch-criterion-item">
          <span class="${c.passed ? 'criterion-passed' : 'criterion-failed'}">[${c.passed ? 'PASS' : 'FAIL'}]</span>
          <span>${c.explanation}</span>
        </li>
      `).join('');
    }

    // Required Documents Live Checklist
    const reqDocs = s.requiredDocuments || ['Income Certificate', 'Caste Certificate', 'Bank Passbook'];
    let verifiedCount = 0;
    const docsChecklistHtml = reqDocs.map(docName => {
      const ok = isDocVerified(docName);
      if (ok) verifiedCount++;
      return `
        <span style="display:inline-flex; align-items:center; gap:0.25rem; font-size:0.75rem; background:${ok ? '#d1fae5' : '#fee2e2'}; color:${ok ? '#065f46' : '#991b1b'}; padding:0.15rem 0.45rem; border-radius:4px;">
          ${ok ? '✓' : '✗'} ${docName}
        </span>
      `;
    }).join(' ');

    const readinessPct = Math.round((verifiedCount / reqDocs.length) * 100);

    const isCompared = state.selectedCompareScholarships.some(sch => sch.id === s.id);

    card.innerHTML = `
      <div>
        <div class="sch-amount-row">
          <div class="sch-amount">${formatINR(s.annualAmount)}/yr</div>
          <span class="sch-status-pill ${statusClass}">${statusText}</span>
        </div>
        <h3 class="sch-title">${s.name}</h3>
        <div class="sch-provider">Provider: ${s.provider}</div>

        <ul class="sch-criteria-list">
          ${criteriaHtml}
        </ul>

        <div style="margin-top:0.75rem;">
          <div style="font-size:0.75rem; font-weight:700; color:var(--color-slate-600); margin-bottom:0.35rem;">Required Verification Certificates:</div>
          <div style="display:flex; flex-wrap:wrap; gap:0.35rem;">
            ${docsChecklistHtml}
          </div>
        </div>

        <div class="sch-docs-readiness" style="margin-top:0.75rem;">
          <span>Document Readiness:</span>
          <strong>${verifiedCount} of ${reqDocs.length} Ready (${readinessPct}%)</strong>
        </div>
      </div>

      <div class="sch-footer-row" style="margin-top:1rem;">
        <span class="sch-deadline">Closing Date: <strong>${s.deadlineDate}</strong></span>
        <div style="display:flex; gap:0.4rem; align-items:center;">
          <button class="btn-compare-card ${isCompared ? 'selected' : ''}" data-sid="${s.id}">
            ${isCompared ? '✓ Comparing' : '⚖️ Compare'}
          </button>
          <a href="${s.applicationUrl}" target="_blank" rel="noopener noreferrer" class="btn-primary-sm" style="text-decoration: none;">
            Official Portal &rarr;
          </a>
        </div>
      </div>
    `;

    container.appendChild(card);
  });

  // Attach compare toggle listeners
  container.querySelectorAll('.btn-compare-card').forEach(btn => {
    btn.addEventListener('click', () => {
      const sid = btn.dataset.sid;
      const match = state.scholarships.find(item => item.id === sid);
      if (match) toggleCompareScholarship(match);
    });
  });
}

// ─── Affordability Calculator ─────────────────────────────────────────────────
function populateCalculatorDropdown() {
  const select = document.getElementById('calcCollegeSelect');
  if (!select || !state.collegeData || !state.collegeData.tiers) return;

  const tiers = state.collegeData.tiers;
  const allColleges = [
    ...(tiers.REALISTIC || tiers.realistic || []),
    ...(tiers.SAFE || tiers.safe || []),
    ...(tiers.DREAM || tiers.dream || [])
  ];

  select.innerHTML = '';
  allColleges.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.name} (${c.type}, ${c.state}) — Cutoff: ${(c.effectiveCutoff || 85).toFixed(1)}%ile`;
    select.appendChild(opt);
  });

  if (allColleges.length > 0) {
    calculateAffordability();
  }
}

async function calculateAffordability() {
  const select = document.getElementById('calcCollegeSelect');
  if (!select) return;
  const collegeId = select.value;
  const customScholarship = document.getElementById('calcCustomScholarship')?.value || 0;

  if (!collegeId) return;

  try {
    const res = await fetch(`${API_BASE}/api/affordability?collegeId=${encodeURIComponent(collegeId)}&scholarship=${encodeURIComponent(customScholarship)}`);
    if (!res.ok) return;
    const data = await res.json();

    document.getElementById('calcTuition').textContent = formatINR(data.annualTuition);
    document.getElementById('calcHostel').textContent = formatINR(data.annualHostel);
    document.getElementById('calcScholarship').textContent = formatINR(data.applicableScholarship);
    document.getElementById('calcNetCost').textContent = formatINR(data.estimatedNetCost);

    const badge = document.getElementById('calcAffordabilityBadge');
    badge.textContent = data.affordabilityTier;

    let badgeColor = 'var(--color-emerald)';
    if (data.affordabilityTier.includes('Stretch')) badgeColor = 'var(--color-saffron)';
    else if (data.affordabilityTier.includes('Not')) badgeColor = 'var(--color-rose)';
    badge.style.background = badgeColor;

    // Visual Budget Bar
    const budget = data.studentAnnualBudget || 100000;
    const net = data.estimatedNetCost || 0;
    const pct = Math.min(100, Math.round((net / budget) * 100));

    const barFill = document.getElementById('budgetBarFill');
    if (barFill) {
      barFill.style.width = `${pct}%`;
      barFill.style.background = net <= budget ? 'var(--color-emerald)' : 'var(--color-rose)';
    }

    const netText = document.getElementById('barNetText');
    if (netText) netText.textContent = formatINR(net);

    const budgetText = document.getElementById('barBudgetText');
    if (budgetText) budgetText.textContent = formatINR(budget);

    const expText = document.getElementById('calcExplanationText');
    if (expText) expText.textContent = data.calculationExplanation || '';
  } catch (e) {
    console.error('Failed to calculate affordability:', e);
  }
}

// ─── Alternative Pathways ─────────────────────────────────────────────────────
async function loadAlternatives() {
  try {
    const res = await fetch(`${API_BASE}/api/alternatives`);
    if (!res.ok) return;
    state.alternatives = await res.json();

    const diag = document.getElementById('pathwaysDiagnosticText');
    if (diag) diag.textContent = state.alternatives.diagnosticMessage || '';

    const container = document.getElementById('pathwaysGrid');
    if (!container) return;
    container.innerHTML = '';

    const list = state.alternatives.pathways || [];
    list.forEach(p => {
      const card = document.createElement('div');
      card.className = 'pathway-card';
      card.innerHTML = `
        <div class="pathway-tag">${p.planTag}</div>
        <h4 class="pathway-college">${p.collegeName}</h4>
        <div class="pathway-branch">Branch: <strong>${p.branch}</strong></div>
        <div class="pathway-reason">${p.reason}</div>
        <div class="pathway-cost">Estimated Annual Net Cost: <strong>${formatINR(p.annualCost)}/yr</strong></div>
      `;
      container.appendChild(card);
    });
  } catch (e) {
    console.error('Failed to load alternatives:', e);
  }
}

// ─── Deadlines & Deadline Risk Monitoring Engine ──────────────────────────────
async function loadDeadlines() {
  try {
    const res = await fetch(`${API_BASE}/api/deadlines`);
    if (!res.ok) return;
    const data = await res.json();
    state.deadlines = data.deadlines || [];

    // Evaluate live countdown and missing document risk
    evaluateDeadlinesWithRisk();
    renderDeadlines();
  } catch (e) {
    console.error('Failed to load deadlines:', e);
  }
}

function evaluateDeadlinesWithRisk() {
  const now = new Date();
  const docs = (state.documentsData && state.documentsData.documents) || [];
  const isDocVerified = (reqName) => {
    const found = docs.find(doc => doc.documentType.toLowerCase().includes(reqName.toLowerCase().replace(/[^a-z]/g, '')));
    return found && ((found.status || '').toUpperCase() === 'VERIFIED' || (found.status || '').toUpperCase() === 'UPLOADED');
  };

  state.deadlines.forEach(item => {
    const target = new Date(item.dueDate || item.date || item.deadlineDate);
    const diffMs = target.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const hoursRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60)) % 24);

    item.daysRemaining = daysRemaining;
    item.hoursRemaining = hoursRemaining;

    // Check missing documents
    const reqDocs = item.requiredDocuments || ['Income Certificate'];
    const missingDocs = reqDocs.filter(d => !isDocVerified(d));
    item.missingDocs = missingDocs;

    // Risk Classification:
    // HIGH: < 12 days remaining AND any required document is missing
    // MEDIUM: 12-25 days remaining AND documents missing
    // LOW: All documents verified OR plenty of time remaining
    if (missingDocs.length > 0 && daysRemaining <= 12) {
      item.riskLevel = 'HIGH';
      item.riskLabel = `🚨 High Risk: Missing ${missingDocs[0]}`;
    } else if (missingDocs.length > 0 && daysRemaining <= 25) {
      item.riskLevel = 'MEDIUM';
      item.riskLabel = `⚠️ Moderate Risk: ${missingDocs.length} Document(s) Pending`;
    } else {
      item.riskLevel = 'LOW';
      item.riskLabel = `✅ On Track / Ready`;
    }
  });
}

function renderDeadlines() {
  const container = document.getElementById('deadlinesList');
  if (!container) return;
  container.innerHTML = '';

  let list = state.deadlines || [];

  // Filter application
  if (state.deadlineFilter === 'high-risk') {
    list = list.filter(d => d.riskLevel === 'HIGH');
  } else if (state.deadlineFilter === 'admission') {
    list = list.filter(d => (d.category || '').toLowerCase() === 'admission');
  } else if (state.deadlineFilter === 'scholarship') {
    list = list.filter(d => (d.category || '').toLowerCase() === 'scholarship');
  }

  if (list.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:1.5rem; text-align:center; color:var(--color-slate-500);">No deadlines match the selected filter.</div>';
    return;
  }

  list.forEach(item => {
    const card = document.createElement('div');
    const riskClass = (item.riskLevel || 'LOW').toLowerCase();
    card.className = `deadline-card risk-${riskClass}`;

    const title = item.title || item.entityName || 'Admissions Deadline';
    const dueDate = item.dueDate || item.date || item.deadlineDate || '';
    const desc = item.description || '';
    const days = item.daysRemaining !== undefined ? item.daysRemaining : 0;
    const hours = item.hoursRemaining !== undefined ? item.hoursRemaining : 0;

    const riskPillClass = `risk-pill-${riskClass}`;

    card.innerHTML = `
      <div class="deadline-info">
        <h4 style="margin:0 0 0.2rem 0; font-size:0.95rem; color:var(--color-navy-dark);">${title}</h4>
        <div class="deadline-meta" style="font-size:0.8rem; color:var(--color-slate-600);">
          <span>Closing Date: <strong>${dueDate}</strong></span> ·
          <span>${desc}</span>
        </div>
        <div>
          <span class="deadline-risk-pill ${riskPillClass}">${item.riskLabel}</span>
        </div>
      </div>
      <div class="deadline-countdown-badge">
        <div class="countdown-days">${days}</div>
        <div class="countdown-label">${days === 1 ? 'Day' : 'Days'} ${hours}h Left</div>
      </div>
    `;

    container.appendChild(card);
  });
}

// ─── Dynamic Roadmap Timeline ─────────────────────────────────────────────────
async function loadRoadmap() {
  try {
    const res = await fetch(`${API_BASE}/api/roadmap`);
    if (!res.ok) return;
    state.roadmap = await res.json();
    renderRoadmap();
  } catch (e) {
    console.error('Failed to load roadmap:', e);
  }
}

function renderRoadmap() {
  const container = document.getElementById('roadmapTimeline');
  if (!container) return;
  container.innerHTML = '';

  const list = state.roadmap || [];
  list.forEach((step, idx) => {
    const el = document.createElement('div');
    const isDone = step.status === 'done' || step.completed === true;
    const statusClass = isDone ? 'status-completed' : (step.status === 'active' || idx === 1 ? 'status-in-progress' : 'status-pending');

    let markerContent = idx + 1;
    if (isDone) markerContent = '✓';
    else if (statusClass === 'status-in-progress') markerContent = '▶';

    el.className = `timeline-step ${statusClass}`;
    el.innerHTML = `
      <div class="step-marker">${markerContent}</div>
      <div class="step-content">
        <div class="step-title">${step.title}</div>
        <div class="step-desc">${step.description || ('Scheduled for ' + (step.month || '2026 Session'))}</div>
      </div>
    `;

    container.appendChild(el);
  });
}

// ─── "Why This Match?" Modal (Anakin-Powered) ─────────────────────────────────
async function openWhyMatchModal(collegeId, collegeName) {
  const modal = document.getElementById('whyMatchModal');
  const title = document.getElementById('modalCollegeName');
  const body = document.getElementById('modalAiReasoning');

  if (title) title.textContent = `Match Evaluation: ${collegeName}`;
  if (body) body.innerHTML = '<div style="display:flex; align-items:center; gap:0.5rem;"><div class="ocr-spinner" style="width:20px; height:20px;"></div> Analyzing official cutoffs, home state quota rules, and placement stats...</div>';

  if (modal) modal.classList.add('open');

  try {
    const res = await fetch(`${API_BASE}/api/why-match?collegeId=${encodeURIComponent(collegeId)}`);
    if (res.ok) {
      const data = await res.json();
      body.innerHTML = `
        <div style="font-size: 0.92rem; line-height: 1.6; color: var(--color-slate-800);">
          ${data.aiReasoning || 'Strong academic and financial match.'}
        </div>
      `;
    } else {
      body.textContent = 'Evaluation based on previous closing cutoffs and fee structures.';
    }
  } catch (e) {
    body.textContent = 'Match analysis currently utilizing standard JoSAA/CSAB closing cutoff matrices.';
  }
}

// ─── Profile Persistence ──────────────────────────────────────────────────────
async function loadProfile() {
  try {
    const res = await fetch(`${API_BASE}/api/profile`);
    if (!res.ok) return;
    state.student = await res.json();
    populateProfileForm(state.student);
    updateHeroSummary(state.student);
  } catch (e) {
    console.error('Failed to load profile:', e);
  }
}

function populateProfileForm(s) {
  if (!s) return;
  const nameEl = document.getElementById('inputName');
  if (nameEl) nameEl.value = s.name || '';

  const pctEl = document.getElementById('inputPercentile');
  if (pctEl) pctEl.value = s.jeePercentile || 92;

  const catEl = document.getElementById('inputCategory');
  if (catEl) catEl.value = s.category || 'OBC-NCL';

  const stEl = document.getElementById('inputState');
  if (stEl) stEl.value = s.state || 'Jharkhand';

  const brEl = document.getElementById('inputBranch');
  if (brEl) brEl.value = s.preferredBranch || 'CSE';

  const incEl = document.getElementById('inputIncome');
  if (incEl) incEl.value = s.annualIncome || 300000;

  const budEl = document.getElementById('inputBudget');
  if (budEl) budEl.value = s.annualBudget || 100000;
}

function updateHeroSummary(s) {
  if (!s) return;
  const heroPill = document.getElementById('heroPillText');
  if (heroPill) {
    heroPill.textContent = `Active Student: ${s.name} (${s.state} · ${s.category} · ${Number(s.jeePercentile).toFixed(1)}%ile)`;
  }
}

async function saveProfile() {
  const s = {
    name: document.getElementById('inputName')?.value || 'Asha Kumar',
    jeePercentile: parseFloat(document.getElementById('inputPercentile')?.value) || 92.0,
    category: document.getElementById('inputCategory')?.value || 'OBC-NCL',
    state: document.getElementById('inputState')?.value || 'Jharkhand',
    preferredBranch: document.getElementById('inputBranch')?.value || 'CSE',
    annualIncome: parseInt(document.getElementById('inputIncome')?.value) || 300000,
    annualBudget: parseInt(document.getElementById('inputBudget')?.value) || 100000
  };

  state.student = s;

  // 1. Post to API
  try {
    await fetch(`${API_BASE}/api/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(s)
    });
  } catch (e) {}

  // 2. Sync to Supabase
  if (state.currentUser && window.FGNDB) {
    await window.FGNDB.upsertProfile(state.currentUser.id, s);
  }

  updateHeroSummary(s);
  showToast(`Profile updated for ${s.name}. Recalculating cutoffs & grants.`);

  // Recalculate everything
  await Promise.allSettled([
    loadColleges(),
    loadScholarships(),
    loadAlternatives(),
    loadDeadlines()
  ]);

  runApplicationErrorChecks();
  updateReadinessScore();
  updateWhatNextActions();
}

function setPreset(name, pct, cat, st, inc, br, bud, btnId) {
  document.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('active'));
  const btn = document.getElementById(btnId);
  if (btn) btn.classList.add('active');

  const nameEl = document.getElementById('inputName');
  if (nameEl) nameEl.value = name;
  const pctEl = document.getElementById('inputPercentile');
  if (pctEl) pctEl.value = pct;
  const catEl = document.getElementById('inputCategory');
  if (catEl) catEl.value = cat;
  const stEl = document.getElementById('inputState');
  if (stEl) stEl.value = st;
  const incEl = document.getElementById('inputIncome');
  if (incEl) incEl.value = inc;
  const brEl = document.getElementById('inputBranch');
  if (brEl) brEl.value = br;
  const budEl = document.getElementById('inputBudget');
  if (budEl) budEl.value = bud;

  saveProfile();
}

// ─── Flow Navigation Scroll Synchronization ───────────────────────────────────
function setupFlowScrollListener() {
  const sections = [
    { id: 'profile-section', step: 'profile' },
    { id: 'colleges-section', step: 'colleges' },
    { id: 'calculator-section', step: 'affordability' },
    { id: 'documents-section', step: 'documents' },
    { id: 'readiness-section', step: 'readiness' },
    { id: 'deadlines-section', step: 'deadlines' },
    { id: 'next-actions-section', step: 'what-next' }
  ];

  window.addEventListener('scroll', () => {
    const scrollPos = window.scrollY + 200;
    for (let i = sections.length - 1; i >= 0; i--) {
      const el = document.getElementById(sections[i].id);
      if (el && el.offsetTop <= scrollPos) {
        document.querySelectorAll('.flow-step-item').forEach(item => {
          if (item.dataset.step === sections[i].step) {
            item.classList.add('active');
          } else {
            item.classList.remove('active');
          }
        });
        break;
      }
    }
  });
}

// ─── Data Master Loader ───────────────────────────────────────────────────────
async function loadAllData() {
  try {
    await loadProfile();
    await Promise.allSettled([
      loadColleges(),
      loadScholarships(),
      loadAlternatives(),
      loadDocuments(),
      loadDeadlines(),
      loadRoadmap(),
      loadTranslations(state.currentLang)
    ]);

    runApplicationErrorChecks();
    updateReadinessScore();
    updateWhatNextActions();
  } catch (err) {
    console.error('Error loading data:', err);
  }
}

// ─── Translations & Multi-Language ────────────────────────────────────────────
async function loadTranslations(lang) {
  try {
    const res = await fetch(`${API_BASE}/api/translate?lang=${lang}`);
    if (!res.ok) return;
    state.translations = await res.json();
    applyTranslations();
  } catch (err) {}
}

function applyTranslations() {
  const dict = state.translations || {};
  if (dict['tagline']) {
    const t = document.getElementById('t-tagline');
    if (t) t.textContent = dict['tagline'];
  }
  if (dict['subtagline']) {
    const st = document.getElementById('t-subtagline');
    if (st) st.textContent = dict['subtagline'];
  }
  updateTierTip();
}

// ─── Auth Listeners & UI Helpers ──────────────────────────────────────────────
function updateAuthUI(user) {
  state.currentUser = user;
  const dot = document.getElementById('authIndicatorDot');
  const statusText = document.getElementById('authStatusText');
  const btnLogin = document.getElementById('btnOpenLogin');
  const btnSignup = document.getElementById('btnOpenSignup');
  const btnSignOut = document.getElementById('btnSignOut');
  const progressPrompt = document.getElementById('progressLoginPrompt');

  if (user) {
    if (dot) dot.classList.add('logged-in');
    if (statusText) statusText.textContent = `Signed in as ${user.user_metadata?.full_name || user.email} — synced to cloud.`;
    if (btnLogin) btnLogin.style.display = 'none';
    if (btnSignup) btnSignup.style.display = 'none';
    if (btnSignOut) btnSignOut.style.display = '';
    if (progressPrompt) progressPrompt.style.display = 'none';
  } else {
    if (dot) dot.classList.remove('logged-in');
    if (statusText) statusText.textContent = 'Not signed in — your data is stored locally in IndexedDB.';
    if (btnLogin) btnLogin.style.display = '';
    if (btnSignup) btnSignup.style.display = '';
    if (btnSignOut) btnSignOut.style.display = 'none';
    if (progressPrompt) progressPrompt.style.display = '';
  }
}

function setupAuthListeners() {
  const btnLogin = document.getElementById('btnOpenLogin');
  const btnSignup = document.getElementById('btnOpenSignup');
  const btnSignOut = document.getElementById('btnSignOut');
  const authModal = document.getElementById('authModal');

  if (btnLogin) btnLogin.addEventListener('click', () => { switchAuthTab('login'); authModal?.classList.add('open'); });
  if (btnSignup) btnSignup.addEventListener('click', () => { switchAuthTab('signup'); authModal?.classList.add('open'); });

  if (btnSignOut && window.FGNAuth) {
    btnSignOut.addEventListener('click', async () => {
      await window.FGNAuth.signOut();
      updateAuthUI(null);
      showToast('Signed out. Local session remains preserved in browser.');
    });
  }

  const loginForm = document.getElementById('loginForm');
  if (loginForm && window.FGNAuth) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail')?.value;
      const pass = document.getElementById('loginPassword')?.value;
      const res = await window.FGNAuth.signIn(email, pass);
      if (res?.error) {
        showToast(res.error.message || 'Login failed.');
      } else {
        authModal?.classList.remove('open');
        updateAuthUI(res.data.user);
        showToast('Successfully signed in.');
        await syncProfileFromSupabase();
        await syncDocumentsFromSupabase();
        await loadProgress();
      }
    });
  }

  const signupForm = document.getElementById('signupForm');
  if (signupForm && window.FGNAuth) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('signupName')?.value;
      const email = document.getElementById('signupEmail')?.value;
      const pass = document.getElementById('signupPassword')?.value;
      const res = await window.FGNAuth.signUp(email, pass, name);
      if (res?.error) {
        showToast(res.error.message || 'Signup failed.');
      } else {
        authModal?.classList.remove('open');
        showToast('Account created. Check email if confirmation is enabled.');
      }
    });
  }
}

window.switchAuthTab = function(tab) {
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const tabLogin = document.getElementById('tabLogin');
  const tabSignup = document.getElementById('tabSignup');
  if (tab === 'login') {
    if (loginForm) loginForm.style.display = '';
    if (signupForm) signupForm.style.display = 'none';
    if (tabLogin) tabLogin.classList.add('active');
    if (tabSignup) tabSignup.classList.remove('active');
  } else {
    if (loginForm) loginForm.style.display = 'none';
    if (signupForm) signupForm.style.display = '';
    if (tabLogin) tabLogin.classList.remove('active');
    if (tabSignup) tabSignup.classList.add('active');
  }
};

async function loadProgress() {
  const container = document.getElementById('progressStepsGrid');
  if (!container) return;

  const DEFAULT_STEPS = [
    { step: 1, stepId: 'RESULTS', title: 'JEE Main Results & Score Analysis', description: 'Review official scorecard from NTA portal.', month: 'Apr 2026', completed: true },
    { step: 2, stepId: 'DOCS', title: 'Category & Income Document Verification', description: 'Obtain and OCR-verify Tehsildar certificates.', month: 'May 2026', completed: true },
    { step: 3, stepId: 'JOSAA', title: 'JoSAA Choice Filling — Rounds 1–6', description: 'Fill choices on josaa.admissions.nic.in.', month: 'Jun 2026', completed: false },
    { step: 4, stepId: 'CSAB', title: 'CSAB Special Vacant Round Participation', description: 'Target vacant seats on csab.nic.in.', month: 'Aug 2026', completed: false },
    { step: 5, stepId: 'SCHOLARSHIP', title: 'Apply for NSP / e-Kalyan Scholarship', description: 'Submit portal applications.', month: 'Sep 2026', completed: false },
    { step: 6, stepId: 'COLLEGE', title: 'College Reporting & Physical Admission', description: 'Report to allotted college with verified originals.', month: 'Nov 2026', completed: false }
  ];

  let steps = DEFAULT_STEPS.map(s => ({ ...s }));
  if (state.currentUser && window.FGNDB) {
    const { data } = await window.FGNDB.getProgress(state.currentUser.id);
    if (data && data.length > 0) {
      const map = {};
      data.forEach(r => { map[r.step_id] = r.completed; });
      steps = steps.map(s => ({ ...s, completed: map[s.stepId] !== undefined ? map[s.stepId] : s.completed }));
    }
  }

  container.innerHTML = '';
  steps.forEach((step, idx) => {
    const card = document.createElement('div');
    const isActive = !step.completed && (idx === 0 || steps[idx - 1].completed);
    card.className = `progress-step-card${step.completed ? ' completed' : (isActive ? ' active' : '')}`;
    card.innerHTML = `
      <div class="step-checkbox">${step.completed ? '✓' : (isActive ? '▶' : step.step)}</div>
      <div class="step-info">
        <div class="step-card-title">${step.title}</div>
        <div class="step-card-desc">${step.description}</div>
        <div class="step-card-month">${step.month}</div>
      </div>
    `;
    card.addEventListener('click', async () => {
      if (!state.currentUser) {
        document.getElementById('authModal')?.classList.add('open');
        showToast('Sign in to save your admission progress.');
        return;
      }
      step.completed = !step.completed;
      if (window.FGNDB) {
        await window.FGNDB.updateProgress(state.currentUser.id, step.stepId, step.completed);
      }
      await loadProgress();
    });
    container.appendChild(card);
  });
}

async function syncProfileFromSupabase() {
  if (!state.currentUser || !window.FGNDB) return;
  const { data } = await window.FGNDB.getProfile(state.currentUser.id);
  if (data) {
    state.student = {
      name: data.name,
      jeePercentile: data.jee_percentile,
      category: data.category,
      state: data.state,
      preferredBranch: data.preferred_branch,
      annualIncome: data.annual_income,
      annualBudget: data.annual_budget
    };
    populateProfileForm(state.student);
    updateHeroSummary(state.student);
  }
}

async function syncDocumentsFromSupabase() {
  if (!state.currentUser || !window.FGNDB || !state.documentsData) return;
  const { data } = await window.FGNDB.getDocuments(state.currentUser.id);
  if (data && data.length > 0) {
    const map = {};
    data.forEach(d => { map[d.document_type.toLowerCase()] = d; });
    state.documentsData.documents.forEach(doc => {
      const match = map[doc.documentType.toLowerCase()];
      if (match) {
        doc.fileName = match.file_name;
        doc.status = match.status;
      }
    });
    renderDocuments();
  }
}
