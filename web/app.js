/**
 * FIRST GEN NAVIGATOR — Client-Side Interactive Engine
 * Clean, institutional academic advisory logic (no AI platform emojis).
 */

const API_BASE = '';

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
  currentUser: null,   // Supabase user
  authReady: false     // true once Supabase session has been checked
};

// Formatting helpers
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

// ─── Auth UI ──────────────────────────────────────────────────────────────────

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
    if (statusText) statusText.textContent = `Signed in as ${user.user_metadata?.full_name || user.email} — data synced to cloud.`;
    if (btnLogin) btnLogin.style.display = 'none';
    if (btnSignup) btnSignup.style.display = 'none';
    if (btnSignOut) btnSignOut.style.display = '';
    if (progressPrompt) progressPrompt.style.display = 'none';
  } else {
    if (dot) dot.classList.remove('logged-in');
    if (statusText) statusText.textContent = 'Not signed in — your data is stored locally only.';
    if (btnLogin) btnLogin.style.display = '';
    if (btnSignup) btnSignup.style.display = '';
    if (btnSignOut) btnSignOut.style.display = 'none';
    if (progressPrompt) progressPrompt.style.display = '';
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

// ─── Progress Dashboard (Supabase-backed) ─────────────────────────────────────

const DEFAULT_STEPS = [
  { step: 1, stepId: 'RESULTS',    title: 'JEE Main Results & Score Analysis',            description: 'Review official scorecard from NTA portal.', month: 'Apr 2025', completed: true  },
  { step: 2, stepId: 'DOCS',       title: 'Category Certificate & Income Document Prep',  description: 'Obtain caste, income, domicile certificates.', month: 'May 2025', completed: true  },
  { step: 3, stepId: 'JOSAA',      title: 'JoSAA Choice Filling — Rounds 1–6',            description: 'Fill choices on josaa.admissions.nic.in.', month: 'Jun 2025', completed: false },
  { step: 4, stepId: 'CSAB',       title: 'CSAB Special Round Participation',             description: 'Register on csab.nic.in if needed.', month: 'Aug 2025', completed: false },
  { step: 5, stepId: 'SCHOLARSHIP', title: 'Apply for NSP / e-Kalyan Scholarship',        description: 'Apply on scholarships.gov.in / ekalyan.', month: 'Sep 2025', completed: false },
  { step: 6, stepId: 'COLLEGE',    title: 'College Document Reporting & Admission',       description: 'Report to allotted college with originals.', month: 'Nov 2025', completed: false },
];

async function loadProgress() {
  const container = document.getElementById('progressStepsGrid');
  if (!container) return;

  let steps = DEFAULT_STEPS.map(s => ({ ...s }));

  if (state.currentUser) {
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
    card.dataset.stepId = step.stepId;
    card.innerHTML = `
      <div class="step-checkbox">${step.completed ? '&#10003;' : (isActive ? '&#9654;' : step.step)}</div>
      <div class="step-info">
        <div class="step-card-title">${step.title}</div>
        <div class="step-card-desc">${step.description}</div>
        <div class="step-card-month">${step.month}</div>
      </div>
    `;
    card.addEventListener('click', () => toggleProgressStep(step, card, steps));
    container.appendChild(card);
  });
}

async function toggleProgressStep(step, card, steps) {
  if (!state.currentUser) {
    document.getElementById('authModal').classList.add('open');
    showToast('Sign in to save your progress across devices.');
    return;
  }
  const newVal = !step.completed;
  step.completed = newVal;
  await window.FGNDB.updateProgress(state.currentUser.id, step.stepId, newVal);
  await loadProgress(); // re-render
}

// ─── Supabase Profile Sync ────────────────────────────────────────────────────

async function syncProfileFromSupabase() {
  if (!state.currentUser) return;
  const { data, error } = await window.FGNDB.getProfile(state.currentUser.id);
  if (data && !error) {
    const profileFromDB = {
      name: data.name,
      jeePercentile: data.jee_percentile,
      category: data.category,
      state: data.state,
      preferredBranch: data.preferred_branch,
      annualIncome: data.annual_income,
      annualBudget: data.annual_budget
    };
    state.student = profileFromDB;
    populateProfileForm(profileFromDB);
    updateHeroSummary(profileFromDB);
  }
}

