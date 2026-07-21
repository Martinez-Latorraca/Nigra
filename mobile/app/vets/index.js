import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Image,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import api from '../../src/lib/api';
import { useTheme } from '../../src/lib/theme';
import MenuButton from '../../src/components/MenuButton';
import { tierOf } from '../../src/lib/sponsorTiers';

const PAGE_LIMIT = 20;

// Debe coincidir con el catálogo del web y del edit form del vet.
const SERVICE_CATALOG = [
  'Consultas',
  'Vacunación',
  'Cirugía',
  'Urgencias 24h',
  'Peluquería',
  'Baño',
  'Radiología',
  'Ecografía',
  'Laboratorio',
  'Guardería',
  'Adiestramiento',
  'Atención a domicilio',
];

function VetCard({ vet, onPress, c }) {
  const tier = tierOf(vet);
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: c.card,
          borderColor: tier ? tier.color : c.cardBorder,
          borderWidth: tier ? 2 : 1,
          // Sombra del color del tier solo para sponsors.
          shadowColor: tier ? tier.color : '#000',
          shadowOffset: { width: 0, height: tier ? 6 : 2 },
          shadowOpacity: tier ? 0.22 : 0.05,
          shadowRadius: tier ? 12 : 4,
          elevation: tier ? 4 : 1,
        },
      ]}
    >
      {tier && (
        <View style={[styles.sponsorBadge, { backgroundColor: tier.color }]}>
          <Text style={styles.sponsorText}>⭐ SOCIO MIMO</Text>
        </View>
      )}
      <View style={styles.cardRow}>
        {vet.logo_url ? (
          <Image source={{ uri: vet.logo_url }} style={styles.logo} />
        ) : (
          <View style={[styles.logo, styles.logoFallback]}>
            <Text style={styles.logoLetter}>{vet.name.charAt(0)}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: c.title }]} numberOfLines={1}>
            {vet.name}
          </Text>
          {vet.city ? (
            <Text style={[styles.city, { color: c.subtitle }]} numberOfLines={1}>
              📍 {vet.city}
            </Text>
          ) : null}
        </View>
      </View>
      {vet.bio ? (
        <Text style={[styles.bio, { color: c.text }]} numberOfLines={2}>
          {vet.bio}
        </Text>
      ) : null}
      {vet.services && vet.services.length > 0 ? (
        <View style={styles.services}>
          {vet.services.slice(0, 3).map((s) => (
            <View key={s} style={[styles.chip, { backgroundColor: c.bg }]}>
              <Text style={[styles.chipText, { color: c.subtitle }]}>{s}</Text>
            </View>
          ))}
          {vet.services.length > 3 ? (
            <View style={[styles.chip, { backgroundColor: c.bg }]}>
              <Text style={[styles.chipText, { color: c.subtitle }]}>
                +{vet.services.length - 3}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

export default function VetsList() {
  const c = useTheme();
  const [vets, setVets] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [city, setCity] = useState('');
  const [committedCity, setCommittedCity] = useState('');
  const [servicesSelected, setServicesSelected] = useState(() => new Set());
  // Geoloc opt-in. { lat, lng } activa filtro "cerca mío" (orden por distancia).
  const [coords, setCoords] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [ads, setAds] = useState([]);

  const fetchVets = useCallback(async (nextPage = 1, cityFilter = '', services = new Set(), geo = null, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const params = { page: nextPage, limit: PAGE_LIMIT };
      if (cityFilter) params.city = cityFilter;
      if (services.size > 0) params.services = [...services].join(',');
      if (geo) {
        params.lat = geo.lat;
        params.lng = geo.lng;
        params.radius_km = 25;
      }
      const { data } = await api.get('/api/vets', { params });
      setVets((prev) => (append ? [...prev, ...(data.vets || [])] : data.vets || []));
      setTotal(data.total || 0);
      setPage(nextPage);
    } catch {
      // silencioso
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Banner "Nuestros socios" — mismo endpoint que /pets. Con permiso de
  // ubicación ya otorgado, prioriza cercanía; sin permiso, prioriza tier.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const params = { limit: 6 };
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          params.lat = loc.coords.latitude;
          params.lng = loc.coords.longitude;
        }
      } catch { /* silencioso */ }
      try {
        const { data } = await api.get('/api/vets/ads', { params });
        if (!cancelled) setAds(data?.vets || []);
      } catch { /* silencioso */ }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    fetchVets(1, '', new Set(), null);
  }, [fetchVets]);

  const submit = () => {
    const trimmed = city.trim();
    setCommittedCity(trimmed);
    fetchVets(1, trimmed, servicesSelected, coords);
  };

  const toggleService = (s) => {
    setServicesSelected((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      fetchVets(1, committedCity, next, coords);
      return next;
    });
  };

  const toggleNearMe = async () => {
    if (coords) {
      setCoords(null);
      fetchVets(1, committedCity, servicesSelected, null);
      return;
    }
    setGeoLoading(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permiso necesario', 'Necesitamos tu ubicación para mostrar vets cerca tuyo.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const g = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      setCoords(g);
      fetchVets(1, committedCity, servicesSelected, g);
    } catch (e) {
      Alert.alert('Error', 'No pudimos obtener tu ubicación.');
    } finally {
      setGeoLoading(false);
    }
  };

  const hasMore = vets.length < total;

  const header = (
    <View>
      <View style={styles.headerTop}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[styles.back, { color: c.subtitle }]}>‹ Volver</Text>
        </Pressable>
        <MenuButton />
      </View>

      <Text style={[styles.kicker, { color: c.subtitle }]}>DIRECTORIO MIMO</Text>
      <Text style={[styles.title, { color: c.title }]}>Veterinarias aliadas.</Text>
      <Text style={[styles.subtitle, { color: c.subtitle }]}>
        Encontrá una veterinaria cerca tuyo. Las marcadas como ⭐ Socio Mimo colaboran
        activamente con la comunidad.
      </Text>

      <Pressable
        onPress={() => router.push('/vets/register')}
        style={styles.registerCta}
      >
        <Text style={styles.registerCtaIcon}>🏥</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.registerCtaTitle}>Registrá tu veterinaria</Text>
          <Text style={styles.registerCtaSub}>Sumate a la red y publicá mascotas encontradas.</Text>
        </View>
        <Text style={styles.registerCtaArrow}>›</Text>
      </Pressable>

      {/* Banner de Socios Mimo (publicidad) — carousel horizontal */}
      {ads.length > 0 ? (
        <View style={{ marginTop: 20 }}>
          <View style={styles.adBannerHeader}>
            <Text style={styles.adBannerKicker}>⭐ NUESTROS SOCIOS</Text>
            <Text style={[styles.adBannerLabel, { color: c.subtitle }]}>Publicidad</Text>
          </View>
          <FlatList
            data={ads}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(v) => String(v.id)}
            contentContainerStyle={{ gap: 10, paddingRight: 8 }}
            renderItem={({ item: v }) => {
              const t = tierOf(v);
              const color = t?.color || '#FF5C6C';
              return (
                <Pressable
                  onPress={() => router.push(`/vets/${v.slug}`)}
                  style={[styles.adBannerItem, { backgroundColor: c.card, borderColor: color }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    {v.logo_url ? (
                      <Image source={{ uri: v.logo_url }} style={styles.adBannerLogo} />
                    ) : (
                      <View style={[styles.adBannerLogo, styles.adBannerLogoFallback]}>
                        <Text style={styles.adBannerLogoLetter}>{v.name.charAt(0)}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.adBannerName, { color: c.title }]} numberOfLines={1}>{v.name}</Text>
                      {v.city ? <Text style={[styles.adBannerCity, { color: c.subtitle }]} numberOfLines={1}>📍 {v.city}</Text> : null}
                    </View>
                    <Text style={{ color, fontSize: 16 }}>⭐</Text>
                  </View>
                  {v.bio ? <Text style={[styles.adBannerBio, { color: c.subtitle }]} numberOfLines={2}>{v.bio}</Text> : null}
                </Pressable>
              );
            }}
          />
        </View>
      ) : null}

      <View style={[styles.searchBar, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
        <TextInput
          value={city}
          onChangeText={setCity}
          placeholder="Ciudad (Montevideo, Salto…)"
          placeholderTextColor={c.subtitle}
          style={[styles.input, { color: c.title }]}
          returnKeyType="search"
          onSubmitEditing={submit}
        />
        <Pressable onPress={submit} style={styles.searchBtn}>
          <Text style={styles.searchBtnText}>Buscar</Text>
        </Pressable>
      </View>

      {/* Filtros: Cerca mío + chips por servicio */}
      <View style={styles.filtersRow}>
        <Pressable
          onPress={toggleNearMe}
          disabled={geoLoading}
          style={[
            styles.filterChip,
            coords
              ? { backgroundColor: '#3ECFB2', borderColor: '#3ECFB2' }
              : { backgroundColor: c.card, borderColor: c.cardBorder },
            geoLoading && { opacity: 0.5 },
          ]}
        >
          <Text
            style={[
              styles.filterChipText,
              { color: coords ? '#fff' : c.title },
            ]}
          >
            {geoLoading ? 'Ubicando…' : coords ? '📍 Cerca mío ✓' : '📍 Cerca mío'}
          </Text>
        </Pressable>
        {SERVICE_CATALOG.map((s) => {
          const active = servicesSelected.has(s);
          return (
            <Pressable
              key={s}
              onPress={() => toggleService(s)}
              style={[
                styles.filterChip,
                active
                  ? { backgroundColor: '#FF5C6C', borderColor: '#FF5C6C' }
                  : { backgroundColor: c.card, borderColor: c.cardBorder },
              ]}
            >
              <Text style={[styles.filterChipText, { color: active ? '#fff' : c.title }]}>
                {active ? '✓ ' : ''}{s}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {!loading && (
        <Text style={[styles.count, { color: c.subtitle }]}>
          {total} {total === 1 ? 'RESULTADO' : 'RESULTADOS'}
        </Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}>
      {loading ? (
        <View style={styles.center}>
          {header}
          <ActivityIndicator color={c.title} style={{ marginTop: 40 }} />
        </View>
      ) : (
        <FlatList
          data={vets}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <VetCard vet={item} c={c} onPress={() => router.push(`/vets/${item.slug}`)} />
          )}
          ListHeaderComponent={header}
          contentContainerStyle={styles.scroll}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: c.subtitle }]}>
              Todavía no hay veterinarias por acá.
            </Text>
          }
          ListFooterComponent={
            hasMore ? (
              <Pressable
                onPress={() => fetchVets(page + 1, committedCity, servicesSelected, coords, true)}
                disabled={loadingMore}
                style={[styles.moreBtn, { borderColor: c.cardBorder }]}
              >
                <Text style={[styles.moreBtnText, { color: c.text }]}>
                  {loadingMore ? 'Cargando…' : 'Cargar más'}
                </Text>
              </Pressable>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { padding: 20 },
  scroll: { padding: 20, paddingBottom: 40, gap: 12 },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  back: { fontSize: 15, fontWeight: '600' },
  kicker: { fontSize: 10, fontWeight: '700', letterSpacing: 2.5 },
  title: { fontSize: 34, fontWeight: '700', letterSpacing: -0.8, marginTop: 6 },
  subtitle: { fontSize: 13, marginTop: 10, lineHeight: 19 },
  searchBar: {
    marginTop: 20,
    borderRadius: 999,
    borderWidth: 1,
    padding: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: { flex: 1, paddingHorizontal: 18, paddingVertical: 10, fontSize: 14, fontWeight: '500' },
  searchBtn: { backgroundColor: '#1A1A2E', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999 },
  searchBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  filtersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 },
  filterChip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  filterChipText: { fontSize: 12, fontWeight: '700' },
  count: { fontSize: 10, fontWeight: '700', letterSpacing: 1.8, marginTop: 24, marginBottom: 4 },
  card: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    position: 'relative',
  },
  sponsorBadge: {
    // backgroundColor viene inline por tier
    position: 'absolute',
    top: 12,
    right: 12,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sponsorText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10 },
  logo: { width: 52, height: 52, borderRadius: 14, backgroundColor: '#E5E7EB' },
  logoFallback: { backgroundColor: '#FF5C6C', alignItems: 'center', justifyContent: 'center' },
  logoLetter: { color: '#fff', fontWeight: '800', fontSize: 22 },
  name: { fontSize: 16, fontWeight: '700' },
  city: { fontSize: 12, fontWeight: '500', marginTop: 3 },
  bio: { fontSize: 13, lineHeight: 18, marginTop: 4 },
  services: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  chip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { fontSize: 10, fontWeight: '700' },
  empty: { textAlign: 'center', fontSize: 14, marginTop: 40 },
  moreBtn: { borderRadius: 999, paddingVertical: 14, alignItems: 'center', borderWidth: 1, marginTop: 12 },
  moreBtnText: { fontWeight: '700', fontSize: 13 },
  registerCta: {
    marginTop: 20,
    padding: 14,
    borderRadius: 20,
    backgroundColor: '#1A1A2E',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  registerCtaIcon: { fontSize: 22 },
  registerCtaTitle: { color: '#fff', fontSize: 14, fontWeight: '700' },
  registerCtaSub: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2 },
  registerCtaArrow: { color: 'rgba(255,255,255,0.6)', fontSize: 22, fontWeight: '300' },

  adBannerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  adBannerKicker: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, color: '#C98800' },
  adBannerLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.2 },
  adBannerItem: {
    // borderColor viene inline por tier de la vet
    width: 220,
    borderRadius: 18,
    borderWidth: 2,
    padding: 12,
    gap: 6,
  },
  adBannerLogo: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F0EBE8' },
  adBannerLogoFallback: { backgroundColor: '#FF5C6C', alignItems: 'center', justifyContent: 'center' },
  adBannerLogoLetter: { color: '#fff', fontWeight: '800', fontSize: 18 },
  adBannerName: { fontSize: 13, fontWeight: '800' },
  adBannerCity: { fontSize: 10, fontWeight: '600' },
  adBannerBio: { fontSize: 11, lineHeight: 15, marginTop: 4 },
});
