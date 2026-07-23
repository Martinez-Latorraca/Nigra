import { useEffect, useState } from 'react';
import {
  ScrollView, View, Text, Image, Pressable, StyleSheet, ActivityIndicator, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import api from '../../src/lib/api';
import { useTheme } from '../../src/lib/theme';
import MenuButton from '../../src/components/MenuButton';

const HOURS_ORDER = [
  ['mon', 'Lunes'], ['tue', 'Martes'], ['wed', 'Miércoles'],
  ['thu', 'Jueves'], ['fri', 'Viernes'], ['sat', 'Sábado'], ['sun', 'Domingo'],
];
const SPECIES_LABEL = { dog: 'Perro', cat: 'Gato', other: 'Otro' };

function ContactRow({ icon, label, value, onPress, c }) {
  if (!value) return null;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[styles.contact, { backgroundColor: c.card, borderColor: c.cardBorder }]}
    >
      <Text style={styles.contactIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.contactLabel, { color: c.subtitle }]}>{label}</Text>
        <Text style={[styles.contactValue, { color: c.title }]} numberOfLines={1}>{value}</Text>
      </View>
    </Pressable>
  );
}

function PetMini({ pet, onPress, c }) {
  const photo = pet.photos?.[0];
  const adopted = !!pet.adopted_at;
  return (
    <Pressable onPress={onPress} style={[styles.miniCard, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
      <View style={{ position: 'relative' }}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.miniImg} />
        ) : (
          <View style={[styles.miniImg, { alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }]}>
            <Text style={{ fontSize: 32 }}>🐾</Text>
          </View>
        )}
        {adopted ? (
          <View style={styles.adoptedOverlay}>
            <Text style={styles.adoptedText}>ADOPTADO</Text>
          </View>
        ) : null}
      </View>
      <View style={{ padding: 10 }}>
        <Text style={[styles.miniName, { color: c.title }]} numberOfLines={1}>{pet.name || 'Sin nombre'}</Text>
        <Text style={[styles.miniMeta, { color: c.subtitle }]}>{SPECIES_LABEL[pet.species]}</Text>
      </View>
    </Pressable>
  );
}

