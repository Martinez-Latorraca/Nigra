import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import api from '../../src/lib/api';
import { useTheme } from '../../src/lib/theme';
import { translateType, translateColor } from '../../src/lib/translations';
import { API_URL } from '../../src/lib/config';
import PetMap from '../../src/components/PetMap';

function parseExtraPhotos(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function PetDetail() {
  const { id } = useLocalSearchParams();
  const c = useTheme();
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api
      .get(`/api/pets/${id}`)
      .then(({ data }) => active && setPet(data))
      .catch(() => active && setError('No pudimos encontrar esta mascota.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator color={c.title} />
      </SafeAreaView>
    );
  }

  if (error || !pet) {
    return (
      <SafeAreaView style={[styles.container, styles.center, { backgroundColor: c.bg }]}>
        <Text style={[styles.notFound, { color: c.title }]}>404.</Text>
        <Text style={[styles.notFoundMsg, { color: c.subtitle }]}>{error}</Text>
        <Pressable style={[styles.primaryBtn, { backgroundColor: c.primary }]} onPress={() => router.back()}>
          <Text style={[styles.primaryBtnText, { color: c.primaryText }]}>Volver</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const isLost = pet.status === 'lost';
  const extras = parseExtraPhotos(pet.extra_photos);

  const handleCall = () => {
    if (pet.contact_info) Linking.openURL(`tel:${pet.contact_info}`);
  };
  const handleShare = () => {
    Share.share({
      message:
        isLost
          ? `🔍 ¡Ayudanos a encontrar a ${pet.name || 'una mascota'}! ${API_URL}/pet/${pet.id}`
          : `🐾 ¿Reconocés a esta mascota? ${API_URL}/pet/${pet.id}`,
    });
  };
  const handleMap = () => {
    if (pet.lat && pet.lng) {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${pet.lat},${pet.lng}`);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={[styles.back, { color: c.subtitle }]}>‹ Volver</Text>
          </Pressable>
          <Text style={[styles.idLabel, { color: c.label }]}>Nigra ID #{pet.id}</Text>
        </View>

        <Image source={{ uri: pet.photo_url }} style={styles.mainImage} />

        {extras.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gallery}>
            {extras.map((url, i) => (
              <Image key={i} source={{ uri: url }} style={styles.thumb} />
            ))}
          </ScrollView>
        )}

        <View style={styles.info}>
          <View style={[styles.badge, { backgroundColor: isLost ? '#EF4444' : '#22C55E' }]}>
            <Text style={styles.badgeText}>{isLost ? 'Perdido' : 'Encontrado'}</Text>
          </View>

          <Text style={[styles.meta, { color: c.subtitle }]}>
            {[translateType(pet.type), translateColor(pet.color)].filter(Boolean).join(' • ')}
          </Text>
          <Text style={[styles.name, { color: c.title }]}>{pet.name || 'Sin nombre'}</Text>

          <Text style={[styles.reporter, { color: c.subtitle }]}>
            Informante: <Text style={{ color: c.text, fontWeight: '600' }}>{pet.reporter_name || 'Anónimo'}</Text>
          </Text>

          <Text style={[styles.description, { color: c.text }]}>
            {pet.description && pet.description !== 'Desconocido'
              ? pet.description
              : 'Sin detalles adicionales.'}
          </Text>

          {pet.lat && pet.lng ? (
            <Pressable style={styles.mapWrap} onPress={handleMap}>
              <PetMap lat={pet.lat} lng={pet.lng} isDark={c.isDark} style={styles.map} />
            </Pressable>
          ) : null}

          <View style={styles.actions}>
            {pet.contact_info ? (
              <Pressable style={[styles.primaryBtn, { backgroundColor: c.primary }]} onPress={handleCall}>
                <Text style={[styles.primaryBtnText, { color: c.primaryText }]}>Llamar</Text>
              </Pressable>
            ) : null}

            <Pressable
              style={[styles.secondaryBtn, { borderColor: c.cardBorder, backgroundColor: c.card }]}
              onPress={handleShare}
            >
              <Text style={[styles.secondaryBtnText, { color: c.text }]}>Compartir</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  scroll: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  back: { fontSize: 15, fontWeight: '600' },
  idLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  mainImage: { width: '100%', aspectRatio: 4 / 3, borderRadius: 28, backgroundColor: '#E5E7EB' },
  gallery: { marginTop: 12 },
  thumb: { width: 72, height: 72, borderRadius: 16, marginRight: 10, backgroundColor: '#E5E7EB' },
  info: { marginTop: 20, gap: 8 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  meta: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 8 },
  name: { fontSize: 36, fontWeight: '700', letterSpacing: -0.8 },
  reporter: { fontSize: 13, marginTop: 4 },
  description: { fontSize: 15, lineHeight: 22, marginTop: 8 },
  mapWrap: { height: 200, borderRadius: 28, overflow: 'hidden', marginTop: 20, backgroundColor: '#E5E7EB' },
  map: { flex: 1 },
  actions: { gap: 12, marginTop: 24 },
  primaryBtn: { borderRadius: 999, paddingVertical: 16, alignItems: 'center' },
  primaryBtnText: { fontWeight: '700', fontSize: 15 },
  secondaryBtn: { borderRadius: 999, paddingVertical: 16, alignItems: 'center', borderWidth: 1 },
  secondaryBtnText: { fontWeight: '600', fontSize: 15 },
  notFound: { fontSize: 64, fontWeight: '700' },
  notFoundMsg: { fontSize: 15 },
});
