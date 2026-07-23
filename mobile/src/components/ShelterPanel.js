import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, Image, Pressable, ScrollView, TextInput, StyleSheet,
  ActivityIndicator, Alert, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useDispatch } from 'react-redux';
import * as ImagePicker from 'expo-image-picker';
import api from '../lib/api';
import { useTheme } from '../lib/theme';
import { clearCredentials } from '../store/userSlice';
import MenuButton from './MenuButton';
import LinkedAccounts from './LinkedAccounts';

const MAX_PHOTOS = 6;
const SPECIES_LABEL = { dog: 'Perro', cat: 'Gato', other: 'Otro' };
const SIZE_LABEL = { small: 'Chico', medium: 'Mediano', large: 'Grande' };
const AGE_LABEL = { puppy: 'Cachorro', young: 'Joven', adult: 'Adulto', senior: 'Senior', unknown: '' };

const SELECTS = {
  species: [
    { key: 'dog', label: 'Perro' },
    { key: 'cat', label: 'Gato' },
    { key: 'other', label: 'Otro' },
  ],
  sex: [
    { key: 'unknown', label: 'Sin dato' },
    { key: 'male', label: 'Macho' },
    { key: 'female', label: 'Hembra' },
  ],
  age_group: [
    { key: 'unknown', label: 'Sin dato' },
    { key: 'puppy', label: 'Cachorro' },
    { key: 'young', label: 'Joven' },
    { key: 'adult', label: 'Adulto' },
    { key: 'senior', label: 'Senior' },
  ],
  size: [
    { key: 'small', label: 'Chico' },
    { key: 'medium', label: 'Mediano' },
    { key: 'large', label: 'Grande' },
  ],
};

