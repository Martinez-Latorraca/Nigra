import { View, Text, Pressable, StyleSheet } from 'react-native';

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
              { backgroundColor: active ? c.primary : c.card, borderColor: active ? c.primary : c.cardBorder },
            ]}
          >
            <Text style={[styles.text, { color: active ? c.primaryText : c.text }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, borderWidth: 1 },
  text: { fontSize: 13, fontWeight: '600' },
});
