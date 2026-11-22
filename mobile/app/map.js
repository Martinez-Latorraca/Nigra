import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, Image, ScrollView, ActivityIndicator, Keyboard, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import * as Location from 'expo-location';
import api from '../src/lib/api';
import { useTheme, palette, fonts } from '../src/lib/theme';
import { Search, X, List, LocateFixed, Clock, MapPin, ArrowRight, Stethoscope } from '../src/lib/icons';
import { translateType, translateColor } from '../src/lib/translations';
import { toast } from '../src/lib/feedback';
import ExploreMap from '../src/components/ExploreMap';
import StatusChip from '../src/components/StatusChip';
import TabBar, { useTabBarSpace } from '../src/components/TabBar';

// Pestaña Mapa (Mapa.dc.html): reportes abiertos y veterinarias en el mapa,
// con buscador de barrio/dirección, filtros, tu ubicación con el radio de
// alertas y la tarjeta del pin seleccionado.
// Los refugios NO van al mapa: no tienen dirección pública (es la casa de
// alguien). Por eso tampoco está el chip "Refugios" del diseño.

const MONTEVIDEO = { lat: -34.9011, lng: -56.1645 };
const FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'lost', label: 'Perdidos', dot: palette.coral },
  { key: 'found', label: 'Encontrados', dot: palette.teal },
  { key: 'vets', label: 'Veterinarias', dot: palette.noche, square: true },
];

const toRad = (d) => (d * Math.PI) / 180;
function distanceKm(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}
const formatKm = (km) => `a ${km < 10 ? km.toFixed(1).replace('.', ',') : Math.round(km)} km`;

function timeAgo(iso) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `Hace ${Math.max(1, mins)} min`;
  const h = Math.round(mins / 60);
  if (h < 24) return `Hace ${h} h`;
  const d = Math.round(h / 24);
  if (d < 30) return d === 1 ? 'Hace 1 día' : `Hace ${d} días`;
  const mo = Math.round(d / 30);
  if (mo < 12) return mo === 1 ? 'Hace 1 mes' : `Hace ${mo} meses`;
  const y = Math.round(d / 365);
  return y === 1 ? 'Hace 1 año' : `Hace ${y} años`;
}

const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// Posición sin quedarse colgado: la última conocida y, si no hay, la actual
// con un tope de tiempo (getCurrentPositionAsync puede no volver nunca).
async function getPosition() {
  const last = await Location.getLastKnownPositionAsync().catch(() => null);
  if (last?.coords) return last.coords;
  const current = await Promise.race([
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null),
    new Promise((r) => setTimeout(() => r(null), 8000)),
  ]);
  return current?.coords || null;
}

