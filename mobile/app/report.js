import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import api from '../src/lib/api';
import { useTheme } from '../src/lib/theme';
import CameraCapture from '../src/components/CameraCapture';
import ReportLoading from '../src/components/ReportLoading';
import ChipGroup from '../src/components/ChipGroup';
import PetCard from '../src/components/PetCard';
import PetMap from '../src/components/PetMap';
import AddressSearch from '../src/components/AddressSearch';

const SITUATIONS = [
  { value: 'lost', label: 'Perdí mi mascota' },
  { value: 'found', label: 'Encontré una mascota' },
];
const TYPES = [
  { value: 'dog', label: 'Perro' },
  { value: 'cat', label: 'Gato' },
];
const COLORS = [
  { value: 'black', label: 'Negro' },
  { value: 'white', label: 'Blanco' },
  { value: 'brown', label: 'Marrón' },
  { value: 'golden', label: 'Dorado' },
  { value: 'mixed', label: 'Mixto' },
  { value: 'orange', label: 'Naranja' },
  { value: 'grey', label: 'Gris' },
  { value: 'spotted', label: 'Manchado' },
  { value: 'striped', label: 'Atigrado' },
];

// Radio generoso para la pre-búsqueda: preferimos mostrar de más que perder un match.
const SEARCH_RADIUS_KM = 50;

