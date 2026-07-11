-- Waitlist para la landing pública. Correr en Supabase Studio > SQL Editor.
-- Idempotente.

CREATE TABLE IF NOT EXISTS waitlist (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  city TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON waitlist (created_at DESC);

-- RLS: solo el server puede leer/escribir con service role.
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
