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

const STATUSES = [
  { value: 'found', label: 'Encontrado' },
  { value: 'lost', label: 'Perdido' },
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

function ChipGroup({ options, value, onChange, c }) {
  return (
    <View style={styles.chipRow}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[
              styles.chip,
              { backgroundColor: active ? c.primary : c.card, borderColor: active ? c.primary : c.cardBorder },
            ]}
          >
            <Text style={[styles.chipText, { color: active ? c.primaryText : c.text }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function Report() {
  const c = useTheme();
  const [mainImage, setMainImage] = useState(null);
  const [extraImages, setExtraImages] = useState([]);
  const [status, setStatus] = useState('found');
  const [type, setType] = useState('dog');
  const [color, setColor] = useState('black');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [position, setPosition] = useState(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

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

  const pickMainImage = () => {
    Alert.alert('Foto de la mascota', 'Elegí de dónde tomarla', [
      { text: 'Cámara', onPress: () => openPicker('camera') },
      { text: 'Galería', onPress: () => openPicker('library') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
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

  const getLocation = async () => {
    setLocating(true);
    try {
      const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
      if (permStatus !== 'granted') {
        Alert.alert('Permiso necesario', 'Necesitamos tu ubicación para el reporte.');
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

  const handleSubmit = async () => {
    if (!mainImage) return setError('Falta la foto de la mascota.');
    if (!contactInfo.trim()) return setError('El contacto es obligatorio.');
    if (!position) return setError('Falta la ubicación. Tocá "Usar mi ubicación".');
    if (description.trim().length < 3) return setError('La descripción debe tener al menos 3 caracteres.');

    setError('');
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('image', { uri: mainImage.uri, name: 'photo.jpg', type: 'image/jpeg' });
      extraImages.forEach((img, i) =>
        formData.append('extra_images', { uri: img.uri, name: `extra_${i}.jpg`, type: 'image/jpeg' })
      );
      formData.append('type', type);
      formData.append('color', color);
      formData.append('status', status);
      formData.append('contact_info', contactInfo.trim());
      formData.append('description', description.trim());
      formData.append('lat', String(position.lat));
      formData.append('lng', String(position.lng));
      if (status === 'lost' && name.trim()) formData.append('name', name.trim());

      const { data } = await api.post('/api/pets/report-pet', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      router.replace(`/pet/${data.pet.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo publicar el reporte.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={[styles.back, { color: c.subtitle }]}>‹ Volver</Text>
          </Pressable>
          <Text style={[styles.title, { color: c.title }]}>Reportar</Text>
        </View>

        {/* Foto principal */}
        <Text style={[styles.label, { color: c.label }]}>Foto de la mascota</Text>
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

        {/* Galería extra */}
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

        {/* Estado / Tipo */}
        <Text style={[styles.label, { color: c.label }]}>Estado</Text>
        <ChipGroup options={STATUSES} value={status} onChange={setStatus} c={c} />

        <Text style={[styles.label, { color: c.label }]}>Especie</Text>
        <ChipGroup options={TYPES} value={type} onChange={setType} c={c} />

        <Text style={[styles.label, { color: c.label }]}>Color predominante</Text>
        <ChipGroup options={COLORS} value={color} onChange={setColor} c={c} />

        {/* Nombre (solo perdido) */}
        {status === 'lost' && (
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

        {/* Ubicación */}
        <Text style={[styles.label, { color: c.label }]}>Ubicación</Text>
        <Pressable
          onPress={getLocation}
          style={[styles.locationBtn, { borderColor: c.cardBorder, backgroundColor: c.card }]}
        >
          {locating ? (
            <ActivityIndicator color={c.text} />
          ) : (
            <Text style={[styles.locationText, { color: position ? '#22C55E' : c.text }]}>
              {position ? '✓ Ubicación capturada' : '📍 Usar mi ubicación'}
            </Text>
          )}
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.submit, { backgroundColor: c.primary }, submitting && styles.disabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={c.primaryText} />
          ) : (
            <Text style={[styles.submitText, { color: c.primaryText }]}>Publicar reporte</Text>
          )}
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '600' },
  input: { borderRadius: 16, padding: 16, fontSize: 16 },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  locationBtn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center', borderWidth: 1 },
  locationText: { fontWeight: '600', fontSize: 15 },
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
});
