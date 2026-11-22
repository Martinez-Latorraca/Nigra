import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  Pressable,
  Image,
  StyleSheet,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import api from '../../src/lib/api';
import { useTheme, palette, fonts, sectionColors, onColor } from '../../src/lib/theme';
import { SkeletonList } from '../../src/components/Skeleton';
import { Stethoscope, ChevronRight, Star, MapPin, Locate, SearchX } from '../../src/lib/icons';
import EmptyState from '../../src/components/EmptyState';
import { tierOf } from '../../src/lib/sponsorTiers';
import SectionHeader from '../../src/components/SectionHeader';
import SearchBar from '../../src/components/SearchBar';
import SponsorBadge from '../../src/components/SponsorBadge';
import Button from '../../src/components/Button';
import TabBar, { useTabBarSpace } from '../../src/components/TabBar';
import { trackAdClick, trackImpressionOnce } from '../../src/lib/vetTracking';
import { SERVICE_CATALOG } from '../../src/lib/services';

const PAGE_LIMIT = 20;

// Color del cuadrado con la inicial cuando la vet no tiene logo.
// Fijo por id para que no cambie entre cargas.
const FALLBACK_COLORS = [palette.violeta, palette.teal, palette.noche, palette.coral, palette.sol];
const fallbackColor = (id) => FALLBACK_COLORS[Number(id) % FALLBACK_COLORS.length] || palette.coral;

function Logo({ vet, size, radius, color }) {
  if (vet.logo_url) {
    return (
      <Image
        source={{ uri: vet.logo_url }}
        style={{ width: size, height: size, borderRadius: radius, backgroundColor: palette.arena }}
      />
    );
  }
  return (
    <View style={[styles.logoFallback, { width: size, height: size, borderRadius: radius, backgroundColor: color }]}>
      <Text style={[styles.logoLetter, { fontSize: size * 0.43, color: onColor(color) }]}>{vet.name.charAt(0)}</Text>
    </View>
  );
}

