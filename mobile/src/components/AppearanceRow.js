import { Pressable, View, Text, StyleSheet } from 'react-native';
import { useTheme, palette, fonts } from '../lib/theme';
import { ChevronRight, Moon, Sun, SunMoon } from '../lib/icons';
import { useAppearance, setAppearance } from '../lib/appearance';
import { choose } from '../lib/feedback';

// Opción "Apariencia" del perfil: Automático / Claro / Oscuro (handoff, "Modo
// oscuro"). No tiene pantalla propia en el diseño: abre la hoja de opciones.
const LABELS = { auto: 'Automático', light: 'Claro', dark: 'Oscuro' };

export default function AppearanceRow({ style }) {
  const c = useTheme();
  const pref = useAppearance();

  const open = async () => {
    const v = await choose({
      title: 'Apariencia',
      options: [
        { value: 'auto', icon: SunMoon, color: c.nocheSmall, title: 'Automático', text: 'Igual que el teléfono.', selected: pref === 'auto' },
        { value: 'light', icon: Sun, color: palette.sol, title: 'Claro', selected: pref === 'light' },
        { value: 'dark', icon: Moon, color: palette.violeta, title: 'Oscuro', selected: pref === 'dark' },
      ],
    });
    if (v) setAppearance(v);
  };

  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={`Apariencia: ${LABELS[pref]}`}
      style={({ pressed }) => [styles.row, { backgroundColor: c.card, opacity: pressed ? 0.85 : 1 }, style]}
    >
      <View style={[styles.tile, { backgroundColor: c.nocheSmall }]}>
        <SunMoon size={18} color={palette.crema} strokeWidth={2} />
      </View>
      <Text style={[styles.title, { color: c.title }]}>Apariencia</Text>
      <Text style={[styles.value, { color: c.muted }]}>{LABELS[pref]}</Text>
      <ChevronRight size={20} color={c.text} strokeWidth={2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 20 },
  tile: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontFamily: fonts.bold, fontSize: 15 },
  value: { fontFamily: fonts.medium, fontSize: 14 },
});
