-- Tabla match_events: registra cada coincidencia visual generada por el AI
-- (notifyMatchesForReport) con su distancia, y captura el outcome real.
--
-- Dos usos:
--   1. Métrica de CALIDAD DEL MATCHING: de los matches generados, cuántos
--      terminaron en reencuentro (reunited) vs falso positivo (rejected).
--      El `visual_distance` + outcome es el dataset etiquetado para mejorar
--      el modelo (ver [[project-visual-matching-improvements]]).
--   2. Alimenta el funnel del admin. (Los reencuentros TOTALES del producto
--      salen aparte de pets.resolved_at — un cierre vía navegación del feed
--      también es un éxito, aunque no haya venido de un match.)
--
-- outcome: pending (recién generado) → reunited (se reencontraron) |
--          rejected (el dueño dijo "no era mi mascota", falso positivo).
--
-- Correr en Supabase Studio > SQL Editor. Idempotente.

CREATE TABLE IF NOT EXISTS match_events (
  id BIGSERIAL PRIMARY KEY,
  -- El pet recién reportado que disparó el match.
  new_pet_id INTEGER REFERENCES pets(id) ON DELETE SET NULL,
  new_pet_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  -- El pet existente (opuesto: lost<->found) que matcheó.
  matched_pet_id INTEGER REFERENCES pets(id) ON DELETE SET NULL,
  matched_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  -- Notificación de 'match' que se le mandó al matched_user (para trazar).
  notification_id INTEGER REFERENCES notifications(id) ON DELETE SET NULL,
  -- Distancia coseno del embedding (0 = idéntico). El umbral de match es <=0.25.
  visual_distance DOUBLE PRECISION,
  outcome TEXT NOT NULL DEFAULT 'pending' CHECK (outcome IN ('pending', 'reunited', 'rejected')),
  outcome_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stats por outcome + ventana temporal.
CREATE INDEX IF NOT EXISTS idx_match_events_outcome ON match_events (outcome, created_at DESC);
-- Update del outcome por par de usuarios (al reencontrarse / rechazar).
CREATE INDEX IF NOT EXISTS idx_match_events_users ON match_events (new_pet_user_id, matched_user_id);

ALTER TABLE match_events ENABLE ROW LEVEL SECURITY;
