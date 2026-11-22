import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { House, Map, Plus, MessageCircle, User } from '../lib/icons';
import { palette, fonts, useTheme } from '../lib/theme';
import { useSocket } from '../lib/socket';

// Barra inferior fija: Inicio · Mapa · (+) · Chats · Perfil.
// Va en las pantallas principales y en los listados de sección; NO en
// fichas, flujo de Perdí/Encontré, chat ni cámara.
// Las pantallas que la usan dejan abajo `useTabBarSpace()` de padding.

const BAR_HEIGHT = 64;

// "Mapa" está deshabilitado hasta que exista la pantalla del mapa.
const TABS = [
  { key: 'home', label: 'Inicio', icon: House, href: '/home' },
  { key: 'map', label: 'Mapa', icon: Map, href: null },
  { key: 'report', label: 'Reportar', href: '/report', center: true },
  { key: 'messages', label: 'Chats', icon: MessageCircle, href: '/messages' },
  { key: 'profile', label: 'Perfil', icon: User, href: '/profile' },
];

// Padding inferior para el contenido: alto de la barra + safe area + 24.
export function useTabBarSpace() {
  const insets = useSafeAreaInsets();
  return BAR_HEIGHT + insets.bottom + 24;
}

export default function TabBar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { unreadCount } = useSocket();
  const c = useTheme();

  return (
    <View
      style={[
        styles.bar,
        { height: BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom },
        { backgroundColor: c.card, borderTopColor: c.cardBorder },
      ]}
    >
      {TABS.map((tab) => {
        if (tab.center) {
          return (
            <View key={tab.key} style={styles.slot}>
              <Pressable
                onPress={() => router.navigate(tab.href)}
                accessibilityRole="button"
                accessibilityLabel={tab.label}
                style={({ pressed }) => [
                  styles.plus,
                  // En oscuro la sombra del "+" es negra al 35 %.
                  c.isDark && { shadowColor: '#000', shadowOpacity: 0.35 },
                  { opacity: pressed ? 0.85 : 1 },
                ]}
              >
                {/* Óvalo de marca que sobresale 24 hacia arriba. */}
                <Svg width={56} height={56} viewBox="0 3.56 56 48.87" style={StyleSheet.absoluteFill}>
                  <Path
                    d="M28.16 52.43Q14.56 52.43 7.28 46.12Q0.0 39.81 0.0 28.16Q0.0 16.18 7.28 9.87Q14.56 3.56 28.16 3.56Q41.75 3.56 48.87 9.87Q56.0 16.18 56.0 28.16Q56.0 39.81 48.87 46.12Q41.75 52.43 28.16 52.43Z"
                    fill={palette.coral}
                  />
                </Svg>
                <Plus size={26} color={palette.noche} strokeWidth={2.5} />
              </Pressable>
            </View>
          );
        }

        const Icon = tab.icon;
        const disabled = !tab.href;
        const active = !disabled && pathname === tab.href;
        const color = active ? c.title : c.navInactive;

        return (
          <Pressable
            key={tab.key}
            onPress={disabled || active ? undefined : () => router.navigate(tab.href)}
            disabled={disabled}
            accessibilityRole="tab"
            accessibilityLabel={disabled ? `${tab.label} (próximamente)` : tab.label}
            accessibilityState={{ selected: active, disabled }}
            style={[styles.slot, disabled && styles.disabled]}
          >
            <View>
              <Icon size={24} color={color} strokeWidth={2} />
              {tab.key === 'messages' && unreadCount > 0 ? <View style={[styles.dot, { borderColor: c.card }]} /> : null}
            </View>
            <Text style={[styles.label, { color, fontFamily: active ? fonts.bold : fonts.medium }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    paddingTop: 8,
    paddingHorizontal: 12,
    borderTopWidth: 1,
  },
  slot: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  disabled: { opacity: 0.45 },
  label: { fontSize: 11 },
  plus: {
    width: 56,
    height: 56,
    marginTop: -24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: palette.noche,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  dot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.coral,
    borderWidth: 2,
  },
});