export default function Find() {
  const c = useTheme();
  const [step, setStep] = useState('form'); // 'form' | 'results' | 'report'
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Datos para buscar
  const [situation, setSituation] = useState('lost');
  const [mainImage, setMainImage] = useState(null);
  const [type, setType] = useState('dog');
  const [color, setColor] = useState('black');
  const [position, setPosition] = useState(null);
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
      Alert.alert('Permiso necesario', 'Necesitamos acceso para cargar la foto.');
      return;
    }
    const launch = source === 'camera' ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
    const result = await launch({ allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!result.canceled) setMainImage(result.assets[0]);
  };

  const openGallery = () => {
    // El recortador nativo no se puede personalizar, así que avisamos justo antes.
    Alert.alert(
      'Recortá la cara del animal',
      'En la pantalla de recorte que sigue, dejá dentro del cuadro SOLO las orejas y el hocico.',
      [{ text: 'Entendido', onPress: () => openPicker('library') }]
    );
  };

  const pickMainImage = () => {
    Alert.alert(
      'Foto de la cara del animal',
      'Que entren solo las orejas y el hocico. Después vas a poder recortarla.',
      [
        { text: 'Cámara', onPress: () => setCameraVisible(true) },
        { text: 'Galería', onPress: openGallery },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
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
        Alert.alert('Permiso necesario', 'Necesitamos tu ubicación para centrar el mapa.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setPosition({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    } catch {
      Alert.alert('Error', 'No pudimos obtener tu ubicación.');
    } finally {
      setLocating(false);
    }
  };

  const handleSearch = async () => {
    if (!mainImage) return setError('Falta la foto de la mascota.');
    if (!position) return setError('Falta la ubicación.');

    setError('');
    setBusy(true);
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
    setBusy(true);
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

  if (busy) return <ReportLoading />;

  const headerTitle =
    step === 'results' ? 'Posibles coincidencias' : step === 'report' ? 'Publicar reporte' : 'Perdí / Encontré';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}>
      <CameraCapture
        visible={cameraVisible}
        onClose={() => setCameraVisible(false)}
        onCapture={setMainImage}
      />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Pressable onPress={goBack} hitSlop={12}>
            <Text style={[styles.back, { color: c.subtitle }]}>‹ Volver</Text>
          </Pressable>
          <Text style={[styles.title, { color: c.title }]}>{headerTitle}</Text>
        </View>

        {/* ─── PASO 1: datos para buscar ─── */}
        {step === 'form' && (
          <>
            <Text style={[styles.label, { color: c.label }]}>Tu situación</Text>
            <ChipGroup options={SITUATIONS} value={situation} onChange={setSituation} c={c} />

            <Text style={[styles.label, { color: c.label }]}>Foto de la mascota</Text>
            <Text style={[styles.locationHint, { color: c.subtitle }]}>
              Solo la cara del animal: orejas y hocico. Es lo que mejor lo distingue para el match.
            </Text>
            {mainImage ? (
              <View>
                <Image source={{ uri: mainImage.uri }} style={styles.mainImage} />
                <Pressable onPress={pickMainImage} style={[styles.changePhoto, { backgroundColor: c.inputBg }]}>
                  <Text style={[styles.changePhotoText, { color: c.text }]}>Cambiar foto</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={pickMainImage} style={[styles.uploadBox, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
                <Text style={[styles.uploadPlus, { color: c.subtitle }]}>＋</Text>
                <Text style={[styles.uploadText, { color: c.subtitle }]}>Cámara o galería</Text>
              </Pressable>
            )}

            <Text style={[styles.label, { color: c.label }]}>Especie</Text>
            <ChipGroup options={TYPES} value={type} onChange={setType} c={c} />

            <Text style={[styles.label, { color: c.label }]}>Color predominante</Text>
            <ChipGroup options={COLORS} value={color} onChange={setColor} c={c} />

            <Text style={[styles.label, { color: c.label }]}>
              {isLost ? '¿Dónde se perdió?' : '¿Dónde la encontraste?'}
            </Text>
            <Text style={[styles.locationHint, { color: '#22C55E' }]}>
              Buscá la dirección o barrio, o usá tu ubicación actual.
            </Text>
            <AddressSearch c={c} onSelect={(lat, lng) => setPosition({ lat, lng })} />
            <Pressable
              onPress={useCurrentLocation}
              style={[styles.locationBtn, { borderColor: '#22C55E', backgroundColor: c.card }]}
            >
              {locating ? (
                <ActivityIndicator color="#22C55E" />
              ) : (
                <Text style={[styles.locationText, { color: '#22C55E' }]}>📍 Usar mi ubicación actual</Text>
              )}
            </Pressable>
            {position ? (
              <>
                <View style={[styles.mapWrap, { borderColor: c.cardBorder }]} pointerEvents="none">
                  <PetMap lat={position.lat} lng={position.lng} isDark={c.isDark} style={styles.map} />
                </View>
                <Text style={styles.locationOk}>✓ Ubicación seleccionada</Text>
              </>
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              style={[styles.submit, { backgroundColor: c.primary }, !mainImage && styles.disabled]}
              onPress={handleSearch}
              disabled={!mainImage}
            >
              <Text style={[styles.submitText, { color: c.primaryText }]}>Buscar coincidencias</Text>
            </Pressable>
            {!mainImage ? (
              <Text style={[styles.hintText, { color: c.subtitle }]}>
                Agregá la foto para poder buscar.
              </Text>
            ) : null}
          </>
        )}

        {/* ─── PASO 2: candidatas ─── */}
        {step === 'results' && (
          <>
            <Text style={[styles.resultsSub, { color: c.subtitle }]}>
              {isLost
                ? 'Estas mascotas fueron reportadas como encontradas. ¿Alguna es la tuya? Tocala para contactar a quien la encontró.'
                : 'Estas mascotas fueron reportadas como perdidas. ¿Alguna es la que encontraste? Tocala para contactar a su dueño.'}
            </Text>
            <View style={styles.results}>
              {matches.map((pet) => (
                <PetCard key={pet.id} pet={pet} onPress={() => router.push(`/pet/${pet.id}`)} />
              ))}
            </View>

            <Pressable
              style={[styles.secondaryBtn, { borderColor: c.cardBorder }]}
              onPress={() => setStep('report')}
            >
              <Text style={[styles.secondaryBtnText, { color: c.text }]}>
                Ninguna es {isLost ? 'mi mascota' : 'la que encontré'} → Publicar reporte
              </Text>
            </Pressable>
          </>
        )}

        {/* ─── PASO 3: completar reporte ─── */}
        {step === 'report' && (
          <>
            <Text
              style={[
                styles.resultsSub,
                matches.length === 0 ? styles.noMatch : { color: c.subtitle },
              ]}
            >
              {matches.length === 0
                ? 'No encontramos coincidencias por ahora. Publicá el reporte así queda visible para la comunidad.'
                : 'Completá los datos para publicar el reporte.'}
            </Text>

            <Text style={[styles.label, { color: c.label }]}>Foto principal</Text>
            {mainImage && <Image source={{ uri: mainImage.uri }} style={styles.mainImage} />}
            <Pressable onPress={pickMainImage} style={[styles.changePhoto, { backgroundColor: c.inputBg }]}>
              <Text style={[styles.changePhotoText, { color: c.text }]}>Cambiar foto</Text>
            </Pressable>

            <Text style={[styles.label, { color: c.label }]}>Fotos extra (opcional)</Text>
            <View style={styles.extraRow}>
              {extraImages.map((img, i) => (
                <Pressable key={i} onPress={() => removeExtra(i)} style={styles.extraThumbWrap}>
                  <Image source={{ uri: img.uri }} style={styles.extraThumb} />
                  <View style={styles.extraRemove}>
                    <Text style={styles.extraRemoveText}>✕</Text>
                  </View>
                </Pressable>
              ))}
              {extraImages.length < 5 && (
                <Pressable
                  onPress={pickExtraImages}
                  style={[styles.extraAdd, { borderColor: c.cardBorder, backgroundColor: c.card }]}
                >
                  <Text style={[styles.uploadPlus, { color: c.subtitle }]}>＋</Text>
                </Pressable>
              )}
            </View>

            {isLost && (
              <>
                <Text style={[styles.label, { color: c.label }]}>Nombre</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: c.inputBg, color: c.inputText }]}
                  value={name}
                  onChangeText={setName}
                  placeholder="Nombre de la mascota"
                  placeholderTextColor={c.label}
                />
              </>
            )}

            <Text style={[styles.label, { color: c.label }]}>Descripción</Text>
            <TextInput
              style={[styles.input, styles.multiline, { backgroundColor: c.inputBg, color: c.inputText }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Señas particulares, zona, detalles"
              placeholderTextColor={c.label}
              multiline
            />

            <Text style={[styles.label, { color: c.label }]}>Contacto</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.inputBg, color: c.inputText }]}
              value={contactInfo}
              onChangeText={setContactInfo}
              placeholder="Teléfono o WhatsApp"
              placeholderTextColor={c.label}
              keyboardType="phone-pad"
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              style={[styles.submit, { backgroundColor: c.primary }]}
              onPress={handleSubmitReport}
            >
              <Text style={[styles.submitText, { color: c.primaryText }]}>Publicar reporte</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 48 },
  header: { gap: 4, marginBottom: 12 },
  back: { fontSize: 15, fontWeight: '600' },
  title: { fontSize: 34, fontWeight: '700', letterSpacing: -0.5 },
  label: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 8,
  },
  mainImage: { width: '100%', aspectRatio: 1, borderRadius: 24, backgroundColor: '#E5E7EB' },
  changePhoto: { borderRadius: 16, paddingVertical: 12, alignItems: 'center', marginTop: 10 },
  changePhotoText: { fontWeight: '600', fontSize: 13 },
  uploadBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 24,
    paddingVertical: 48,
    alignItems: 'center',
    gap: 6,
  },
  uploadPlus: { fontSize: 28, fontWeight: '300' },
  uploadText: { fontSize: 13, fontWeight: '500' },
  extraRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  extraThumbWrap: { position: 'relative' },
  extraThumb: { width: 72, height: 72, borderRadius: 14, backgroundColor: '#E5E7EB' },
  extraRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  extraRemoveText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  extraAdd: {
    width: 72,
    height: 72,
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: { borderRadius: 16, padding: 16, fontSize: 16 },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  locationHint: { fontSize: 13, marginBottom: 10, marginTop: -2 },
  mapWrap: { height: 240, borderRadius: 20, overflow: 'hidden', borderWidth: 1, marginTop: 10 },
  map: { flex: 1 },
  locationBtn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center', borderWidth: 1, marginTop: 10 },
  locationText: { fontWeight: '600', fontSize: 15 },
  locationOk: { textAlign: 'center', fontWeight: '700', fontSize: 13, marginTop: 8, color: '#22C55E' },
  resultsSub: { fontSize: 14, lineHeight: 20, marginBottom: 4 },
  noMatch: { color: '#EF4444', fontWeight: '700' },
  results: { marginTop: 12 },
  secondaryBtn: { borderRadius: 999, paddingVertical: 16, alignItems: 'center', borderWidth: 1, marginTop: 16 },
  secondaryBtnText: { fontWeight: '700', fontSize: 14 },
  error: {
    color: '#EF4444',
    textAlign: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 16,
    marginTop: 16,
    fontSize: 13,
    fontWeight: '600',
  },
  submit: { borderRadius: 999, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  submitText: { fontWeight: '700', fontSize: 16 },
  disabled: { opacity: 0.5 },
  hintText: { textAlign: 'center', fontSize: 12, marginTop: 10 },
});
