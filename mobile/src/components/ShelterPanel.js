import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, Image, Pressable, ScrollView, StyleSheet,
  ActivityIndicator, Alert, Switch, Modal, KeyboardAvoidingView, Platform, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useDispatch } from 'react-redux';
import * as ImagePicker from 'expo-image-picker';
import api from '../lib/api';
import { useTheme, palette, fonts, sectionColors } from '../lib/theme';
import {
  ChevronRight, ChevronDown, ChevronUp, RefreshCw, X, Plus, Pencil, LogOut, ClipboardIcon, ImageIcon,
  HouseHeart, PawPrint, MapPin, Palette, Phone, MessageCircle, Mail, Globe, AtSign, Camera,
  UserX, Trash2,
} from '../lib/icons';
import EmptyState from './EmptyState';
import { confirm, toast } from '../lib/feedback';
import { clearCredentials } from '../store/userSlice';
import LinkedAccounts from './LinkedAccounts';
import SectionHeader from './SectionHeader';
import FormField from './FormField';
import { EditModal } from './ProfileEditForms';
import StatusChip from './StatusChip';
import Button from './Button';
import AppearanceRow from './AppearanceRow';
import TabBar, { useTabBarSpace } from './TabBar';
import { CONTACT_EMAIL, mailtoContact } from '../lib/config';

