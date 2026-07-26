-- Trust & safety: denuncias de usuarios/mensajes + bloqueos entre users.
--
-- reports: un user reporta a otro (opcionalmente por un mensaje puntual). El
-- admin revisa desde el AdminPanel y decide (borrar mensaje, banear, descartar).
--
-- user_blocks: si A bloquea a B, ninguno de los dos ve al otro en el inbox ni
-- puede mandarle mensajes (bloqueo simétrico en el delivery). Reversible via
-- DELETE endpoint.
--
-- Correr en Supabase Studio > SQL Editor. Idempotente.

CREATE TABLE IF NOT EXISTS reports (
  id BIGSERIAL PRIMARY KEY,
  reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Mensaje puntual denunciado (opcional). ON DELETE SET NULL: si el admin
  -- borra el mensaje, la denuncia queda con el contexto en `note`/snapshot.
  message_id INTEGER REFERENCES messages(id) ON DELETE SET NULL,
  pet_id INTEGER REFERENCES pets(id) ON DELETE SET NULL,
  -- Snapshot del contenido denunciado — sobrevive al borrado del mensaje.
  message_snapshot TEXT,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'scam', 'inappropriate', 'other')),
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports (status, created_at DESC);

CREATE TABLE IF NOT EXISTS user_blocks (
  id BIGSERIAL PRIMARY KEY,
  blocker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (blocker_id, blocked_id)
);

-- Lookups del enforcement: "¿hay un bloqueo entre A y B en cualquier dirección?".
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks (blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks (blocked_id);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;
