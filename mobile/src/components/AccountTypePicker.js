import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme, palette, fonts } from '../lib/theme';
import { Check, HouseHeart, PawPrint, Stethoscope } from '../lib/icons';

// Mismas opciones y textos en el registro por email y en /account-type (alta
// por login social), para que la app se sienta igual entres por donde entres.
export const ACCOUNT_TYPES = [
  {
    id: 'user',
    icon: PawPrint,
    color: palette.coral,
    title: 'Busco / reporto mascotas',
    desc: 'Uso Mimo para encontrar o reportar mascotas.',
  },
  {
    id: 'vet',
    icon: Stethoscope,
    color: palette.noche,
    title: 'Represento una veterinaria',
    desc: 'Publico mascotas encontradas y recibo alertas.',
  },
  {
    id: 'shelter',
    icon: HouseHeart,
    color: palette.teal,
    title: 'Represento un refugio',
    desc: 'Publico mascotas en adopción y las promociono.',
  },
];

// Tarjetas de radio (Registro.dc.html / Tipo-cuenta.dc.html): tile de color
// con el ícono, título y bajada, y el círculo de selección a la derecha.
export default function AccountTypePicker({ value, onChange, disabled, label }) {
  const c = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Tipo de cuenta" style={styles.group}>
      {label ? <Text style={[styles.label, { color: c.text }]}>{label}</Text> : null}
      {ACCOUNT_TYPES.map((t) => {
        const active = value === t.id;
        const Icon = t.icon;
        const fg = t.color === palette.noche ? palette.crema : palette.arena;
        return (
          <Pressable
            key={t.id}
            onPress={() => onChange(t.id)}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityState={{ checked: active, disabled: !!disabled }}
            style={[
              styles.card,
              { backgroundColor: c.card },
              active
                ? { borderWidth: 2, borderColor: c.title, padding: 11 }
                : { borderWidth: 1, borderColor: c.cardBorder },
            ]}
          >
            <View style={[styles.tile, { backgroundColor: t.color === palette.noche ? c.nocheSmall : t.color }]}>
              <Icon size={22} color={fg} strokeWidth={2} />
            </View>
            <View style={styles.texts}>
              <Text style={[styles.title, { color: c.title }]}>{t.title}</Text>
              <Text style={[styles.desc, { color: c.text }]}>{t.desc}</Text>
            </View>
            {active ? (
              <View style={[styles.radio, { backgroundColor: c.title }]}>
                <Check size={14} color={c.bg} strokeWidth={3} />
              </View>
            ) : (
              <View style={[styles.radio, styles.radioOff, { borderColor: c.isDark ? c.cardBorder : 'rgba(26,26,46,0.18)' }]} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  label: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  // padding 12 + borde 1; el activo usa 11 + borde 2 para que no salte.
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 20 },
  tile: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.bold, fontSize: 15 },
  desc: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 17 },
  radio: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  radioOff: { borderWidth: 2 },
});
