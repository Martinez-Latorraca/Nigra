import { Pressable, Text, View, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme, fonts } from '../../lib/theme';

// Botón "Continuar con …" (Login.dc.html): 52 de alto, cuadrado de 36 a la
// izquierda con el logo oficial del proveedor a 20 px y el texto centrado.
// dark = fondo Noche (Apple); si no, blanco con borde Arena.
export default function SocialButton({ Logo, label, dark = false, onPress, loading, disabled }) {
  const c = useTheme();
  const bg = dark ? c.noche : c.socialBg;
  const fg = dark ? c.crema : c.socialText;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg },
        !dark && { borderWidth: 1, borderColor: c.socialBorder },
        { opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
      ]}
    >
      <View style={[styles.logoBox, { backgroundColor: dark ? 'rgba(255,255,255,0.14)' : c.bg }]}>
        <Logo width={20} height={20} color={fg} />
      </View>
      {loading ? (
        <View style={styles.labelWrap}>
          <ActivityIndicator color={fg} />
        </View>
      ) : (
        <Text style={[styles.label, styles.labelWrap, { color: fg }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: 16,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  // marginRight = ancho del cuadrado + gap, así el texto queda centrado en el botón.
  labelWrap: { flex: 1, marginRight: 48, alignItems: 'center' },
  label: { fontFamily: fonts.bold, fontSize: 15, textAlign: 'center' },
});
