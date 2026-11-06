import { useEffect, useState } from 'react';
import {
  ScrollView, View, Text, Image, Pressable, StyleSheet, ActivityIndicator, Linking, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import api from '../../src/lib/api';
import { useTheme, fonts, sectionColors } from '../../src/lib/theme';
import { PawPrint } from '../../src/lib/icons';
import StatusChip from '../../src/components/StatusChip';
import Button from '../../src/components/Button';
import {
  CoverHeader, IdentityCard, InfoCard, HoursCard, ContactList,
} from '../../src/components/EntityProfile';

const SPECIES_LABEL = { dog: 'Perro', cat: 'Gato', other: 'Otro' };
const SIZE_LABEL = { small: 'Chico', medium: 'Mediano', large: 'Grande' };
const COLOR = sectionColors.refugios;

function PetMini({ pet, onPress, width, c }) {
  const photo = pet.photos?.[0];
  const adopted = !!pet.adopted_at;
  const meta = [SPECIES_LABEL[pet.species], pet.size ? SIZE_LABEL[pet.size] : null].filter(Boolean).join(' · ');
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.mini, { width, opacity: pressed ? 0.85 : 1 }]}>
      <View style={[styles.miniImg, { backgroundColor: c.arena }]}>
        {photo ? (
          <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} />
        ) : (
          <PawPrint size={28} color={c.text} strokeWidth={2} />
        )}
        <StatusChip status={adopted ? 'adopted' : 'adoption'} style={styles.miniChip} />
      </View>
      <Text style={[styles.miniName, { color: c.title }]} numberOfLines={1}>{pet.name || 'Sin nombre'}</Text>
      {meta ? <Text style={[styles.miniMeta, { color: c.text }]}>{meta}</Text> : null}
    </Pressable>
  );
}

export default function ShelterProfile() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { slug } = useLocalSearchParams();
  const [shelter, setShelter] = useState(null);
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api.get(`/api/shelters/${slug}`)
      .then(async ({ data }) => {
        setShelter(data);
        try {
          const { data: petsData } = await api.get('/api/adoption-pets', {
            params: { shelter_id: data.id, limit: 12 },
          });
          setPets(petsData.pets || []);
        } catch { /* silencioso */ }
      })
      .catch(() => setError('No pudimos encontrar este refugio.'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: c.bg }]}>
        <ActivityIndicator color={c.title} />
      </View>
    );
  }
  if (error || !shelter) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: c.bg }]}>
        <Text style={[styles.notFoundTitle, { color: c.title }]}>404</Text>
        <Text style={[styles.notFoundText, { color: c.text }]}>{error}</Text>
        <Button title="Volver al directorio" color={COLOR} onPress={() => router.replace('/shelters')} style={styles.notFoundBtn} />
      </View>
    );
  }

  const openLink = (url) => {
    if (url) Linking.openURL(url).catch(() => {});
  };
  // Mini cards: 2 columnas dentro de una tarjeta con padding 18 (+20 de pantalla).
  const miniWidth = (width - 40 - 36 - 10) / 2;

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
        <CoverHeader coverUrl={shelter.cover_url} color={COLOR} backLabel="Directorio" />

        <View style={styles.body}>
          {/* Solo ciudad: la dirección de un refugio no se publica
              (suele ser un domicilio particular con animales). */}
          <IdentityCard
            logoUrl={shelter.logo_url}
            name={shelter.name}
            kicker="Refugio"
            location={shelter.city}
            color={COLOR}
          />

          {shelter.bio ? (
            <InfoCard title="Sobre nosotros">
              <Text style={[styles.text, { color: c.text }]}>{shelter.bio}</Text>
            </InfoCard>
          ) : null}

          <HoursCard hours={shelter.hours} />

          <InfoCard title="En adopción" style={styles.petsCard}>
            <Pressable onPress={() => router.push('/adoptions')} style={styles.seeAll} hitSlop={8}>
              <Text style={[styles.seeAllText, { color: c.text }]}>Ver todas →</Text>
            </Pressable>
            {pets.length === 0 ? (
              <Text style={[styles.text, { color: c.text }]}>
                Este refugio todavía no tiene publicaciones activas.
              </Text>
            ) : (
              <View style={styles.miniGrid}>
                {pets.map((p) => (
                  <PetMini key={p.id} pet={p} c={c} width={miniWidth} onPress={() => router.push(`/adoptions/${p.id}`)} />
                ))}
              </View>
            )}
          </InfoCard>

          <ContactList entity={shelter} color={COLOR} onOpen={openLink} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center', padding: 20, gap: 12 },
  body: { marginTop: -48, paddingHorizontal: 20, gap: 16 },
  text: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  petsCard: { gap: 14 },
  seeAll: { position: 'absolute', top: 18, right: 18 },
  seeAllText: { fontFamily: fonts.bold, fontSize: 13 },
  miniGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  mini: { gap: 6 },
  miniImg: { height: 120, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  miniChip: { position: 'absolute', top: 8, left: 8, paddingHorizontal: 8, paddingVertical: 2 },
  miniName: { fontFamily: fonts.display, fontSize: 15 },
  miniMeta: { fontFamily: fonts.regular, fontSize: 12, marginTop: -4 },
  notFoundTitle: { fontFamily: fonts.display, fontSize: 60 },
  notFoundText: { fontFamily: fonts.regular, fontSize: 15, textAlign: 'center' },
  notFoundBtn: { alignSelf: 'stretch', marginTop: 8 },
});
