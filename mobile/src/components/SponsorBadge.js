import BadgeBasic  from '../assets/badges/tier-basic.svg';
import BadgePro    from '../assets/badges/tier-pro.svg';
import BadgeNation from '../assets/badges/tier-nation.svg';

// Espejo mobile del <SponsorBadge> web. react-native-svg-transformer convierte
// cada .svg en un componente React que acepta width/height como props.
// Aspect ratio del diseño: 95×24.
const MAP = {
  sponsor_basic:  BadgeBasic,
  sponsor_pro:    BadgePro,
  sponsor_nation: BadgeNation,
};

export default function SponsorBadge({ vet, width = 95, style }) {
  const Svg = MAP[vet?.plan];
  if (!Svg) return null;
  const height = Math.round((width * 24) / 95);
  return <Svg width={width} height={height} style={style} />;
}
