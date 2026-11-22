import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, Pressable, Image, StyleSheet, ActivityIndicator, Modal, useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import api from '../../src/lib/api';
import { useTheme, palette, fonts, sectionColors } from '../../src/lib/theme';
import { ChevronDown, Check, HouseHeart, PawPrint, SearchX } from '../../src/lib/icons';
import EmptyState from '../../src/components/EmptyState';
import SectionHeader from '../../src/components/SectionHeader';
import SearchBar from '../../src/components/SearchBar';
import StatusChip from '../../src/components/StatusChip';
import Button from '../../src/components/Button';
import TabBar, { useTabBarSpace } from '../../src/components/TabBar';

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
  { key: '', label: 'Cualquiera' },
  { key: 'small', label: 'Chico' },
  { key: 'medium', label: 'Mediano' },
  { key: 'large', label: 'Grande' },
];
const SEX_FILTERS = [
  { key: '', label: 'Cualquiera' },
  { key: 'male', label: 'Macho' },
  { key: 'female', label: 'Hembra' },
];

// Dropdown genérico: botón que abre un modal con la lista de opciones.
// RN no tiene <select> nativo; usar el picker de @react-native-picker suma dep.
// Cada opción es { key, label }. `value` matchea contra `key`.
function Dropdown({ label, value, options, onChange, c }) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => String(o.key) === String(value)) || options[0];
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${current?.label || ''}`}
        style={[styles.dropdownBtn, { backgroundColor: c.card, borderColor: c.cardBorder }]}
      >
        <View style={styles.dropdownTexts}>
          <Text style={[styles.dropdownLabel, { color: c.text }]}>{label}</Text>
          <Text style={[styles.dropdownValue, { color: c.title }]} numberOfLines={1}>
            {current?.label || '—'}
          </Text>
        </View>
        <ChevronDown size={18} color={c.text} strokeWidth={2} />
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
                    style={[styles.modalRow, active && { backgroundColor: c.bg }]}
                  >
                    <Text
                      style={[
                        styles.modalRowText,
                        { color: c.title, fontFamily: active ? fonts.bold : fonts.medium },
                      ]}
                    >
                      {item.label}
                    </Text>
                    {active ? <Check size={18} color={palette.violeta} strokeWidth={2.5} /> : null}
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

function AdoptionCard({ pet, c, onPress, width }) {
  const photo = pet.photos?.[0];
  const adopted = !!pet.adopted_at;
  const meta = [
    SPECIES_LABEL[pet.species],
    pet.size ? SIZE_LABEL[pet.size] : null,
    pet.age_group && pet.age_group !== 'unknown' ? AGE_LABEL[pet.age_group] : null,
  ].filter(Boolean).join(' · ');
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, { width, backgroundColor: c.card, opacity: pressed ? 0.85 : 1 }]}
    >
      <View style={[styles.imgWrap, { backgroundColor: c.arena }]}>
        {photo ? (
          <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} />
        ) : (
          <PawPrint size={36} color={c.text} strokeWidth={2} />
        )}
        <StatusChip status={adopted ? 'adopted' : 'adoption'} style={styles.chip} />
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.name, { color: c.title }]} numberOfLines={1}>
          {pet.name || 'Sin nombre'}
        </Text>
        {meta ? (
          <Text style={[styles.meta, { color: c.text }]} numberOfLines={1}>{meta}</Text>
        ) : null}
        <View style={styles.shelterRow}>
          <HouseHeart size={14} color={c.text} strokeWidth={2} />
          <Text style={[styles.shelter, { color: c.text }]} numberOfLines={1}>
            {pet.shelter_name}{pet.shelter_city ? ` · ${pet.shelter_city}` : ''}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const EMPTY_FILTERS = { species: '', size: '', sex: '', city: '', shelter_id: '' };

export default function Adoptions() {
  const c = useTheme();
  const bottomSpace = useTabBarSpace();
  // Dos columnas de ancho fijo: con un número impar la última no se estira.
  const cardWidth = (useWindowDimensions().width - 40 - 12) / 2;
  const [pets, setPets] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  // City input tiene draft (typing) + committed (aplicado tras submit).
  const [cityDraft, setCityDraft] = useState('');
  // Refugios activos para el dropdown. Se cargan una vez.
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

  // Refugios para el dropdown. Cap 50 (limit del server).
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
  const hasFilters = Object.values(filters).some(Boolean);
  const clearFilters = () => {
    setCityDraft('');
    setFilters(EMPTY_FILTERS);
    fetchPets(1, EMPTY_FILTERS);
  };

  const header = (
    <View style={styles.headerWrap}>
      <SectionHeader
        color={sectionColors.adopcion}
        kicker="Refugios Mimo"
        title="En adopción"
        subtitle="Mascotas que están esperando una familia. Contactá al refugio directamente."
        style={styles.sectionHeader}
      />

      <View style={styles.filters}>
        {/* Dropdowns 2x2 (especie/tamaño y sexo/refugio) — ciudad va con input aparte. */}
        <View style={styles.dropdownGrid}>
          <Dropdown
            label="Especie"
            value={filters.species}
            options={SPECIES_FILTERS}
            onChange={(v) => setFilter('species', v)}
            c={c}
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
          />
          <Dropdown
            label="Refugio"
            value={filters.shelter_id}
            options={[
              { key: '', label: 'Todos' },
              ...shelters.map((s) => ({ key: String(s.id), label: s.name })),
            ]}
            onChange={(v) => setFilter('shelter_id', v)}
            c={c}
          />
        </View>

        <SearchBar
          value={cityDraft}
          onChangeText={setCityDraft}
          onSubmit={submitCity}
          placeholder="Ciudad (Montevideo, Salto…)"
        />

        <Text style={[styles.count, { color: c.text }]}>
          {total} {total === 1 ? 'resultado' : 'resultados'}
        </Text>
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
          data={pets}
          numColumns={2}
          keyExtractor={(item) => String(item.id)}
          columnWrapperStyle={styles.column}
          renderItem={({ item }) => (
            <AdoptionCard pet={item} c={c} width={cardWidth} onPress={() => router.push(`/adoptions/${item.id}`)} />
          )}
          ListHeaderComponent={header}
          contentContainerStyle={{ paddingBottom: bottomSpace }}
          ListEmptyComponent={
            <EmptyState
              icon={SearchX}
              color={sectionColors.adopcion}
              title="No encontramos resultados"
              text="Probá con otra ciudad o sacá algún filtro."
              action={hasFilters ? { title: 'Limpiar filtros', variant: 'dark', onPress: clearFilters } : null}
            />
          }
          ListFooterComponent={
            hasMore ? (
              <Button
                variant="outline"
                title={loadingMore ? 'Cargando…' : 'Cargar más'}
                onPress={() => fetchPets(page + 1, filters, true)}
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
  dropdownGrid: { flexDirection: 'row', gap: 10 },
  dropdownBtn: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  dropdownTexts: { flex: 1, minWidth: 0, gap: 1 },
  dropdownLabel: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.66, textTransform: 'uppercase' },
  dropdownValue: { fontFamily: fonts.bold, fontSize: 14 },
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(26,26,46,0.4)', justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 16, paddingBottom: 24, maxHeight: '70%',
  },
  modalTitle: {
    fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase',
    textAlign: 'center', marginBottom: 12,
  },
  modalRow: {
    paddingVertical: 14, paddingHorizontal: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  modalRowText: { fontSize: 15 },
  count: {
    fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', marginTop: 6,
  },
  column: { gap: 12, paddingHorizontal: 20, marginBottom: 12 },
  card: { borderRadius: 22, overflow: 'hidden' },
  imgWrap: { height: 150, alignItems: 'center', justifyContent: 'center' },
  chip: { position: 'absolute', top: 10, left: 10 },
  cardBody: { padding: 12, gap: 3 },
  name: { fontFamily: fonts.display, fontSize: 17 },
  meta: { fontFamily: fonts.regular, fontSize: 12 },
  shelterRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  shelter: { flex: 1, fontFamily: fonts.bold, fontSize: 12 },
  moreBtn: { height: 52, borderRadius: 16, marginHorizontal: 20, marginTop: 4 },
  moreBtnText: { fontSize: 15 },
});