function ChipSelect({ options, value, onChange, c }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {options.map((o) => {
        const active = value === o.key;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={[
              styles.chip,
              active ? { backgroundColor: '#1A1A2E', borderColor: '#1A1A2E' } : { backgroundColor: c.card, borderColor: c.cardBorder },
            ]}
          >
            <Text style={[styles.chipText, { color: active ? '#fff' : c.title }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Form para crear/editar una publicación de adopción.
function AdoptionPetForm({ pet, c, onCancel, onSaved }) {
  const editing = !!pet;
  const [form, setForm] = useState({
    name: pet?.name || '',
    species: pet?.species || 'dog',
    sex: pet?.sex || 'unknown',
    age_group: pet?.age_group || 'unknown',
    size: pet?.size || 'medium',
    color: pet?.color || '',
    description: pet?.description || '',
    vaccinated: !!pet?.vaccinated,
    neutered: !!pet?.neutered,
  });
  const [photos, setPhotos] = useState(() => Array.isArray(pet?.photos) ? pet.photos : []);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const upd = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tus fotos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('photo', { uri: asset.uri, name: 'pet.jpg', type: 'image/jpeg' });
      const { data } = await api.post('/api/adoption-pets/upload-photo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPhotos((p) => [...p, data.url]);
    } catch (e) {
      setError(e.response?.data?.error || 'No se pudo subir la foto.');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (url) => setPhotos((p) => p.filter((x) => x !== url));

  const save = async () => {
    if (photos.length === 0) return setError('Subí al menos una foto.');
    setSaving(true);
    setError('');
    try {
      const body = { ...form, photos };
      if (editing) {
        await api.patch(`/api/adoption-pets/${pet.id}`, body);
      } else {
        await api.post('/api/adoption-pets', body);
      }
      onSaved();
    } catch (e) {
      setError(e.response?.data?.error || 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.formCard, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text style={[styles.formTitle, { color: c.title }]}>
          {editing ? 'Editar publicación' : 'Nueva publicación'}
        </Text>
        <Pressable onPress={onCancel} hitSlop={10}>
          <Text style={[styles.cancel, { color: c.subtitle }]}>Cancelar</Text>
        </Pressable>
      </View>

      <Text style={[styles.label, { color: c.subtitle }]}>FOTOS *</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
        {photos.map((url) => (
          <Pressable key={url} onPress={() => removePhoto(url)} style={styles.photoWrap}>
            <Image source={{ uri: url }} style={styles.photoImg} />
            <View style={styles.photoRemove}>
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>×</Text>
            </View>
          </Pressable>
        ))}
        {photos.length < MAX_PHOTOS ? (
          <Pressable onPress={pickPhoto} disabled={uploading} style={[styles.photoAdd, { borderColor: c.cardBorder }]}>
            <Text style={[styles.photoAddText, { color: c.subtitle }]}>
              {uploading ? '…' : '+ Foto'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <Text style={[styles.label, { color: c.subtitle, marginTop: 20 }]}>NOMBRE</Text>
      <TextInput
        value={form.name}
        onChangeText={upd('name')}
        placeholder="Firulais"
        placeholderTextColor={c.subtitle}
        style={[styles.input, { color: c.title, borderColor: c.cardBorder, backgroundColor: c.bg }]}
        maxLength={60}
      />

      <Text style={[styles.label, { color: c.subtitle, marginTop: 20 }]}>ESPECIE *</Text>
      <View style={{ marginTop: 8 }}>
        <ChipSelect options={SELECTS.species} value={form.species} onChange={upd('species')} c={c} />
      </View>
      <Text style={[styles.label, { color: c.subtitle, marginTop: 16 }]}>SEXO</Text>
      <View style={{ marginTop: 8 }}>
        <ChipSelect options={SELECTS.sex} value={form.sex} onChange={upd('sex')} c={c} />
      </View>
      <Text style={[styles.label, { color: c.subtitle, marginTop: 16 }]}>EDAD</Text>
      <View style={{ marginTop: 8 }}>
        <ChipSelect options={SELECTS.age_group} value={form.age_group} onChange={upd('age_group')} c={c} />
      </View>
      <Text style={[styles.label, { color: c.subtitle, marginTop: 16 }]}>TAMAÑO</Text>
      <View style={{ marginTop: 8 }}>
        <ChipSelect options={SELECTS.size} value={form.size} onChange={upd('size')} c={c} />
      </View>

      <Text style={[styles.label, { color: c.subtitle, marginTop: 20 }]}>COLOR</Text>
      <TextInput
        value={form.color}
        onChangeText={upd('color')}
        placeholder="Marrón, blanco…"
        placeholderTextColor={c.subtitle}
        style={[styles.input, { color: c.title, borderColor: c.cardBorder, backgroundColor: c.bg }]}
        maxLength={30}
      />

      <Text style={[styles.label, { color: c.subtitle, marginTop: 20 }]}>DESCRIPCIÓN</Text>
      <TextInput
        value={form.description}
        onChangeText={upd('description')}
        placeholder="Contá su historia y personalidad."
        placeholderTextColor={c.subtitle}
        multiline
        style={[styles.input, styles.textarea, { color: c.title, borderColor: c.cardBorder, backgroundColor: c.bg }]}
        maxLength={2000}
      />

      <View style={styles.switchRow}>
        <Text style={[styles.switchLabel, { color: c.title }]}>Vacunado</Text>
        <Switch value={form.vaccinated} onValueChange={upd('vaccinated')} />
      </View>
      <View style={styles.switchRow}>
        <Text style={[styles.switchLabel, { color: c.title }]}>Castrado</Text>
        <Switch value={form.neutered} onValueChange={upd('neutered')} />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        onPress={save}
        disabled={saving || uploading}
        style={[styles.saveBtn, (saving || uploading) && { opacity: 0.5 }]}
      >
        <Text style={styles.saveBtnText}>{saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Publicar'}</Text>
      </Pressable>
    </View>
  );
}

function ShelterEditForm({ shelter, c, onSaved }) {
  const [form, setForm] = useState({
    name: shelter.name || '',
    city: shelter.city || '',
    address: shelter.address || '',
    phone: shelter.phone || '',
    whatsapp: shelter.whatsapp || '',
    website: shelter.website || '',
    instagram: shelter.instagram || '',
    email: shelter.email || '',
    bio: shelter.bio || '',
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const upd = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    setMsg('');
    try {
      const body = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ''));
      const { data } = await api.patch('/api/shelters/me', body);
      onSaved(data);
      setMsg('✓ Guardado');
    } catch (e) {
      setMsg(e.response?.data?.error || 'No se pudo guardar.');
    } finally { setSaving(false); }
  };

  const fields = [
    ['name', 'NOMBRE *', 120],
    ['city', 'CIUDAD', 80],
    ['address', 'DIRECCIÓN', 200],
    ['phone', 'TELÉFONO', 30],
    ['whatsapp', 'WHATSAPP', 30],
    ['email', 'EMAIL', 150],
    ['website', 'SITIO WEB', 200],
    ['instagram', 'INSTAGRAM (sin @)', 80],
  ];

  return (
    <View style={[styles.formCard, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
      {fields.map(([k, label, max]) => (
        <View key={k} style={{ marginBottom: 14 }}>
          <Text style={[styles.label, { color: c.subtitle }]}>{label}</Text>
          <TextInput
            value={form[k]}
            onChangeText={upd(k)}
            placeholderTextColor={c.subtitle}
            style={[styles.input, { color: c.title, borderColor: c.cardBorder, backgroundColor: c.bg }]}
            maxLength={max}
          />
        </View>
      ))}
      <Text style={[styles.label, { color: c.subtitle }]}>BIO</Text>
      <TextInput
        value={form.bio}
        onChangeText={upd('bio')}
        multiline
        style={[styles.input, styles.textarea, { color: c.title, borderColor: c.cardBorder, backgroundColor: c.bg }]}
        maxLength={2000}
      />
      <Pressable onPress={save} disabled={saving} style={[styles.saveBtn, saving && { opacity: 0.5 }]}>
        <Text style={styles.saveBtnText}>{saving ? 'Guardando…' : 'Guardar cambios'}</Text>
      </Pressable>
      {msg ? <Text style={{ textAlign: 'center', marginTop: 10, color: c.subtitle, fontSize: 12 }}>{msg}</Text> : null}
    </View>
  );
}

function PetRow({ pet, c, onEdit, onMarkAdopted, onDelete }) {
  const adopted = !!pet.adopted_at;
  return (
    <View style={[styles.petRow, { backgroundColor: c.card, borderColor: c.cardBorder, opacity: adopted ? 0.6 : 1 }]}>
      {pet.photos?.[0] ? (
        <Image source={{ uri: pet.photos[0] }} style={styles.petThumb} />
      ) : (
        <View style={[styles.petThumb, { backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ fontSize: 24 }}>🐾</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={[styles.petName, { color: c.title }]} numberOfLines={1}>{pet.name || 'Sin nombre'}</Text>
        <Text style={[styles.petMeta, { color: c.subtitle }]} numberOfLines={1}>
          {SPECIES_LABEL[pet.species]}
          {pet.size ? ` · ${SIZE_LABEL[pet.size]}` : ''}
          {pet.age_group && pet.age_group !== 'unknown' ? ` · ${AGE_LABEL[pet.age_group]}` : ''}
          {adopted ? ' · ADOPTADO' : ''}
        </Text>
      </View>
      <View style={{ gap: 6 }}>
        {!adopted ? (
          <>
            <Pressable onPress={() => onEdit(pet)} hitSlop={8}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: c.subtitle }}>Editar</Text>
            </Pressable>
            <Pressable onPress={() => onMarkAdopted(pet.id)} hitSlop={8}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#3ECFB2' }}>✓ Adoptado</Text>
            </Pressable>
          </>
        ) : null}
        <Pressable onPress={() => onDelete(pet.id)} hitSlop={8}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#FF5C6C' }}>Borrar</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function ShelterPanel() {
  const c = useTheme();
  const dispatch = useDispatch();
  const [shelter, setShelter] = useState(null);
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingShelter, setEditingShelter] = useState(false);
  const [creatingPet, setCreatingPet] = useState(false);
  const [editingPet, setEditingPet] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        api.get('/api/shelters/me'),
        api.get('/api/adoption-pets/mine'),
      ]);
      setShelter(r1.data);
      setPets(r2.data.pets || []);
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // field = 'logo' | 'cover'. Logo es cuadrado (aspect 1:1), cover es 16:9.
  const uploadImage = async (field) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('Permiso necesario', 'Necesitamos acceso a tus fotos.');
    const aspect = field === 'logo' ? [1, 1] : [16, 9];
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect, quality: 0.7 });
    if (result.canceled) return;
    const asset = result.assets[0];
    try {
      const fd = new FormData();
      fd.append('image', { uri: asset.uri, name: `${field}.jpg`, type: 'image/jpeg' });
      fd.append('field', field);
      await api.post('/api/shelters/me/image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      load();
    } catch { Alert.alert('Error', 'No se pudo subir la imagen.'); }
  };

  const handleLogout = () => {
    dispatch(clearCredentials());
    router.replace('/login');
  };

  // Eliminar cuenta = soft-delete del user (server cascade a vet + shelter).
  // Un shelter que "elimina su refugio" está cerrando la cuenta entera.
  // Reactivable via re-registro con el mismo email.
  const deleteAccount = () => {
    Alert.alert(
      'Eliminar cuenta',
      'Se ocultarán tus publicaciones y el perfil público del refugio. Podés recuperar la cuenta registrándote de nuevo con el mismo email.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive',
          onPress: async () => {
            try {
              await api.delete('/api/users/me');
              dispatch(clearCredentials());
              router.replace('/login');
            } catch { Alert.alert('Error', 'No se pudo eliminar la cuenta.'); }
          },
        },
      ]
    );
  };

  const markAdopted = async (id) => {
    try { await api.post(`/api/adoption-pets/${id}/adopted`); load(); } catch { /* silencioso */ }
  };
  const removePet = (id) => {
    Alert.alert('Borrar publicación', '¿Confirmás que querés borrar esta publicación?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar', style: 'destructive',
        onPress: async () => {
          try { await api.delete(`/api/adoption-pets/${id}`); load(); } catch { /* silencioso */ }
        },
      },
    ]);
  };

  if (loading || !shelter) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={c.title} />
      </SafeAreaView>
    );
  }

  const active = pets.filter((p) => !p.adopted_at && !p.deleted_at);
  const historical = pets.filter((p) => p.adopted_at || p.deleted_at);
  const approved = shelter.approved;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <View style={styles.headerTop}>
          <Text style={[styles.kicker, { color: c.subtitle }]}>MI REFUGIO</Text>
          <MenuButton />
        </View>

        {/* Hero: cover como banner + logo abajo. */}
        <View style={[styles.hero, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
          <Pressable onPress={() => uploadImage('cover')} style={styles.coverBanner}>
            {shelter.cover_url ? (
              <Image source={{ uri: shelter.cover_url }} style={styles.coverImg} />
            ) : (
              <View style={styles.coverPlaceholder} />
            )}
            <View style={styles.coverOverlay}>
              <Text style={styles.coverOverlayText}>
                {shelter.cover_url ? 'Cambiar cover' : '+ Subir cover'}
              </Text>
            </View>
          </Pressable>

          <View style={styles.heroBody}>
            <Pressable onPress={() => uploadImage('logo')} style={styles.heroLogoWrap}>
              {shelter.logo_url ? (
                <Image source={{ uri: shelter.logo_url }} style={styles.heroLogo} />
              ) : (
                <View style={[styles.heroLogo, styles.heroLogoFallback]}>
                  <Text style={styles.heroLogoLetter}>{shelter.name.charAt(0)}</Text>
                </View>
              )}
              <Text style={[styles.editLogoText, { color: c.subtitle }]}>Cambiar logo</Text>
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={[styles.heroName, { color: c.title }]}>{shelter.name}</Text>
              {shelter.city ? <Text style={[styles.heroCity, { color: c.subtitle }]}>📍 {shelter.city}</Text> : null}
              {!approved ? (
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingText}>PENDIENTE DE APROBACIÓN</Text>
                </View>
              ) : null}
              <Pressable onPress={() => router.push(`/shelters/${shelter.slug}`)}>
                <Text style={[styles.viewPublic, { color: c.subtitle }]}>Ver perfil público →</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {!approved ? (
          <View style={styles.pendingCard}>
            <Text style={styles.pendingKicker}>📋 VERIFICACIÓN PENDIENTE</Text>
            <Text style={styles.pendingCardText}>
              Para publicar mascotas en adopción tenés que verificar que representás a un refugio o protectora.
              Enviá a somos.mimo.app@gmail.com los comprobantes que tengas
              (papeles de la ONG, cuenta bancaria a nombre del refugio, redes sociales, etc.)
              desde el email de tu cuenta.
              {'\n\n'}
              Mientras tanto podés completar los datos del refugio. Un admin te aprueba y ya podés publicar.
            </Text>
          </View>
        ) : null}

        {/* Edit form */}
        <Pressable
          onPress={() => setEditingShelter(!editingShelter)}
          style={[styles.toggleBtn, { backgroundColor: c.card, borderColor: c.cardBorder }]}
        >
          <Text style={[styles.toggleBtnText, { color: c.title }]}>
            {editingShelter ? 'Ocultar edición del refugio' : 'Editar datos del refugio'}
          </Text>
        </Pressable>
        {editingShelter ? (
          <View style={{ marginTop: 12 }}>
            <ShelterEditForm
              shelter={shelter}
              c={c}
              onSaved={(s) => { setShelter(s); setEditingShelter(false); }}
            />
          </View>
        ) : null}

        {/* Adopciones — solo visible si el refugio está aprobado. El server
            también bloquea con requireShelter.approved. */}
        {approved ? (
          <View style={{ marginTop: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={[styles.sectionTitle, { color: c.title }]}>Publicaciones activas</Text>
              {!creatingPet && !editingPet ? (
                <Pressable onPress={() => setCreatingPet(true)} style={styles.newBtn}>
                  <Text style={styles.newBtnText}>+ Nueva</Text>
                </Pressable>
              ) : null}
            </View>

            {creatingPet ? (
              <AdoptionPetForm
                pet={null}
                c={c}
                onCancel={() => setCreatingPet(false)}
                onSaved={() => { setCreatingPet(false); load(); }}
              />
            ) : editingPet ? (
              <AdoptionPetForm
                pet={editingPet}
                c={c}
                onCancel={() => setEditingPet(null)}
                onSaved={() => { setEditingPet(null); load(); }}
              />
            ) : (
              <>
                {active.length === 0 ? (
                  <Text style={[styles.empty, { color: c.subtitle }]}>
                    Todavía no publicaste ninguna mascota en adopción.
                  </Text>
                ) : (
                  <View style={{ gap: 10 }}>
                    {active.map((p) => (
                      <PetRow key={p.id} pet={p} c={c} onEdit={setEditingPet} onMarkAdopted={markAdopted} onDelete={removePet} />
                    ))}
                  </View>
                )}
              </>
            )}
          </View>
        ) : null}

        {approved && historical.length > 0 && !creatingPet && !editingPet ? (
          <View style={{ marginTop: 24 }}>
            <Text style={[styles.sectionTitle, { color: c.subtitle, fontSize: 14 }]}>Historial</Text>
            <View style={{ gap: 10, marginTop: 12 }}>
              {historical.map((p) => (
                <PetRow key={p.id} pet={p} c={c} onEdit={setEditingPet} onMarkAdopted={markAdopted} onDelete={removePet} />
              ))}
            </View>
          </View>
        ) : null}

        <View style={{ marginTop: 30 }}>
          <LinkedAccounts c={c} />
        </View>

        <Pressable onPress={handleLogout} style={[styles.logoutBtn, { borderColor: c.cardBorder }]}>
          <Text style={[styles.logoutBtnText, { color: c.text }]}>Cerrar sesión</Text>
        </Pressable>
        <Pressable onPress={deleteAccount} style={styles.deleteBtn}>
          <Text style={styles.deleteBtnText}>Eliminar cuenta</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  kicker: { fontSize: 10, fontWeight: '800', letterSpacing: 2.5 },
  hero: {
    borderRadius: 32, borderWidth: 1, overflow: 'hidden',
  },
  coverBanner: { position: 'relative', height: 120, backgroundColor: '#F0EBE8' },
  coverImg: { width: '100%', height: '100%' },
  coverPlaceholder: { flex: 1, backgroundColor: '#FFF6F0' },
  coverOverlay: {
    position: 'absolute', bottom: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6,
  },
  coverOverlayText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  heroBody: { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroLogoWrap: { alignItems: 'center' },
  heroLogo: { width: 72, height: 72, borderRadius: 18, backgroundColor: '#F0EBE8' },
  heroLogoFallback: { backgroundColor: '#FF5C6C', alignItems: 'center', justifyContent: 'center' },
  heroLogoLetter: { color: '#fff', fontWeight: '800', fontSize: 30 },
  editLogoText: { fontSize: 10, fontWeight: '700', textAlign: 'center', marginTop: 6 },
  heroName: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  heroCity: { fontSize: 12, fontWeight: '600', marginTop: 3 },
  viewPublic: { fontSize: 12, fontWeight: '600', marginTop: 8 },
  pendingBadge: {
    backgroundColor: '#FEF3C7', borderRadius: 999, alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4, marginTop: 6,
  },
  pendingText: { color: '#92400E', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  pendingCard: {
    marginTop: 12, backgroundColor: '#FEF3C7', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: '#FCD34D',
  },
  pendingKicker: { color: '#92400E', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 8 },
  pendingCardText: { color: '#78350F', fontSize: 12, lineHeight: 18 },
  toggleBtn: {
    marginTop: 16, borderRadius: 999, borderWidth: 1, paddingVertical: 12, alignItems: 'center',
  },
  toggleBtnText: { fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  sectionTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  newBtn: {
    backgroundColor: '#FF5C6C', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
  },
  newBtnText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  empty: { textAlign: 'center', fontSize: 13, paddingVertical: 20 },
  petRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 20, borderWidth: 1,
  },
  petThumb: { width: 56, height: 56, borderRadius: 12 },
  petName: { fontSize: 15, fontWeight: '800' },
  petMeta: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginTop: 3, textTransform: 'uppercase' },
  formCard: { borderRadius: 24, borderWidth: 1, padding: 20 },
  formTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  cancel: { fontSize: 12, fontWeight: '700' },
  label: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  input: {
    borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, fontWeight: '500', marginTop: 8,
  },
  textarea: { minHeight: 100, textAlignVertical: 'top' },
  chip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  chipText: { fontSize: 12, fontWeight: '700' },
  photoWrap: { width: 88, height: 88, borderRadius: 14, overflow: 'hidden', position: 'relative' },
  photoImg: { width: '100%', height: '100%' },
  photoRemove: {
    position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center',
  },
  photoAdd: {
    width: 88, height: 88, borderRadius: 14, borderWidth: 2, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  photoAddText: { fontSize: 11, fontWeight: '700' },
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12,
  },
  switchLabel: { fontSize: 14, fontWeight: '600' },
  error: {
    color: '#DC2626', fontSize: 12, fontWeight: '700', textAlign: 'center', marginTop: 12,
  },
  saveBtn: {
    marginTop: 20, backgroundColor: '#1A1A2E', borderRadius: 999, paddingVertical: 14, alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  logoutBtn: {
    marginTop: 20, borderRadius: 999, borderWidth: 1, paddingVertical: 14, alignItems: 'center',
  },
  logoutBtnText: { fontSize: 13, fontWeight: '700' },
  deleteBtn: {
    marginTop: 10, borderRadius: 999, borderWidth: 1, paddingVertical: 14, alignItems: 'center',
    borderColor: '#FECACA',
  },
  deleteBtnText: { color: '#EF4444', fontSize: 13, fontWeight: '700' },
});
