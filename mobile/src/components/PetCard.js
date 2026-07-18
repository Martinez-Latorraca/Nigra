import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { translateType, translateColor } from '../lib/translations';
import { useTheme } from '../lib/theme';

export default function PetCard({ pet, onPress, style }) {
  const c = useTheme();
  const isLost = pet.status === 'lost';
  const statusColor = isLost ? '#EF4444' : '#22C55E';

  const matchPercentage =
    pet.visual_distance !== undefined ? ((1 - pet.visual_distance) * 100).toFixed(0) : null;

  const title = isLost ? pet.name || 'Sin nombre' : 'Encontrado';

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }, style]}
    >
      {/* Imagen cuadrada */}
      <Image source={{ uri: pet.photo_url }} style={[styles.image, { backgroundColor: c.inputBg }]} />

      {/* Contenido */}
      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={[styles.badge, { backgroundColor: statusColor }]}>
            <Text style={styles.badgeText}>{isLost ? 'Perdido' : 'Encontrado'}</Text>
          </View>

          <Text style={[styles.kicker, { color: '#0d945c' }]} numberOfLines={1}>
            {[translateType(pet.type), translateColor(pet.color)].filter(Boolean).join(' • ')}
          </Text>
        </View>

        <Text style={[styles.title, { color: c.title }]} numberOfLines={1}>
          {title}
        </Text>

        {pet.description && pet.description !== 'Desconocido' ? (
          <Text style={[styles.description, { color: c.subtitle }]} numberOfLines={1}>
            {pet.description}
          </Text>
        ) : null}

        {pet.address ? (
          <Text style={[styles.address, { color: c.subtitle }]} numberOfLines={1}>
            📍 {pet.address}
          </Text>
        ) : null}

        {pet.vet_name ? (
          <View style={styles.vetBadge}>
            <Text style={styles.vetBadgeIcon}>🏥</Text>
            <Text style={styles.vetBadgeText} numberOfLines={1}>
              {pet.vet_name}
            </Text>
          </View>
        ) : null}

        {/* Footer con divisor */}
        <View style={[styles.footer, { borderTopColor: c.cardBorder }]}>
          <Text style={[styles.footerLeft, { color: matchPercentage ? '#0d945c' : c.label }]}>
            {matchPercentage
              ? `${matchPercentage}% de coincidencia`
              : pet.distance_km
              ? `📍 ${parseFloat(pet.distance_km).toFixed(1)} km`
              : `Mimo ID #${pet.id}`}
          </Text>
          <Text style={[styles.contact, { color: c.title }]}>Contactar ↗</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 28,
    padding: 14,
    gap: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  image: { width: 124, height: 124, borderRadius: 24, alignSelf: 'center' },
  body: { flex: 1, justifyContent: 'space-between' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  badge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  badgeText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, color: '#FFFFFF' },
  matchWrap: { alignItems: 'flex-end' },
  matchLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  matchValue: { fontSize: 13, fontWeight: '700' },
  kicker: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    textAlign: 'right',
  },
  title: { fontSize: 19, fontWeight: '700', letterSpacing: -0.4, marginTop: 8 },
  description: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  address: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    marginTop: 10,
    paddingTop: 10,
  },
  footerLeft: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  contact: { fontSize: 13, fontWeight: '600' },
  vetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,184,48,0.15)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  vetBadgeIcon: { fontSize: 11 },
  vetBadgeText: { fontSize: 10, fontWeight: '700', color: '#C98800', letterSpacing: 0.3 },
});
