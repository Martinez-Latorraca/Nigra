import { useColorScheme } from 'react-native';
import { useIsDark } from './appearance';

// Paleta de marca Mimo (ver handoff de diseño). Reglas:
// - Todo el texto de cuerpo va en Noche. No hay grises para texto, salvo
//   los íconos/labels inactivos de la barra de navegación (grisNav).
// - Texto e íconos sobre Coral/Teal/Sol/Violeta: Arena.
// - Texto e íconos sobre Noche: Crema.
export const palette = {
  coral: '#FF5C6C',
  teal: '#3ECFB2',
  sol: '#FFB830',
  violeta: '#9B6DFF',
  noche: '#1A1A2E',
  crema: '#FFF6F0',
  arena: '#F0EBE8',
  blanco: '#FFFFFF',
  grisNav: '#5A5A6E',
};

// Color del encabezado de cada sección.
export const sectionColors = {
  explorar: palette.sol,
  adopcion: palette.violeta,
  refugios: palette.teal,
  veterinarias: palette.noche,
  reportar: palette.coral,
  perfilUsuario: palette.coral,
  perfilVet: palette.noche,
  perfilRefugio: palette.teal,
};

// Color del texto/íconos que van encima de un fondo de la paleta.
export function onColor(bg) {
  return bg === palette.noche ? palette.crema : palette.arena;
}

// Con fuentes custom, Android ignora fontWeight: cada peso es una familia
// distinta. Usar siempre estos nombres en fontFamily, sin fontWeight.
// Se cargan en app/_layout.js.
export const fonts = {
  display: 'Nunito_900Black', // títulos, nombres, números grandes
  displayBold: 'Nunito_800ExtraBold', // wordmark "mimo"
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  bold: 'DMSans_700Bold',
};

// Tokens del modo oscuro (Oscuro-sistema.dc.html).
export const dark = {
  noche2: '#262642', // tarjetas, campos, barra de navegación, superficie Noche
  linea: '#33334F', // bordes, placeholder de foto
  lineaFuerte: '#3A3A58', // divisores, switch apagado, fondos Noche chicos
  lavanda: '#B4B4C6', // texto secundario, placeholders, nav inactiva
};

// La preferencia (Automático / Claro / Oscuro) vive en src/lib/appearance.js.
// useColorScheme() sigue los cambios del sistema; useIsDark aplica la preferencia.
export function useTheme() {
  const isDark = useIsDark(useColorScheme());
  return {
    isDark,
    ...palette,
    // Texto secundario (metadatos, placeholders). En claro sigue siendo Noche.
    muted: isDark ? dark.lavanda : palette.noche,
    navInactive: isDark ? dark.lavanda : palette.grisNav,
    placeholder: isDark ? dark.lavanda : 'rgba(26,26,46,0.45)',
    // Placeholder de foto.
    photo: isDark ? dark.linea : palette.arena,
    // Botón oscuro / chip activo: se invierte en oscuro.
    inverseBg: isDark ? palette.crema : palette.noche,
    inverseText: isDark ? palette.noche : palette.crema,
    // Superficie Noche grande (encabezado de Vets, perfil de vet).
    nocheSurface: isDark ? dark.noche2 : palette.noche,
    // Fondos Noche chicos (íconos, chip "Adoptado", logo sin color).
    nocheSmall: isDark ? dark.lineaFuerte : palette.noche,
    bg: isDark ? palette.noche : palette.crema,
    card: isDark ? dark.noche2 : palette.blanco,
    cardBorder: isDark ? dark.linea : palette.arena,
    title: isDark ? palette.crema : palette.noche,
    text: isDark ? palette.crema : palette.noche,
    subtitle: isDark ? dark.lavanda : palette.noche,
    label: isDark ? dark.lavanda : palette.noche,
    inputBg: isDark ? dark.noche2 : palette.blanco,
    inputText: isDark ? palette.crema : palette.noche,
    primary: palette.coral,
    primaryText: palette.arena,
    divider: isDark ? dark.lineaFuerte : palette.arena,
    socialBg: isDark ? dark.noche2 : palette.blanco,
    socialBorder: isDark ? dark.lineaFuerte : palette.arena,
    socialText: isDark ? palette.crema : palette.noche,
  };
}