async function syncDocumentsFromSupabase() {
  if (!state.currentUser || !state.documentsData) return;
  const { data, error } = await window.FGNDB.getDocuments(state.currentUser.id);
  if (data && !error && data.length > 0) {
    // Merge DB documents into vault
    const dbMap = {};
    data.forEach(d => { dbMap[d.document_type.toLowerCase()] = d; });

    if (state.documentsData.documents) {
      state.documentsData.documents.forEach(doc => {
        const dbDoc = dbMap[doc.documentType.toLowerCase()];
        if (dbDoc) {
          doc.fileName = dbDoc.file_name;
          doc.status = dbDoc.status;
        }
      });
    }
    renderDocuments();
  }
}

// Initial Boot
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  setupAuthListeners();

  // Check existing session
  const session = await window.FGNAuth.getSession();
  const user = session?.user ?? null;
  updateAuthUI(user);
  state.authReady = true;

  await loadAllData();

  // If signed in, sync cloud data
  if (user) {
    await syncProfileFromSupabase();
    await syncDocumentsFromSupabase();
  }
  await loadProgress();
});



function setupEventListeners() {
  // Navigation
  const btnRefresh = document.getElementById('btnQuickRecalc');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', async () => {
      await loadAllData();
      showToast('All college cutoffs and feasibility calculations updated.');
    });
  }

  // Profile Form
  const profileForm = document.getElementById('profileForm');
  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveProfile();
    });
  }

  // Preset Chips
  const btnAsha = document.getElementById('btnPresetAsha');
  if (btnAsha) {
    btnAsha.addEventListener('click', () => setPreset('Asha Kumar', 92.0, 'OBC-NCL', 'Jharkhand', 300000, 'CSE', 100000, 'btnPresetAsha'));
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

  // Global "+ Upload Document" button in Vault header
  const btnOpenUploadNew = document.getElementById('btnOpenUploadModalNew');
  if (btnOpenUploadNew) {
    btnOpenUploadNew.addEventListener('click', () => {
      openUploadModal('Income Certificate');
    });
  }

  // Real File Input listener
  const realFileInput = document.getElementById('realFileInput');
  if (realFileInput) {
    realFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        document.getElementById('uploadFileName').value = e.target.files[0].name;
      }
    });
  }

  // Document Type Select in Modal
  const docTypeSelect = document.getElementById('uploadDocTypeSelect');
  const customGroup = document.getElementById('customDocTypeGroup');
  if (docTypeSelect) {
    docTypeSelect.addEventListener('change', (e) => {
      if (e.target.value === 'Other') {
        if (customGroup) customGroup.style.display = 'flex';
      } else {
        if (customGroup) customGroup.style.display = 'none';
        const fileNameInput = document.getElementById('uploadFileName');
        if (fileNameInput && !document.getElementById('realFileInput').files.length) {
          fileNameInput.value = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_verified.pdf';
        }
      }
    });
  }

  // Modal Closures
  const closeWhyMatch = document.getElementById('btnCloseWhyMatchModal');
  if (closeWhyMatch) {
    closeWhyMatch.addEventListener('click', () => {
      document.getElementById('whyMatchModal').classList.remove('open');
    });
  }
  const closeWhyMatchBtn = document.getElementById('btnCloseWhyMatchBtn');
  if (closeWhyMatchBtn) {
    closeWhyMatchBtn.addEventListener('click', () => {
      document.getElementById('whyMatchModal').classList.remove('open');
    });
  }

  const closeUploadModal = document.getElementById('btnCloseUploadModal');
  if (closeUploadModal) {
    closeUploadModal.addEventListener('click', () => {
      document.getElementById('uploadDocModal').classList.remove('open');
    });
  }
  const cancelUploadBtn = document.getElementById('btnCancelUpload');
  if (cancelUploadBtn) {
    cancelUploadBtn.addEventListener('click', () => {
      document.getElementById('uploadDocModal').classList.remove('open');
    });
  }

  // Confirm Upload
  const confirmUploadBtn = document.getElementById('btnConfirmUpload');
  if (confirmUploadBtn) {
    confirmUploadBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await confirmDocumentUpload();
    });
  }
}

