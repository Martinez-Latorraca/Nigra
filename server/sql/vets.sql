-- Tabla vets: veterinarias registradas. Se autoregistran (con user owner) y
-- pueden publicar mascotas encontradas de una. Solo aparecen en el directorio
-- público cuando un admin las marca approved = true. Sponsor plan opcional
-- para features premium (alertas por radio, dashboard, card destacada).
--
-- Correr en Supabase Studio > SQL Editor. Idempotente.

CREATE TABLE IF NOT EXISTS vets (
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
  services TEXT[] NOT NULL DEFAULT '{}',

  -- 'ally' = free tier (auto-registrada). Sponsor levels van más adelante.
  plan TEXT NOT NULL DEFAULT 'ally',

  -- Gate del directorio público. Admin lo pone true desde AdminPanel.
  approved BOOLEAN NOT NULL DEFAULT FALSE,
  approved_at TIMESTAMPTZ,
  -- Badge "Socio Mimo": solo si es sponsor pago.
  verified_at TIMESTAMPTZ,

  -- Config de alertas por radio (feature sponsor).
  alert_radius_km INTEGER NOT NULL DEFAULT 5,
  receives_lost BOOLEAN NOT NULL DEFAULT FALSE,
  receives_found BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Un user solo puede tener UNA vet (evita spam de multi-registro).
CREATE UNIQUE INDEX IF NOT EXISTS idx_vets_owner_unique ON vets (owner_user_id);
-- Directorio público filtra por approved + geo.
CREATE INDEX IF NOT EXISTS idx_vets_approved_geo ON vets (approved, lat, lng)
  WHERE approved = TRUE AND lat IS NOT NULL AND lng IS NOT NULL;
-- Búsqueda por ciudad.
CREATE INDEX IF NOT EXISTS idx_vets_city ON vets (city) WHERE approved = TRUE;

-- Trigger updated_at.
CREATE OR REPLACE FUNCTION vets_touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_vets_updated_at ON vets;
CREATE TRIGGER trg_vets_updated_at BEFORE UPDATE ON vets
  FOR EACH ROW EXECUTE FUNCTION vets_touch_updated_at();

-- RLS: solo el server accede con service role.
ALTER TABLE vets ENABLE ROW LEVEL SECURITY;

-- Extensión de pets para trackear publicaciones hechas por una vet.
ALTER TABLE pets ADD COLUMN IF NOT EXISTS registered_by_vet_id INTEGER
  REFERENCES vets(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_pets_by_vet ON pets (registered_by_vet_id)
  WHERE registered_by_vet_id IS NOT NULL;
