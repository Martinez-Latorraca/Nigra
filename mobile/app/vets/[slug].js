import { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import api from '../../src/lib/api';
import { useTheme, fonts, sectionColors } from '../../src/lib/theme';
import { SkeletonDetail } from '../../src/components/Skeleton';
import SponsorBadge from '../../src/components/SponsorBadge';
import Button from '../../src/components/Button';
import {
  CoverHeader, IdentityCard, InfoCard, HoursCard, ContactList,
} from '../../src/components/EntityProfile';
import { trackContactClick } from '../../src/lib/vetTracking';

const COLOR = sectionColors.veterinarias;

export default function VetProfile() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
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
      <View style={[styles.container, { backgroundColor: c.bg }]}>
        <SkeletonDetail />
      </View>
    );
  }

  if (error || !vet) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: c.bg }]}>
        <Text style={[styles.notFoundTitle, { color: c.title }]}>404</Text>
        <Text style={[styles.notFoundText, { color: c.text }]}>{error}</Text>
        <Button title="Volver al directorio" variant="dark" onPress={() => router.replace('/vets')} style={styles.notFoundBtn} />
      </View>
    );
  }

  // Cada contacto trackea el tap y abre el link — WA / tel / email / web / IG.
  const openLink = (url) => {
    if (!url) return;
    trackContactClick(vet.id);
    Linking.openURL(url).catch(() => {});
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
        <CoverHeader coverUrl={vet.cover_url} color={COLOR} backLabel="Veterinarias" />

        <View style={styles.body}>
          <IdentityCard
            logoUrl={vet.logo_url}
            name={vet.name}
            kicker="Veterinaria"
            location={[vet.address, vet.city].filter(Boolean).join(' · ')}
            color={COLOR}
            badge={<SponsorBadge vet={vet} />}
          />

          {vet.bio ? (
            <InfoCard title="Sobre la clínica">
              <Text style={[styles.text, { color: c.text }]}>{vet.bio}</Text>
            </InfoCard>
          ) : null}

          {vet.services && vet.services.length > 0 ? (
            <InfoCard title="Servicios" style={styles.servicesCard}>
              <View style={styles.services}>
                {vet.services.map((s) => (
                  <View key={s} style={[styles.chip, { backgroundColor: c.bg }]}>
                    <Text style={[styles.chipText, { color: c.text }]}>{s}</Text>
                  </View>
                ))}
              </View>
            </InfoCard>
          ) : null}

          <HoursCard hours={vet.hours} />

          <ContactList entity={vet} color={COLOR} onOpen={openLink} />
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
  servicesCard: { gap: 12 },
  services: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontFamily: fonts.medium, fontSize: 13 },
  notFoundTitle: { fontFamily: fonts.display, fontSize: 60 },
  notFoundText: { fontFamily: fonts.regular, fontSize: 15, textAlign: 'center' },
  notFoundBtn: { alignSelf: 'stretch', marginTop: 8 },
});
