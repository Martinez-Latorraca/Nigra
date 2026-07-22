import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import api from '../src/lib/api';
import { useTheme } from '../src/lib/theme';
import PetCard from '../src/components/PetCard';
import MenuButton from '../src/components/MenuButton';
import { tierOf } from '../src/lib/sponsorTiers';
import SponsorBadge from '../src/components/SponsorBadge';

const FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'lost', label: 'Perdidos' },
  { key: 'found', label: 'Encontrados' },
];
const AD_INTERVAL = 6;

// Card de publicidad de un vet sponsor. Estilo distinto del PetCard (borde
// dorado + label "Publicidad") para no confundir con contenido orgánico.
function VetAdCard({ vet, c, onPress, style }) {
  const tier = tierOf(vet);
  const color = tier?.color || '#FF5C6C';
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.adCard,
        {
          backgroundColor: c.card,
          borderColor: color,
          shadowColor: color,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.22,
          shadowRadius: 12,
          elevation: 4,
        },
        style,
      ]}
    >
      <View style={styles.adBadge}>
        <Text style={styles.adBadgeText}>Publicidad</Text>
      </View>
      <View style={styles.adCoverWrap}>
        {vet.cover_url ? (
          <Image source={{ uri: vet.cover_url }} style={styles.adCover} />
        ) : (
          <View style={[styles.adCover, styles.adCoverPlaceholder]}>
            {vet.logo_url ? (
              <Image source={{ uri: vet.logo_url }} style={styles.adCenterLogo} />
            ) : (
              <View style={styles.adCenterFallback}>
                <Text style={styles.adCenterFallbackText}>{vet.name.charAt(0)}</Text>
              </View>
            )}
          </View>
        )}
      </View>
      <View style={styles.adBody}>
        <SponsorBadge vet={vet} width={110} />
        <Text style={[styles.adName, { color: c.title }]} numberOfLines={2}>{vet.name}</Text>
        {vet.city ? <Text style={[styles.adCity, { color: c.subtitle }]}>📍 {vet.city}</Text> : null}
        {vet.bio ? <Text style={[styles.adBio, { color: c.subtitle }]} numberOfLines={2}>{vet.bio}</Text> : null}
        <Text style={[styles.adCta, { color }]}>Ver perfil →</Text>
      </View>
    </Pressable>
  );
}

export default function Pets() {
  const c = useTheme();
  const { width } = useWindowDimensions();
  const numColumns = width >= 700 ? 2 : 1;
  const [pets, setPets] = useState([]);
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  const fetchPets = useCallback(async (status) => {
    setError('');
    try {
      const { data } = await api.get('/api/pets', {
        params: { limit: 30, status: status === 'all' ? undefined : status },
      });
      setPets(data.pets || []);
    } catch (err) {
      setError('No se pudieron cargar las mascotas');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchPets(filter).finally(() => setLoading(false));
  }, [filter, fetchPets]);

  // Ads del feed. Si el user ya autorizó ubicación (no pedimos aca proactivo),
  // usamos coords para orden por cercanía; si no, orden por tier de sponsor.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const params = { limit: 8 };
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          params.lat = loc.coords.latitude;
          params.lng = loc.coords.longitude;
        }
      } catch { /* silencioso: caemos a orden por tier */ }
      try {
        const { data } = await api.get('/api/vets/ads', { params });
        if (!cancelled) setAds(data?.vets || []);
      } catch { /* silencioso */ }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPets(filter);
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={[styles.back, { color: c.subtitle }]}>‹ Volver</Text>
          </Pressable>
          <MenuButton />
        </View>
        <Text style={[styles.title, { color: c.title }]}>Explorar</Text>
      </View>

      <View style={styles.filters}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? c.primary : c.card,
                  borderColor: active ? c.primary : c.cardBorder,
                },
              ]}
            >
              <Text style={[styles.chipText, { color: active ? c.primaryText : c.subtitle }]}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.title} />
        </View>
      ) : (
        <FlatList
          data={(() => {
            // Interleave: cada AD_INTERVAL pets, 1 ad. Marcamos con __kind
            // para distinguirlas en renderItem sin cambiar la shape del backend.
            const list = [];
            pets.forEach((p, i) => {
              list.push({ __kind: 'pet', ...p });
              if ((i + 1) % AD_INTERVAL === 0) {
                const adIdx = Math.floor((i + 1) / AD_INTERVAL) - 1;
                const ad = ads[adIdx];
                if (ad) list.push({ __kind: 'ad', ...ad, __id: `ad-${ad.id}` });
              }
            });
            return list;
          })()}
          key={numColumns}
          numColumns={numColumns}
          keyExtractor={(item) => (item.__kind === 'ad' ? item.__id : String(item.id))}
          columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
          renderItem={({ item }) => (
            item.__kind === 'ad' ? (
              <VetAdCard
                vet={item}
                c={c}
                onPress={() => router.push(`/vets/${item.slug}`)}
                style={numColumns > 1 ? styles.gridCard : undefined}
              />
            ) : (
              <PetCard
                pet={item}
                onPress={() => router.push(`/pet/${item.id}`)}
                style={numColumns > 1 ? styles.gridCard : undefined}
              />
            )
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.title} />
          }
          ListEmptyComponent={
            <Text style={[styles.empty, { color: c.subtitle }]}>
              {error || 'No hay mascotas para mostrar todavía.'}
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 8, gap: 4 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  back: { fontSize: 15, fontWeight: '600' },
  title: { fontSize: 34, fontWeight: '700', letterSpacing: -0.5 },
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingVertical: 16 },
  chip: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 999, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '600' },
  list: { paddingHorizontal: 20, paddingBottom: 32 },
  columnWrapper: { gap: 12 },
  gridCard: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { textAlign: 'center', marginTop: 48, fontSize: 14, fontWeight: '500' },

  adCard: {
    borderRadius: 24,
    borderWidth: 2,
    padding: 12,
    marginBottom: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  adBadge: {
    position: 'absolute',
    top: 20,
    left: 20,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    zIndex: 10,
    backgroundColor: 'rgba(26,26,46,0.75)',
  },
  adBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  adCoverWrap: { borderRadius: 18, overflow: 'hidden', aspectRatio: 4 / 3, backgroundColor: '#F0EBE8' },
  adCover: { width: '100%', height: '100%' },
  adCoverPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  adCenterLogo: { width: 96, height: 96, borderRadius: 24 },
  adCenterFallback: { width: 96, height: 96, borderRadius: 24, backgroundColor: '#FF5C6C', alignItems: 'center', justifyContent: 'center' },
  adCenterFallbackText: { color: '#fff', fontSize: 40, fontWeight: '900' },
  adBody: { padding: 8, gap: 6 },
  adName: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  adCity: { fontSize: 11, fontWeight: '600' },
  adBio: { fontSize: 12, lineHeight: 16, marginTop: 4 },
  adCta: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 8 },
});
