import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, Pressable, Image, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import api from '../../src/lib/api';
import { useTheme } from '../../src/lib/theme';
import MenuButton from '../../src/components/MenuButton';

const PAGE_LIMIT = 20;

const SPECIES_LABEL = { dog: 'Perro', cat: 'Gato', other: 'Otro' };
const SIZE_LABEL = { small: 'Chico', medium: 'Mediano', large: 'Grande' };
const AGE_LABEL = { puppy: 'Cachorro', young: 'Joven', adult: 'Adulto', senior: 'Senior', unknown: '' };

const SPECIES_FILTERS = [
  { key: '', label: 'Todos' },
  { key: 'dog', label: 'Perros' },
  { key: 'cat', label: 'Gatos' },
  { key: 'other', label: 'Otros' },
];
const SIZE_FILTERS = [
  { key: '', label: 'Cualquier tamaño' },
  { key: 'small', label: 'Chico' },
  { key: 'medium', label: 'Mediano' },
  { key: 'large', label: 'Grande' },
];
const SEX_FILTERS = [
  { key: '', label: 'Cualquier sexo' },
  { key: 'male', label: 'Macho' },
  { key: 'female', label: 'Hembra' },
];

function PetCard({ pet, c, onPress }) {
  const photo = pet.photos?.[0];
  const adopted = !!pet.adopted_at;
  return (
    <Pressable onPress={onPress} style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
      <View style={styles.imgWrap}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.img} />
        ) : (
          <View style={[styles.img, { backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ fontSize: 42 }}>🐾</Text>
          </View>
        )}
        {adopted ? (
          <View style={styles.adoptedOverlay}>
            <Text style={styles.adoptedText}>ADOPTADO</Text>
          </View>
        ) : null}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>En adopción</Text>
        </View>
      </View>
      <View style={{ padding: 14 }}>
        <Text style={[styles.name, { color: c.title }]} numberOfLines={1}>
          {pet.name || 'Sin nombre'}
        </Text>
        <Text style={[styles.meta, { color: c.subtitle }]} numberOfLines={1}>
          {SPECIES_LABEL[pet.species]}
          {pet.size ? ` · ${SIZE_LABEL[pet.size]}` : ''}
          {pet.age_group && pet.age_group !== 'unknown' ? ` · ${AGE_LABEL[pet.age_group]}` : ''}
        </Text>
        <Text style={[styles.shelter, { color: c.text }]} numberOfLines={1}>
          🏡 {pet.shelter_name}{pet.shelter_city ? ` · ${pet.shelter_city}` : ''}
        </Text>
      </View>
    </Pressable>
  );
}

