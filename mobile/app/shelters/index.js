import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, Pressable, Image, StyleSheet, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import api from '../../src/lib/api';
import { useTheme, palette, fonts, sectionColors, onColor } from '../../src/lib/theme';
import { MapPin, ChevronRight, HouseHeart, SearchX } from '../../src/lib/icons';
import EmptyState from '../../src/components/EmptyState';
import SectionHeader from '../../src/components/SectionHeader';
import SearchBar from '../../src/components/SearchBar';
import Button from '../../src/components/Button';
import TabBar, { useTabBarSpace } from '../../src/components/TabBar';

const PAGE_LIMIT = 20;

// Color del cuadrado con la inicial cuando el refugio no tiene logo.
// Fijo por id para que no cambie entre cargas.
const FALLBACK_COLORS = [palette.teal, palette.violeta, palette.coral, palette.sol, palette.noche];

function ShelterCard({ shelter, c, onPress }) {
  const fallback = FALLBACK_COLORS[Number(shelter.id) % FALLBACK_COLORS.length] || palette.teal;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, { backgroundColor: c.card, opacity: pressed ? 0.85 : 1 }]}
    >
      <View style={styles.cardRow}>
        {shelter.logo_url ? (
          <Image source={{ uri: shelter.logo_url }} style={[styles.logo, { backgroundColor: c.arena }]} />
        ) : (
          <View style={[styles.logo, styles.logoFallback, { backgroundColor: fallback }]}>
            <Text style={[styles.logoLetter, { color: onColor(fallback) }]}>{shelter.name.charAt(0)}</Text>
          </View>
        )}
        <View style={styles.cardTexts}>
          <Text style={[styles.name, { color: c.title }]} numberOfLines={1}>{shelter.name}</Text>
          {shelter.city ? (
            <View style={styles.cityRow}>
              <MapPin size={14} color={c.text} strokeWidth={2} />
              <Text style={[styles.city, { color: c.text }]} numberOfLines={1}>{shelter.city}</Text>
            </View>
          ) : null}
        </View>
        <ChevronRight size={20} color={c.text} strokeWidth={2} />
      </View>
      {shelter.bio ? (
        <Text style={[styles.bio, { color: c.text }]} numberOfLines={2}>{shelter.bio}</Text>
      ) : null}
    </Pressable>
  );
}

export default function SheltersList() {
  const c = useTheme();
  const bottomSpace = useTabBarSpace();
  const [shelters, setShelters] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [city, setCity] = useState('');
  const [committedCity, setCommittedCity] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchShelters = useCallback(async (nextPage = 1, cityFilter = '', append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const params = { page: nextPage, limit: PAGE_LIMIT };
      if (cityFilter) params.city = cityFilter;
      const { data } = await api.get('/api/shelters', { params });
      setShelters((prev) => (append ? [...prev, ...(data.shelters || [])] : data.shelters || []));
      setTotal(data.total || 0);
      setPage(nextPage);
    } catch { /* silencioso */ }
    finally { setLoading(false); setLoadingMore(false); }
  }, []);

  useEffect(() => { fetchShelters(1, ''); }, [fetchShelters]);

  const submit = () => {
    const trimmed = city.trim();
    setCommittedCity(trimmed);
    fetchShelters(1, trimmed);
  };

  const hasMore = shelters.length < total;
  const clearFilters = () => {
    setCity('');
    setCommittedCity('');
    fetchShelters(1, '');
  };

  const header = (
    <View style={styles.headerWrap}>
      <SectionHeader
        color={sectionColors.refugios}
        kicker="Directorio Mimo"
        title="Refugios aliados"
        subtitle="Protectoras y refugios que trabajan con adopciones. Contactalos directamente."
        style={styles.sectionHeader}
      />
      <View style={styles.filters}>
        <SearchBar
          value={city}
          onChangeText={setCity}
          onSubmit={submit}
          placeholder="Ciudad (Montevideo, Salto…)"
        />
        {!loading && (
          <Text style={[styles.count, { color: c.text }]}>
            {total} {total === 1 ? 'resultado' : 'resultados'}
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      {loading ? (
        <View>
          {header}
          <ActivityIndicator color={c.title} style={{ marginTop: 40 }} />
        </View>
      ) : (
        <FlatList
          data={shelters}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <ShelterCard shelter={item} c={c} onPress={() => router.push(`/shelters/${item.slug}`)} />
          )}
          ListHeaderComponent={header}
          contentContainerStyle={{ paddingBottom: bottomSpace }}
          ListEmptyComponent={
            committedCity ? (
              <EmptyState
                icon={SearchX}
                color={sectionColors.refugios}
                title="No encontramos resultados"
                text="Probá con otra ciudad."
                action={{ title: 'Limpiar filtros', variant: 'dark', onPress: clearFilters }}
              />
            ) : (
              <EmptyState
                icon={HouseHeart}
                color={sectionColors.refugios}
                title="Todavía no hay refugios"
                text="Todavía no hay refugios registrados por acá."
              />
            )
          }
          ListFooterComponent={
            hasMore ? (
              <Button
                variant="outline"
                title={loadingMore ? 'Cargando…' : 'Cargar más'}
                onPress={() => fetchShelters(page + 1, committedCity, true)}
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
  filters: { paddingHorizontal: 20, gap: 10 },
  count: {
    fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', marginTop: 6,
  },
  card: { borderRadius: 24, padding: 16, gap: 12, marginHorizontal: 20, marginBottom: 12 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  cardTexts: { flex: 1, minWidth: 0, gap: 2 },
  logo: { width: 56, height: 56, borderRadius: 18 },
  logoFallback: { alignItems: 'center', justifyContent: 'center' },
  logoLetter: { fontFamily: fonts.display, fontSize: 24 },
  name: { fontFamily: fonts.display, fontSize: 18 },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  city: { flex: 1, fontFamily: fonts.regular, fontSize: 13 },
  bio: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  moreBtn: { height: 52, borderRadius: 16, marginHorizontal: 20, marginTop: 4 },
  moreBtnText: { fontSize: 15 },
});
