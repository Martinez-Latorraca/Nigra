import { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import api from '../../src/lib/api';
import { useTheme } from '../../src/lib/theme';
import MenuButton from '../../src/components/MenuButton';
import { tierOf } from '../../src/lib/sponsorTiers';

const HOURS_ORDER = [
  ['mon', 'Lunes'],
  ['tue', 'Martes'],
  ['wed', 'Miércoles'],
  ['thu', 'Jueves'],
  ['fri', 'Viernes'],
  ['sat', 'Sábado'],
  ['sun', 'Domingo'],
];

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
        <Text style={[styles.contactValue, { color: c.title }]} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </Pressable>
  );
}

export default function VetProfile() {
  const c = useTheme();
  const { slug } = useLocalSearchParams();
  const [vet, setVet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api
      .get(`/api/vets/${slug}`)
      .then(({ data }) => setVet(data))
      .catch(() => setError('No pudimos encontrar esta veterinaria.'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered, { backgroundColor: c.bg }]}>
        <ActivityIndicator color={c.title} />
      </SafeAreaView>
    );
  }

  if (error || !vet) {
    return (
      <SafeAreaView style={[styles.container, styles.centered, { backgroundColor: c.bg }]}>
        <Text style={[styles.notFoundTitle, { color: c.title }]}>404.</Text>
        <Text style={[styles.notFoundText, { color: c.subtitle }]}>{error}</Text>
        <Pressable onPress={() => router.replace('/vets')} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Volver al directorio</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const tier = tierOf(vet);
  const whatsappHref = vet.whatsapp
    ? `https://wa.me/${String(vet.whatsapp).replace(/[^\d]/g, '')}`
    : null;

  const openLink = (url) => () => {
    if (url) Linking.openURL(url).catch(() => {});
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={[styles.back, { color: c.subtitle }]}>‹ Directorio</Text>
          </Pressable>
          <MenuButton />
        </View>

        {vet.cover_url ? (
          <Image source={{ uri: vet.cover_url }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.coverFallback]} />
        )}

        <View style={[styles.heroCard, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
          <View style={styles.heroRow}>
            {vet.logo_url ? (
              <Image source={{ uri: vet.logo_url }} style={styles.logo} />
            ) : (
              <View style={[styles.logo, styles.logoFallback]}>
                <Text style={styles.logoLetter}>{vet.name.charAt(0)}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <View style={styles.badgeRow}>
                <Text style={[styles.kicker, { color: c.subtitle }]}>VETERINARIA</Text>
                {tier && (
                  <View style={[styles.sponsorBadge, { backgroundColor: tier.color }]}>
                    <Text style={styles.sponsorText}>⭐ SOCIO MIMO</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.name, { color: c.title }]}>{vet.name}</Text>
              {(vet.city || vet.address) && (
                <Text style={[styles.location, { color: c.subtitle }]}>
                  📍 {[vet.address, vet.city].filter(Boolean).join(' · ')}
                </Text>
              )}
            </View>
          </View>
        </View>

        {vet.bio ? (
          <View style={[styles.section, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
            <Text style={[styles.sectionKicker, { color: c.subtitle }]}>SOBRE NOSOTROS</Text>
            <Text style={[styles.bio, { color: c.text }]}>{vet.bio}</Text>
          </View>
        ) : null}

        {vet.services && vet.services.length > 0 ? (
          <View style={[styles.section, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
            <Text style={[styles.sectionKicker, { color: c.subtitle }]}>SERVICIOS</Text>
            <View style={styles.services}>
              {vet.services.map((s) => (
                <View key={s} style={[styles.chip, { backgroundColor: c.bg }]}>
                  <Text style={[styles.chipText, { color: c.text }]}>{s}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {vet.hours && Object.keys(vet.hours).length > 0 ? (
          <View style={[styles.section, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
            <Text style={[styles.sectionKicker, { color: c.subtitle }]}>HORARIOS</Text>
            {HOURS_ORDER.map(([k, label]) => {
              const v = vet.hours[k];
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

        <View style={styles.contactList}>
          <ContactRow
            icon="📞"
            label="TELÉFONO"
            value={vet.phone}
            onPress={vet.phone ? openLink(`tel:${vet.phone}`) : null}
            c={c}
          />
          <ContactRow
            icon="💬"
            label="WHATSAPP"
            value={vet.whatsapp}
            onPress={whatsappHref ? openLink(whatsappHref) : null}
            c={c}
          />
          <ContactRow
            icon="✉️"
            label="EMAIL"
            value={vet.email}
            onPress={vet.email ? openLink(`mailto:${vet.email}`) : null}
            c={c}
          />
          <ContactRow
            icon="🌐"
            label="SITIO WEB"
            value={vet.website}
            onPress={vet.website ? openLink(vet.website) : null}
            c={c}
          />
          <ContactRow
            icon="📸"
            label="INSTAGRAM"
            value={vet.instagram ? `@${String(vet.instagram).replace(/^@/, '')}` : null}
            onPress={
              vet.instagram
                ? openLink(`https://instagram.com/${String(vet.instagram).replace(/^@/, '')}`)
                : null
            }
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
  scroll: { paddingBottom: 40 },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
  },
  back: { fontSize: 15, fontWeight: '600' },
  cover: { width: '100%', height: 160, backgroundColor: '#F0EBE8' },
  coverFallback: { backgroundColor: '#FFF6F0' },
  heroCard: {
    marginHorizontal: 20,
    marginTop: -40,
    borderRadius: 32,
    padding: 20,
    borderWidth: 1,
  },
  heroRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-end' },
  logo: { width: 64, height: 64, borderRadius: 18, backgroundColor: '#F0EBE8' },
  logoFallback: { backgroundColor: '#FF5C6C', alignItems: 'center', justifyContent: 'center' },
  logoLetter: { color: '#fff', fontWeight: '800', fontSize: 26 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  kicker: { fontSize: 9, fontWeight: '700', letterSpacing: 1.8 },
  sponsorBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  sponsorText: { color: '#fff', fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  name: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5, marginTop: 4 },
  location: { fontSize: 12, fontWeight: '500', marginTop: 4 },
  section: {
    marginHorizontal: 20,
    marginTop: 14,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
  },
  sectionKicker: { fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 12 },
  bio: { fontSize: 14, lineHeight: 21 },
  services: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontSize: 12, fontWeight: '600' },
  hourRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  hourDay: { fontSize: 13, fontWeight: '700' },
  hourValue: { fontSize: 13, fontWeight: '500' },
  contactList: { paddingHorizontal: 20, paddingTop: 14, gap: 10 },
  contact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  contactIcon: { fontSize: 18 },
  contactLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },
  contactValue: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  notFoundTitle: { fontSize: 60, fontWeight: '700' },
  notFoundText: { fontSize: 14, marginTop: 8, marginBottom: 24 },
  backBtn: { backgroundColor: '#1A1A2E', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 999 },
  backBtnText: { color: '#fff', fontWeight: '700' },
});
