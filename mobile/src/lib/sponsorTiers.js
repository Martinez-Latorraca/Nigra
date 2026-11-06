// Espejo mobile de client/src/utils/sponsorTiers.js — mantener sincronizado.
// Colores hardcoded (no depende de theme) porque el sponsor tier es una
// marca visual consistente en light/dark. Basic = salvia, Pro = cielo,
// Nation = terracota; texto y estrella encima van en Arena (#F0EBE8).
// adRadiusKm: cap de distancia para aparecer como ad al user con geoloc
// activa. Cap fijo por tier — no configurable por vet.
export const SPONSOR_TIERS = {
  sponsor_basic:  { color: '#8FBF9F', label: 'Socio Mimo', tierLabel: 'Basic',  adRadiusKm: 5 },
  sponsor_pro:    { color: '#7EB6E8', label: 'Socio Mimo', tierLabel: 'Pro',    adRadiusKm: 20 },
  sponsor_nation: { color: '#C8664B', label: 'Socio Mimo', tierLabel: 'Nation', adRadiusKm: 50 },
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
