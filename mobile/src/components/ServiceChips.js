import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme, palette, fonts } from '../lib/theme';
import { Check, Plus } from '../lib/icons';
import { SERVICE_CATALOG } from '../lib/services';
import FormField from './FormField';

// Estado de los servicios de una vet: los del catálogo se eligen con chips y
// el resto va en "Otros servicios", separado por coma. Lo usan el registro y
// la edición de la clínica.
export function useServices(initial = []) {
  const catalogSet = new Set(SERVICE_CATALOG);
  const [selected, setSelected] = useState(() => new Set(initial.filter((s) => catalogSet.has(s))));
  const [other, setOther] = useState(initial.filter((s) => !catalogSet.has(s)).join(', '));
  const toggle = (s) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  // Lista final para el server: catálogo en orden + los otros.
  const toList = () => [
    ...SERVICE_CATALOG.filter((s) => selected.has(s)),
    ...other.split(',').map((s) => s.trim()).filter(Boolean),
  ];
  return { selected, toggle, other, setOther, toList };
}

// Chips del catálogo (Noche con check al elegirlo) + campo "Otros servicios".
export default function ServiceChips({ services, otherPlaceholder = 'Separá por coma: Homeopatía, Nutrición…' }) {
  const c = useTheme();
  return (
    <>
      <View style={styles.field}>
        <Text style={[styles.label, { color: c.text }]}>Servicios</Text>
        <View style={styles.chips}>
          {SERVICE_CATALOG.map((s) => {
            const active = services.selected.has(s);
            return (
              <Pressable
                key={s}
                onPress={() => services.toggle(s)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: active }}
                style={[
                  styles.chip,
                  active
                    ? { backgroundColor: palette.noche, borderColor: palette.noche }
                    : { backgroundColor: c.card, borderColor: c.cardBorder },
                ]}
              >
                {active ? (
                  <Check size={14} color={palette.crema} strokeWidth={2.5} />
                ) : (
                  <Plus size={14} color={c.text} strokeWidth={2} />
                )}
                <Text
                  style={[
                    styles.chipText,
                    { color: active ? palette.crema : c.text, fontFamily: active ? fonts.bold : fonts.medium },
                  ]}
                >
                  {s}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <FormField
        label="Otros servicios"
        icon={Plus}
        value={services.other}
        onChangeText={services.setOther}
        placeholder={otherPlaceholder}
      />
    </>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  label: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    height: 36,
    paddingLeft: 10,
    paddingRight: 12,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chipText: { fontSize: 13 },
});
