-- Tabla shelters: refugios / protectoras que publican mascotas en adopción.
-- No son users regulares — el owner tiene role='shelter' (gate en middlewares).
-- No reportan lost/found, no reciben alertas cerca, no chatean con owners de
-- mascotas perdidas. Solo editan perfil + gestionan adoption_pets.
--
-- Alta: el user se registra con role='shelter' + admin aprueba. Mismo patrón
-- que vets pero SIN plan/tier (todos gratuitos) y SIN alert_radius_km.
--
-- Correr en Supabase Studio > SQL Editor. Idempotente.

CREATE TABLE IF NOT EXISTS shelters (
  id SERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  website TEXT,
  instagram TEXT,

  address TEXT,
  city TEXT,
  country TEXT NOT NULL DEFAULT 'UY',
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,

  logo_url TEXT,
  cover_url TEXT,
  bio TEXT,
  hours JSONB,

  approved BOOLEAN NOT NULL DEFAULT FALSE,
  approved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_shelters_owner_unique ON shelters (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_shelters_approved_geo ON shelters (approved, lat, lng)
  WHERE approved = TRUE AND lat IS NOT NULL AND lng IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shelters_city ON shelters (city)
  WHERE approved = TRUE AND deleted_at IS NULL;

CREATE OR REPLACE FUNCTION shelters_touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_shelters_updated_at ON shelters;
CREATE TRIGGER trg_shelters_updated_at BEFORE UPDATE ON shelters
  FOR EACH ROW EXECUTE FUNCTION shelters_touch_updated_at();

ALTER TABLE shelters ENABLE ROW LEVEL SECURITY;
