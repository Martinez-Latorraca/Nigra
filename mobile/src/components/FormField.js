import { forwardRef } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTheme, palette, fonts } from '../lib/theme';

// Campo de los formularios dentro de tarjetas blancas (editar perfil, datos
// del refugio, registro de vet): etiqueta en mayúsculas, fondo Crema, ícono
// Lucide opcional. `required` agrega el asterisco Coral; `readOnly` lo pinta
// en Arena; `hint` va debajo; `error` pone borde Coral y el mensaje.
// `right` va a la derecha del input (p. ej. mostrar contraseña) y `boxStyle`
// pisa la caja (las pantallas de login usan caja blanca con borde).
const FormField = forwardRef(function FormField(
  { label, icon: Icon, required, readOnly, hint, error, multiline, prefix, right, style, boxStyle, ...inputProps },
  ref,
) {
  const c = useTheme();
  return (
    <View style={[styles.wrap, style]}>
      {label ? (
        <Text style={[styles.label, { color: c.text }]}>
          {label}
          {required ? <Text style={{ color: palette.coral }}> *</Text> : null}
        </Text>
      ) : null}
      <View
        style={[
          styles.box,
          { backgroundColor: readOnly ? c.photo : c.bg },
          multiline && styles.boxMultiline,
          boxStyle,
          error ? styles.boxError : null,
        ]}
      >
        {Icon ? <Icon size={18} color={c.text} strokeWidth={2} /> : null}
        {prefix ? <Text style={[styles.prefix, { color: c.text }]}>{prefix}</Text> : null}
        <TextInput
          ref={ref}
          editable={!readOnly}
          multiline={multiline}
          placeholderTextColor={c.placeholder}
          style={[styles.input, { color: c.inputText }, multiline && styles.inputMultiline]}
          {...inputProps}
        />
        {right}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {hint ? <Text style={[styles.hint, { color: c.text }]}>{hint}</Text> : null}
    </View>
  );
});

export default FormField;

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  box: { minHeight: 50, borderRadius: 14, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  boxMultiline: { alignItems: 'flex-start', paddingVertical: 12 },
  boxError: { borderWidth: 2, borderColor: palette.coral },
  prefix: { fontFamily: fonts.bold, fontSize: 15 },
  input: { flex: 1, minHeight: 40, fontFamily: fonts.regular, fontSize: 15, paddingVertical: 0 },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  hint: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17 },
  error: { fontFamily: fonts.bold, fontSize: 13, color: palette.coral },
});
