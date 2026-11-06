import { View, Text, StyleSheet } from 'react-native';
import { Star } from '../lib/icons';
import { tierOf } from '../lib/sponsorTiers';
import { palette, fonts } from '../lib/theme';

// Pastilla "Socio Mimo · Pro": 20 de alto, color del plan, texto y estrella
// rellena en Arena. Sin plan de sponsor no muestra nada.
// `width` queda por compatibilidad con los llamados viejos y se ignora:
// la pastilla se ajusta al texto.
export default function SponsorBadge({ vet, style }) {
  const tier = tierOf(vet);
  if (!tier) return null;
  return (
    <View style={[styles.badge, { backgroundColor: tier.color }, style]}>
      <Star size={11} color={palette.arena} fill={palette.arena} strokeWidth={2} />
      <Text style={styles.text}>
        {tier.label} · {tier.tierLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    height: 20,
    paddingHorizontal: 10,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  text: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, color: palette.arena },
});
