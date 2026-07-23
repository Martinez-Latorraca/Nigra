import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, Pressable, Image, TextInput, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import api from '../../src/lib/api';
import { useTheme } from '../../src/lib/theme';
import MenuButton from '../../src/components/MenuButton';

const PAGE_LIMIT = 20;

function ShelterCard({ shelter, c, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
      <View style={styles.cardRow}>
        {shelter.logo_url ? (
          <Image source={{ uri: shelter.logo_url }} style={styles.logo} />
        ) : (
          <View style={[styles.logo, styles.logoFallback]}>
            <Text style={styles.logoLetter}>{shelter.name.charAt(0)}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: c.title }]} numberOfLines={1}>{shelter.name}</Text>
          {shelter.city ? (
            <Text style={[styles.city, { color: c.subtitle }]} numberOfLines={1}>📍 {shelter.city}</Text>
          ) : null}
        </View>
      </View>
      {shelter.bio ? (
        <Text style={[styles.bio, { color: c.text }]} numberOfLines={2}>{shelter.bio}</Text>
      ) : null}
    </Pressable>
  );
}

export default function SheltersList() {
  const c = useTheme();
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

  const header = (
    <View>
      <View style={styles.headerTop}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[styles.back, { color: c.subtitle }]}>‹ Volver</Text>
        </Pressable>
        <MenuButton />
      </View>

      <Text style={[styles.kicker, { color: c.subtitle }]}>DIRECTORIO MIMO</Text>
      <Text style={[styles.title, { color: c.title }]}>Refugios aliados.</Text>
      <Text style={[styles.subtitle, { color: c.subtitle }]}>
        Protectoras y refugios que trabajan con adopciones. Contactalos directamente.
      </Text>

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
        <View style={{ padding: 20 }}>
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
          contentContainerStyle={styles.scroll}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: c.subtitle }]}>
              Todavía no hay refugios registrados por acá.
            </Text>
          }
          ListFooterComponent={
            hasMore ? (
              <Pressable
                onPress={() => fetchShelters(page + 1, committedCity, true)}
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
  scroll: { padding: 20, paddingBottom: 40, gap: 12 },
  headerTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
  },
  back: { fontSize: 15, fontWeight: '600' },
  kicker: { fontSize: 10, fontWeight: '700', letterSpacing: 2.5 },
  title: { fontSize: 34, fontWeight: '700', letterSpacing: -0.8, marginTop: 6 },
  subtitle: { fontSize: 13, marginTop: 10, lineHeight: 19 },
  searchBar: {
    marginTop: 20, borderRadius: 999, borderWidth: 1, padding: 4,
    flexDirection: 'row', alignItems: 'center',
  },
  input: { flex: 1, paddingHorizontal: 18, paddingVertical: 10, fontSize: 14, fontWeight: '500' },
  searchBtn: { backgroundColor: '#1A1A2E', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999 },
  searchBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  count: { fontSize: 10, fontWeight: '700', letterSpacing: 1.8, marginTop: 24, marginBottom: 4 },
  card: { borderRadius: 24, padding: 18, borderWidth: 1 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10 },
  logo: { width: 52, height: 52, borderRadius: 14, backgroundColor: '#E5E7EB' },
  logoFallback: { backgroundColor: '#FF5C6C', alignItems: 'center', justifyContent: 'center' },
  logoLetter: { color: '#fff', fontWeight: '800', fontSize: 22 },
  name: { fontSize: 16, fontWeight: '700' },
  city: { fontSize: 12, fontWeight: '500', marginTop: 3 },
  bio: { fontSize: 13, lineHeight: 18, marginTop: 4 },
  empty: { textAlign: 'center', fontSize: 14, marginTop: 40 },
  moreBtn: { borderRadius: 999, paddingVertical: 14, alignItems: 'center', borderWidth: 1, marginTop: 12 },
  moreBtnText: { fontWeight: '700', fontSize: 13 },
});
