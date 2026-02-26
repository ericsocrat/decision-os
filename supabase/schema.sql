-- =============================================================================
-- Decision OS — Supabase Database Schema
-- =============================================================================
-- Run this SQL in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- after creating your Supabase project.
-- =============================================================================

-- 1. Create the decisions table
CREATE TABLE IF NOT EXISTS public.decisions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  decision_id TEXT NOT NULL,          -- app-level nanoid (from client)
  data        JSONB NOT NULL,         -- full Decision object
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),

  -- Each user can have at most one row per decision_id
  UNIQUE (user_id, decision_id)
);

-- 2. Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_decisions_user_id ON public.decisions (user_id);
CREATE INDEX IF NOT EXISTS idx_decisions_updated ON public.decisions (user_id, updated_at DESC);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies — users can only access their own decisions
CREATE POLICY "Users can read own decisions"
  ON public.decisions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own decisions"
  ON public.decisions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own decisions"
  ON public.decisions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own decisions"
  ON public.decisions FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Auto-update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.decisions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
