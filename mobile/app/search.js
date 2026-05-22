import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  ScrollView,
  StyleSheet,
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
  { value: 'found', label: 'La encontré' },
  { value: 'lost', label: 'La perdí' },
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
const RADII = [
  { value: 5, label: '5 km' },
  { value: 10, label: '10 km' },
  { value: 20, label: '20 km' },
  { value: 50, label: '50 km' },
];

export default function Search() {
  const c = useTheme();
  const [mainImage, setMainImage] = useState(null);
  const [situation, setSituation] = useState('found');
  const [type, setType] = useState('dog');
  const [color, setColor] = useState('black');
  const [radius, setRadius] = useState(10);
  const [position, setPosition] = useState(null);
  const [results, setResults] = useState([]);
  const [message, setMessage] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [cameraVisible, setCameraVisible] = useState(false);

  const pickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!result.canceled) setMainImage(result.assets[0]);
  };

  const pickImage = () => {
    Alert.alert('Foto de la mascota', 'Elegí de dónde tomarla', [
      { text: 'Cámara', onPress: () => setCameraVisible(true) },
      { text: 'Galería', onPress: pickFromGallery },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const useCurrentLocation = async () => {
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
    }
  };

  const handleSearch = async () => {
    if (!mainImage) return setError('Falta la foto de la mascota.');
    if (!position) return setError('Falta la ubicación. Tocá "Usar mi ubicación".');

    setError('');
    setMessage('');
    setResults([]);
    setSearching(true);

    // Buscamos el estado opuesto: si la encontré, busco entre las perdidas.
    const searchStatus = situation === 'lost' ? 'found' : 'lost';

    try {
      const formData = new FormData();
      formData.append('image', { uri: mainImage.uri, name: 'photo.jpg', type: 'image/jpeg' });
      formData.append('status', searchStatus);
      formData.append('type', type);
      formData.append('color', color);
      formData.append('lat', String(position.lat));
      formData.append('lng', String(position.lng));
      formData.append('searchRatio', String(radius));

      const { data } = await api.post('/api/pets/search-pet', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResults(data);
      setMessage(
        data.length === 0
          ? 'Sin coincidencias. Probá ampliar el radio o reencuadrar la foto.'
          : `Se encontraron ${data.length} posibles coincidencias.`
      );
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo completar la búsqueda.');
    } finally {
      setSearching(false);
    }
  };

  if (searching) return <ReportLoading />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}>
      <CameraCapture
        visible={cameraVisible}
        onClose={() => setCameraVisible(false)}
        onCapture={setMainImage}
      />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={[styles.back, { color: c.subtitle }]}>‹ Volver</Text>
          </Pressable>
          <Text style={[styles.title, { color: c.title }]}>Búsqueda visual</Text>
        </View>

        {/* Resultados (arriba, para no scrollear) */}
        {message ? <Text style={[styles.message, { color: '#22C55E' }]}>{message}</Text> : null}
        {results.length > 0 && (
          <View style={styles.results}>
            {results.map((pet) => (
              <PetCard key={pet.id} pet={pet} onPress={() => router.push(`/pet/${pet.id}`)} />
            ))}
          </View>
        )}

        {/* Foto */}
        <Text style={[styles.label, { color: c.label }]}>Foto de la mascota</Text>
        {mainImage ? (
          <View>
            <Image source={{ uri: mainImage.uri }} style={styles.mainImage} />
            <Pressable onPress={pickImage} style={[styles.changePhoto, { backgroundColor: c.inputBg }]}>
              <Text style={[styles.changePhotoText, { color: c.text }]}>Cambiar foto</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={pickImage} style={[styles.uploadBox, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
            <Text style={[styles.uploadPlus, { color: c.subtitle }]}>＋</Text>
            <Text style={[styles.uploadText, { color: c.subtitle }]}>Cámara o galería</Text>
          </Pressable>
        )}

        <Text style={[styles.label, { color: c.label }]}>Tu situación</Text>
        <ChipGroup options={SITUATIONS} value={situation} onChange={setSituation} c={c} />

        <Text style={[styles.label, { color: c.label }]}>Especie</Text>
        <ChipGroup options={TYPES} value={type} onChange={setType} c={c} />

        <Text style={[styles.label, { color: c.label }]}>Color predominante</Text>
        <ChipGroup options={COLORS} value={color} onChange={setColor} c={c} />

        <Text style={[styles.label, { color: c.label }]}>Radio de búsqueda</Text>
        <ChipGroup options={RADII} value={radius} onChange={setRadius} c={c} />

        <Text style={[styles.label, { color: c.label }]}>¿Dónde se perdió?</Text>
        <Text style={[styles.locationHint, { color: c.subtitle }]}>
          Buscá la dirección o barrio, o usá tu ubicación actual.
        </Text>
        <AddressSearch c={c} onSelect={(lat, lng) => setPosition({ lat, lng })} />
        <Pressable
          onPress={useCurrentLocation}
          style={[styles.locationBtn, { borderColor: c.cardBorder, backgroundColor: c.card }]}
        >
          <Text style={[styles.locationText, { color: c.text }]}>📍 Usar mi ubicación actual</Text>
        </Pressable>
        {position ? (
          <>
            <View style={[styles.mapWrap, { borderColor: c.cardBorder }]} pointerEvents="none">
              <PetMap lat={position.lat} lng={position.lng} isDark={c.isDark} style={styles.map} />
            </View>
            <Text style={[styles.locationOk, { color: '#22C55E' }]}>✓ Ubicación seleccionada</Text>
          </>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.submit, { backgroundColor: c.primary }, !mainImage && styles.disabled]}
          onPress={handleSearch}
          disabled={!mainImage}
        >
          <Text style={[styles.submitText, { color: c.primaryText }]}>Ejecutar búsqueda</Text>
        </Pressable>
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
  locationHint: { fontSize: 13, marginBottom: 10, marginTop: -2 },
  mapWrap: { height: 240, borderRadius: 20, overflow: 'hidden', borderWidth: 1 },
  map: { flex: 1 },
  locationBtn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center', borderWidth: 1, marginTop: 10 },
  locationText: { fontWeight: '600', fontSize: 15 },
  locationOk: { textAlign: 'center', fontWeight: '700', fontSize: 13, marginTop: 8 },
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
  message: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  results: { marginTop: 24 },
});