// ─── Auth Event Listeners ─────────────────────────────────────────────────────

function setupAuthListeners() {
  // Open auth modal
  const btnOpenLogin = document.getElementById('btnOpenLogin');
  if (btnOpenLogin) btnOpenLogin.addEventListener('click', () => {
    switchAuthTab('login');
    document.getElementById('authModal').classList.add('open');
  });
  const btnOpenSignup = document.getElementById('btnOpenSignup');
  if (btnOpenSignup) btnOpenSignup.addEventListener('click', () => {
    switchAuthTab('signup');
    document.getElementById('authModal').classList.add('open');
  });

  // Close auth modal
  const btnCloseAuth = document.getElementById('btnCloseAuthModal');
  if (btnCloseAuth) btnCloseAuth.addEventListener('click', () => {
    document.getElementById('authModal').classList.remove('open');
  });

  // Login form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;
      const errEl = document.getElementById('loginError');
      const btn = document.getElementById('btnLogin');
      if (btn) btn.textContent = 'Signing in...';
      if (errEl) errEl.style.display = 'none';

      const { data, error } = await window.FGNAuth.signIn(email, password);
      if (btn) btn.textContent = 'Sign In →';
      if (error) {
        if (errEl) { errEl.textContent = error.message; errEl.style.display = ''; }
      } else {
        document.getElementById('authModal').classList.remove('open');
        updateAuthUI(data.user);
        showToast(`Welcome back, ${data.user.user_metadata?.full_name || data.user.email}!`);
        await syncProfileFromSupabase();
        await syncDocumentsFromSupabase();
        await loadProgress();
      }
    });
  }

  // Signup form
  const signupForm = document.getElementById('signupForm');
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('signupName').value;
      const email = document.getElementById('signupEmail').value;
      const password = document.getElementById('signupPassword').value;
      const errEl = document.getElementById('signupError');
      const btn = document.getElementById('btnSignup');
      if (btn) btn.textContent = 'Creating account...';
      if (errEl) errEl.style.display = 'none';

      const { data, error } = await window.FGNAuth.signUp(email, password, name);
      if (btn) btn.textContent = 'Create Account →';
      if (error) {
        if (errEl) { errEl.textContent = error.message; errEl.style.display = ''; }
      } else {
        document.getElementById('authModal').classList.remove('open');
        // If email confirmation required
        if (data.session) {
          updateAuthUI(data.user);
          showToast(`Account created! Welcome, ${name}!`);
          await loadProgress();
        } else {
          showToast('Account created! Please check your email to confirm.');
        }
      }
    });
  }

  // Sign out
  const btnSignOut = document.getElementById('btnSignOut');
  if (btnSignOut) {
    btnSignOut.addEventListener('click', async () => {
      await window.FGNAuth.signOut();
      updateAuthUI(null);
      showToast('Signed out successfully.');
      await loadProgress();
    });
  }

  // Auth state changes (tab switching, token refresh)
  window.addEventListener('fgn:authchange', async (e) => {
    const { event, session } = e.detail;
    const user = session?.user ?? null;
    updateAuthUI(user);
    if (event === 'SIGNED_IN') {
      await syncProfileFromSupabase();
      await syncDocumentsFromSupabase();
      await loadProgress();
    } else if (event === 'SIGNED_OUT') {
      await loadProgress();
    }
  });
}

