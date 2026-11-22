import { Pressable, Text, View, ActivityIndicator, StyleSheet } from 'react-native';
import { palette, fonts, onColor, useTheme } from '../lib/theme';

// Botón de la app.
// - primary: Coral (o `color`) con texto Arena.
// - outline: borde 2 del color del texto (Noche; Crema en oscuro), fondo transparente.
// - dark:    Noche con texto Crema; en oscuro se invierte (Crema con texto Noche).
// icon: componente Lucide opcional a la izquierda del texto.
export default function Button({
  title,
  onPress,
  variant = 'primary',
  color,
  icon: Icon,
  loading = false,
  disabled = false,
  style,
  textStyle,
}) {
  const c = useTheme();
  let bg;
  let fg;
  let border;
  if (variant === 'outline') {
    bg = 'transparent';
    fg = color || c.title;
    border = { borderWidth: 2, borderColor: color || c.title };
  } else if (variant === 'dark') {
    bg = c.inverseBg;
    fg = c.inverseText;
  } else {
    bg = color || palette.coral;
    fg = onColor(bg);
  }

  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg },
        border,
        { opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.content}>
          {Icon ? <Icon size={20} color={fg} strokeWidth={2} /> : null}
          <Text style={[styles.text, { color: fg }, textStyle]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 56,
    borderRadius: 18,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  text: { fontFamily: fonts.bold, fontSize: 16 },
});