export default function ShelterProfile() {
  const c = useTheme();
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
      <SafeAreaView style={[styles.container, styles.centered, { backgroundColor: c.bg }]}>
        <ActivityIndicator color={c.title} />
      </SafeAreaView>
    );
  }
  if (error || !shelter) {
    return (
      <SafeAreaView style={[styles.container, styles.centered, { backgroundColor: c.bg }]}>
        <Text style={[styles.notFoundTitle, { color: c.title }]}>404.</Text>
        <Text style={[styles.notFoundText, { color: c.subtitle }]}>{error}</Text>
        <Pressable onPress={() => router.replace('/shelters')} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Volver al directorio</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const whatsappHref = shelter.whatsapp
    ? `https://wa.me/${String(shelter.whatsapp).replace(/[^\d]/g, '')}`
    : null;
  const openLink = (url) => () => {
    if (url) Linking.openURL(url).catch(() => {});
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={[styles.back, { color: c.subtitle }]}>‹ Directorio</Text>
          </Pressable>
          <MenuButton />
        </View>

        {shelter.cover_url ? (
          <Image source={{ uri: shelter.cover_url }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.coverFallback]} />
        )}

        <View style={[styles.heroCard, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
          <View style={styles.heroRow}>
            {shelter.logo_url ? (
              <Image source={{ uri: shelter.logo_url }} style={styles.heroLogo} />
            ) : (
              <View style={[styles.heroLogo, styles.heroLogoFallback]}>
                <Text style={styles.heroLogoLetter}>{shelter.name.charAt(0)}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.kicker, { color: c.subtitle }]}>REFUGIO</Text>
              <Text style={[styles.heroName, { color: c.title }]}>{shelter.name}</Text>
              {(shelter.city || shelter.address) && (
                <Text style={[styles.heroLocation, { color: c.subtitle }]}>
                  📍 {[shelter.address, shelter.city].filter(Boolean).join(' · ')}
                </Text>
              )}
            </View>
          </View>
        </View>

        {shelter.bio ? (
          <View style={[styles.section, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
            <Text style={[styles.sectionKicker, { color: c.subtitle }]}>SOBRE NOSOTROS</Text>
            <Text style={[styles.body, { color: c.text }]}>{shelter.bio}</Text>
          </View>
        ) : null}

        {shelter.hours && Object.keys(shelter.hours).length > 0 ? (
          <View style={[styles.section, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
            <Text style={[styles.sectionKicker, { color: c.subtitle }]}>HORARIOS</Text>
            {HOURS_ORDER.map(([k, label]) => {
              const v = shelter.hours[k];
              if (!v) return null;
              return (
                <View key={k} style={[styles.hourRow, { borderBottomColor: c.cardBorder }]}>
                  <Text style={[styles.hourDay, { color: c.title }]}>{label}</Text>
                  <Text style={[styles.hourValue, { color: c.subtitle }]}>{v}</Text>
                </View>
              );
            })}
          </View>
        ) : null}

        <View style={[styles.section, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[styles.sectionKicker, { color: c.subtitle }]}>MASCOTAS EN ADOPCIÓN</Text>
            <Pressable onPress={() => router.push('/adoptions')}>
              <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 1.2, color: c.title }}>VER TODAS →</Text>
            </Pressable>
          </View>
          {pets.length === 0 ? (
            <Text style={[styles.empty, { color: c.subtitle, marginTop: 20 }]}>
              Este refugio todavía no tiene publicaciones activas.
            </Text>
          ) : (
            <View style={styles.miniGrid}>
              {pets.map((p) => (
                <PetMini key={p.id} pet={p} c={c} onPress={() => router.push(`/adoptions/${p.id}`)} />
              ))}
            </View>
          )}
        </View>

        <View style={styles.contactList}>
          <ContactRow icon="📞" label="TELÉFONO" value={shelter.phone} onPress={shelter.phone ? openLink(`tel:${shelter.phone}`) : null} c={c} />
          <ContactRow icon="💬" label="WHATSAPP" value={shelter.whatsapp} onPress={whatsappHref ? openLink(whatsappHref) : null} c={c} />
          <ContactRow icon="✉️" label="EMAIL" value={shelter.email} onPress={shelter.email ? openLink(`mailto:${shelter.email}`) : null} c={c} />
          <ContactRow icon="🌐" label="SITIO WEB" value={shelter.website} onPress={shelter.website ? openLink(shelter.website) : null} c={c} />
          <ContactRow
            icon="📸"
            label="INSTAGRAM"
            value={shelter.instagram ? `@${String(shelter.instagram).replace(/^@/, '')}` : null}
            onPress={shelter.instagram ? openLink(`https://instagram.com/${String(shelter.instagram).replace(/^@/, '')}`) : null}
            c={c}
          />
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
    padding: 20, paddingBottom: 12,
  },
  back: { fontSize: 15, fontWeight: '600' },
  cover: { width: '100%', height: 160, backgroundColor: '#F0EBE8' },
  coverFallback: { backgroundColor: '#FFF6F0' },
  heroCard: {
    marginHorizontal: 20, marginTop: -40, borderRadius: 32, padding: 20, borderWidth: 1,
  },
  heroRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-end' },
  heroLogo: { width: 64, height: 64, borderRadius: 18, backgroundColor: '#F0EBE8' },
  heroLogoFallback: { backgroundColor: '#FF5C6C', alignItems: 'center', justifyContent: 'center' },
  heroLogoLetter: { color: '#fff', fontWeight: '800', fontSize: 26 },
  kicker: { fontSize: 9, fontWeight: '700', letterSpacing: 1.8 },
  heroName: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5, marginTop: 4 },
  heroLocation: { fontSize: 12, fontWeight: '500', marginTop: 4 },
  section: {
    marginHorizontal: 20, marginTop: 14, padding: 20, borderRadius: 24, borderWidth: 1,
  },
  sectionKicker: { fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  body: { fontSize: 14, lineHeight: 21, marginTop: 12 },
  hourRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1,
  },
  hourDay: { fontSize: 13, fontWeight: '700' },
  hourValue: { fontSize: 13, fontWeight: '500' },
  miniGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  miniCard: {
    width: '48%', borderRadius: 16, borderWidth: 1, overflow: 'hidden',
  },
  miniImg: { width: '100%', aspectRatio: 1 },
  adoptedOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center',
  },
  adoptedText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
  miniName: { fontSize: 13, fontWeight: '800' },
  miniMeta: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginTop: 2, textTransform: 'uppercase' },
  empty: { textAlign: 'center', fontSize: 13 },
  contactList: { paddingHorizontal: 20, paddingTop: 14, gap: 10 },
  contact: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 16, borderWidth: 1,
  },
  contactIcon: { fontSize: 18 },
  contactLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },
  contactValue: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  notFoundTitle: { fontSize: 60, fontWeight: '700' },
  notFoundText: { fontSize: 14, marginTop: 8, marginBottom: 24 },
  backBtn: { backgroundColor: '#1A1A2E', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 999 },
  backBtnText: { color: '#fff', fontWeight: '700' },
});