// Data Fetchers

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
  } catch (err) {
    console.error('Error loading data:', err);
    showToast('Connecting to server...');
  }
}

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
  if (pctEl) pctEl.value = s.jeePercentile || 0;

  const catEl = document.getElementById('inputCategory');
  if (catEl) catEl.value = s.category || 'GEN';

  const stEl = document.getElementById('inputState');
  if (stEl) stEl.value = s.state || 'Jharkhand';

  const brEl = document.getElementById('inputBranch');
  if (brEl) brEl.value = s.preferredBranch || 'CSE';

  const incEl = document.getElementById('inputIncome');
  if (incEl) incEl.value = s.annualIncome || 0;

  const budEl = document.getElementById('inputBudget');
  if (budEl) budEl.value = s.annualBudget || 0;
}

function updateHeroSummary(s) {
  if (!s) return;
  const heroPill = document.getElementById('heroPillText');
  if (heroPill) {
    heroPill.textContent = `Active Student: ${s.name} (${s.state} · ${s.category} · ${Number(s.jeePercentile).toFixed(1)}%ile)`;
  }
}

async function saveProfile() {
  const saveStatus = document.getElementById('profileSaveStatus');
  if (saveStatus) saveStatus.textContent = 'Saving profile and calculating...';

  const payload = {
    name: document.getElementById('inputName').value,
    jeePercentile: document.getElementById('inputPercentile').value,
    category: document.getElementById('inputCategory').value,
    state: document.getElementById('inputState').value,
    preferredBranch: document.getElementById('inputBranch').value,
    annualIncome: document.getElementById('inputIncome').value,
    annualBudget: document.getElementById('inputBudget').value
  };

  try {
    const res = await fetch(`${API_BASE}/api/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      state.student = await res.json();
      updateHeroSummary(state.student);
      if (saveStatus) {
        saveStatus.textContent = 'Profile successfully updated';
        setTimeout(() => { saveStatus.textContent = ''; }, 3000);
      }

      // Sync to Supabase if user is signed in
      if (state.currentUser) {
        await window.FGNDB.upsertProfile(state.currentUser.id, payload);
      }

      await Promise.allSettled([
        loadColleges(),
        loadScholarships(),
        loadAlternatives(),
        loadRoadmap()
      ]);
      showToast('Profile and institutional options synchronized.');
    }
  } catch (err) {
    if (saveStatus) saveStatus.textContent = 'Error updating profile.';
  }
}


function setPreset(name, percentile, category, st, income, branch, budget, btnId) {
  document.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('active'));
  const btn = document.getElementById(btnId);
  if (btn) btn.classList.add('active');

  const nameEl = document.getElementById('inputName');
  if (nameEl) nameEl.value = name;

  const pctEl = document.getElementById('inputPercentile');
  if (pctEl) pctEl.value = percentile;

  const catEl = document.getElementById('inputCategory');
  if (catEl) catEl.value = category;

  const stEl = document.getElementById('inputState');
  if (stEl) stEl.value = st;

  const brEl = document.getElementById('inputBranch');
  if (brEl) brEl.value = branch;

  const incEl = document.getElementById('inputIncome');
  if (incEl) incEl.value = income;

  const budEl = document.getElementById('inputBudget');
  if (budEl) budEl.value = budget;

  saveProfile();
}

async function loadColleges() {
  try {
    const res = await fetch(`${API_BASE}/api/colleges`);
    if (!res.ok) return;
    state.collegeData = await res.json();

    const tiers = state.collegeData.tiers || {};
    const realisticList = tiers['REALISTIC'] || tiers['realistic'] || [];
    const dreamList = tiers['DREAM'] || tiers['dream'] || [];
    const safeList = tiers['SAFE'] || tiers['safe'] || [];

    const cntRealistic = document.getElementById('countRealistic');
    if (cntRealistic) cntRealistic.textContent = realisticList.length;

    const cntDream = document.getElementById('countDream');
    if (cntDream) cntDream.textContent = dreamList.length;

    const cntSafe = document.getElementById('countSafe');
    if (cntSafe) cntSafe.textContent = safeList.length;

    const statCount = document.getElementById('statCollegesCount');
    if (statCount) statCount.textContent = realisticList.length + dreamList.length + safeList.length;

    populateCalculatorCollegeSelect(tiers);
    renderColleges();
  } catch (e) {
    console.error('Failed to load colleges:', e);
  }
}

function populateCalculatorCollegeSelect(tiers) {
  const select = document.getElementById('calcCollegeSelect');
  if (!select) return;
  select.innerHTML = '';

  const realisticList = tiers['REALISTIC'] || tiers['realistic'] || [];
  const dreamList = tiers['DREAM'] || tiers['dream'] || [];
  const safeList = tiers['SAFE'] || tiers['safe'] || [];

  const all = [...realisticList, ...dreamList, ...safeList];
  const seen = new Set();
  all.forEach(c => {
    const cid = c.id || c.collegeId;
    if (cid && !seen.has(cid)) {
      seen.add(cid);
      const opt = document.createElement('option');
      opt.value = cid;
      opt.textContent = `${c.name || c.collegeName} (${c.type || c.instituteType}, ${c.state})`;
      select.appendChild(opt);
    }
  });

  if (select.options.length > 0) {
    calculateAffordability();
  }
}

function updateTierTip() {
  const tipText = document.getElementById('tierTipText');
  if (!tipText) return;
  const dict = state.translations || {};
  const current = state.currentTier.toLowerCase();
  if (current === 'realistic') {
    tipText.textContent = dict['realistic_tip'] || 'Realistic colleges are your prime target matches where your rank has a very strong admission probability.';
  } else if (current === 'dream') {
    tipText.textContent = dict['dream_tip'] || 'Dream colleges are aspirational goals where you might get a seat during later rounds or special CSAB counseling.';
  } else {
    tipText.textContent = dict['safe_tip'] || 'Safe colleges are your guaranteed backup safety net where your marks are well above past closing cutoffs.';
  }
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
    container.innerHTML = `<div class="empty-state" style="padding: 2rem; text-align: center; color: var(--color-slate-500); grid-column: 1 / -1;">No institutions in this tier currently matched with your score. Try adjusting your preferred branch or score.</div>`;
    return;
  }

  list.forEach(c => {
    const card = document.createElement('div');
    card.className = 'college-card';

    const collegeId = c.id || c.collegeId;
    const collegeName = c.name || c.collegeName;
    const collegeType = c.type || c.instituteType || 'Institute';
    const nirf = c.nirfRank || 0;
    const branch = c.branch || 'Engg';
    const cutoff = c.effectiveCutoff || c.cutoffPercentile || 0;
    const isHs = c.isHomeState || c.isHomeStateEligible;
    const board = c.counsellingBoard || 'JoSAA / State';

    const aff = c.affordability || {};
    const tuition = aff.annualTuition || 0;
    const hostel = aff.annualHostel || 0;
    const scholarship = aff.applicableScholarship || 0;
    const netCost = aff.estimatedNetCost !== undefined ? aff.estimatedNetCost : (tuition + hostel - scholarship);
    const tierName = aff.affordabilityTier || 'Affordable';

    const hsBadge = isHs ? `<span class="badge-home-state">Home State Quota</span>` : '';

    const studentPct = state.student ? Number(state.student.jeePercentile) : 0;
    const diff = (studentPct - cutoff).toFixed(1);
    const diffSign = diff >= 0 ? `+${diff}` : `${diff}`;
    const diffColor = diff >= 0 ? 'var(--color-emerald)' : 'var(--color-rose)';

    let badgeClass = 'tier-affordable';
    if (tierName.includes('Highly')) badgeClass = 'tier-highly-affordable';
    else if (tierName.includes('Stretch')) badgeClass = 'tier-stretch';
    else if (tierName.includes('Not')) badgeClass = 'tier-not-affordable';

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
          <span>Cutoff for <strong>${branch}</strong>:</span>
          <span class="cutoff-num">${cutoff.toFixed(1)}%ile</span>
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
        <button class="btn-secondary-sm btn-why-match" data-cid="${collegeId}" data-cname="${encodeURIComponent(collegeName)}">
          Why This Match?
        </button>
      </div>
    `;

    container.appendChild(card);
  });

  // Attach button event listeners
  container.querySelectorAll('.btn-why-match').forEach(btn => {
    btn.addEventListener('click', () => {
      const cid = btn.dataset.cid;
      const cname = decodeURIComponent(btn.dataset.cname);
      openWhyMatchModal(cid, cname);
    });
  });
}

