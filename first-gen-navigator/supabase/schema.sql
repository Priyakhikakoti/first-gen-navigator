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
