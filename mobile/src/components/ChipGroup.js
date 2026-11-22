import { View, Text, Pressable, StyleSheet } from 'react-native';
import { palette, fonts } from '../lib/theme';

// Chips de filtro: activo = Noche con texto Crema; inactivo = Blanco con borde Arena.
export default function ChipGroup({ options, value, onChange, c }) {
  return (
    <View style={styles.row}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[
              styles.chip,
              active
                ? { backgroundColor: c.inverseBg, borderColor: c.inverseBg }
                : { backgroundColor: c.card, borderColor: c.cardBorder },
            ]}
          >
            <Text
              style={[
                styles.text,
                { color: active ? c.inverseText : c.text, fontFamily: active ? fonts.bold : fonts.medium },
              ]}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { height: 40, paddingHorizontal: 18, justifyContent: 'center', borderRadius: 999, borderWidth: 1 },
  text: { fontSize: 14 },
});
