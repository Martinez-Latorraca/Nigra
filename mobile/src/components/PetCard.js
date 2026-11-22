import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { MapPin, ArrowUpRight, Stethoscope } from '../lib/icons';
import { translateType, translateColor } from '../lib/translations';
import { useTheme, palette, fonts } from '../lib/theme';
import StatusChip from './StatusChip';

// Tarjeta de reporte en los listados (estilo de pantallas/Explorar).
export default function PetCard({ pet, onPress, style }) {
  const c = useTheme();
  const isLost = pet.status === 'lost';

  const matchPercentage =
    pet.visual_distance !== undefined ? ((1 - pet.visual_distance) * 100).toFixed(0) : null;

  const title = isLost ? pet.name || 'Sin nombre' : 'Encontrado';

  const footer = matchPercentage
    ? `${matchPercentage}% de coincidencia`
    : pet.distance_km
    ? `A ${parseFloat(pet.distance_km).toFixed(1)} km`
    : `Mimo ID #${pet.id}`;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, { backgroundColor: c.card, opacity: pressed ? 0.85 : 1 }, style]}
    >
      <Image source={{ uri: pet.photo_url }} style={[styles.image, { backgroundColor: c.photo }]} />

      <View style={styles.body}>
        <View style={styles.topRow}>
          <StatusChip status={pet.status} />
          <Text style={[styles.kicker, { color: c.text }]} numberOfLines={1}>
            {[translateType(pet.type), translateColor(pet.color)].filter(Boolean).join(' · ')}
          </Text>
        </View>

        <Text style={[styles.title, { color: c.title }]} numberOfLines={1}>
          {title}
        </Text>

        {pet.description && pet.description !== 'Desconocido' ? (
          <Text style={[styles.secondary, { color: c.text }]} numberOfLines={1}>
            {pet.description}
          </Text>
        ) : null}

        {pet.address ? (
          <View style={styles.iconRow}>
            <MapPin size={14} color={c.text} strokeWidth={2} />
            <Text style={[styles.secondary, styles.flex, { color: c.text }]} numberOfLines={1}>
              {pet.address}
            </Text>
          </View>
        ) : null}

        {pet.vet_name ? (
          <View style={[styles.vetBadge, { backgroundColor: c.nocheSmall }]}>
            <Stethoscope size={11} color={palette.crema} strokeWidth={2} />
            <Text style={styles.vetBadgeText} numberOfLines={1}>
              {pet.vet_name}
            </Text>
          </View>
        ) : null}

        <View style={[styles.footer, { borderTopColor: c.cardBorder }]}>
          <Text style={[styles.footerLeft, { color: c.text }]} numberOfLines={1}>
            {footer}
          </Text>
          <View style={styles.contact}>
            <Text style={[styles.contactText, { color: c.text }]}>Contactar</Text>
            <ArrowUpRight size={14} color={c.text} strokeWidth={2} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 24,
    padding: 12,
    gap: 14,
    marginBottom: 12,
  },
  image: { width: 104, height: 104, borderRadius: 18 },
  body: { flex: 1, minWidth: 0, gap: 4 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  kicker: {
    flexShrink: 1,
    fontFamily: fonts.bold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.66,
    textAlign: 'right',
  },
  title: { fontFamily: fonts.display, fontSize: 18, marginTop: 2 },
  secondary: { fontFamily: fonts.regular, fontSize: 13 },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  flex: { flex: 1 },
  vetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  vetBadgeText: { fontFamily: fonts.bold, fontSize: 10, color: palette.crema },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    marginTop: 'auto',
    paddingTop: 8,
  },
  footerLeft: { flexShrink: 1, fontFamily: fonts.bold, fontSize: 12 },
  contact: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  contactText: { fontFamily: fonts.bold, fontSize: 13 },
});
