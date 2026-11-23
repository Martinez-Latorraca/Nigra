// Paleta de Mimo (mismos valores que la app y que `C` en Landing.jsx).
// Para estilos inline; en clases de Tailwind están como `mimo-*`.
export const C = {
    coral: '#FF5C6C',
    teal: '#3ECFB2',
    sol: '#FFB830',
    violeta: '#9B6DFF',
    noche: '#1A1A2E',
    noche2: '#262642',
    linea: '#33334F',
    crema: '#FFF6F0',
    arena: '#F0EBE8',
    lavanda: '#B4B4C6',
};

// Color de cada estado de un reporte (igual que StatusChip en la app).
export const STATUS = {
    lost: { label: 'Perdido', color: C.coral },
    found: { label: 'Encontrado', color: C.teal },
    reunited: { label: 'Reencontrada ✓', color: C.violeta },
};

export const petStatusKey = (pet) => (pet?.resolved_at ? 'reunited' : pet?.status === 'lost' ? 'lost' : 'found');

// Color de cada sección (igual que sectionColors en la app).
export const SECTION = {
    explorar: C.sol,
    adopciones: C.violeta,
    refugios: C.teal,
    veterinarias: C.coral,
};
