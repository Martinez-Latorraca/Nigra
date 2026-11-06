import { Pressable, StyleSheet } from 'react-native';
import { palette } from '../lib/theme';

// Botón redondo de 44 con un ícono Lucide. Por defecto es el de los
// encabezados de color (blanco translúcido, ícono Arena).
export default function IconButton({
  icon: Icon,
  onPress,
  size = 44,
  iconSize = 24,
  color = palette.arena,
  backgroundColor = 'rgba(255,255,255,0.22)',
  accessibilityLabel,
  disabled,
  style,
  children,
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.btn,
        { width: size, height: size, borderRadius: size / 2, backgroundColor, opacity: pressed ? 0.7 : 1 },
        style,
      ]}
    >
      {Icon ? <Icon size={iconSize} color={color} strokeWidth={2} /> : null}
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { alignItems: 'center', justifyContent: 'center' },
});
