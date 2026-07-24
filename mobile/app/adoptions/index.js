import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, Pressable, Image, TextInput, StyleSheet, ActivityIndicator, Modal,
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

// Dropdown genérico: botón que abre un modal con la lista de opciones.
// RN no tiene <select> nativo; usar el picker de @react-native-picker suma dep.
// Cada opción es { key, label }. `value` matchea contra `key`.
function Dropdown({ label, value, options, onChange, c, activeColor = '#1A1A2E' }) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => String(o.key) === String(value)) || options[0];
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.dropdownBtn, { backgroundColor: c.card, borderColor: c.cardBorder }]}
      >
        <Text style={[styles.dropdownLabel, { color: c.subtitle }]}>{label}</Text>
        <View style={styles.dropdownRow}>
          <Text style={[styles.dropdownValue, { color: c.title }]} numberOfLines={1}>
            {current?.label || '—'}
          </Text>
          <Text style={[styles.dropdownCaret, { color: c.subtitle }]}>▾</Text>
        </View>
      </Pressable>
      <Modal
        visible={open}
        animationType="fade"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: c.card }]} onPress={() => {}}>
            <Text style={[styles.modalTitle, { color: c.title }]}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(o, i) => String(o.key ?? i)}
              renderItem={({ item }) => {
                const active = String(item.key) === String(value);
                return (
                  <Pressable
                    onPress={() => { onChange(item.key); setOpen(false); }}
                    style={[styles.modalRow, active && { backgroundColor: `${activeColor}18` }]}
                  >
                    <Text style={[styles.modalRowText, { color: active ? activeColor : c.title }]}>
                      {item.label}
                    </Text>
                    {active ? <Text style={[styles.modalCheck, { color: activeColor }]}>✓</Text> : null}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

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

const EMPTY_FILTERS = { species: '', size: '', sex: '', city: '', shelter_id: '' };

export default function Adoptions() {
  const c = useTheme();
  const [pets, setPets] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  // City input tiene draft (typing) + committed (aplicado tras submit).
  const [cityDraft, setCityDraft] = useState('');
  // Refugios activos para los chips. Se cargan una vez.
  const [shelters, setShelters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPets = useCallback(async (nextPage = 1, f = filters, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const params = { page: nextPage, limit: PAGE_LIMIT };
      for (const [k, v] of Object.entries(f)) if (v) params[k] = v;
      const { data } = await api.get('/api/adoption-pets', { params });
      setPets((prev) => (append ? [...prev, ...(data.pets || [])] : data.pets || []));
      setTotal(data.total || 0);
      setPage(nextPage);
    } catch { /* silencioso */ }
    finally { setLoading(false); setLoadingMore(false); }
  }, [filters]);

  useEffect(() => { fetchPets(1, EMPTY_FILTERS); /* eslint-disable-next-line */ }, []);

  // Refugios para los chips. Cap 50 (limit del server).
  useEffect(() => {
    api.get('/api/shelters', { params: { limit: 50 } })
      .then(({ data }) => setShelters(data.shelters || []))
      .catch(() => {});
  }, []);

  const setFilter = (key, value) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    fetchPets(1, next);
  };
  const submitCity = () => {
    const trimmed = cityDraft.trim();
    setFilter('city', trimmed);
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

      {/* Dropdowns 2x2 (especie/tamaño y sexo/refugio) — ciudad va con input aparte. */}
      <View style={styles.dropdownGrid}>
        <Dropdown
          label="Especie"
          value={filters.species}
          options={SPECIES_FILTERS}
          onChange={(v) => setFilter('species', v)}
          c={c}
          activeColor="#FF5C6C"
        />
        <Dropdown
          label="Tamaño"
          value={filters.size}
          options={SIZE_FILTERS}
          onChange={(v) => setFilter('size', v)}
          c={c}
        />
      </View>
      <View style={styles.dropdownGrid}>
        <Dropdown
          label="Sexo"
          value={filters.sex}
          options={SEX_FILTERS}
          onChange={(v) => setFilter('sex', v)}
          c={c}
          activeColor="#9B6DFF"
        />
        <Dropdown
          label="Refugio"
          value={filters.shelter_id}
          options={[
            { key: '', label: 'Todos los refugios' },
            ...shelters.map((s) => ({ key: String(s.id), label: s.name })),
          ]}
          onChange={(v) => setFilter('shelter_id', v)}
          c={c}
          activeColor="#3ECFB2"
        />
      </View>

      {/* Ciudad: text input con submit. */}
      <View style={[styles.searchBar, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
        <TextInput
          value={cityDraft}
          onChangeText={setCityDraft}
          placeholder="Ciudad (Montevideo, Salto…)"
          placeholderTextColor={c.subtitle}
          style={[styles.input, { color: c.title }]}
          returnKeyType="search"
          onSubmitEditing={submitCity}
        />
        <Pressable onPress={submitCity} style={styles.searchBtn}>
          <Text style={styles.searchBtnText}>Buscar</Text>
        </Pressable>
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
                onPress={() => fetchPets(page + 1, filters, true)}
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
  dropdownGrid: { flexDirection: 'row', gap: 10, marginTop: 12 },
  dropdownBtn: {
    flex: 1, borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10,
  },
  dropdownLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  dropdownRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 4, gap: 6,
  },
  dropdownValue: { fontSize: 13, fontWeight: '700', flex: 1 },
  dropdownCaret: { fontSize: 12, fontWeight: '700' },
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 16, paddingBottom: 24, maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textAlign: 'center', marginBottom: 12,
  },
  modalRow: {
    paddingVertical: 14, paddingHorizontal: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  modalRowText: { fontSize: 15, fontWeight: '600' },
  modalCheck: { fontSize: 16, fontWeight: '800' },
  searchBar: {
    marginTop: 10, borderRadius: 999, borderWidth: 1, padding: 4,
    flexDirection: 'row', alignItems: 'center',
  },
  input: { flex: 1, paddingHorizontal: 18, paddingVertical: 10, fontSize: 14, fontWeight: '500' },
  searchBtn: { backgroundColor: '#1A1A2E', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999 },
  searchBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
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