// "Why This Match?" Modal
async function openWhyMatchModal(collegeId, collegeName) {
  const modal = document.getElementById('whyMatchModal');
  const modalTitle = document.getElementById('modalCollegeName');
  const modalBody = document.getElementById('modalAiReasoning');

  if (!modal || !modalTitle || !modalBody) return;

  modalTitle.textContent = collegeName;
  modalBody.textContent = 'Generating quota analysis and academic evaluation...';
  modal.classList.add('open');

  try {
    const res = await fetch(`${API_BASE}/api/why-match?collegeId=${encodeURIComponent(collegeId)}`);
    if (res.ok) {
      const data = await res.json();
      modalBody.textContent = data.aiReasoning;
    } else {
      modalBody.textContent = 'Match analysis could not be generated at this time.';
    }
  } catch (err) {
    modalBody.textContent = 'Error connecting to evaluation engine.';
  }
}
window.openWhyMatchModal = openWhyMatchModal;

// Scholarships
async function loadScholarships() {
  try {
    const res = await fetch(`${API_BASE}/api/scholarships`);
    if (!res.ok) return;
    state.scholarships = await res.json();

    let maxEligibleAmount = 0;
    let topSchName = 'None matched';

    state.scholarships.forEach(s => {
      if (s.eligibility && s.eligibility.isEligible && s.annualAmount > maxEligibleAmount) {
        maxEligibleAmount = s.annualAmount;
        topSchName = s.name;
      }
    });

    const schMax = document.getElementById('statScholarshipMax');
    if (schMax) schMax.textContent = formatINR(maxEligibleAmount);

    const schName = document.getElementById('statScholarshipName');
    if (schName) schName.textContent = topSchName;

    const schCalc = document.getElementById('calcCustomScholarship');
    if (schCalc && (!schCalc.value || schCalc.value === '0')) {
      schCalc.value = maxEligibleAmount;
    }

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

  state.scholarships.forEach(s => {
    const card = document.createElement('div');
    card.className = 'scholarship-card';

    const isEligible = s.eligibility && s.eligibility.isEligible;
    const statusClass = isEligible ? 'eligible' : 'ineligible';
    const statusText = s.eligibility ? s.eligibility.overallStatus : 'Under Review';

    let criteriaHtml = '';
    if (s.eligibility && s.eligibility.criteriaChecks) {
      criteriaHtml = s.eligibility.criteriaChecks.map(c => `
        <li class="sch-criterion-item">
          <span class="${c.passed ? 'criterion-passed' : 'criterion-failed'}">[${c.passed ? 'PASS' : 'FAIL'}]</span>
          <span>${c.explanation}</span>
        </li>
      `).join('');
    }

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

        <div class="sch-docs-readiness">
          <span>Document Readiness:</span>
          <strong>${s.readyDocumentCount} of ${s.totalRequiredDocumentCount} Required Ready</strong>
        </div>
      </div>

      <div class="sch-footer-row">
        <span class="sch-deadline">Closing Date: <strong>${s.deadlineDate}</strong></span>
        <a href="${s.applicationUrl}" target="_blank" rel="noopener noreferrer" class="btn-primary-sm" style="text-decoration: none;">
          Official Portal &rarr;
        </a>
      </div>
    `;

    container.appendChild(card);
  });
}

// Affordability Calculator
async function calculateAffordability() {
  const select = document.getElementById('calcCollegeSelect');
  if (!select) return;
  const collegeId = select.value;
  const customScholarship = document.getElementById('calcCustomScholarship').value || 0;

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
    badge.style.color = '#ffffff';

    // Budget Comparison
    const statedBudget = data.studentAnnualBudget || 1;
    const netCost = data.estimatedNetCost;
    document.getElementById('barNetText').textContent = formatINR(netCost);
    document.getElementById('barBudgetText').textContent = formatINR(statedBudget);

    const percentage = Math.min((netCost / statedBudget) * 100, 100);
    const fill = document.getElementById('budgetBarFill');
    fill.style.width = `${Math.max(percentage, 5)}%`;
    fill.style.background = badgeColor;

    document.getElementById('calcExplanationText').textContent = data.calculationExplanation;
  } catch (err) {
    console.error('Affordability calculation error:', err);
  }
}

// Alternatives
async function loadAlternatives() {
  try {
    const res = await fetch(`${API_BASE}/api/alternatives`);
    if (!res.ok) return;
    state.alternatives = await res.json();

    const diag = document.getElementById('pathwaysDiagnosticText');
    if (diag) {
      diag.textContent = state.alternatives.diagnosticMessage || 'Optimized pathways generated based on admission odds.';
    }

    const container = document.getElementById('pathwaysGrid');
    if (!container) return;
    container.innerHTML = '';

    const pathways = state.alternatives.pathways || [];
    pathways.forEach(p => {
      const card = document.createElement('div');
      card.className = 'pathway-card';

      card.innerHTML = `
        <div>
          <span class="pathway-tag">${p.planTag}</span>
          <h3 class="pathway-college">${p.collegeName}</h3>
          <div class="pathway-branch">Specialization: ${p.branch}</div>
          
          <div class="pathway-metrics">
            <span>Expected Cutoff: <strong>${Number(p.cutoff).toFixed(1)}%ile</strong></span>
            <span>Annual Cost: <strong>${formatINR(p.annualCost)}</strong></span>
          </div>

          <p class="pathway-reason">${p.reason}</p>
        </div>

        <div class="pathway-advantage">
          Strategic Advantage: ${p.admissionAdvantage}
        </div>
      `;

      container.appendChild(card);
    });
  } catch (e) {
    console.error('Failed to load alternatives:', e);
  }
}

// Documents
async function loadDocuments() {
  try {
    const res = await fetch(`${API_BASE}/api/documents`);
    if (!res.ok) return;
    state.documentsData = await res.json();

    const total = state.documentsData.totalCount || 0;
    const uploaded = state.documentsData.uploadedCount || 0;
    const missing = state.documentsData.missingCount || 0;

    const statReady = document.getElementById('statDocsReady');
    if (statReady) statReady.textContent = `${uploaded} / ${total}`;

    const statStatus = document.getElementById('statDocsStatus');
    if (statStatus) {
      statStatus.textContent = missing > 0 ? `${missing} documents pending verification` : 'All documents verified';
    }

    const vaultScore = document.getElementById('vaultScoreText');
    if (vaultScore) vaultScore.textContent = `${uploaded} of ${total} Ready`;

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

    const isUploaded = d.status && d.status.toUpperCase() === 'UPLOADED';
    const statusClass = isUploaded ? 'uploaded' : 'missing';
    const statusLabel = isUploaded ? 'Verified / Ready' : 'Pending Upload';

    const actionHtml = isUploaded
      ? `<div style="display: flex; gap: 0.5rem; align-items: center;">
           <span style="font-size: 0.75rem; color: var(--color-emerald); font-weight: 600;">Verified Document</span>
           <button class="btn-secondary-sm btn-upload-doc" data-doctype="${encodeURIComponent(d.documentType)}">Update File</button>
         </div>`
      : `<button class="btn-primary-sm btn-upload-doc" data-doctype="${encodeURIComponent(d.documentType)}">Upload Document</button>`;

    card.innerHTML = `
      <div>
        <div class="doc-card-header">
          <div class="doc-name">${d.documentType}</div>
          <span class="doc-status-chip ${statusClass}">${statusLabel}</span>
        </div>
        <div class="doc-filename">File: ${d.fileName || 'No certificate recorded'}</div>
        <div class="doc-notes">${d.notes || 'Required for quota verification.'}</div>
      </div>
      <div style="margin-top: 0.75rem;">
        ${actionHtml}
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
}

function openUploadModal(docType) {
  const modal = document.getElementById('uploadDocModal');
  const typeSelect = document.getElementById('uploadDocTypeSelect');
  const customGroup = document.getElementById('customDocTypeGroup');
  const fileNameInput = document.getElementById('uploadFileName');
  const realFileInput = document.getElementById('realFileInput');

  if (realFileInput) realFileInput.value = '';

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

async function confirmDocumentUpload() {
  const typeSelect = document.getElementById('uploadDocTypeSelect');
  let docType = typeSelect ? typeSelect.value : 'Income Certificate';

  if (docType === 'Other') {
    const customName = document.getElementById('customDocTypeName');
    if (customName && customName.value.trim()) {
      docType = customName.value.trim();
    }
  }

  const fileName = document.getElementById('uploadFileName').value || (docType.toLowerCase().replace(/[^a-z0-9]/g, '_') + '.pdf');

  try {
    const res = await fetch(`${API_BASE}/api/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentType: docType, fileName: fileName })
    });

    if (res.ok) {
      document.getElementById('uploadDocModal').classList.remove('open');
      showToast(`Document "${docType}" successfully uploaded and recorded.`);

      // Sync to Supabase if user is signed in
      if (state.currentUser) {
        await window.FGNDB.upsertDocument(state.currentUser.id, docType, fileName);
      }

      await Promise.allSettled([
        loadDocuments(),
        loadScholarships()
      ]);
    }
  } catch (err) {
    showToast('Failed to record document upload.');
  }
}


// Deadlines & Roadmap
async function loadDeadlines() {
  try {
    const res = await fetch(`${API_BASE}/api/deadlines`);
    if (!res.ok) return;
    const data = await res.json();
    state.deadlines = data.deadlines || [];
    renderDeadlines();
  } catch (e) {
    console.error('Failed to load deadlines:', e);
  }
}

function renderDeadlines() {
  const container = document.getElementById('deadlinesList');
  if (!container) return;
  container.innerHTML = '';

  const list = state.deadlines || [];
  if (list.length === 0) {
    container.innerHTML = '<div class="empty-state">No immediate deadlines approaching.</div>';
    return;
  }

  list.forEach(item => {
    const card = document.createElement('div');
    const urgency = (item.urgency || item.urgencyTier || 'upcoming').toLowerCase();
    card.className = `deadline-card tier-${urgency}`;

    const title = item.title || item.entityName || 'Admissions Deadline';
    const dueDate = item.dueDate || item.deadlineDate || '';
    const desc = item.description || '';
    const days = item.daysRemaining !== undefined ? item.daysRemaining : 0;

    card.innerHTML = `
      <div class="deadline-info">
        <h4>${title}</h4>
        <div class="deadline-meta">
          <span>Closing Date: <strong>${dueDate}</strong></span> ·
          <span>${desc}</span>
        </div>
      </div>
      <div class="deadline-countdown-badge">
        <div class="countdown-days">${days}</div>
        <div class="countdown-label">Days Left</div>
      </div>
    `;

    container.appendChild(card);
  });
}

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
    const isDone = step.completed === true;
    const statusClass = isDone ? 'status-completed' : (idx === 1 ? 'status-in-progress' : 'status-pending');

    let markerContent = idx + 1;
    if (isDone) markerContent = '[DONE]';
    else if (statusClass === 'status-in-progress') markerContent = '>';

    el.className = `timeline-step ${statusClass}`;

    el.innerHTML = `
      <div class="step-marker">${markerContent}</div>
      <div class="step-content">
        <div class="step-title">${step.title}</div>
        <div class="step-desc">${step.description}</div>
      </div>
    `;

    container.appendChild(el);
  });
}

// Multilingual Translation
async function loadTranslations(lang) {
  try {
    const res = await fetch(`${API_BASE}/api/translate?lang=${lang}`);
    if (!res.ok) return;
    state.translations = await res.json();
    applyTranslations();
  } catch (err) {
    console.error('Error loading translations:', err);
  }
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
