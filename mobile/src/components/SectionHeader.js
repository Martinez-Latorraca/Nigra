import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from '../lib/icons';
import { palette, fonts, onColor } from '../lib/theme';
import IconButton from './IconButton';

// Encabezado de sección: fondo del color de la sección, radio inferior 32,
// volver a la izquierda. A la derecha va `right` o un espacio de 44 que mantiene
// centrado el texto del medio (ya no hay menú lateral: lo reemplaza la TabBar).
// color: usar sectionColors de theme.js. onBack: por defecto router.back().
// showBack en false deja un espacio en lugar del botón de volver.
export default function SectionHeader({
  color = palette.coral,
  kicker,
  title,
  subtitle,
  onBack,
  showBack = true,
  right,
  centerLabel,
  children,
  style,
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const fg = onColor(color);
  // Sobre Noche el diseño usa botones más tenues y kicker/bajada en gris claro.
  const dark = color === palette.noche;
  const btnBg = dark ? 'rgba(255,255,255,0.12)' : undefined;
  const kickerColor = dark ? '#B4B4C6' : fg;
  const subtitleColor = dark ? '#D9D9E3' : fg;

  return (
    <View style={[styles.header, { backgroundColor: color, paddingTop: 16 + insets.top }, style]}>
      <View style={styles.topRow}>
        {showBack ? (
          <IconButton
            icon={ChevronLeft}
            color={fg}
            backgroundColor={btnBg}
            accessibilityLabel="Volver"
            onPress={onBack || (() => router.back())}
          />
        ) : (
          <View style={styles.spacer} />
        )}
        {centerLabel ? <Text style={[styles.centerLabel, { color: kickerColor }]}>{centerLabel}</Text> : null}
        {right ?? <View style={styles.spacer} />}
      </View>

      {kicker || title || subtitle ? (
        <View style={styles.texts}>
          {kicker ? <Text style={[styles.kicker, { color: kickerColor }]}>{kicker}</Text> : null}
          {title ? <Text style={[styles.title, { color: fg }]}>{title}</Text> : null}
          {subtitle ? <Text style={[styles.subtitle, { color: subtitleColor }]}>{subtitle}</Text> : null}
        </View>
      ) : null}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 20,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  spacer: { width: 44, height: 44 },
  texts: { gap: 6 },
  kicker: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  centerLabel: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase' },
  title: { fontFamily: fonts.display, fontSize: 34, lineHeight: 38 },
  subtitle: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
});
