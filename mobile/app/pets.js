import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import api from '../src/lib/api';
import { useTheme } from '../src/lib/theme';
import PetCard from '../src/components/PetCard';
import MenuButton from '../src/components/MenuButton';

const FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'lost', label: 'Perdidos' },
  { key: 'found', label: 'Encontrados' },
];

export default function Pets() {
  const c = useTheme();
  const { width } = useWindowDimensions();
  const numColumns = width >= 700 ? 2 : 1;
  const [pets, setPets] = useState([]);
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
          data={pets}
          key={numColumns}
          numColumns={numColumns}
          keyExtractor={(item) => String(item.id)}
          columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
          renderItem={({ item }) => (
            <PetCard
              pet={item}
              onPress={() => router.push(`/pet/${item.id}`)}
              style={numColumns > 1 ? styles.gridCard : undefined}
            />
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
});