function VetCard({ vet, onPress, c }) {
  const services = vet.services || [];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, { backgroundColor: c.card, opacity: pressed ? 0.85 : 1 }]}
    >
      <View style={styles.cardRow}>
        <Logo vet={vet} size={56} radius={18} color={fallbackColor(vet.id)} />
        <View style={styles.cardTexts}>
          <Text style={[styles.name, { color: c.title }]} numberOfLines={1}>{vet.name}</Text>
          {vet.city ? (
            <View style={styles.cityRow}>
              <MapPin size={14} color={c.text} strokeWidth={2} />
              <Text style={[styles.city, { color: c.text }]} numberOfLines={1}>{vet.city}</Text>
            </View>
          ) : null}
        </View>
        <ChevronRight size={20} color={c.text} strokeWidth={2} />
      </View>
      <SponsorBadge vet={vet} />
      {vet.bio ? (
        <Text style={[styles.bio, { color: c.text }]} numberOfLines={2}>{vet.bio}</Text>
      ) : null}
      {services.length > 0 ? (
        <View style={styles.services}>
          {services.slice(0, 3).map((s) => (
            <View key={s} style={[styles.serviceChip, { backgroundColor: c.bg }]}>
              <Text style={[styles.serviceChipText, { color: c.text }]}>{s}</Text>
            </View>
          ))}
          {services.length > 3 ? (
            <View style={[styles.serviceChip, { backgroundColor: c.bg }]}>
              <Text style={[styles.serviceChipText, { color: c.text }]}>+{services.length - 3}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

// Chip de filtro: activo = Noche con texto Crema.
function FilterChip({ label, active, onPress, disabled, icon: Icon, c }) {
  const fg = active ? palette.crema : c.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      style={[
        styles.filterChip,
        active
          ? { backgroundColor: palette.noche, borderColor: palette.noche }
          : { backgroundColor: c.card, borderColor: c.cardBorder },
        disabled && { opacity: 0.5 },
      ]}
    >
      {Icon ? <Icon size={16} color={fg} strokeWidth={2} /> : null}
      <Text style={[styles.filterChipText, { color: fg, fontFamily: active ? fonts.bold : fonts.medium }]}>
        {label}
      </Text>
    </Pressable>
  );
}

// FlatList requiere que estas refs no cambien entre renders o tira warning
// "Changing onViewableItemsChanged on the fly is not supported".
const AD_VIEWABILITY = { itemVisiblePercentThreshold: 50 };
const onAdsViewable = ({ viewableItems }) => {
  for (const v of viewableItems) if (v.item?.id) trackImpressionOnce(v.item.id);
};

export default function VetsList() {
  const c = useTheme();
  const bottomSpace = useTabBarSpace();
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
  const hasFilters = !!committedCity || servicesSelected.size > 0 || !!coords;
  const clearFilters = () => {
    const none = new Set();
    setCity('');
    setCommittedCity('');
    setServicesSelected(none);
    setCoords(null);
    fetchVets(1, '', none, null);
  };

  const header = (
    <View style={styles.headerWrap}>
      <SectionHeader
        color={sectionColors.veterinarias}
        kicker="Directorio Mimo"
        title="Veterinarias aliadas"
        subtitle="Encontrá una veterinaria cerca tuyo. Las marcadas como Socio Mimo colaboran activamente con la comunidad."
        style={styles.sectionHeader}
      />

      <View style={styles.blocks}>
        <Pressable
          onPress={() => router.push('/vets/register')}
          style={({ pressed }) => [styles.registerCta, { opacity: pressed ? 0.85 : 1 }]}
        >
          <View style={styles.registerIcon}>
            <Stethoscope size={24} color={palette.arena} strokeWidth={2} />
          </View>
          <View style={styles.registerTexts}>
            <Text style={styles.registerTitle}>Registrá tu veterinaria</Text>
            <Text style={styles.registerSub}>Sumate a la red y publicá mascotas encontradas.</Text>
          </View>
          <ChevronRight size={20} color={palette.arena} strokeWidth={2} />
        </Pressable>

        {/* Banner de Socios Mimo (publicidad) — carrusel horizontal */}
        {ads.length > 0 ? (
          <View style={styles.adsSection}>
            <View style={styles.adsHeader}>
              <View style={styles.adsTitleRow}>
                <Star size={18} color={palette.sol} fill={palette.sol} strokeWidth={2} />
                <Text style={[styles.adsTitle, { color: c.title }]}>Nuestros socios</Text>
              </View>
              <Text style={[styles.adsLabel, { color: c.text }]}>Publicidad</Text>
            </View>
            <FlatList
              data={ads}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(v) => String(v.id)}
              style={styles.bleed}
              contentContainerStyle={styles.adsList}
              onViewableItemsChanged={onAdsViewable}
              viewabilityConfig={AD_VIEWABILITY}
              renderItem={({ item: v }) => {
                const color = tierOf(v)?.color || palette.coral;
                return (
                  <Pressable
                    onPress={() => { trackAdClick(v.id); router.push(`/vets/${v.slug}`); }}
                    style={({ pressed }) => [
                      styles.adItem,
                      { backgroundColor: c.card, borderColor: color, opacity: pressed ? 0.85 : 1 },
                    ]}
                  >
                    <View style={styles.adTop}>
                      <Logo vet={v} size={44} radius={14} color={color} />
                      <View style={styles.cardTexts}>
                        <Text style={[styles.adName, { color: c.title }]} numberOfLines={1}>{v.name}</Text>
                        {v.city ? (
                          <Text style={[styles.adCity, { color: c.text }]} numberOfLines={1}>{v.city}</Text>
                        ) : null}
                      </View>
                    </View>
                    <SponsorBadge vet={v} />
                    {v.bio ? (
                      <Text style={[styles.adBio, { color: c.text }]} numberOfLines={2}>{v.bio}</Text>
                    ) : null}
                  </Pressable>
                );
              }}
            />
          </View>
        ) : null}

        <View style={styles.filters}>
          <SearchBar
            value={city}
            onChangeText={setCity}
            onSubmit={submit}
            placeholder="Ciudad (Montevideo, Salto…)"
          />

          {/* Filtros: Cerca mío + chips por servicio */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.bleed}
            contentContainerStyle={styles.chipsRow}
          >
            <FilterChip
              label={geoLoading ? 'Ubicando…' : 'Cerca mío'}
              icon={Locate}
              active={!!coords}
              disabled={geoLoading}
              onPress={toggleNearMe}
              c={c}
            />
            {SERVICE_CATALOG.map((s) => (
              <FilterChip
                key={s}
                label={s}
                active={servicesSelected.has(s)}
                onPress={() => toggleService(s)}
                c={c}
              />
            ))}
          </ScrollView>

          {!loading && (
            <Text style={[styles.count, { color: c.text }]}>
              {total} {total === 1 ? 'resultado' : 'resultados'}
            </Text>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      {loading ? (
        <View>
          {header}
          <SkeletonList />
        </View>
      ) : (
        <FlatList
          data={vets}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <VetCard vet={item} c={c} onPress={() => router.push(`/vets/${item.slug}`)} />
          )}
          ListHeaderComponent={header}
          contentContainerStyle={{ paddingBottom: bottomSpace }}
          ListEmptyComponent={
            hasFilters ? (
              <EmptyState
                icon={SearchX}
                color={sectionColors.veterinarias}
                title="No encontramos resultados"
                text="Probá con otra ciudad o sacá algún filtro."
                action={{ title: 'Limpiar filtros', variant: 'dark', onPress: clearFilters }}
              />
            ) : (
              <EmptyState
                icon={Stethoscope}
                color={sectionColors.veterinarias}
                title="Todavía no hay veterinarias"
                text="Todavía no hay veterinarias registradas por acá."
              />
            )
          }
          ListFooterComponent={
            hasMore ? (
              <Button
                variant="outline"
                title={loadingMore ? 'Cargando…' : 'Cargar más'}
                onPress={() => fetchVets(page + 1, committedCity, servicesSelected, coords, true)}
                disabled={loadingMore}
                style={styles.moreBtn}
                textStyle={styles.moreBtnText}
              />
            ) : null
          }
        />
      )}

      <TabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerWrap: { marginBottom: 12 },
  sectionHeader: { marginBottom: 20 },
  blocks: { paddingHorizontal: 20, gap: 24 },
  // Los carruseles van de borde a borde aunque el bloque tenga padding 20.
  bleed: { marginHorizontal: -20 },

  registerCta: {
    backgroundColor: palette.coral,
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  registerIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerTexts: { flex: 1, gap: 2 },
  registerTitle: { fontFamily: fonts.display, fontSize: 17, color: palette.arena },
  registerSub: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: palette.arena },

  adsSection: { gap: 12 },
  adsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  adsTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  adsTitle: { fontFamily: fonts.display, fontSize: 20 },
  adsLabel: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  adsList: { gap: 12, paddingHorizontal: 20, paddingBottom: 4 },
  adItem: { width: 220, borderRadius: 22, borderWidth: 2, padding: 14, gap: 10 },
  adTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  adName: { fontFamily: fonts.display, fontSize: 16 },
  adCity: { fontFamily: fonts.regular, fontSize: 12 },
  adBio: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },

  filters: { gap: 10 },
  chipsRow: { gap: 8, paddingHorizontal: 20 },
  filterChip: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterChipText: { fontSize: 14 },
  count: {
    fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', marginTop: 6,
  },

  card: { borderRadius: 24, padding: 16, gap: 12, marginHorizontal: 20, marginBottom: 12 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  cardTexts: { flex: 1, minWidth: 0, gap: 2 },
  logoFallback: { alignItems: 'center', justifyContent: 'center' },
  logoLetter: { fontFamily: fonts.display },
  name: { fontFamily: fonts.display, fontSize: 18 },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  city: { flex: 1, fontFamily: fonts.regular, fontSize: 13 },
  bio: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  services: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  serviceChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  serviceChipText: { fontFamily: fonts.medium, fontSize: 12 },
  moreBtn: { height: 52, borderRadius: 16, marginHorizontal: 20, marginTop: 4 },
  moreBtnText: { fontSize: 15 },
});
