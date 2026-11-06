import { View, TextInput, Pressable, Text, StyleSheet } from 'react-native';
import { useTheme, palette, fonts } from '../lib/theme';
import { Search } from '../lib/icons';

// Buscador de los listados: ícono, campo y botón Noche "Buscar".
// Busca al tocar el botón o al dar enter (onSubmit).
export default function SearchBar({ value, onChangeText, onSubmit, placeholder, icon: Icon = Search, buttonLabel = 'Buscar', style }) {
  const c = useTheme();
  return (
    <View style={[styles.bar, { backgroundColor: c.inputBg, borderColor: c.cardBorder }, style]}>
      <Icon size={18} color={c.text} strokeWidth={2} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder={placeholder}
        placeholderTextColor="rgba(26,26,46,0.45)"
        returnKeyType="search"
        accessibilityLabel={placeholder}
        style={[styles.input, { color: c.inputText }]}
      />
      <Pressable
        onPress={onSubmit}
        accessibilityRole="button"
        style={({ pressed }) => [styles.btn, { opacity: pressed ? 0.85 : 1 }]}
      >
        <Text style={styles.btnText}>{buttonLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    paddingLeft: 14,
    paddingRight: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: { flex: 1, height: 40, fontFamily: fonts.regular, fontSize: 15, paddingVertical: 0 },
  btn: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: palette.noche,
    justifyContent: 'center',
  },
  btnText: { fontFamily: fonts.bold, fontSize: 14, color: palette.crema },
});
