import { useColorScheme } from 'react-native';

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

export function useTheme() {
  const isDark = useColorScheme() === 'dark';
  // Las claves son las mismas de antes para no romper las pantallas que
  // todavía no se rediseñaron. Los tokens oscuros salen de Home-v2-oscuro;
  // hoy no se ven porque app.json fuerza userInterfaceStyle "light".
  return {
    isDark,
    ...palette,
    bg: isDark ? palette.noche : palette.crema,
    card: isDark ? '#262642' : palette.blanco,
    cardBorder: isDark ? '#33334F' : palette.arena,
    title: isDark ? palette.crema : palette.noche,
    text: isDark ? palette.crema : palette.noche,
    subtitle: isDark ? '#B4B4C6' : palette.noche,
    label: isDark ? '#B4B4C6' : palette.noche,
    inputBg: isDark ? '#262642' : palette.blanco,
    inputText: isDark ? palette.crema : palette.noche,
    primary: palette.coral,
    primaryText: palette.arena,
    divider: isDark ? '#3A3A58' : palette.arena,
    socialBg: isDark ? '#262642' : palette.blanco,
    socialBorder: isDark ? '#3A3A58' : palette.arena,
    socialText: isDark ? palette.crema : palette.noche,
  };
}
