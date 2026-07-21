// Espejo mobile de client/src/utils/sponsorTiers.js — mantener sincronizado.
// Colores hardcoded (no depende de theme) porque el sponsor tier es una
// marca visual consistente en light/dark.
export const SPONSOR_TIERS = {
  sponsor_basic:  { color: '#FF5C6C', label: 'Socio Mimo', tierLabel: 'Basic' },
  sponsor_pro:    { color: '#9B6DFF', label: 'Socio Mimo', tierLabel: 'Pro' },
  sponsor_nation: { color: '#FFB830', label: 'Socio Mimo', tierLabel: 'Nation' },
};

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
