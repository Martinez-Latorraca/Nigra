-- Tabla adoption_pets: mascotas disponibles para adopción, publicadas por
-- un refugio. NO tienen owner user (el "dueño" es el refugio). Independiente
-- de la tabla `pets` (que es para lost/found reportados por users).
--
-- photos = array de URLs Cloudinary (2-6 fotos por pet). Sin embedding — no
-- hay AI matching visual acá (los usuarios no reportan adopciones).
--
-- adopted_at = soft resolve; el pet queda en la lista con badge "Adoptado"
-- por un tiempo antes de que el refugio lo archive.
--
-- Correr en Supabase Studio > SQL Editor. Idempotente.

CREATE TABLE IF NOT EXISTS adoption_pets (
  id SERIAL PRIMARY KEY,
  shelter_id INTEGER NOT NULL REFERENCES shelters(id) ON DELETE CASCADE,

  name TEXT,
  species TEXT NOT NULL CHECK (species IN ('dog', 'cat', 'other')),
  sex TEXT CHECK (sex IN ('male', 'female', 'unknown')),
  age_group TEXT CHECK (age_group IN ('puppy', 'young', 'adult', 'senior', 'unknown')),
  size TEXT CHECK (size IN ('small', 'medium', 'large')),
  color TEXT,
  description TEXT,

  vaccinated BOOLEAN NOT NULL DEFAULT FALSE,
  neutered BOOLEAN NOT NULL DEFAULT FALSE,

  -- Galería de fotos. 1-6 URLs. La primera es la cover.
  photos JSONB NOT NULL DEFAULT '[]',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  adopted_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

-- Feed público: listar por creado desc, filtrando por especie/tamaño/edad.
CREATE INDEX IF NOT EXISTS idx_adoption_pets_feed
  ON adoption_pets (created_at DESC)
  WHERE deleted_at IS NULL;

-- Filtro por refugio (panel del shelter + directorio).
CREATE INDEX IF NOT EXISTS idx_adoption_pets_shelter
  ON adoption_pets (shelter_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION adoption_pets_touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_adoption_pets_updated_at ON adoption_pets;
CREATE TRIGGER trg_adoption_pets_updated_at BEFORE UPDATE ON adoption_pets
  FOR EACH ROW EXECUTE FUNCTION adoption_pets_touch_updated_at();

ALTER TABLE adoption_pets ENABLE ROW LEVEL SECURITY;
