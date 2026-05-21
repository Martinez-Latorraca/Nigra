import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { translateType, translateColor } from '../lib/translations';
import { useTheme } from '../lib/theme';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (Number.isNaN(days)) return '';
  if (days <= 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  if (days < 30) return `Hace ${days} días`;
  return new Date(dateStr).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

export default function PetCard({ pet, onPress }) {
  const c = useTheme();
  const isLost = pet.status === 'lost';
  const statusColor = isLost ? '#EF4444' : '#22C55E';

  const matchPercentage =
    pet.visual_distance !== undefined ? ((1 - pet.visual_distance) * 100).toFixed(0) : null;

  const title =
    pet.description && pet.description !== 'Desconocido' ? pet.description : pet.name || 'Sin nombre';

  const date = timeAgo(pet.created_at);

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}
    >
      {/* Imagen cuadrada */}
      <Image source={{ uri: pet.photo_url }} style={[styles.image, { backgroundColor: c.inputBg }]} />

      {/* Contenido */}
      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={[styles.badge, { backgroundColor: statusColor }]}>
            <Text style={styles.badgeText}>{isLost ? 'Perdido' : 'Encontrado'}</Text>
          </View>

          {matchPercentage ? (
            <View style={styles.matchWrap}>
              <Text style={[styles.matchLabel, { color: c.label }]}>MATCH</Text>
              <Text style={[styles.matchValue, { color: c.title }]}>{matchPercentage}%</Text>
            </View>
          ) : date ? (
            <Text style={[styles.date, { color: c.label }]}>{date}</Text>
          ) : null}
        </View>

        <Text style={[styles.title, { color: c.title }]} numberOfLines={1}>
          {title}
        </Text>

        <Text style={[styles.meta, { color: c.subtitle }]} numberOfLines={1}>
          {[translateType(pet.type), translateColor(pet.color)].filter(Boolean).join(' • ')}
        </Text>

        {/* Footer con divisor */}
        <View style={[styles.footer, { borderTopColor: c.cardBorder }]}>
          <Text style={[styles.footerLeft, { color: c.label }]}>
            {pet.distance_km ? `📍 ${parseFloat(pet.distance_km).toFixed(1)} km` : 'Nigra ID'}
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
  image: { width: 110, height: 110, borderRadius: 22, alignSelf: 'center' },
  body: { flex: 1, justifyContent: 'space-between' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  badge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  badgeText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, color: '#FFFFFF' },
  date: { fontSize: 11, fontWeight: '600' },
  matchWrap: { alignItems: 'flex-end' },
  matchLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  matchValue: { fontSize: 13, fontWeight: '700' },
  title: { fontSize: 19, fontWeight: '700', letterSpacing: -0.4, marginTop: 8 },
  meta: { fontSize: 14, fontWeight: '500', textTransform: 'capitalize', marginTop: 2 },
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
});
