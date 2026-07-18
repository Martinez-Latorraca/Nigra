-- Verificación de email al registrarse. Mismo patrón que password_resets:
-- token hasheado, expiración, single-use.
--
-- Correr una vez en Supabase Studio > SQL Editor. Idempotente.

CREATE TABLE IF NOT EXISTS email_verifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_verifications_token_hash
  ON email_verifications (token_hash);
CREATE INDEX IF NOT EXISTS idx_email_verifications_user
  ON email_verifications (user_id)
  WHERE used_at IS NULL;

ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;
