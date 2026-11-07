import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Menu } from '../lib/icons';
import { palette, fonts, onColor } from '../lib/theme';
import { useSidebar } from '../lib/sidebar';
import { useSocket } from '../lib/socket';
import IconButton from './IconButton';

// Encabezado de sección: fondo del color de la sección, radio inferior 32,
// volver a la izquierda y menú (abre el sidebar) a la derecha.
// color: usar sectionColors de theme.js. onBack: por defecto router.back().
// showBack/showMenu en false ocultan cada botón; right reemplaza al menú.
export default function SectionHeader({
  color = palette.coral,
  kicker,
  title,
  subtitle,
  onBack,
  showBack = true,
  showMenu = true,
  right,
  centerLabel,
  children,
  style,
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { open } = useSidebar();
  const { unreadCount } = useSocket();
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
        {right ??
          (showMenu ? (
            <IconButton icon={Menu} iconSize={22} color={fg} backgroundColor={btnBg} accessibilityLabel="Menú" onPress={open}>
              {unreadCount > 0 ? <View style={[styles.dot, { borderColor: color }]} /> : null}
            </IconButton>
          ) : null)}
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
  dot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.coral,
    borderWidth: 2,
  },
});