export default function Adoptions() {
  const c = useTheme();
  const [pets, setPets] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [species, setSpecies] = useState('');
  const [size, setSize] = useState('');
  const [sex, setSex] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPets = useCallback(async (nextPage = 1, sp = species, sz = size, sx = sex, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const params = { page: nextPage, limit: PAGE_LIMIT };
      if (sp) params.species = sp;
      if (sz) params.size = sz;
      if (sx) params.sex = sx;
      const { data } = await api.get('/api/adoption-pets', { params });
      setPets((prev) => (append ? [...prev, ...(data.pets || [])] : data.pets || []));
      setTotal(data.total || 0);
      setPage(nextPage);
    } catch { /* silencioso */ }
    finally { setLoading(false); setLoadingMore(false); }
  }, [species, size, sex]);

  useEffect(() => { fetchPets(1, '', '', ''); /* eslint-disable-next-line */ }, []);

  const setFilter = (sp, sz, sx) => {
    setSpecies(sp);
    setSize(sz);
    setSex(sx);
    fetchPets(1, sp, sz, sx);
  };

  const hasMore = pets.length < total;

  const header = (
    <View>
      <View style={styles.headerTop}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[styles.back, { color: c.subtitle }]}>‹ Volver</Text>
        </Pressable>
        <MenuButton />
      </View>
      <Text style={[styles.kicker, { color: c.subtitle }]}>REFUGIOS MIMO</Text>
      <Text style={[styles.title, { color: c.title }]}>En adopción.</Text>
      <Text style={[styles.subtitle, { color: c.subtitle }]}>
        Mascotas que están esperando una familia. Contactá al refugio directamente.
      </Text>

      <View style={styles.filtersRow}>
        {SPECIES_FILTERS.map((f) => {
          const active = species === f.key;
          return (
            <Pressable
              key={f.key || 'all_sp'}
              onPress={() => setFilter(f.key, size, sex)}
              style={[
                styles.chip,
                active
                  ? { backgroundColor: '#FF5C6C', borderColor: '#FF5C6C' }
                  : { backgroundColor: c.card, borderColor: c.cardBorder },
              ]}
            >
              <Text style={[styles.chipText, { color: active ? '#fff' : c.title }]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.filtersRow}>
        {SIZE_FILTERS.map((f) => {
          const active = size === f.key;
          return (
            <Pressable
              key={f.key || 'all_sz'}
              onPress={() => setFilter(species, f.key, sex)}
              style={[
                styles.chip,
                active
                  ? { backgroundColor: '#1A1A2E', borderColor: '#1A1A2E' }
                  : { backgroundColor: c.card, borderColor: c.cardBorder },
              ]}
            >
              <Text style={[styles.chipText, { color: active ? '#fff' : c.title }]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.filtersRow}>
        {SEX_FILTERS.map((f) => {
          const active = sex === f.key;
          return (
            <Pressable
              key={f.key || 'all_sx'}
              onPress={() => setFilter(species, size, f.key)}
              style={[
                styles.chip,
                active
                  ? { backgroundColor: '#9B6DFF', borderColor: '#9B6DFF' }
                  : { backgroundColor: c.card, borderColor: c.cardBorder },
              ]}
            >
              <Text style={[styles.chipText, { color: active ? '#fff' : c.title }]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.count, { color: c.subtitle }]}>
        {total} {total === 1 ? 'RESULTADO' : 'RESULTADOS'}
      </Text>
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
          data={pets}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <PetCard vet={item} pet={item} c={c} onPress={() => router.push(`/adoptions/${item.id}`)} />
          )}
          ListHeaderComponent={header}
          contentContainerStyle={styles.scroll}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: c.subtitle }]}>
              No encontramos mascotas con esos filtros.
            </Text>
          }
          ListFooterComponent={
            hasMore ? (
              <Pressable
                onPress={() => fetchPets(page + 1, species, size, sex, true)}
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
  filtersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 },
  chip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  chipText: { fontSize: 12, fontWeight: '700' },
  count: { fontSize: 10, fontWeight: '700', letterSpacing: 1.8, marginTop: 20, marginBottom: 4 },
  card: {
    borderRadius: 24, borderWidth: 1, overflow: 'hidden',
  },
  imgWrap: { position: 'relative', aspectRatio: 4 / 3, backgroundColor: '#F0EBE8' },
  img: { width: '100%', height: '100%' },
  badge: {
    position: 'absolute', top: 12, left: 12,
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: 'rgba(26,26,46,0.8)',
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  adoptedOverlay: {
    position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  adoptedText: {
    backgroundColor: '#FF5C6C', color: '#fff', paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 999, fontSize: 10, fontWeight: '800', letterSpacing: 1.5,
  },
  name: { fontSize: 18, fontWeight: '800', letterSpacing: -0.4 },
  meta: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginTop: 4, textTransform: 'uppercase' },
  shelter: { fontSize: 12, fontWeight: '600', marginTop: 6 },
  empty: { textAlign: 'center', fontSize: 14, marginTop: 40 },
  moreBtn: {
    borderRadius: 999, paddingVertical: 14, alignItems: 'center', borderWidth: 1, marginTop: 12,
  },
  moreBtnText: { fontWeight: '700', fontSize: 13 },
});
