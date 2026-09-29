/**
 * supabase-client.js
 * Browser-side Supabase client for First Gen Navigator.
 */

const SUPABASE_URL = 'https://sxgvbhfbbegqdvvsnhra.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_tEOmrVw-l_q83nT9EIX5rQ_feM2rO0A';

// Supabase JS v2 loaded via CDN in index.html
const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Auth helpers ──────────────────────────────────────────────────────────────
async function signUp(email, password, name) {
  return await _supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
}
async function signIn(email, password) {
  return await _supabase.auth.signInWithPassword({ email, password });
}
async function signOut() { return await _supabase.auth.signOut(); }
async function getSession() { const { data } = await _supabase.auth.getSession(); return data?.session ?? null; }
async function getUser() { const s = await getSession(); return s?.user ?? null; }

// ─── Profile DB ────────────────────────────────────────────────────────────────
async function dbGetProfile(userId) {
  return await _supabase.from('student_profiles').select('*').eq('user_id', userId).maybeSingle();
}
async function dbUpsertProfile(userId, p) {
  return await _supabase.from('student_profiles').upsert({
    user_id: userId,
    name: p.name,
    jee_percentile: Number(p.jeePercentile),
    category: p.category,
    state: p.state,
    preferred_branch: p.preferredBranch,
    annual_income: Number(p.annualIncome),
    annual_budget: Number(p.annualBudget),
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id' }).select().single();
}

// ─── Documents DB ──────────────────────────────────────────────────────────────
async function dbGetDocuments(userId) {
  return await _supabase.from('student_documents').select('*').eq('user_id', userId).order('created_at', { ascending: true });
}
async function dbUpsertDocument(userId, documentType, fileName) {
  return await _supabase.from('student_documents').upsert({
    user_id: userId, document_type: documentType, file_name: fileName, status: 'Uploaded',
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id,document_type' }).select().single();
}

// ─── Progress DB ───────────────────────────────────────────────────────────────
async function dbGetProgress(userId) {
  return await _supabase.from('admission_progress').select('*').eq('user_id', userId).order('step_order', { ascending: true });
}
async function dbUpdateProgress(userId, stepId, completed) {
  return await _supabase.from('admission_progress').upsert({
    user_id: userId, step_id: stepId, completed, updated_at: new Date().toISOString()
  }, { onConflict: 'user_id,step_id' }).select().single();
}

// ─── Auth state change listener ────────────────────────────────────────────────
_supabase.auth.onAuthStateChange((event, session) => {
  window.dispatchEvent(new CustomEvent('fgn:authchange', { detail: { event, session } }));
});

// ─── Expose globally ───────────────────────────────────────────────────────────
window.FGNAuth = { signUp, signIn, signOut, getSession, getUser, client: _supabase };
window.FGNDB = { getProfile: dbGetProfile, upsertProfile: dbUpsertProfile, getDocuments: dbGetDocuments, upsertDocument: dbUpsertDocument, getProgress: dbGetProgress, updateProgress: dbUpdateProgress };

console.log('[FGN] Supabase client ready.');
