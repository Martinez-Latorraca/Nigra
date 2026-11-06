// Diferencia visual de los tiers de sponsor. La palanca es el color de la
// estrella y del ring/borde de la card — el copy visible es siempre
// "Socio Mimo" para los tres.
//
// Basic  = salvia     #8FBF9F
// Pro    = cielo      #7EB6E8
// Nation = terracota  #C8664B
// Colores propios de los planes: combinan con la paleta pero no se usan en
// ninguna sección, para no confundirse con Coral/Teal/Sol/Violeta.
//
// Ally NO es un tier de sponsor — se representa por ausencia de todo esto.
// adRadiusKm: cap de distancia para que la card aparezca como ad al user
// (solo cuando el user tiene geoloc activa). El tier compra alcance —
// no se configura por vet.
export const SPONSOR_TIERS = {
    sponsor_basic:  { color: '#8FBF9F', label: 'Socio Mimo', tierLabel: 'Basic',  adRadiusKm: 5 },
    sponsor_pro:    { color: '#7EB6E8', label: 'Socio Mimo', tierLabel: 'Pro',    adRadiusKm: 20 },
    sponsor_nation: { color: '#C8664B', label: 'Socio Mimo', tierLabel: 'Nation', adRadiusKm: 50 },
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
