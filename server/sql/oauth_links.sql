-- Tabla de vinculaciones OAuth. Permite que un mismo user tenga varios
-- providers linkeados (google + facebook + apple + password).
--
-- Correr una vez en Supabase Studio > SQL Editor. Idempotente.

CREATE TABLE IF NOT EXISTS user_oauth_links (
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, provider),
  UNIQUE (provider, provider_id)
);

-- Backfill desde users.provider/provider_id (schema legacy).
INSERT INTO user_oauth_links (user_id, provider, provider_id)
SELECT id, provider, provider_id
FROM users
WHERE provider IS NOT NULL AND provider_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- RLS: PostgREST no debería exponer esta tabla — la accedemos solo desde el
-- server con service role. Habilitamos RLS y no creamos policies (deny all
-- for anon/authenticated a nivel de PostgREST).
ALTER TABLE user_oauth_links ENABLE ROW LEVEL SECURITY;
