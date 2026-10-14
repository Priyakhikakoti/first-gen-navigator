-- ============================================================
-- FIRST GEN NAVIGATOR — Supabase Database Schema
-- Run this in the Supabase SQL Editor to set up all tables.
-- ============================================================

-- Enable Row Level Security on all tables
-- (users can only access their own data)

-- ── 1. Student Profiles ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.student_profiles (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT,
  jee_percentile  NUMERIC(5,2),
  category        TEXT CHECK (category IN ('GEN','OBC-NCL','EWS','SC','ST')),
  state           TEXT,
  preferred_branch TEXT,
  annual_income   INTEGER,
  annual_budget   INTEGER,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.student_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.student_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.student_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- ── 2. Student Documents ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.student_documents (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type   TEXT NOT NULL,
  file_name       TEXT,
  status          TEXT DEFAULT 'Uploaded',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, document_type)
);

ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own documents"
  ON public.student_documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
  ON public.student_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents"
  ON public.student_documents FOR UPDATE
  USING (auth.uid() = user_id);

-- ── 3. Admission Progress ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admission_progress (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  step_id         TEXT NOT NULL,         -- e.g. 'RESULTS', 'DOCS', 'JOSAA'
  step_order      INTEGER,
  completed       BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, step_id)
);

ALTER TABLE public.admission_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress"
  ON public.admission_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON public.admission_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON public.admission_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- ── 4. Paid Analysis Ledger ───────────────────────────────────────────────────
-- The Express server alone writes payment state with the service-role key.
CREATE TABLE IF NOT EXISTS public.analysis_payments (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_id           UUID NOT NULL,
  razorpay_qr_code_id   TEXT,
  qr_image_url          TEXT,
  amount_paise          INTEGER NOT NULL CHECK (amount_paise = 5000),
  currency              TEXT NOT NULL CHECK (currency = 'INR'),
  status                TEXT NOT NULL DEFAULT 'pending',
  razorpay_payment_id   TEXT,
  paid_at               TIMESTAMPTZ,
  expires_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, analysis_id)
);

-- Remove manual-review fields from deployments that ran the interim QR flow.
ALTER TABLE public.analysis_payments
  DROP COLUMN IF EXISTS payment_reference CASCADE,
  DROP COLUMN IF EXISTS reviewed_by CASCADE,
  DROP COLUMN IF EXISTS reviewed_at CASCADE,
  DROP COLUMN IF EXISTS review_note CASCADE;

ALTER TABLE public.analysis_payments
  ADD COLUMN IF NOT EXISTS razorpay_qr_code_id TEXT,
  ADD COLUMN IF NOT EXISTS qr_image_url TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

ALTER TABLE public.analysis_payments
  DROP CONSTRAINT IF EXISTS analysis_payments_status_check,
  DROP CONSTRAINT IF EXISTS analysis_payments_check,
  DROP CONSTRAINT IF EXISTS analysis_payments_check1,
  DROP CONSTRAINT IF EXISTS analysis_payments_qr_fields_check;

-- Old manual reviews have no Razorpay identifiers and cannot authorize access.
UPDATE public.analysis_payments
SET status = 'expired',
    razorpay_qr_code_id = NULL,
    qr_image_url = NULL,
    razorpay_payment_id = NULL,
    paid_at = NULL,
    expires_at = NULL
WHERE status NOT IN ('pending', 'paid', 'expired')
   OR razorpay_qr_code_id IS NULL
   OR qr_image_url IS NULL
   OR expires_at IS NULL;

ALTER TABLE public.analysis_payments
  ADD CONSTRAINT analysis_payments_status_check CHECK (status IN ('pending', 'paid', 'expired')),
  ADD CONSTRAINT analysis_payments_qr_fields_check CHECK (status = 'expired' OR (
    razorpay_qr_code_id IS NOT NULL AND
    qr_image_url IS NOT NULL AND
    expires_at IS NOT NULL
  ));

CREATE UNIQUE INDEX IF NOT EXISTS analysis_payments_qr_code_id_key
  ON public.analysis_payments (razorpay_qr_code_id)
  WHERE razorpay_qr_code_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS analysis_payments_razorpay_payment_id_key
  ON public.analysis_payments (razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL;

ALTER TABLE public.analysis_payments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.analysis_payments FROM anon, authenticated;
GRANT SELECT ON TABLE public.analysis_payments TO authenticated;
GRANT ALL ON TABLE public.analysis_payments TO service_role;

DROP POLICY IF EXISTS "Users can view own analysis payments" ON public.analysis_payments;
CREATE POLICY "Users can view own analysis payments"
  ON public.analysis_payments FOR SELECT
  USING (auth.uid() = user_id);
