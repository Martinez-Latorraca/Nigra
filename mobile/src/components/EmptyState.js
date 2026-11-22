import { View, Text, StyleSheet } from 'react-native';
import { useTheme, palette, fonts } from '../lib/theme';
import Button from './Button';

// Vacío de una lista o sección (Estados.dc.html): ícono Lucide de 38 en el
// color de la sección sobre una tarjeta blanca de 80, título Nunito 20, una
// frase y, si hay, la acción que lo resuelve.
// action: { title, onPress, color?, variant?, icon? } (props de Button).
// secondary: { title, onPress } → link subrayado debajo.
export default function EmptyState({ icon: Icon, color = palette.coral, title, text, action, secondary, style }) {
  const c = useTheme();
  return (
    <View style={[styles.wrap, style]}>
      {Icon ? (
        <View style={[styles.tile, { backgroundColor: c.card }]}>
          <Icon size={38} color={color} strokeWidth={2} />
        </View>
      ) : null}
      <Text style={[styles.title, { color: c.title }]}>{title}</Text>
      {text ? <Text style={[styles.text, { color: c.text }]}>{text}</Text> : null}
      {action || secondary ? (
        <View style={styles.actions}>
          {action ? <Button {...action} style={[styles.btn, action.style]} textStyle={styles.btnText} /> : null}
          {secondary ? (
            <Text onPress={secondary.onPress} style={[styles.secondary, { color: c.title }]}>
              {secondary.title}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 12, paddingVertical: 28, paddingHorizontal: 20 },
  tile: { width: 80, height: 80, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.display, fontSize: 20, lineHeight: 24, textAlign: 'center', marginTop: 4 },
  text: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, textAlign: 'center', maxWidth: 290 },
  actions: { marginTop: 6, gap: 8, alignItems: 'center' },
  btn: { height: 48, borderRadius: 16, paddingHorizontal: 18 },
  btnText: { fontSize: 15 },
  secondary: { fontFamily: fonts.medium, fontSize: 14, textDecorationLine: 'underline', padding: 4 },
});
