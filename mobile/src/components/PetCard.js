import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { translateType, translateColor } from '../lib/translations';
import { useTheme } from '../lib/theme';

export default function PetCard({ pet, onPress }) {
  const c = useTheme();
  const isLost = pet.status === 'lost';

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}
    >
      <Image source={{ uri: pet.photo_url }} style={styles.image} />

      <View style={styles.body}>
        <View style={styles.topRow}>
          <View
            style={[
              styles.badge,
              { backgroundColor: isLost ? c.primary : c.inputBg },
            ]}
          >
            <Text style={[styles.badgeText, { color: isLost ? c.primaryText : c.subtitle }]}>
              {isLost ? 'Perdido' : 'Encontrado'}
            </Text>
          </View>
        </View>

        <Text style={[styles.name, { color: c.title }]} numberOfLines={1}>
          {pet.name || (pet.description && pet.description !== 'Desconocido' ? pet.description : 'Sin nombre')}
        </Text>

        <Text style={[styles.meta, { color: c.subtitle }]} numberOfLines={1}>
          {[translateType(pet.type), translateColor(pet.color)].filter(Boolean).join(' • ')}
        </Text>

        <Text style={[styles.idLabel, { color: c.label }]}>Nigra ID #{pet.id}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 28,
    padding: 12,
    gap: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 12,
  },
  image: { width: 96, height: 96, borderRadius: 20, backgroundColor: '#E5E7EB' },
  body: { flex: 1, gap: 4 },
  topRow: { flexDirection: 'row' },
  badge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  name: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  meta: { fontSize: 14, fontWeight: '500', textTransform: 'capitalize' },
  idLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
});