const MAX_PHOTOS = 6;
const COLOR = sectionColors.perfilRefugio;
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
    <View style={styles.chips}>
      {options.map((o) => {
        const active = value === o.key;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={[
              styles.chip,
              active
                ? { backgroundColor: c.inverseBg, borderColor: c.inverseBg }
                : { backgroundColor: c.bg, borderColor: c.bg },
            ]}
          >
            <Text style={[styles.chipText, { color: active ? c.inverseText : c.title, fontFamily: active ? fonts.bold : fonts.medium }]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Form para crear/editar una publicación de adopción.
function AdoptionPetForm({ pet, c, onCancel, onSaved }) {
  const editing = !!pet;
  const insets = useSafeAreaInsets();
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

  // Si replaceIndex viene, la foto seleccionada reemplaza esa posición;
  // sino se agrega al final.
  const pickPhoto = async (replaceIndex = null) => {
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
      setPhotos((p) => {
        if (replaceIndex === null) return [...p, data.url];
        const next = [...p];
        next[replaceIndex] = data.url;
        return next;
      });
    } catch (e) {
      setError(e.response?.data?.error || 'No se pudo subir la foto.');
    } finally {
      setUploading(false);
    }
  };

  const removePhotoAt = (i) => setPhotos((p) => p.filter((_, idx) => idx !== i));
  const movePhoto = (i, dir) => setPhotos((p) => {
    const j = i + dir;
    if (j < 0 || j >= p.length) return p;
    const next = [...p];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });

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
    <Modal visible animationType="slide" onRequestClose={onCancel} statusBarTranslucent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.flex1, { backgroundColor: c.bg }]}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <SectionHeader
            color={palette.violeta}
            centerLabel="Mi refugio"
            title={editing ? 'Editar publicación' : 'Nueva mascota en adopción'}
            subtitle="Contá cómo es para que encuentre familia más rápido."
            onBack={onCancel}
            style={styles.formHeader}
          />

          <View style={styles.formBody}>
            <View style={[styles.card, styles.cardTight, { backgroundColor: c.card }]}>
              <View style={styles.cardHead}>
                <Text style={[styles.cardTitle, { color: c.title }]}>
                  Fotos <Text style={{ color: palette.coral }}>*</Text>
                </Text>
                <Text style={[styles.counter, { color: c.text }]}>{photos.length} / {MAX_PHOTOS}</Text>
              </View>
              <Text style={[styles.hint, styles.hintUp, { color: c.text }]}>
                La primera es la principal: es la que se ve en el listado.
              </Text>
              {photos.map((url, i) => (
                <View key={`${url}-${i}`} style={[styles.photoRow, { backgroundColor: c.bg }]}>
                  <Image source={{ uri: url }} style={[styles.photoRowImg, { backgroundColor: c.photo }]} />
                  <View style={styles.flex}>
                    {i === 0 ? (
                      <View style={styles.mainChip}>
                        <Text style={styles.mainChipText}>Principal</Text>
                      </View>
                    ) : (
                      <Text style={[styles.photoRowLabel, { color: c.title }]}>Foto {i + 1}</Text>
                    )}
                  </View>
                  <Pressable
                    onPress={() => movePhoto(i, -1)}
                    disabled={i === 0}
                    style={[styles.photoIconBtn, { backgroundColor: c.card }, i === 0 && styles.dim]}
                    hitSlop={4}
                    accessibilityLabel="Subir"
                  >
                    <ChevronUp size={18} color={c.text} strokeWidth={2} />
                  </Pressable>
                  <Pressable
                    onPress={() => movePhoto(i, 1)}
                    disabled={i === photos.length - 1}
                    style={[styles.photoIconBtn, { backgroundColor: c.card }, i === photos.length - 1 && styles.dim]}
                    hitSlop={4}
                    accessibilityLabel="Bajar"
                  >
                    <ChevronDown size={18} color={c.text} strokeWidth={2} />
                  </Pressable>
                  <Pressable
                    onPress={() => pickPhoto(i)}
                    disabled={uploading}
                    style={[styles.photoIconBtn, { backgroundColor: c.card }]}
                    hitSlop={4}
                    accessibilityLabel="Reemplazar"
                  >
                    <RefreshCw size={16} color={c.text} strokeWidth={2} />
                  </Pressable>
                  <Pressable
                    onPress={() => removePhotoAt(i)}
                    style={[styles.photoIconBtn, { backgroundColor: c.card }]}
                    hitSlop={4}
                    accessibilityLabel="Quitar"
                  >
                    <X size={18} color={palette.coral} strokeWidth={2.5} />
                  </Pressable>
                </View>
              ))}
              {photos.length < MAX_PHOTOS ? (
                <Pressable onPress={() => pickPhoto()} disabled={uploading} style={styles.photoAdd}>
                  <Plus size={20} color={c.text} strokeWidth={2} />
                  <Text style={[styles.photoAddText, { color: c.text }]}>{uploading ? 'Subiendo…' : 'Agregar foto'}</Text>
                </Pressable>
              ) : null}
            </View>

            <View style={[styles.card, { backgroundColor: c.card }]}>
              <Text style={[styles.cardTitle, { color: c.title }]}>Datos</Text>
              <FormField label="Nombre" icon={PawPrint} value={form.name} onChangeText={upd('name')} placeholder="Firulais" maxLength={60} />
              <View style={styles.field}>
                <Text style={[styles.label, { color: c.text }]}>
                  Especie <Text style={{ color: palette.coral }}>*</Text>
                </Text>
                <ChipSelect options={SELECTS.species} value={form.species} onChange={upd('species')} c={c} />
              </View>
              <View style={styles.field}>
                <Text style={[styles.label, { color: c.text }]}>Sexo</Text>
                <ChipSelect options={SELECTS.sex} value={form.sex} onChange={upd('sex')} c={c} />
              </View>
              <View style={styles.field}>
                <Text style={[styles.label, { color: c.text }]}>Edad</Text>
                <ChipSelect options={SELECTS.age_group} value={form.age_group} onChange={upd('age_group')} c={c} />
              </View>
              <View style={styles.field}>
                <Text style={[styles.label, { color: c.text }]}>Tamaño</Text>
                <ChipSelect options={SELECTS.size} value={form.size} onChange={upd('size')} c={c} />
              </View>
              <FormField label="Color" icon={Palette} value={form.color} onChangeText={upd('color')} placeholder="Marrón, blanco…" maxLength={30} />
            </View>

            <View style={[styles.card, { backgroundColor: c.card }]}>
              <Text style={[styles.cardTitle, { color: c.title }]}>Sobre la mascota</Text>
              <FormField
                label="Descripción"
                value={form.description}
                onChangeText={upd('description')}
                placeholder="Contá su historia y personalidad: cómo se lleva con otros animales y con niños, qué tipo de hogar necesita."
                multiline
                maxLength={2000}
              />
              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: c.title }]}>Vacunado</Text>
                <Switch
                  value={form.vaccinated}
                  onValueChange={upd('vaccinated')}
                  trackColor={{ false: c.divider, true: palette.teal }}
                  thumbColor={palette.blanco}
                />
              </View>
              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: c.title }]}>Castrado</Text>
                <Switch
                  value={form.neutered}
                  onValueChange={upd('neutered')}
                  trackColor={{ false: c.divider, true: palette.teal }}
                  thumbColor={palette.blanco}
                />
              </View>
            </View>

            {error ? <Text style={[styles.error, { color: c.text }]}>{error}</Text> : null}

            <Button
              color={palette.violeta}
              title={saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Publicar'}
              onPress={save}
              disabled={saving || uploading}
            />
            <Pressable onPress={onCancel} style={styles.cancelBtn}>
              <Text style={[styles.cancelText, { color: c.text }]}>Cancelar</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ShelterEditForm({ shelter, c, onSaved, onUploadImage, inModal }) {
  const [form, setForm] = useState({
    name: shelter.name || '',
    city: shelter.city || '',
    // Sin dirección: no se pide ni se guarda (ver PUBLIC_COLUMNS en
    // shelterController). Publicar el domicilio de un refugio expone a las
    // personas y a los animales.
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
      setMsg('Guardado.');
    } catch (e) {
      setMsg(e.response?.data?.error || 'No se pudo guardar.');
    } finally { setSaving(false); }
  };

  const fields = (
    <>
      <View style={[styles.card, { backgroundColor: c.card }]}>
        <Text style={[styles.cardTitle, { color: c.title }]}>Datos del refugio</Text>
        <FormField label="Nombre" required icon={HouseHeart} value={form.name} onChangeText={upd('name')} maxLength={120} />
        <FormField label="Ciudad" icon={MapPin} value={form.city} onChangeText={upd('city')} placeholder="Montevideo" maxLength={80} />
      </View>

      <View style={[styles.card, { backgroundColor: c.card }]}>
        <Text style={[styles.cardTitle, { color: c.title }]}>Contacto</Text>
        <FormField label="Teléfono" icon={Phone} value={form.phone} onChangeText={upd('phone')} placeholder="+598 …" keyboardType="phone-pad" maxLength={30} />
        <FormField label="WhatsApp" icon={MessageCircle} value={form.whatsapp} onChangeText={upd('whatsapp')} placeholder="+598 …" keyboardType="phone-pad" maxLength={30} />
        <FormField label="Email" icon={Mail} value={form.email} onChangeText={upd('email')} keyboardType="email-address" autoCapitalize="none" maxLength={150} />
        <FormField label="Sitio web" icon={Globe} value={form.website} onChangeText={upd('website')} placeholder="https://…" autoCapitalize="none" maxLength={200} />
        <FormField label="Instagram" icon={AtSign} value={form.instagram} onChangeText={upd('instagram')} placeholder="sin @" autoCapitalize="none" maxLength={80} />
      </View>

      <View style={[styles.card, { backgroundColor: c.card }]}>
        <Text style={[styles.cardTitle, { color: c.title }]}>Sobre el refugio</Text>
        <FormField
          label="Bio"
          value={form.bio}
          onChangeText={upd('bio')}
          placeholder="Contá quiénes son, cuántos animales cuidan y cómo ayudar."
          multiline
          maxLength={2000}
        />
      </View>

      {msg ? <Text style={[styles.msg, { color: c.text }]}>{msg}</Text> : null}
      <Button
        color={COLOR}
        title={saving ? 'Guardando…' : 'Guardar cambios'}
        onPress={save}
        disabled={saving}
      />
    </>
  );

  // Pendiente de aprobación: el form va dentro del panel (es el paso 1).
  if (!inModal) {
    return (
      <View style={{ gap: 16 }}>
        <View style={[styles.card, { backgroundColor: c.card }]}>
          <Text style={[styles.cardTitle, { color: c.title }]}>Imágenes</Text>
          <View style={styles.imageBtns}>
            <Button variant="outline" icon={ImageIcon} title="Cambiar logo" onPress={() => onUploadImage('logo')} style={styles.halfBtn} textStyle={styles.btnText13} />
            <Button variant="outline" icon={ImageIcon} title="Cambiar portada" onPress={() => onUploadImage('cover')} style={styles.halfBtn} textStyle={styles.btnText13} />
          </View>
        </View>
        {fields}
      </View>
    );
  }

  // Aprobado: modal a pantalla completa con portada + logo, como Perfil-vet-editar.
  return (
    <View>
      <View style={[styles.editCover, { backgroundColor: c.photo }]}>
        {shelter.cover_url ? <Image source={{ uri: shelter.cover_url }} style={StyleSheet.absoluteFill} /> : null}
        <Pressable onPress={() => onUploadImage('cover')} style={styles.editCoverBtn}>
          <Camera size={16} color={palette.crema} strokeWidth={2} />
          <Text style={styles.editCoverBtnText}>Cambiar portada</Text>
        </Pressable>
        <Pressable
          onPress={() => onUploadImage('logo')}
          accessibilityLabel="Cambiar logo"
          style={[styles.editLogoBtn, { borderColor: c.bg, backgroundColor: c.bg }]}
        >
          {shelter.logo_url ? (
            <Image source={{ uri: shelter.logo_url }} style={styles.editLogoImg} />
          ) : (
            <View style={[styles.editLogoImg, styles.center, { backgroundColor: COLOR }]}>
              <Text style={styles.editLogoLetter}>{shelter.name.charAt(0)}</Text>
            </View>
          )}
        </Pressable>
      </View>
      <View style={styles.editBody}>
        <Text style={[styles.editLogoHint, { color: c.text }]}>
          Logo cuadrado y portada horizontal. Se ven en tu ficha y en el listado de refugios.
        </Text>
        {fields}
      </View>
    </View>
  );
}

function PetRow({ pet, c, onEdit, onMarkAdopted, onDelete }) {
  const adopted = !!pet.adopted_at;
  const meta = [
    SPECIES_LABEL[pet.species],
    pet.size ? SIZE_LABEL[pet.size] : null,
    pet.age_group && pet.age_group !== 'unknown' ? AGE_LABEL[pet.age_group] : null,
  ].filter(Boolean).join(' · ');
  return (
    <View style={[styles.petCard, { backgroundColor: c.card }, adopted && { opacity: 0.55 }]}>
      <View style={styles.petTop}>
        {pet.photos?.[0] ? (
          <Image source={{ uri: pet.photos[0] }} style={[styles.petThumb, { backgroundColor: c.photo }]} />
        ) : (
          <View style={[styles.petThumb, styles.center, { backgroundColor: c.photo }]}>
            <PawPrint size={24} color={c.text} strokeWidth={2} />
          </View>
        )}
        <View style={styles.flex}>
          <StatusChip status={adopted ? 'adopted' : 'adoption'} />
          <Text style={[styles.petName, { color: c.title }]} numberOfLines={1}>{pet.name || 'Sin nombre'}</Text>
          {meta ? <Text style={[styles.petMeta, { color: c.text }]} numberOfLines={1}>{meta}</Text> : null}
        </View>
      </View>
      <View style={styles.petActions}>
        {!adopted ? (
          <>
            <Pressable onPress={() => onMarkAdopted(pet.id)} style={[styles.petBtn, { backgroundColor: palette.teal }]}>
              <Text style={[styles.petBtnText, { color: palette.arena }]}>✓ Adoptado</Text>
            </Pressable>
            <Pressable onPress={() => onEdit(pet)} style={[styles.petBtn, styles.petBtnOutline, { borderColor: c.title }]}>
              <Text style={[styles.petBtnText, { color: c.text }]}>Editar</Text>
            </Pressable>
          </>
        ) : null}
        <Pressable onPress={() => onDelete(pet.id)} style={styles.petBtnLink} hitSlop={6}>
          <Text style={[styles.petBtnText, styles.underline, { color: c.text }]}>Borrar</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function ShelterPanel() {
  const c = useTheme();
  const dispatch = useDispatch();
  const bottomSpace = useTabBarSpace();
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
  const deleteAccount = async () => {
    const ok = await confirm({
      tone: 'danger',
      icon: UserX,
      title: '¿Eliminar tu cuenta?',
      text: 'Se ocultan tus publicaciones y el perfil público del refugio.',
      note: 'Podés recuperarla más adelante registrándote con el mismo email.',
      confirmText: 'Eliminar cuenta',
    });
    if (!ok) return;
    try {
      await api.delete('/api/users/me');
      dispatch(clearCredentials());
      router.replace('/login');
    } catch {
      toast('No se pudo eliminar la cuenta. Probá de nuevo.', 'error');
    }
  };

  const markAdopted = async (id) => {
    try { await api.post(`/api/adoption-pets/${id}/adopted`); load(); } catch { /* silencioso */ }
  };
  const removePet = async (id) => {
    const ok = await confirm({
      tone: 'danger',
      icon: Trash2,
      title: '¿Eliminar esta publicación?',
      text: 'Se borra de forma permanente, con sus fotos.',
      note: 'No se puede deshacer.',
      confirmText: 'Eliminar',
    });
    if (!ok) return;
    try {
      await api.delete(`/api/adoption-pets/${id}`);
      load();
    } catch {
      toast('No se pudo eliminar la publicación. Probá de nuevo.', 'error');
    }
  };

  if (loading || !shelter) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator color={c.title} />
      </View>
    );
  }

  const active = pets.filter((p) => !p.adopted_at && !p.deleted_at);
  const historical = pets.filter((p) => p.adopted_at || p.deleted_at);
  const adoptedCount = pets.filter((p) => p.adopted_at).length;
  const approved = shelter.approved;

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: bottomSpace }} showsVerticalScrollIndicator={false}>
        <SectionHeader color={COLOR} showBack={false} centerLabel="Mi refugio" style={styles.sectionHeader}>
          <View style={styles.heroRow}>
            <Pressable onPress={() => uploadImage('logo')} accessibilityLabel="Cambiar logo">
              {shelter.logo_url ? (
                <Image source={{ uri: shelter.logo_url }} style={styles.logo} />
              ) : (
                <View style={[styles.logo, styles.center]}>
                  <Text style={styles.logoLetter}>{shelter.name.charAt(0)}</Text>
                </View>
              )}
            </Pressable>
            <View style={styles.heroTexts}>
              <Text style={styles.heroName} numberOfLines={2}>{shelter.name}</Text>
              {!approved ? (
                <View style={styles.pendingBadge}>
                  <ClipboardIcon size={13} color={palette.arena} strokeWidth={2} />
                  <Text style={styles.pendingBadgeText}>Pendiente de aprobación</Text>
                </View>
              ) : (
                <>
                  {shelter.city ? (
                    <View style={styles.row}>
                      <MapPin size={14} color={palette.arena} strokeWidth={2} />
                      <Text style={styles.heroCity}>{shelter.city}</Text>
                    </View>
                  ) : null}
                  <Pressable onPress={() => router.push(`/shelters/${shelter.slug}`)} hitSlop={6}>
                    <Text style={styles.heroLink}>Ver perfil público →</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </SectionHeader>

        <View style={styles.body}>
          {!approved ? (
            <View style={[styles.card, styles.verifyCard, { backgroundColor: c.card }]}>
              <View style={styles.row}>
                <ClipboardIcon size={15} color={c.text} strokeWidth={2} />
                <Text style={[styles.label, { color: c.text }]}>Verificación pendiente</Text>
              </View>
              <Text style={[styles.verifyTitle, { color: c.title }]}>
                Para publicar mascotas en adopción tenés que verificar que representás a un refugio o protectora.
              </Text>
              {[
                'Completá los datos del refugio acá abajo.',
                `Mandá comprobantes a ${CONTACT_EMAIL} desde el email de tu cuenta: papeles de la ONG, cuenta bancaria a nombre del refugio, redes sociales.`,
                'Un admin te aprueba y ya podés publicar mascotas en adopción.',
              ].map((t, i) => (
                <View key={i} style={styles.step}>
                  <View style={[styles.stepNum, { backgroundColor: c.inverseBg }]}>
                    <Text style={[styles.stepNumText, { color: c.inverseText }]}>{i + 1}</Text>
                  </View>
                  <Text style={[styles.stepText, { color: c.text }]}>{t}</Text>
                </View>
              ))}
              {/* Refugio-pendiente.dc.html: abre un mail a soporte con el asunto
                  armado; los adjuntos los suma la persona en su app de mail. */}
              <Button
                variant="dark"
                icon={Mail}
                title="Enviar comprobantes"
                onPress={() =>
                  Linking.openURL(mailtoContact(`Verificación de refugio: ${shelter.name || ''}`.trim())).catch(() =>
                    toast(`No pudimos abrir tu app de mail. Escribinos a ${CONTACT_EMAIL}.`, 'error')
                  )
                }
                style={styles.verifyBtn}
                textStyle={styles.btnText15}
              />
            </View>
          ) : (
            <View style={styles.statsGrid}>
              <View style={[styles.stat, { backgroundColor: c.card, borderTopColor: palette.violeta }]}>
                <Text style={[styles.statLabel, { color: c.text }]}>En adopción</Text>
                <Text style={[styles.statValue, { color: c.title }]}>{active.length}</Text>
              </View>
              <View style={[styles.stat, { backgroundColor: c.card, borderTopColor: palette.teal }]}>
                <Text style={[styles.statLabel, { color: c.text }]}>Adoptadas</Text>
                <Text style={[styles.statValue, { color: c.title }]}>{adoptedCount}</Text>
                <Text style={[styles.statHint, { color: c.text }]}>desde que te sumaste</Text>
              </View>
            </View>
          )}

          {approved ? (
            <Pressable
              onPress={() => setEditingShelter(true)}
              style={({ pressed }) => [styles.toggleBtn, { backgroundColor: c.card, borderColor: c.cardBorder, opacity: pressed ? 0.8 : 1 }]}
            >
              <View style={styles.row}>
                <Pencil size={14} color={c.text} strokeWidth={2} />
                <Text style={[styles.toggleBtnText, { color: c.text }]}>Editar datos del refugio</Text>
              </View>
              <ChevronRight size={20} color={c.text} strokeWidth={2} />
            </Pressable>
          ) : (
            <ShelterEditForm
              shelter={shelter}
              c={c}
              onUploadImage={uploadImage}
              onSaved={setShelter}
            />
          )}

          {/* Adopciones — solo visible si el refugio está aprobado. El server
              también bloquea con requireShelter.approved. */}
          {approved ? (
            <View style={styles.listSection}>
              <View style={styles.sectionHead}>
                <Text style={[styles.sectionTitle, { color: c.title }]}>Publicaciones activas</Text>
                {!creatingPet && !editingPet ? (
                  <Button
                    color={palette.violeta}
                    icon={Plus}
                    title="Nueva"
                    onPress={() => setCreatingPet(true)}
                    style={styles.smallBtn}
                    textStyle={styles.btnText13}
                  />
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
              ) : active.length === 0 ? (
                <EmptyState
                  icon={HouseHeart}
                  color={palette.violeta}
                  title="Publicá tu primera mascota"
                  text='Las mascotas que publiques aparecen en "En adopción" para toda la comunidad.'
                  action={{ title: 'Nueva publicación', icon: Plus, color: palette.violeta, onPress: () => setCreatingPet(true) }}
                />
              ) : (
                active.map((p) => (
                  <PetRow key={p.id} pet={p} c={c} onEdit={setEditingPet} onMarkAdopted={markAdopted} onDelete={removePet} />
                ))
              )}
            </View>
          ) : (
            <View style={[styles.lockedCard, { borderColor: c.cardBorder }]}>
              <View style={[styles.lockedIcon, { backgroundColor: c.photo }]}>
                <HouseHeart size={20} color={c.text} strokeWidth={2} />
              </View>
              <View style={styles.flex}>
                <Text style={[styles.lockedTitle, { color: c.title }]}>Publicaciones</Text>
                <Text style={[styles.small, { color: c.text }]}>
                  Vas a poder publicar mascotas en adopción cuando te aprobemos.
                </Text>
              </View>
            </View>
          )}

          {approved && historical.length > 0 && !creatingPet && !editingPet ? (
            <View style={styles.listSection}>
              <Text style={[styles.sectionTitle, styles.historyTitle, { color: c.title }]}>Historial</Text>
              {historical.map((p) => (
                <PetRow key={p.id} pet={p} c={c} onEdit={setEditingPet} onMarkAdopted={markAdopted} onDelete={removePet} />
              ))}
            </View>
          ) : null}

          <AppearanceRow />

          <LinkedAccounts c={c} />

          <View style={{ gap: 4 }}>
            <Button variant="outline" icon={LogOut} title="Cerrar sesión" onPress={handleLogout} style={styles.btn52} textStyle={styles.btnText15} />
            <Pressable onPress={deleteAccount} style={styles.deleteBtn}>
              <Text style={[styles.deleteBtnText, { color: c.text }]}>Eliminar cuenta</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
      <TabBar />

      <EditModal visible={editingShelter} title="Editar refugio" color={COLOR} onClose={() => setEditingShelter(false)}>
        <ShelterEditForm
          shelter={shelter}
          c={c}
          inModal
          onUploadImage={uploadImage}
          onSaved={(s) => { setShelter(s); setEditingShelter(false); }}
        />
      </EditModal>
    </View>
  );
}