export default function MapScreen() {
  const c = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabSpace = useTabBarSpace();
  const user = useSelector((s) => s.user.data);
  const mapRef = useRef(null);

  const [filter, setFilter] = useState('all');
  const [bounds, setBounds] = useState(null);
  const [pets, setPets] = useState([]);
  const [vets, setVets] = useState([]);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null); // { kind, id }
  const [me, setMe] = useState(null); // { lat, lng }
  const [radiusKm, setRadiusKm] = useState(null);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const searchTimer = useRef(null);

  // Ubicación al entrar, solo si ya dio permiso (no pedimos permiso de entrada).
  useEffect(() => {
    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await getPosition();
      if (pos) {
        setMe({ lat: pos.latitude, lng: pos.longitude });
        mapRef.current?.flyTo(pos.latitude, pos.longitude, 14);
      }
    })();
  }, []);

  // Radio de alertas: el de la vet si la cuenta es de vet; si no, el del usuario.
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        if (user.has_vet) {
          const { data } = await api.get('/api/vets/me/dashboard');
          setRadiusKm(data?.vet?.alert_radius_km ?? null);
        } else {
          const { data } = await api.get('/api/users/me');
          setRadiusKm(Number.isFinite(data?.notify_radius_km) ? data.notify_radius_km : null);
        }
      } catch {
        /* sin radio */
      }
    })();
  }, [user]);

  const load = useCallback(async (b, f) => {
    if (!b) return;
    setLoading(true);
    try {
      const wantPets = f !== 'vets';
      const wantVets = f === 'all' || f === 'vets';
      const center = { lat: (b.minLat + b.maxLat) / 2, lng: (b.minLng + b.maxLng) / 2 };
      const halfDiag = distanceKm(center, { lat: b.maxLat, lng: b.maxLng });
      const [p, v] = await Promise.all([
        wantPets
          ? api
              .get('/api/pets/map', {
                params: { minLat: b.minLat, maxLat: b.maxLat, minLng: b.minLng, maxLng: b.maxLng, status: f === 'all' ? 'all' : f },
              })
              .then((r) => r.data)
          : Promise.resolve({ pets: [], truncated: false }),
        wantVets
          ? api
              .get('/api/vets/nearby', {
                params: { lat: center.lat, lng: center.lng, radius_km: Math.min(500, Math.max(1, halfDiag)), limit: 50 },
              })
              .then((r) => r.data?.vets || [])
          : Promise.resolve([]),
      ]);
      setPets((p.pets || []).filter((x) => x.lat != null && x.lng != null));
      setTruncated(!!p.truncated);
      setVets(v.filter((x) => x.lat != null && x.lng != null));
    } catch {
      toast('No se pudo cargar el mapa. Probá de nuevo.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(bounds, filter);
  }, [bounds, filter, load]);

  // Si el seleccionado ya no está en lo cargado (cambió el filtro), se cierra.
  useEffect(() => {
    if (!selected) return;
    const list = selected.kind === 'pet' ? pets : vets;
    if (!list.some((x) => x.id === selected.id)) setSelected(null);
  }, [pets, vets, selected]);

  const onMapEvent = useCallback((m) => {
    if (m.type === 'bounds') setBounds({ minLat: m.minLat, maxLat: m.maxLat, minLng: m.minLng, maxLng: m.maxLng });
    else if (m.type === 'select') setSelected({ kind: m.kind, id: m.id });
    else if (m.type === 'deselect') setSelected(null);
  }, []);

  const mapData = useMemo(
    () => ({
      pets: pets.map(({ id, lat, lng, status }) => ({ id, lat, lng, status })),
      vets: vets.map(({ id, lat, lng }) => ({ id, lat, lng })),
      selected,
      user: me ? { ...me, radiusKm } : null,
    }),
    [pets, vets, selected, me, radiusKm]
  );

  const locate = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      toast('Necesitamos tu ubicación para centrar el mapa.', 'error');
      return;
    }
    const pos = await getPosition();
    if (!pos) {
      toast('No pudimos obtener tu ubicación.', 'error');
      return;
    }
    setMe({ lat: pos.latitude, lng: pos.longitude });
    mapRef.current?.flyTo(pos.latitude, pos.longitude, 14);
  };

  const onChangeQuery = (text) => {
    setQuery(text);
    clearTimeout(searchTimer.current);
    if (text.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      try {
        const { data } = await api.get('/api/geo/search', { params: { q: text } });
        setSuggestions(Array.isArray(data) ? data.slice(0, 5) : []);
      } catch {
        setSuggestions([]);
      }
    }, 500);
  };

  const pickSuggestion = (s) => {
    setQuery(s.display_name.split(',')[0]);
    setSuggestions([]);
    Keyboard.dismiss();
    mapRef.current?.flyTo(parseFloat(s.lat), parseFloat(s.lon), 15);
  };

  const selPet = selected?.kind === 'pet' ? pets.find((p) => p.id === selected.id) : null;
  const selVet = selected?.kind === 'vet' ? vets.find((v) => v.id === selected.id) : null;
  const elevated = { backgroundColor: c.card, shadowColor: '#1A1A2E', shadowOpacity: c.isDark ? 0 : 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: c.isDark ? 0 : 4 };

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <ExploreMap
        ref={mapRef}
        initialCenter={MONTEVIDEO}
        isDark={c.isDark}
        vetBg={c.nocheSmall}
        data={mapData}
        onEvent={onMapEvent}
        style={StyleSheet.absoluteFill}
      />

      {/* Buscador + filtros */}
      <View style={[styles.top, { paddingTop: insets.top + 16 }]} pointerEvents="box-none">
        <View style={[styles.searchBox, elevated]}>
          <Search size={20} color={c.text} strokeWidth={2} />
          <TextInput
            value={query}
            onChangeText={onChangeQuery}
            placeholder="Buscar barrio o dirección"
            placeholderTextColor={c.placeholder}
            accessibilityLabel="Buscar barrio o dirección"
            returnKeyType="search"
            style={[styles.searchInput, { color: c.inputText }]}
          />
          {query ? (
            <Pressable onPress={() => onChangeQuery('')} hitSlop={8} accessibilityLabel="Borrar búsqueda">
              <X size={18} color={c.text} strokeWidth={2} />
            </Pressable>
          ) : null}
        </View>
        {suggestions.length > 0 ? (
          <View style={[styles.suggestions, elevated]}>
            {suggestions.map((s, i) => (
              <Pressable
                key={String(s.place_id ?? i)}
                onPress={() => pickSuggestion(s)}
                style={[styles.suggestion, i > 0 && { borderTopWidth: 1, borderTopColor: c.cardBorder }]}
              >
                <MapPin size={16} color={c.text} strokeWidth={2} />
                <Text style={[styles.suggestionText, { color: c.text }]} numberOfLines={2}>
                  {s.display_name}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[styles.chip, elevated, active && { backgroundColor: c.inverseBg }]}
              >
                {f.dot ? (
                  <View
                    style={[
                      styles.chipDot,
                      f.square && { borderRadius: 3 },
                      { backgroundColor: f.key === 'vets' ? c.nocheSmall : f.dot },
                      (active || (f.key === 'vets' && c.isDark)) && { borderWidth: 1.5, borderColor: active ? c.inverseText : c.text },
                    ]}
                  />
                ) : null}
                <Text style={[styles.chipText, { color: active ? c.inverseText : c.title, fontFamily: active ? fonts.bold : fonts.medium }]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        {truncated ? (
          <View style={[styles.notice, { backgroundColor: c.inverseBg }]}>
            <Text style={[styles.noticeText, { color: c.inverseText }]}>Hay muchos reportes: acercá el mapa para verlos todos.</Text>
          </View>
        ) : null}
        {loading ? <ActivityIndicator style={styles.spinner} color={palette.coral} /> : null}
      </View>

      {/* Botones laterales */}
      <View style={[styles.side, { bottom: tabSpace + (selected ? 130 : 0) }]} pointerEvents="box-none">
        <Pressable onPress={() => router.push('/pets')} accessibilityLabel="Ver como lista" style={[styles.round, elevated]}>
          <List size={22} color={c.title} strokeWidth={2} />
        </Pressable>
        <Pressable onPress={locate} accessibilityLabel="Centrar en mi ubicación" style={[styles.round, elevated]}>
          <LocateFixed size={22} color={c.title} strokeWidth={2} />
        </Pressable>
      </View>

      {/* Tarjeta del pin seleccionado */}
      {selPet ? (
        <Pressable
          onPress={() => router.push(`/pet/${selPet.id}`)}
          style={[styles.card, elevated, { bottom: tabSpace - 8 }]}
          accessibilityRole="button"
        >
          <Image source={{ uri: selPet.photo_url }} style={[styles.cardImg, { backgroundColor: c.photo }]} />
          <View style={styles.cardBody}>
            <View style={styles.cardTop}>
              <StatusChip status={selPet.status} />
              <View style={styles.row4}>
                <Clock size={13} color={c.text} strokeWidth={2} />
                <Text style={[styles.meta, { color: c.text }]}>{timeAgo(selPet.created_at)}</Text>
              </View>
            </View>
            <Text style={[styles.cardTitle, { color: c.title }]} numberOfLines={1}>
              {selPet.status === 'lost' ? selPet.name || 'Sin nombre' : 'Encontrado'}
            </Text>
            <Text style={[styles.cardText, { color: c.text }]} numberOfLines={1}>
              {[translateType(selPet.type), translateColor(selPet.color)].filter(Boolean).map(capitalize).join(' · ')}
            </Text>
            {selPet.address || me ? (
              <View style={styles.row4}>
                <MapPin size={13} color={c.text} strokeWidth={2} />
                <Text style={[styles.meta, { color: c.text, flex: 1 }]} numberOfLines={1}>
                  {[selPet.address?.split(',')[0], me ? formatKm(distanceKm(me, selPet)) : null].filter(Boolean).join(' · ')}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={[styles.go, { backgroundColor: c.inverseBg }]}>
            <ArrowRight size={20} color={c.inverseText} strokeWidth={2} />
          </View>
        </Pressable>
      ) : null}
      {selVet ? (
        <Pressable
          onPress={() => router.push(`/vets/${selVet.slug}`)}
          style={[styles.card, elevated, { bottom: tabSpace - 8 }]}
          accessibilityRole="button"
        >
          {selVet.logo_url ? (
            <Image source={{ uri: selVet.logo_url }} style={[styles.cardImg, { backgroundColor: c.photo }]} />
          ) : (
            <View style={[styles.cardImg, styles.center, { backgroundColor: c.nocheSmall }]}>
              <Stethoscope size={32} color={palette.crema} strokeWidth={2} />
            </View>
          )}
          <View style={styles.cardBody}>
            <Text style={[styles.cardKicker, { color: c.text }]}>Veterinaria</Text>
            <Text style={[styles.cardTitle, { color: c.title }]} numberOfLines={1}>{selVet.name}</Text>
            <View style={styles.row4}>
              <MapPin size={13} color={c.text} strokeWidth={2} />
              <Text style={[styles.meta, { color: c.text, flex: 1 }]} numberOfLines={1}>
                {[selVet.address || selVet.city, me ? formatKm(distanceKm(me, selVet)) : null].filter(Boolean).join(' · ')}
              </Text>
            </View>
          </View>
          <View style={[styles.go, { backgroundColor: c.inverseBg }]}>
            <ArrowRight size={20} color={c.inverseText} strokeWidth={2} />
          </View>
        </Pressable>
      ) : null}

      <TabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  top: { position: 'absolute', left: 0, right: 0, top: 0, gap: 12 },
  searchBox: {
    marginHorizontal: 20,
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: { flex: 1, height: 44, fontFamily: fonts.regular, fontSize: 15, paddingVertical: 0 },
  suggestions: { marginHorizontal: 20, marginTop: -4, borderRadius: 18, overflow: 'hidden' },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  suggestionText: { flex: 1, fontFamily: fonts.regular, fontSize: 14, lineHeight: 19 },
  chips: { paddingHorizontal: 20, paddingBottom: 8, gap: 8 },
  chip: { height: 38, paddingHorizontal: 14, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 8 },
  chipDot: { width: 10, height: 10, borderRadius: 5 },
  chipText: { fontSize: 14 },
  notice: { alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  noticeText: { fontFamily: fonts.bold, fontSize: 12 },
  spinner: { alignSelf: 'center' },
  side: { position: 'absolute', right: 20, gap: 10 },
  round: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  card: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 24,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardImg: { width: 84, height: 84, borderRadius: 18 },
  cardBody: { flex: 1, minWidth: 0, gap: 4 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  row4: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { fontFamily: fonts.bold, fontSize: 12 },
  cardKicker: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  cardTitle: { fontFamily: fonts.display, fontSize: 18 },
  cardText: { fontFamily: fonts.regular, fontSize: 13 },
  go: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
