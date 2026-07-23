import { useEffect, useState } from 'react';
import {
  ScrollView, View, Text, Image, Pressable, StyleSheet, ActivityIndicator, Linking,
  useWindowDimensions, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import api from '../../src/lib/api';
import { useTheme } from '../../src/lib/theme';
import MenuButton from '../../src/components/MenuButton';

const SPECIES_LABEL = { dog: 'Perro', cat: 'Gato', other: 'Otro' };
const SIZE_LABEL = { small: 'Chico', medium: 'Mediano', large: 'Grande' };
const AGE_LABEL = { puppy: 'Cachorro', young: 'Joven', adult: 'Adulto', senior: 'Senior', unknown: 'Sin dato' };
const SEX_LABEL = { male: 'Macho', female: 'Hembra', unknown: 'Sin dato' };

function Chip({ children, c }) {
  return (
    <View style={[chipStyles.chip, { backgroundColor: c.bg }]}>
      <Text style={[chipStyles.text, { color: c.text }]}>{children}</Text>
    </View>
  );
}
const chipStyles = StyleSheet.create({
  chip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  text: { fontSize: 12, fontWeight: '700' },
});

export default function AdoptionDetail() {
  const c = useTheme();
  const { id } = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activePhoto, setActivePhoto] = useState(0);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.get(`/api/adoption-pets/${id}`)
      .then(({ data }) => setPet(data))
      .catch(() => setError('No pudimos encontrar esta publicación.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered, { backgroundColor: c.bg }]}>
        <ActivityIndicator color={c.title} />
      </SafeAreaView>
    );
  }
  if (error || !pet) {
    return (
      <SafeAreaView style={[styles.container, styles.centered, { backgroundColor: c.bg }]}>
        <Text style={[styles.notFoundTitle, { color: c.title }]}>404.</Text>
        <Text style={[styles.notFoundText, { color: c.subtitle }]}>{error}</Text>
        <Pressable onPress={() => router.replace('/adoptions')} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Volver a adopciones</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const photos = Array.isArray(pet.photos) ? pet.photos : [];
  const adopted = !!pet.adopted_at;
  const openLink = (url) => () => {
    if (url) Linking.openURL(url).catch(() => {});
  };
  const whatsappHref = pet.shelter_whatsapp
    ? `https://wa.me/${String(pet.shelter_whatsapp).replace(/[^\d]/g, '')}?text=Hola,%20me%20interesa%20adoptar%20a%20${encodeURIComponent(pet.name || 'esta mascota')}`
    : null;

  const heroSize = Math.min(width, 500);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={[styles.back, { color: c.subtitle }]}>‹ Adopciones</Text>
          </Pressable>
          <MenuButton />
        </View>

        {/* Galería */}
        <View style={{ position: 'relative' }}>
          {photos[activePhoto] ? (
            <Image source={{ uri: photos[activePhoto] }} style={{ width, height: Math.round(heroSize * 0.75), backgroundColor: '#F0EBE8' }} />
          ) : (
            <View style={{ width, height: Math.round(heroSize * 0.75), alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0EBE8' }}>
              <Text style={{ fontSize: 72 }}>🐾</Text>
            </View>
          )}
          {adopted ? (
            <View style={styles.adoptedOverlay}>
              <Text style={styles.adoptedText}>YA FUE ADOPTADO</Text>
            </View>
          ) : null}
        </View>

        {photos.length > 1 ? (
          <FlatList
            horizontal
            data={photos}
            keyExtractor={(u, i) => `${u}-${i}`}
            contentContainerStyle={{ padding: 16, gap: 10 }}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item, index }) => (
              <Pressable
                onPress={() => setActivePhoto(index)}
                style={[
                  styles.thumb,
                  { borderColor: index === activePhoto ? c.title : 'transparent', opacity: index === activePhoto ? 1 : 0.7 },
                ]}
              >
                <Image source={{ uri: item }} style={styles.thumbImg} />
              </Pressable>
            )}
          />
        ) : null}

        <View style={{ padding: 20 }}>
          <Text style={[styles.kicker, { color: c.subtitle }]}>EN ADOPCIÓN</Text>
          <Text style={[styles.name, { color: c.title }]}>{pet.name || 'Sin nombre'}.</Text>

          <View style={styles.chipsRow}>
            <Chip c={c}>{SPECIES_LABEL[pet.species]}</Chip>
            {pet.size ? <Chip c={c}>{SIZE_LABEL[pet.size]}</Chip> : null}
            {pet.age_group && pet.age_group !== 'unknown' ? <Chip c={c}>{AGE_LABEL[pet.age_group]}</Chip> : null}
            {pet.sex && pet.sex !== 'unknown' ? <Chip c={c}>{SEX_LABEL[pet.sex]}</Chip> : null}
            {pet.color ? <Chip c={c}>{pet.color}</Chip> : null}
            {pet.vaccinated ? <Chip c={c}>💉 Vacunado</Chip> : null}
            {pet.neutered ? <Chip c={c}>✂️ Castrado</Chip> : null}
          </View>

          {pet.description ? (
            <View style={[styles.section, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
              <Text style={[styles.body, { color: c.text }]}>{pet.description}</Text>
            </View>
          ) : null}

          {/* Refugio */}
          <View style={[styles.section, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
            <Text style={[styles.sectionKicker, { color: c.subtitle }]}>REFUGIO</Text>
            <Pressable
              onPress={() => router.push(`/shelters/${pet.shelter_slug}`)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 }}
            >
              {pet.shelter_logo ? (
                <Image source={{ uri: pet.shelter_logo }} style={styles.shelterLogo} />
              ) : (
                <View style={[styles.shelterLogo, styles.shelterLogoFallback]}>
                  <Text style={styles.shelterLogoLetter}>{pet.shelter_name?.charAt(0) || '?'}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.shelterName, { color: c.title }]} numberOfLines={1}>{pet.shelter_name}</Text>
                {pet.shelter_city ? (
                  <Text style={[styles.shelterCity, { color: c.subtitle }]}>📍 {pet.shelter_city}</Text>
                ) : null}
              </View>
              <Text style={{ color: c.subtitle, fontSize: 20 }}>›</Text>
            </Pressable>

            {!adopted ? (
              <View style={{ marginTop: 16, gap: 8 }}>
                {whatsappHref ? (
                  <Pressable onPress={openLink(whatsappHref)} style={[styles.ctaBtn, { backgroundColor: '#1A1A2E' }]}>
                    <Text style={styles.ctaBtnText}>💬 Contactar por WhatsApp</Text>
                  </Pressable>
                ) : null}
                {pet.shelter_email ? (
                  <Pressable onPress={openLink(`mailto:${pet.shelter_email}?subject=Consulta%20por%20adopci%C3%B3n%20-%20${encodeURIComponent(pet.name || 'mascota')}`)}
                    style={[styles.ctaBtnGhost, { borderColor: c.cardBorder }]}>
                    <Text style={[styles.ctaBtnGhostText, { color: c.title }]}>✉️  Email</Text>
                  </Pressable>
                ) : null}
                {pet.shelter_phone ? (
                  <Pressable onPress={openLink(`tel:${pet.shelter_phone}`)}
                    style={[styles.ctaBtnGhost, { borderColor: c.cardBorder }]}>
                    <Text style={[styles.ctaBtnGhostText, { color: c.title }]}>📞  Llamar</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center', padding: 20 },
  headerTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, paddingBottom: 8,
  },
  back: { fontSize: 15, fontWeight: '600' },
  adoptedOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center',
  },
  adoptedText: {
    backgroundColor: '#FF5C6C', color: '#fff', paddingHorizontal: 16, paddingVertical: 6,
    borderRadius: 999, fontSize: 12, fontWeight: '800', letterSpacing: 1.5,
  },
  thumb: { width: 60, height: 60, borderRadius: 12, borderWidth: 2, overflow: 'hidden' },
  thumbImg: { width: '100%', height: '100%' },
  kicker: { fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  name: { fontSize: 32, fontWeight: '800', letterSpacing: -0.8, marginTop: 4 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 16 },
  section: {
    marginTop: 20, padding: 20, borderRadius: 24, borderWidth: 1,
  },
  sectionKicker: { fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  body: { fontSize: 14, lineHeight: 21 },
  shelterLogo: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#F0EBE8' },
  shelterLogoFallback: { backgroundColor: '#FF5C6C', alignItems: 'center', justifyContent: 'center' },
  shelterLogoLetter: { color: '#fff', fontWeight: '800', fontSize: 20 },
  shelterName: { fontSize: 16, fontWeight: '800' },
  shelterCity: { fontSize: 12, fontWeight: '500', marginTop: 3 },
  ctaBtn: { borderRadius: 999, paddingVertical: 14, alignItems: 'center' },
  ctaBtnText: { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  ctaBtnGhost: { borderRadius: 999, paddingVertical: 14, alignItems: 'center', borderWidth: 1 },
  ctaBtnGhostText: { fontSize: 13, fontWeight: '700' },
  notFoundTitle: { fontSize: 60, fontWeight: '700' },
  notFoundText: { fontSize: 14, marginTop: 8, marginBottom: 24 },
  backBtn: { backgroundColor: '#1A1A2E', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 999 },
  backBtnText: { color: '#fff', fontWeight: '700' },
});