const styles = StyleSheet.create({
  editCover: { height: 170, alignItems: 'center', justifyContent: 'center' },
  editCoverBtn: {
    position: 'absolute', right: 16, top: 14, height: 36, paddingHorizontal: 12, borderRadius: 999,
    backgroundColor: 'rgba(26,26,46,0.7)', flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  editCoverBtnText: { fontFamily: fonts.bold, fontSize: 13, color: palette.crema },
  editLogoBtn: { position: 'absolute', left: 20, bottom: -40, width: 88, height: 88, borderRadius: 24, borderWidth: 4, overflow: 'hidden' },
  editLogoImg: { width: '100%', height: '100%', borderRadius: 20 },
  editLogoLetter: { fontFamily: fonts.display, fontSize: 34, color: palette.noche },
  editBody: { paddingHorizontal: 20, paddingTop: 12, gap: 16 },
  editLogoHint: { marginLeft: 108, minHeight: 40, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  container: { flex: 1 },
  flex1: { flex: 1 },
  formHeader: { marginBottom: 20 },
  formBody: { paddingHorizontal: 20, gap: 16 },
  cardTight: { gap: 12 },
  counter: { fontFamily: fonts.bold, fontSize: 13 },
  hintUp: { marginTop: -6 },
  mainChip: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: palette.violeta },
  mainChipText: { fontFamily: fonts.bold, fontSize: 11, color: palette.arena },
  cancelBtn: { height: 44, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontFamily: fonts.medium, fontSize: 15, textDecorationLine: 'underline' },
  center: { alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, minWidth: 0, gap: 3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dim: { opacity: 0.3 },
  underline: { textDecorationLine: 'underline' },
  sectionHeader: { marginBottom: 20 },
  body: { paddingHorizontal: 20, gap: 24 },

  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  logo: { width: 72, height: 72, borderRadius: 22, backgroundColor: palette.crema },
  logoLetter: { fontFamily: fonts.display, fontSize: 30, color: palette.noche },
  heroTexts: { flex: 1, minWidth: 0, gap: 4 },
  heroName: { fontFamily: fonts.display, fontSize: 24, lineHeight: 28, color: palette.arena },
  heroCity: { fontFamily: fonts.regular, fontSize: 13, color: palette.arena },
  heroLink: { fontFamily: fonts.bold, fontSize: 13, color: palette.arena, textDecorationLine: 'underline' },
  pendingBadge: {
    alignSelf: 'flex-start', height: 26, paddingHorizontal: 12, borderRadius: 999, backgroundColor: palette.sol,
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2,
  },
  pendingBadgeText: { fontFamily: fonts.bold, fontSize: 12, color: palette.arena },

  verifyCard: { borderWidth: 2, borderColor: palette.sol },
  verifyBtn: { height: 48, borderRadius: 14, marginTop: 4 },
  verifyTitle: { fontFamily: fonts.display, fontSize: 19, lineHeight: 24 },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  stepNum: {
    width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  stepNumText: { fontFamily: fonts.bold, fontSize: 12 },
  stepText: { flex: 1, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, paddingTop: 2 },

  statsGrid: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 20, borderTopWidth: 4, gap: 4 },
  statLabel: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.66, textTransform: 'uppercase' },
  statValue: { fontFamily: fonts.display, fontSize: 28, lineHeight: 32 },
  statHint: { fontFamily: fonts.regular, fontSize: 12 },

  toggleBtn: {
    height: 52, borderRadius: 16, borderWidth: 1, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  toggleBtnText: { fontFamily: fonts.bold, fontSize: 15 },

  card: { borderRadius: 24, padding: 18, gap: 14 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontFamily: fonts.display, fontSize: 18 },
  link: { fontFamily: fonts.bold, fontSize: 13, textDecorationLine: 'underline' },
  field: { gap: 6 },
  label: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  hint: { fontFamily: fonts.regular, fontSize: 13 },
  small: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { height: 38, borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, justifyContent: 'center' },
  chipText: { fontSize: 14 },
  imageBtns: { flexDirection: 'row', gap: 10 },
  halfBtn: { flex: 1, height: 48, borderRadius: 14, paddingHorizontal: 10 },

  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: 14 },
  photoRowImg: { width: 56, height: 56, borderRadius: 10 },
  photoRowLabel: { fontFamily: fonts.bold, fontSize: 13 },
  photoIconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  photoAdd: {
    height: 64, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', borderColor: palette.violeta,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  photoAddText: { fontFamily: fonts.bold, fontSize: 14 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  divided: { borderTopWidth: 1, paddingTop: 12 },
  switchLabel: { fontFamily: fonts.bold, fontSize: 15 },
  error: {
    fontFamily: fonts.bold, fontSize: 14, padding: 12, borderRadius: 14, borderWidth: 2, borderColor: palette.coral,
  },
  msg: { fontFamily: fonts.bold, textAlign: 'center', fontSize: 13 },

  listSection: { gap: 12 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: fonts.display, fontSize: 20 },
  historyTitle: { fontSize: 17 },
  petCard: { borderRadius: 20, padding: 10, gap: 10 },
  petTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  petThumb: { width: 60, height: 60, borderRadius: 14 },
  petName: { fontFamily: fonts.display, fontSize: 16 },
  petMeta: { fontFamily: fonts.regular, fontSize: 12 },
  petActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  petBtn: { height: 36, paddingHorizontal: 12, borderRadius: 10, justifyContent: 'center' },
  petBtnOutline: { borderWidth: 1 },
  petBtnLink: { height: 36, paddingHorizontal: 10, justifyContent: 'center' },
  petBtnText: { fontFamily: fonts.bold, fontSize: 12 },

  lockedCard: {
    borderRadius: 24, borderWidth: 2, borderStyle: 'dashed', padding: 18, flexDirection: 'row',
    alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.5)',
  },
  lockedIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  lockedTitle: { fontFamily: fonts.display, fontSize: 16 },

  smallBtn: { height: 40, borderRadius: 12, paddingHorizontal: 14 },
  btn52: { height: 52, borderRadius: 16 },
  btnText15: { fontSize: 15 },
  btnText13: { fontSize: 13 },
  deleteBtn: { height: 48, alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { fontFamily: fonts.medium, fontSize: 14, textDecorationLine: 'underline' },
});
