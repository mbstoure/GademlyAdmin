-- Migration: admin_sessions tracking table
-- Run in Supabase SQL editor (one time only)

CREATE TABLE IF NOT EXISTS public.admin_sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token text NOT NULL,
  browser       text,
  device        text,
  os            text,
  ip            text DEFAULT 'unknown',
  location      text,
  logged_in_at  timestamptz NOT NULL DEFAULT now(),
  last_active   timestamptz NOT NULL DEFAULT now(),
  is_current    boolean DEFAULT false,
  revoked       boolean DEFAULT false,
  revoked_at    timestamptz
);

-- Index for fast per-user queries
CREATE INDEX IF NOT EXISTS admin_sessions_user_idx
  ON public.admin_sessions(user_id, logged_in_at DESC);

-- RLS: only authenticated users (super admins are the only ones who can log
-- into this admin panel, so checking auth.uid() IS NOT NULL is sufficient)
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_sessions_insert" ON public.admin_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admin_sessions_select" ON public.admin_sessions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "admin_sessions_update" ON public.admin_sessions
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "admin_sessions_delete" ON public.admin_sessions
  FOR DELETE USING (auth.uid() IS NOT NULL);
