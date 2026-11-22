import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import api from '../src/lib/api';
import { useTheme, palette, fonts, sectionColors } from '../src/lib/theme';
import {
  Camera, Search, Locate, Check, MapPin, ArrowUpRight, ChevronRight, X, Plus, Info, Send, Phone, ScanSearch, Images,
} from '../src/lib/icons';
import { translateType, translateColor } from '../src/lib/translations';
import CameraCapture from '../src/components/CameraCapture';
import ReportLoading from '../src/components/ReportLoading';
import { loadLoadingSlides } from '../src/lib/loadingSlides';
import PetMap from '../src/components/PetMap';
import AddressSearch from '../src/components/AddressSearch';
import SectionHeader from '../src/components/SectionHeader';
import StatusChip from '../src/components/StatusChip';
import TextField from '../src/components/TextField';
import Button from '../src/components/Button';
import EmptyState from '../src/components/EmptyState';
import { choose, toast } from '../src/lib/feedback';

const SITUATIONS = [
  { value: 'lost', label: 'Perdí mi mascota' },
  { value: 'found', label: 'Encontré una' },
];
const TYPES = [
  { value: 'dog', label: 'Perro' },
  { value: 'cat', label: 'Gato' },
];
// swatch: cómo se dibuja la muestrita de color (ver ColorSwatch).
const COLORS = [
  { value: 'black', label: 'Negro', swatch: { solid: '#1F1F1F' } },
  { value: 'white', label: 'Blanco', swatch: { solid: '#FFFFFF' } },
  { value: 'brown', label: 'Marrón', swatch: { solid: '#7A4A2A' } },
  { value: 'golden', label: 'Dorado', swatch: { solid: '#D9A441' } },
  { value: 'mixed', label: 'Mixto', swatch: { split: ['#1F1F1F', '#FFFFFF'] } },
  { value: 'orange', label: 'Naranja', swatch: { solid: '#E07B2E' } },
  { value: 'grey', label: 'Gris', swatch: { solid: '#9A9AA5' } },
  { value: 'spotted', label: 'Manchado', swatch: { spots: true } },
  { value: 'striped', label: 'Atigrado', swatch: { stripes: ['#7A4A2A', '#D9A441'] } },
];

// Radio generoso para la pre-búsqueda: preferimos mostrar de más que perder un match.
const SEARCH_RADIUS_KM = 50;

const STEP_INFO = {
  form: { n: 1, label: 'Buscar' },
  results: { n: 2, label: 'Coincidencias' },
  report: { n: 3, label: 'Publicar' },
};

// Muestrita circular del color (sin librerías de gradientes).
function ColorSwatch({ swatch }) {
  return (
    <View style={styles.swatch}>
      {swatch.solid ? <View style={[StyleSheet.absoluteFill, { backgroundColor: swatch.solid }]} /> : null}
      {swatch.split ? (
        <View style={[StyleSheet.absoluteFill, styles.split]}>
          <View style={{ flex: 1, backgroundColor: swatch.split[0] }} />
          <View style={{ flex: 1, backgroundColor: swatch.split[1] }} />
        </View>
      ) : null}
      {swatch.spots ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF' }]}>
          <View style={[styles.spot, { top: 4, left: 4, width: 8, height: 8 }]} />
          <View style={[styles.spot, { bottom: 4, right: 4, width: 6, height: 6 }]} />
        </View>
      ) : null}
      {swatch.stripes ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: swatch.stripes[1] }]}>
          <View style={styles.stripes}>
            {[0, 1, 2, 3, 4].map((i) => (
              <View key={i} style={[styles.stripe, { backgroundColor: swatch.stripes[0] }]} />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function Pill({ label, active, onPress, children, c }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[
        styles.pill,
        children ? styles.pillWithSwatch : null,
        active
          ? { backgroundColor: palette.noche, borderColor: palette.noche }
          : { backgroundColor: c.card, borderColor: c.cardBorder },
      ]}
    >
      {children}
      <Text style={[styles.pillText, { color: active ? palette.crema : c.text, fontFamily: active ? fonts.bold : fonts.medium }]}>
        {label}
      </Text>
    </Pressable>
  );
}

// Tarjeta de coincidencia: parecido en grande + barra + distancia.
function MatchCard({ pet, onPress, c }) {
  const pct = pet.visual_distance !== undefined ? Math.max(0, Math.round((1 - pet.visual_distance) * 100)) : null;
  const meta = [translateType(pet.type), translateColor(pet.color)].filter(Boolean).join(' · ');
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.match, { backgroundColor: c.card, opacity: pressed ? 0.85 : 1 }]}>
      <Image source={{ uri: pet.photo_url }} style={[styles.matchImg, { backgroundColor: c.arena }]} />
      <View style={styles.matchBody}>
        <View style={styles.matchTop}>
          <StatusChip status={pet.status} />
          <Text style={[styles.matchMeta, { color: c.text }]} numberOfLines={1}>{meta}</Text>
        </View>
        {pct !== null ? (
          <>
            <Text style={[styles.matchPct, { color: c.title }]}>
              {pct}% <Text style={styles.matchPctLabel}>de parecido</Text>
            </Text>
            <View style={[styles.bar, { backgroundColor: c.arena }]}>
              <View style={[styles.barFill, { width: `${pct}%` }]} />
            </View>
          </>
        ) : null}
        {pet.distance_km != null ? (
          <View style={styles.row}>
            <MapPin size={14} color={c.text} strokeWidth={2} />
            <Text style={[styles.small, { color: c.text }]}>
              a {parseFloat(pet.distance_km).toFixed(1).replace('.', ',')} km
            </Text>
          </View>
        ) : null}
        <View style={[styles.matchFoot, { borderTopColor: c.cardBorder }]}>
          <Text style={[styles.matchContact, { color: c.text }]}>Contactar</Text>
          <ArrowUpRight size={14} color={c.text} strokeWidth={2} />
        </View>
      </View>
    </Pressable>
  );
}

