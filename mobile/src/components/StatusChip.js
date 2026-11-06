import { View, Text, StyleSheet } from 'react-native';
import { palette, fonts, onColor } from '../lib/theme';

// Estados de mascota → color del chip.
export const STATUS_STYLES = {
  lost: { label: 'Perdido', color: palette.coral },
  found: { label: 'Encontrado', color: palette.teal },
  adoption: { label: 'En adopción', color: palette.violeta },
  reunited: { label: 'Reencontrada', color: palette.violeta },
  adopted: { label: 'Adoptado', color: palette.noche },
};

export default function StatusChip({ status, label, size = 'sm', style }) {
  const s = STATUS_STYLES[status];
  if (!s) return null;
  const big = size === 'md';
  return (
    <View style={[styles.chip, big && styles.chipMd, { backgroundColor: s.color }, style]}>
      <Text style={[styles.text, big && styles.textMd, { color: onColor(s.color) }]}>{label || s.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  chipMd: { paddingHorizontal: 12, paddingVertical: 5 },
  text: { fontFamily: fonts.bold, fontSize: 11 },
  textMd: { fontSize: 13 },
});
