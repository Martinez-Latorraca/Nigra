import { forwardRef } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { palette, fonts, useTheme } from '../lib/theme';

// Campo de texto: etiqueta en mayúsculas arriba, ícono Lucide de 18 a la
// izquierda y `right` opcional (p. ej. el ojo de la contraseña).
// Con `error` el borde pasa a 2 Coral y se muestra el mensaje abajo.
// El resto de las props van directo al TextInput.
const TextField = forwardRef(function TextField(
  { label, icon: Icon, right, error, style, inputStyle, multiline, ...inputProps },
  ref,
) {
  const c = useTheme();
  return (
    <View style={[styles.wrap, style]}>
      {label ? <Text style={[styles.label, { color: c.text }]}>{label}</Text> : null}
      <View
        style={[
          styles.box,
          { backgroundColor: c.inputBg, borderColor: c.cardBorder },
          multiline && styles.boxMultiline,
          error ? styles.boxError : null,
        ]}
      >
        {Icon ? <Icon size={18} color={c.text} strokeWidth={2} style={multiline ? styles.iconTop : null} /> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={c.isDark ? '#B4B4C6' : 'rgba(26,26,46,0.45)'}
          multiline={multiline}
          style={[styles.input, { color: c.inputText }, multiline && styles.inputMultiline, inputStyle]}
          {...inputProps}
        />
        {right}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
});

export default TextField;

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  box: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    paddingLeft: 14,
    paddingRight: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  boxMultiline: { alignItems: 'flex-start', paddingVertical: 12 },
  boxError: { borderWidth: 2, borderColor: palette.coral },
  iconTop: { marginTop: 2 },
  input: { flex: 1, minHeight: 40, fontFamily: fonts.regular, fontSize: 15, paddingVertical: 0 },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  error: { fontFamily: fonts.medium, fontSize: 13, color: palette.coral },
});
