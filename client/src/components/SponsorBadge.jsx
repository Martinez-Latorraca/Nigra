import basic from '../assets/badges/tier-basic.svg';
import pro from '../assets/badges/tier-pro.svg';
import nation from '../assets/badges/tier-nation.svg';

// Badges pill diseñados por Nico (306×71). Uno por tier de sponsor.
// Se renderizan con <img> — Vite les asigna una URL como asset. El caller
// controla el ancho; el alto se calcula por aspect ratio.
const MAP = {
    sponsor_basic:  basic,
    sponsor_pro:    pro,
    sponsor_nation: nation,
};

export default function SponsorBadge({ vet, width = 120, className = '', style }) {
    const src = MAP[vet?.plan];
    if (!src) return null;
    return (
        <img
            src={src}
            alt="Socio Mimo"
            width={width}
            height={Math.round(width * 71 / 306)}
            className={className}
            style={{ display: 'block', ...style }}
        />
    );
}