export default function Find() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState('form'); // 'form' | 'results' | 'report'
  const [busy, setBusy] = useState(false); // false | 'search' | 'publish'
  // Pedimos los slides de la pantalla de espera antes de que haga falta.
  useEffect(() => {
    loadLoadingSlides();
  }, []);
  const [error, setError] = useState('');

  // Datos para buscar
  const [situation, setSituation] = useState('lost');
  const [mainImage, setMainImage] = useState(null);
  const [type, setType] = useState('dog');
  const [color, setColor] = useState('black');
  const [position, setPosition] = useState(null);
  // Nombre del lugar elegido en el buscador (solo para mostrar en el resumen).
  const [placeName, setPlaceName] = useState('');
  const [locating, setLocating] = useState(false);
  const [cameraVisible, setCameraVisible] = useState(false);

  // Resultado de la pre-búsqueda
  const [matches, setMatches] = useState([]);

  // Datos extra solo para el reporte
  const [extraImages, setExtraImages] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const isLost = situation === 'lost';

  const openPicker = async (source) => {
    const perm =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast('Necesitamos acceso para cargar la foto.', 'error');
      return;
    }
    const launch = source === 'camera' ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
    const result = await launch({ allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!result.canceled) setMainImage(result.assets[0]);
  };

  // El recortador nativo no se puede personalizar: el aviso de dejar solo la
  // cara va como bajada de la opción de galería (Confirmaciones.dc.html).
  const pickMainImage = async () => {
    const source = await choose({
      title: 'Foto de la cara',
      text: 'Que entren solo las orejas y el hocico.',
      options: [
        { value: 'camera', icon: Camera, title: 'Sacar una foto', text: 'Con la guía para encuadrar la cara.' },
        { value: 'library', icon: Images, title: 'Elegir de la galería', text: 'Después recortás dejando solo la cara.' },
      ],
    });
    if (source === 'camera') setCameraVisible(true);
    else if (source === 'library') openPicker('library');
  };

  const pickExtraImages = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      selectionLimit: 5,
      quality: 0.6,
    });
    if (!result.canceled) {
      setExtraImages((prev) => [...prev, ...result.assets].slice(0, 5));
    }
  };

  const removeExtra = (idx) => setExtraImages((prev) => prev.filter((_, i) => i !== idx));

  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        toast('Necesitamos tu ubicación para centrar el mapa.', 'error');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setPosition({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      setPlaceName('');
    } catch {
      toast('No pudimos obtener tu ubicación.', 'error');
    } finally {
      setLocating(false);
    }
  };

  const handleSearch = async () => {
    if (!mainImage) return setError('Falta la foto de la mascota.');
    if (!position) return setError('Falta la ubicación.');

    setError('');
    setBusy('search');
    // Buscamos en el pool opuesto: si la perdí, busco entre las encontradas.
    const searchStatus = isLost ? 'found' : 'lost';
    try {
      const formData = new FormData();
      formData.append('image', { uri: mainImage.uri, name: 'photo.jpg', type: 'image/jpeg' });
      formData.append('status', searchStatus);
      formData.append('type', type);
      formData.append('color', color);
      formData.append('lat', String(position.lat));
      formData.append('lng', String(position.lng));
      formData.append('searchRatio', String(SEARCH_RADIUS_KM));

      const { data } = await api.post('/api/pets/search-pet', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (Array.isArray(data) && data.length > 0) {
        setMatches(data);
        setStep('results');
      } else {
        setMatches([]);
        setStep('report');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo completar la búsqueda.');
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitReport = async () => {
    if (!contactInfo.trim()) return setError('El contacto es obligatorio.');
    if (description.trim().length < 3) return setError('La descripción debe tener al menos 3 caracteres.');

    setError('');
    setBusy('publish');
    try {
      const formData = new FormData();
      formData.append('image', { uri: mainImage.uri, name: 'photo.jpg', type: 'image/jpeg' });
      extraImages.forEach((img, i) =>
        formData.append('extra_images', { uri: img.uri, name: `extra_${i}.jpg`, type: 'image/jpeg' })
      );
      formData.append('type', type);
      formData.append('color', color);
      formData.append('status', situation); // se publica en su propio pool
      formData.append('contact_info', contactInfo.trim());
      formData.append('description', description.trim());
      formData.append('lat', String(position.lat));
      formData.append('lng', String(position.lng));
      if (isLost && name.trim()) formData.append('name', name.trim());

      const { data } = await api.post('/api/pets/report-pet', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      router.replace(`/pet/${data.pet.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo publicar el reporte.');
    } finally {
      setBusy(false);
    }
  };

  const goBack = () => {
    setError('');
    if (step === 'form') router.back();
    else setStep('form');
  };

  if (busy) return <ReportLoading mode={busy} audience={isLost ? 'lost' : 'found'} />;

  const header = {
    form: { title: 'Perdí / Encontré', sub: 'Subí una foto y la buscamos entre los reportes cercanos.' },
    results: {
      title: 'Posibles coincidencias',
      sub: isLost
        ? 'Estas mascotas fueron reportadas como encontradas. ¿Alguna es la tuya?'
        : 'Estas mascotas fueron reportadas como perdidas. ¿Alguna es la que encontraste?',
    },
    report: { title: 'Publicar reporte', sub: 'Completá los datos para que la comunidad pueda ayudarte.' },
  }[step];
  const { n: stepN, label: stepLabel } = STEP_INFO[step];
  const shortPlace = placeName ? placeName.split(',').slice(0, 2).join(',').trim() : '';
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const searchSummary = [translateType(type), translateColor(color), shortPlace].filter(Boolean).map(cap).join(' · ');

  const errorBox = error ? (
    <View style={[styles.errorBox, { backgroundColor: c.card }]}>
      <Info size={20} color={palette.coral} strokeWidth={2} />
      <Text style={[styles.errorText, { color: c.text }]}>{error}</Text>
    </View>
  ) : null;

  const photoPreview = (height) => (
    <View style={[styles.photo, { height, backgroundColor: c.arena }]}>
      {mainImage ? <Image source={{ uri: mainImage.uri }} style={StyleSheet.absoluteFill} /> : null}
      <Pressable onPress={pickMainImage} style={[styles.changePhoto, { backgroundColor: c.card }]}>
        <Camera size={16} color={c.text} strokeWidth={2} />
        <Text style={[styles.changePhotoText, { color: c.text }]}>Cambiar foto</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <CameraCapture
        visible={cameraVisible}
        onClose={() => setCameraVisible(false)}
        onCapture={setMainImage}
        onPickGallery={() => {
          setCameraVisible(false);
          openPicker('library');
        }}
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader
          color={sectionColors.reportar}
          title={header.title}
          subtitle={header.sub}
          onBack={goBack}
          style={styles.sectionHeader}
        >
          <View style={styles.progressWrap}>
            <View style={styles.progress}>
              {[1, 2, 3].map((i) => (
                <View key={i} style={[styles.progressSeg, i <= stepN && styles.progressSegOn]} />
              ))}
            </View>
            <Text style={styles.progressText}>Paso {stepN} de 3 · {stepLabel}</Text>
          </View>
        </SectionHeader>

        <View style={styles.body}>
          {/* ─── PASO 1: datos para buscar ─── */}
          {step === 'form' && (
            <>
              <View style={styles.section}>
                <Text style={[styles.label, { color: c.text }]}>Tu situación</Text>
                <View style={[styles.segmented, { backgroundColor: c.arena }]}>
                  {SITUATIONS.map((s) => {
                    const active = situation === s.value;
                    return (
                      <Pressable
                        key={s.value}
                        onPress={() => setSituation(s.value)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        style={[styles.segment, active && { backgroundColor: palette.noche }]}
                      >
                        <Text
                          style={[
                            styles.segmentText,
                            { color: active ? palette.crema : c.text, fontFamily: active ? fonts.bold : fonts.medium },
                          ]}
                        >
                          {s.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={[styles.label, { color: c.text }]}>Foto de la mascota</Text>
                {mainImage ? (
                  photoPreview(260)
                ) : (
                  <Pressable onPress={pickMainImage} style={[styles.upload, { backgroundColor: c.card }]}>
                    <View style={styles.uploadIcon}>
                      <Camera size={28} color={palette.arena} strokeWidth={2} />
                    </View>
                    <Text style={[styles.uploadTitle, { color: c.title }]}>Cámara o galería</Text>
                    <Text style={[styles.uploadText, { color: c.text }]}>
                      Solo la cara: orejas y hocico. Es lo que mejor la distingue para encontrar coincidencias.
                    </Text>
                  </Pressable>
                )}
              </View>

              <View style={styles.section}>
                <Text style={[styles.label, { color: c.text }]}>Especie</Text>
                <View style={styles.pills}>
                  {TYPES.map((t) => (
                    <Pill key={t.value} label={t.label} active={type === t.value} onPress={() => setType(t.value)} c={c} />
                  ))}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={[styles.label, { color: c.text }]}>Color predominante</Text>
                <View style={styles.pills}>
                  {COLORS.map((col) => (
                    <Pill key={col.value} label={col.label} active={color === col.value} onPress={() => setColor(col.value)} c={c}>
                      <ColorSwatch swatch={col.swatch} />
                    </Pill>
                  ))}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={[styles.label, { color: c.text }]}>
                  {isLost ? '¿Dónde se perdió?' : '¿Dónde la encontraste?'}
                </Text>
                <AddressSearch
                  c={c}
                  onSelect={(lat, lng, label) => {
                    setPosition({ lat, lng });
                    setPlaceName(label || '');
                  }}
                />
                <Button
                  variant="outline"
                  icon={Locate}
                  title="Usar mi ubicación actual"
                  loading={locating}
                  onPress={useCurrentLocation}
                  style={styles.locationBtn}
                  textStyle={styles.locationBtnText}
                />
                {position ? (
                  <>
                    <View style={[styles.mapWrap, { backgroundColor: c.arena }]} pointerEvents="none">
                      <PetMap lat={position.lat} lng={position.lng} isDark={c.isDark} style={styles.map} />
                    </View>
                    <View style={styles.row}>
                      <View style={styles.okDot}>
                        <Check size={12} color={palette.noche} strokeWidth={3} />
                      </View>
                      <Text style={[styles.okText, { color: c.text }]}>Ubicación seleccionada</Text>
                    </View>
                  </>
                ) : null}
              </View>

              {errorBox}

              <View style={styles.ctaBlock}>
                <Button
                  variant="dark"
                  icon={Search}
                  title="Buscar coincidencias"
                  onPress={handleSearch}
                  disabled={!mainImage}
                />
                {!mainImage ? (
                  <Text style={[styles.hintCenter, { color: c.text }]}>Agregá la foto para poder buscar.</Text>
                ) : null}
              </View>
            </>
          )}

          {/* ─── PASO 2: candidatas ─── */}
          {step === 'results' && (
            <>
              <View style={[styles.summary, { backgroundColor: c.card }]}>
                <Image source={{ uri: mainImage?.uri }} style={[styles.summaryImg, { backgroundColor: c.arena }]} />
                <View style={styles.flex}>
                  <Text style={[styles.label, { color: c.text }]}>Tu búsqueda</Text>
                  <Text style={[styles.summaryText, { color: c.text }]} numberOfLines={1}>{searchSummary}</Text>
                </View>
                <Pressable onPress={goBack} hitSlop={8}>
                  <Text style={[styles.summaryEdit, { color: c.text }]}>Editar</Text>
                </Pressable>
              </View>

              <Text style={[styles.text, { color: c.text }]}>
                {isLost
                  ? 'Tocá una para contactar a quien la encontró. Están ordenadas por parecido.'
                  : 'Tocá una para contactar a su dueño. Están ordenadas por parecido.'}
              </Text>

              <View style={styles.matches}>
                {matches.map((pet) => (
                  <MatchCard
                    key={pet.id}
                    pet={pet}
                    c={c}
                    onPress={() => router.push(`/pet/${pet.id}?origen=coincidencias`)}
                  />
                ))}
              </View>

              <View style={styles.noneBlock}>
                <Text style={[styles.text, { color: c.text }]}>
                  ¿Ninguna es {isLost ? 'tu mascota' : 'la que encontraste'}?
                </Text>
                <Pressable
                  onPress={() => setStep('report')}
                  style={({ pressed }) => [styles.outlineLink, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <Text style={[styles.outlineLinkText, { color: c.text }]}>Publicar reporte</Text>
                  <ChevronRight size={18} color={c.text} strokeWidth={2} />
                </Pressable>
              </View>
            </>
          )}

          {/* ─── PASO 3: completar reporte ─── */}
          {step === 'report' && (
            <>
              {matches.length === 0 ? (
                <EmptyState
                  icon={ScanSearch}
                  color={palette.coral}
                  title="Ninguna coincidencia por ahora"
                  text="No vimos mascotas parecidas cerca. Publicá el reporte y te avisamos si aparece una."
                  style={styles.noMatches}
                />
              ) : null}

              <View style={styles.section}>
                <Text style={[styles.label, { color: c.text }]}>Foto principal</Text>
                {photoPreview(220)}
              </View>

              <View style={styles.section}>
                <View style={styles.labelRow}>
                  <Text style={[styles.label, { color: c.text }]}>Más fotos</Text>
                  <Text style={[styles.counter, { color: c.text }]}>{extraImages.length} / 5</Text>
                </View>
                {/* El copy explica el beneficio concreto: cada foto extra se
                    vectoriza y suma una chance más de matchear. Sin esto la gente
                    lo lee como "opcional" y sube una sola. */}
                <Text style={[styles.small, { color: c.text }]}>
                  Cuantas más fotos subas (distintos ángulos y luz), más fácil es reconocerla. Recomendado: 3 o 4.
                </Text>
                <View style={styles.extraRow}>
                  {extraImages.map((img, i) => (
                    <View key={i} style={[styles.extraThumb, { backgroundColor: c.arena }]}>
                      <Image source={{ uri: img.uri }} style={styles.extraImg} />
                      <Pressable
                        onPress={() => removeExtra(i)}
                        accessibilityLabel="Quitar foto"
                        hitSlop={6}
                        style={[styles.extraRemove, { borderColor: c.bg }]}
                      >
                        <X size={12} color={palette.crema} strokeWidth={3} />
                      </Pressable>
                    </View>
                  ))}
                  {extraImages.length < 5 && (
                    <Pressable
                      onPress={pickExtraImages}
                      accessibilityLabel="Agregar fotos"
                      style={[styles.extraAdd, { backgroundColor: c.card }]}
                    >
                      <Plus size={24} color={c.text} strokeWidth={2} />
                    </Pressable>
                  )}
                </View>
              </View>

              {isLost && (
                <TextField
                  label="Nombre"
                  value={name}
                  onChangeText={setName}
                  placeholder="Nombre de la mascota"
                />
              )}

              <TextField
                label="Descripción"
                value={description}
                onChangeText={setDescription}
                placeholder="Señas particulares, zona, detalles"
                multiline
              />

              <TextField
                label="Contacto"
                icon={Phone}
                value={contactInfo}
                onChangeText={setContactInfo}
                placeholder="Teléfono o WhatsApp"
                keyboardType="phone-pad"
              />

              {errorBox}

              <Button variant="dark" icon={Send} title="Publicar reporte" onPress={handleSubmitReport} />
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionHeader: { paddingBottom: 24 },
  progressWrap: { gap: 8 },
  progress: { flexDirection: 'row', gap: 6 },
  progressSeg: { flex: 1, height: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.3)' },
  progressSegOn: { backgroundColor: palette.arena },
  progressText: {
    fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: palette.arena,
  },

  body: { paddingHorizontal: 20, paddingTop: 24, gap: 24 },
  section: { gap: 10 },
  label: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  counter: { fontFamily: fonts.bold, fontSize: 12 },
  text: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  small: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19 },

  segmented: { flexDirection: 'row', gap: 8, padding: 4, borderRadius: 18 },
  segment: { flex: 1, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  segmentText: { fontSize: 14 },

  upload: {
    height: 200,
    borderRadius: 24,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: palette.coral,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 40,
  },
  uploadIcon: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: palette.coral, alignItems: 'center', justifyContent: 'center',
  },
  uploadTitle: { fontFamily: fonts.display, fontSize: 17 },
  uploadText: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  photo: { borderRadius: 24, overflow: 'hidden' },
  changePhoto: {
    position: 'absolute', right: 12, bottom: 12, height: 40, paddingHorizontal: 14, borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  changePhotoText: { fontFamily: fonts.bold, fontSize: 13 },

  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { height: 40, paddingHorizontal: 20, borderRadius: 999, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  pillWithSwatch: { paddingLeft: 8, paddingRight: 14 },
  pillText: { fontSize: 14 },
  swatch: {
    width: 22, height: 22, borderRadius: 11, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(26,26,46,0.15)',
  },
  split: { flexDirection: 'row' },
  spot: { position: 'absolute', borderRadius: 999, backgroundColor: '#1F1F1F' },
  stripes: {
    position: 'absolute', top: -8, left: -8, right: -8, bottom: -8, flexDirection: 'row', gap: 3,
    transform: [{ rotate: '45deg' }],
  },
  stripe: { width: 3 },

  locationBtn: { height: 48, borderRadius: 16 },
  locationBtnText: { fontSize: 14 },
  mapWrap: { height: 170, borderRadius: 20, overflow: 'hidden' },
  map: { flex: 1 },
  okDot: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: palette.teal, alignItems: 'center', justifyContent: 'center',
  },
  okText: { fontFamily: fonts.bold, fontSize: 13 },

  ctaBlock: { gap: 10 },
  hintCenter: { fontFamily: fonts.regular, fontSize: 13, textAlign: 'center' },
  errorBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 18,
    borderWidth: 2, borderColor: palette.coral,
  },
  errorText: { flex: 1, fontFamily: fonts.bold, fontSize: 14, lineHeight: 20 },
  noMatches: { paddingVertical: 8 },

  summary: { borderRadius: 20, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  summaryImg: { width: 56, height: 56, borderRadius: 14 },
  summaryText: { fontFamily: fonts.bold, fontSize: 14, marginTop: 2 },
  summaryEdit: { fontFamily: fonts.bold, fontSize: 13, textDecorationLine: 'underline' },
  matches: { gap: 12 },
  match: { borderRadius: 24, padding: 12, flexDirection: 'row', gap: 14 },
  matchImg: { width: 104, height: 104, borderRadius: 18 },
  matchBody: { flex: 1, minWidth: 0, gap: 4 },
  matchTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  matchMeta: { flexShrink: 1, fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.66, textTransform: 'uppercase' },
  matchPct: { fontFamily: fonts.display, fontSize: 26, marginTop: 2 },
  matchPctLabel: { fontFamily: fonts.bold, fontSize: 13 },
  bar: { height: 6, borderRadius: 999, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999, backgroundColor: palette.coral },
  matchFoot: {
    marginTop: 'auto', paddingTop: 8, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'flex-end',
    alignItems: 'center', gap: 2,
  },
  matchContact: { fontFamily: fonts.bold, fontSize: 13 },
  noneBlock: { alignItems: 'center', gap: 10, marginTop: 8 },
  outlineLink: {
    alignSelf: 'stretch', height: 52, borderWidth: 2, borderColor: palette.noche, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  outlineLinkText: { fontFamily: fonts.bold, fontSize: 15 },

  extraRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  extraThumb: { width: 76, height: 76, borderRadius: 16 },
  extraImg: { width: '100%', height: '100%', borderRadius: 16 },
  extraRemove: {
    position: 'absolute', top: -6, right: -6, width: 26, height: 26, borderRadius: 13, borderWidth: 2,
    backgroundColor: palette.noche, alignItems: 'center', justifyContent: 'center',
  },
  extraAdd: {
    width: 76, height: 76, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', borderColor: palette.coral,
    alignItems: 'center', justifyContent: 'center',
  },
});
