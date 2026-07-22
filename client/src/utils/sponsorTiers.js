// Diferencia visual de los tiers de sponsor. La palanca es el color de la
// estrella y del ring/borde de la card — el copy visible es siempre
// "Socio Mimo" para los tres.
//
// Basic  = coral    (color primario de la marca, "empezar apoyando")
// Pro    = violeta  (color menos usado, distintivo)
// Nation = sol      (dorado premium, el histórico "Socio Mimo")
//
// Ally NO es un tier de sponsor — se representa por ausencia de todo esto.
// adRadiusKm: cap de distancia para que la card aparezca como ad al user
// (solo cuando el user tiene geoloc activa). El tier compra alcance —
// no se configura por vet.
export const SPONSOR_TIERS = {
    sponsor_basic:  { color: '#FF5C6C', label: 'Socio Mimo', tierLabel: 'Basic',  adRadiusKm: 5 },
    sponsor_pro:    { color: '#9B6DFF', label: 'Socio Mimo', tierLabel: 'Pro',    adRadiusKm: 20 },
    sponsor_nation: { color: '#FFB830', label: 'Socio Mimo', tierLabel: 'Nation', adRadiusKm: 50 },
};

export function adRadiusOf(vet) {
    return tierOf(vet)?.adRadiusKm ?? null;
}

// Devuelve la config del tier o null si la vet es ally (o desconocida).
export function tierOf(vet) {
    if (!vet) return null;
    return SPONSOR_TIERS[vet.plan] || null;
}

// Convenience: el color de la estrella del tier o null.
export function tierColor(vet) {
    return tierOf(vet)?.color || null;
}

export function isSponsor(vet) {
    return !!tierOf(vet);
}
