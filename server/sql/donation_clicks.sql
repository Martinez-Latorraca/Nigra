-- Tabla donation_clicks: tracking del banner de donación (fase 1 del plan
-- donations tracking, ver [[project-donations-tracking]]).
--
-- Solo trackea que alguien tocó el CTA "Donar por Mercado Pago". No sabe si
-- la donación se concretó (para eso hace falta webhook MP + preferencia con
-- external_reference — fase 2, no arrancado).
--
-- user_id es nullable: el banner puede aparecer para users no logueados en
-- casos futuros (por ahora solo aparece en el chat post-reunión que sí es
-- autenticado). pet_id también nullable por si el banner aparece fuera de
-- un caso puntual.
--
-- Correr en Supabase Studio > SQL Editor. Idempotente.

CREATE TABLE IF NOT EXISTS donation_clicks (
  id BIGSERIAL PRIMARY KEY,
  pet_id INTEGER REFERENCES pets(id) ON DELETE SET NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Query pattern: "clicks del último mes, agrupados por día". Sin filtros por
-- user/pet más profundos (fase 1 es solo el conteo agregado).
CREATE INDEX IF NOT EXISTS idx_donation_clicks_time
  ON donation_clicks (clicked_at DESC);

ALTER TABLE donation_clicks ENABLE ROW LEVEL SECURITY;
