-- Tabla vet_events: analytics de publicidad de vets sponsor.
--
-- 3 kinds:
--   impression    = ad card entró al viewport del user (viewability)
--   ad_click      = user tocó la card de publicidad (feed /pets, banner /vets)
--   contact_click = user tocó un contacto (whatsapp/tel/instagram/web) en el perfil
--
-- No requiere auth: los events se emiten desde el frontend sin sesión. El
-- volumen esperado es bajo (< 100/día en MVP); si sube, migrar a agregados
-- por día o samplear impresiones. Ver [[project-vet-sponsor-model]].
--
-- Correr en Supabase Studio > SQL Editor. Idempotente.

CREATE TABLE IF NOT EXISTS vet_events (
  id BIGSERIAL PRIMARY KEY,
  vet_id INTEGER NOT NULL REFERENCES vets(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('impression', 'ad_click', 'contact_click')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Query pattern: "dame counts de los últimos 30 días para el vet X, agrupado por kind".
CREATE INDEX IF NOT EXISTS idx_vet_events_vet_created
  ON vet_events (vet_id, created_at DESC);

ALTER TABLE vet_events ENABLE ROW LEVEL SECURITY;
