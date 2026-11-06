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
import { router } from 'expo-router';
import * as Location from 'expo-location';
import api from '../src/lib/api';
import { useTheme, palette, fonts, sectionColors } from '../src/lib/theme';
import { MapPin } from '../src/lib/icons';
import PetCard from '../src/components/PetCard';
import SectionHeader from '../src/components/SectionHeader';
import ChipGroup from '../src/components/ChipGroup';
import TabBar, { useTabBarSpace } from '../src/components/TabBar';
import { tierOf } from '../src/lib/sponsorTiers';
import { trackAdClick, trackImpressionOnce } from '../src/lib/vetTracking';

const FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'lost', label: 'Perdidos' },
  { value: 'found', label: 'Encontrados' },
];
const AD_INTERVAL = 6;

// FlatList exige que la ref no cambie entre renders. Al ser module-level
// no captura closure sobre estados del componente.
const AD_VIEWABILITY = { itemVisiblePercentThreshold: 50 };
const onFeedViewable = ({ viewableItems }) => {
  for (const v of viewableItems) {
    if (v.item?.__kind === 'ad' && v.item?.id) trackImpressionOnce(v.item.id);
  }
};

// Card de publicidad de un vet sponsor. Distinta del PetCard (borde del
// color del plan + etiqueta "Publicidad") para no confundir con contenido
// orgánico.
function VetAdCard({ vet, c, onPress, style }) {
  const color = tierOf(vet)?.color || palette.coral;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.adCard,
        { backgroundColor: c.card, borderColor: color, opacity: pressed ? 0.85 : 1 },
        style,
      ]}
    >
      <View style={[styles.adCover, { backgroundColor: c.arena }]}>
        {vet.cover_url ? (
          <Image source={{ uri: vet.cover_url }} style={StyleSheet.absoluteFill} />
        ) : vet.logo_url ? (
          <Image source={{ uri: vet.logo_url }} style={styles.adCenterLogo} />
        ) : (
          <View style={styles.adCenterFallback}>
            <Text style={styles.adCenterFallbackText}>{vet.name.charAt(0)}</Text>
          </View>
        )}
        <View style={styles.adBadge}>
          <Text style={styles.adBadgeText}>Publicidad</Text>
        </View>
      </View>
      <View style={styles.adBody}>
        <Text style={[styles.adName, { color: c.title }]} numberOfLines={2}>{vet.name}</Text>
        {vet.city ? (
          <View style={styles.iconRow}>
            <MapPin size={14} color={c.text} strokeWidth={2} />
            <Text style={[styles.adSecondary, { color: c.text }]}>{vet.city}</Text>
          </View>
        ) : null}
        {vet.bio ? (
          <Text style={[styles.adSecondary, { color: c.text }]} numberOfLines={2}>{vet.bio}</Text>
        ) : null}
        <Text style={[styles.adCta, { color: c.text }]}>Ver perfil →</Text>
      </View>
    </Pressable>
  );
}

export default function Pets() {
  const c = useTheme();
  const { width } = useWindowDimensions();
  const bottomSpace = useTabBarSpace();
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

  const handleAdPress = (item) => {
    trackAdClick(item.id);
    router.push(`/vets/${item.slug}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <SectionHeader
        color={sectionColors.explorar}
        title="Explorar"
        subtitle="Reportes de mascotas en tu zona."
      />

      <View style={styles.filters}>
        <ChipGroup options={FILTERS} value={filter} onChange={setFilter} c={c} />
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
                onPress={() => handleAdPress(item)}
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
          onViewableItemsChanged={onFeedViewable}
          viewabilityConfig={AD_VIEWABILITY}
          contentContainerStyle={[styles.list, { paddingBottom: bottomSpace }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.title} />
          }
          ListEmptyComponent={
            <Text style={[styles.empty, { color: c.text }]}>
              {error || 'No hay mascotas para mostrar todavía.'}
            </Text>
          }
        />
      )}

      <TabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filters: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  list: { paddingHorizontal: 20 },
  columnWrapper: { gap: 12 },
  gridCard: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { textAlign: 'center', marginTop: 48, fontFamily: fonts.medium, fontSize: 15 },

  adCard: {
    borderRadius: 24,
    borderWidth: 2,
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },
  adCover: {
    height: 168,
    borderRadius: 18,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(26,26,46,0.8)',
  },
  adBadgeText: {
    color: palette.crema,
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  adCenterLogo: { width: 80, height: 80, borderRadius: 22 },
  adCenterFallback: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: palette.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adCenterFallbackText: { color: palette.arena, fontFamily: fonts.display, fontSize: 36 },
  adBody: { paddingHorizontal: 6, paddingBottom: 6, gap: 4 },
  adName: { fontFamily: fonts.display, fontSize: 20 },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  adSecondary: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  adCta: { fontFamily: fonts.bold, fontSize: 13, marginTop: 6 },
});
