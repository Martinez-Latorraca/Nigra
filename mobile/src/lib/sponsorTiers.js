// Espejo mobile de client/src/utils/sponsorTiers.js — mantener sincronizado.
// Colores hardcoded (no depende de theme) porque el sponsor tier es una
// marca visual consistente en light/dark.
// adRadiusKm: cap de distancia para aparecer como ad al user con geoloc
// activa. Cap fijo por tier — no configurable por vet.
export const SPONSOR_TIERS = {
  sponsor_basic:  { color: '#FF5C6C', label: 'Socio Mimo', tierLabel: 'Basic',  adRadiusKm: 5 },
  sponsor_pro:    { color: '#9B6DFF', label: 'Socio Mimo', tierLabel: 'Pro',    adRadiusKm: 20 },
  sponsor_nation: { color: '#FFB830', label: 'Socio Mimo', tierLabel: 'Nation', adRadiusKm: 50 },
};

export function adRadiusOf(vet) {
  return tierOf(vet)?.adRadiusKm ?? null;
}

export function tierOf(vet) {
  if (!vet) return null;
  return SPONSOR_TIERS[vet.plan] || null;
}

export function tierColor(vet) {
  return tierOf(vet)?.color || null;
}

export function isSponsor(vet) {
  return !!tierOf(vet);
}
