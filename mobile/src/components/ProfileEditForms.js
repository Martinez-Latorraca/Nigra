import { useEffect, useState } from 'react';
import {
  View, Text, Image, Pressable, ScrollView, StyleSheet, Alert, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import api from '../lib/api';
import { useTheme, palette, fonts, onColor } from '../lib/theme';
import { updateUserData } from '../store/userSlice';
import { CONTACT_EMAIL } from '../lib/config';
import {
  User, Mail, MapPin, Phone, MessageCircle, Globe, AtSign, Stethoscope, Camera,
} from '../lib/icons';
import MapPicker from './MapPicker';
import FormField from './FormField';
import ServiceChips, { useServices } from './ServiceChips';
import Button from './Button';

// Edición del perfil (pantallas/Perfil-editar y Perfil-vet-editar): modal a
// pantalla completa con barra "Cancelar · título" del color del perfil.
export function EditModal({ visible, title, color, onClose, children }) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const fg = onColor(color);
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.modal, { backgroundColor: c.bg }]}>
        <View style={[styles.bar, { backgroundColor: color, paddingTop: insets.top + 16 }]}>
          <Pressable onPress={onClose} hitSlop={8} style={styles.barSide}>
            <Text style={[styles.barCancel, { color: fg }]}>Cancelar</Text>
          </Pressable>
          <Text style={[styles.barTitle, { color: fg }]}>{title}</Text>
          <View style={styles.barSide} />
        </View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
          <ScrollView
            contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ------------------------------------------------------------------ //
// UserEditForm — edita nombre + foto del user (no-vet).
// ------------------------------------------------------------------ //
export function UserEditForm({ user, dispatch, onClose }) {
  const c = useTheme();
  const [name, setName] = useState(user?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tus fotos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setUploading(true);
    setErr('');
    try {
      const fd = new FormData();
      fd.append('image', { uri: asset.uri, name: 'avatar.jpg', type: 'image/jpeg' });
      const { data } = await api.post('/api/users/me/avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAvatarUrl(data.avatar_url);
      dispatch(updateUserData({ avatar_url: data.avatar_url }));
    } catch (e) {
      setErr(e.response?.data?.error || 'No se pudo subir la imagen.');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setMsg('');
    setErr('');
    try {
      const { data } = await api.patch('/api/users/me', { name: name.trim() });
      dispatch(updateUserData({ name: data.name, avatar_url: data.avatar_url }));
      setMsg('Guardado.');
      setTimeout(() => onClose?.(), 800);
    } catch (e) {
      setErr(e.response?.data?.error || 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.body}>
      <View style={styles.avatarBlock}>
        <Pressable onPress={pickAvatar} disabled={uploading} accessibilityLabel="Cambiar foto de perfil" style={styles.avatarBtn}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.center, { backgroundColor: palette.violeta }]}>
              <Text style={styles.avatarLetter}>{(user?.name || '?').charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.avatarBadge}>
            <Camera size={16} color={palette.arena} strokeWidth={2} />
          </View>
        </Pressable>
        <Pressable onPress={pickAvatar} disabled={uploading} hitSlop={6}>
          <Text style={[styles.link, { color: c.text }]}>{uploading ? 'Subiendo…' : 'Cambiar foto'}</Text>
        </Pressable>
      </View>

      <View style={[styles.card, { backgroundColor: c.card }]}>
        <FormField label="Nombre" required icon={User} value={name} onChangeText={setName} />
        <FormField
          label="Email"
          icon={Mail}
          readOnly
          value={user?.email || ''}
          hint={`Para cambiar tu email escribinos a ${CONTACT_EMAIL}.`}
        />
      </View>

      {err ? <Text style={[styles.msg, styles.msgError, { color: c.text }]}>{err}</Text> : null}
      {msg ? <Text style={[styles.msg, { color: c.text }]}>{msg}</Text> : null}

      <Button
        title={saving ? 'Guardando…' : 'Guardar cambios'}
        onPress={save}
        disabled={saving || !name.trim()}
      />
    </View>
  );
}

// ------------------------------------------------------------------ //
// VetEditForm — edita todos los datos de la vet incluyendo logo, portada,
// mapa y catálogo de servicios.
// ------------------------------------------------------------------ //
export function VetEditForm({ vet, onClose, onSaved }) {
  const c = useTheme();
  const [form, setForm] = useState({
    name: vet.name || '',
    phone: vet.phone || '',
    whatsapp: vet.whatsapp || '',
    website: vet.website || '',
    instagram: vet.instagram || '',
    address: vet.address || '',
    city: vet.city || '',
    bio: vet.bio || '',
  });
  const services = useServices(vet.services || []);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [uploadingKind, setUploadingKind] = useState(null);
  const [logoUrl, setLogoUrl] = useState(vet.logo_url || '');
  const [coverUrl, setCoverUrl] = useState(vet.cover_url || '');
  const [mapPosition, setMapPosition] = useState(
    vet.lat != null && vet.lng != null ? { lat: vet.lat, lng: vet.lng } : null
  );

  // El WebView del mapa, si se monta durante la animación de apertura del
  // Modal, deja el ScrollView sin scroll en Android. Se monta un rato después.
  const [showMap, setShowMap] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShowMap(true), 600);
    return () => clearTimeout(t);
  }, []);

  const update = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const pickAndUpload = async (kind) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tus fotos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: kind === 'logo' ? [1, 1] : [16, 9],
      quality: 0.7,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setUploadingKind(kind);
    setErr('');
    try {
      const fd = new FormData();
      fd.append('image', { uri: asset.uri, name: `${kind}.jpg`, type: 'image/jpeg' });
      fd.append('field', kind);
      const { data } = await api.post('/api/vets/me/image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (kind === 'logo') setLogoUrl(data.logo_url);
      else setCoverUrl(data.cover_url);
      onSaved?.();
    } catch (e) {
      setErr(e.response?.data?.error || 'No se pudo subir la imagen.');
    } finally {
      setUploadingKind(null);
    }
  };

  const save = async () => {
    setSaving(true);
    setMsg('');
    setErr('');
    try {
      const body = { ...form, services: services.toList() };
      if (mapPosition) {
        body.lat = mapPosition.lat;
        body.lng = mapPosition.lng;
      }
      for (const k of Object.keys(body)) {
        if (body[k] === '' || body[k] === null) delete body[k];
      }
      await api.patch('/api/vets/me', body);
      setMsg('Guardado.');
      onSaved?.();
      setTimeout(() => onClose?.(), 800);
    } catch (e) {
      setErr(e.response?.data?.error || 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View>
      {/* Portada + logo superpuesto */}
      <View style={[styles.cover, { backgroundColor: c.arena }]}>
        {coverUrl ? <Image source={{ uri: coverUrl }} style={StyleSheet.absoluteFill} /> : null}
        <Pressable
          onPress={() => pickAndUpload('cover')}
          disabled={uploadingKind !== null}
          style={styles.coverBtn}
        >
          <Camera size={16} color={palette.crema} strokeWidth={2} />
          <Text style={styles.coverBtnText}>{uploadingKind === 'cover' ? 'Subiendo…' : 'Cambiar portada'}</Text>
        </Pressable>
        <Pressable
          onPress={() => pickAndUpload('logo')}
          disabled={uploadingKind !== null}
          accessibilityLabel="Cambiar logo"
          style={[styles.logoBtn, { borderColor: c.bg, backgroundColor: c.bg }]}
        >
          {logoUrl ? (
            <Image source={{ uri: logoUrl }} style={styles.logoImg} />
          ) : (
            <View style={[styles.logoImg, styles.center, { backgroundColor: palette.noche }]}>
              <Text style={styles.logoLetter}>{vet.name.charAt(0)}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <View style={[styles.body, styles.vetBody]}>
        <Text style={[styles.logoHint, { color: c.text }]}>
          {uploadingKind === 'logo'
            ? 'Subiendo logo…'
            : 'Logo cuadrado y portada horizontal. Se ven en tu ficha y en el directorio.'}
        </Text>

        <View style={[styles.card, { backgroundColor: c.card }]}>
          <Text style={[styles.cardTitle, { color: c.title }]}>La clínica</Text>
          <FormField label="Nombre" required icon={Stethoscope} value={form.name} onChangeText={update('name')} />
          <FormField label="Ciudad" icon={MapPin} value={form.city} onChangeText={update('city')} />
          <FormField label="Dirección" icon={MapPin} value={form.address} onChangeText={update('address')} />
          <View style={styles.field}>
            <Text style={[styles.label, { color: c.text }]}>Ubicación en el mapa</Text>
            <View style={[styles.mapWrap, { backgroundColor: c.arena }]}>
              {showMap ? (
                <MapPicker
                  value={mapPosition}
                  onChange={(lat, lng) => setMapPosition({ lat, lng })}
                  style={styles.flex}
                />
              ) : null}
              <View style={[styles.mapPill, { backgroundColor: c.card }]} pointerEvents="none">
                <Text style={[styles.mapPillText, { color: c.text }]}>Tocá el mapa para mover el pin</Text>
              </View>
            </View>
            <Text style={[styles.hint, { color: c.text }]}>
              Sin marcar acá, tu veterinaria no aparece en el filtro "Cerca mío" del directorio.
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: c.card }]}>
          <Text style={[styles.cardTitle, { color: c.title }]}>Contacto</Text>
          <FormField label="Teléfono" icon={Phone} value={form.phone} onChangeText={update('phone')} placeholder="+598 …" keyboardType="phone-pad" />
          <FormField label="WhatsApp" icon={MessageCircle} value={form.whatsapp} onChangeText={update('whatsapp')} placeholder="+598 …" keyboardType="phone-pad" />
          <FormField label="Sitio web" icon={Globe} value={form.website} onChangeText={update('website')} placeholder="https://…" autoCapitalize="none" />
          <FormField label="Instagram" icon={AtSign} value={form.instagram} onChangeText={update('instagram')} placeholder="@handle" autoCapitalize="none" />
        </View>

        <View style={[styles.card, { backgroundColor: c.card }]}>
          <Text style={[styles.cardTitle, { color: c.title }]}>Sobre la clínica</Text>
          <FormField
            label="Bio"
            value={form.bio}
            onChangeText={update('bio')}
            multiline
            placeholder="Contá qué hacen, especialidades, horarios…"
          />
          <ServiceChips services={services} />
        </View>

        {err ? <Text style={[styles.msg, styles.msgError, { color: c.text }]}>{err}</Text> : null}
        {msg ? <Text style={[styles.msg, { color: c.text }]}>{msg}</Text> : null}

        <Button variant="dark" title={saving ? 'Guardando…' : 'Guardar cambios'} onPress={save} disabled={saving} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  modal: { flex: 1 },
  bar: {
    paddingHorizontal: 20,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  barSide: { width: 68, height: 44, justifyContent: 'center' },
  barCancel: { fontFamily: fonts.medium, fontSize: 15 },
  barTitle: { fontFamily: fonts.display, fontSize: 18 },

  body: { paddingHorizontal: 20, paddingTop: 28, gap: 20 },
  vetBody: { paddingTop: 12, gap: 16 },
  card: { borderRadius: 24, padding: 18, gap: 14 },
  cardTitle: { fontFamily: fonts.display, fontSize: 18 },
  field: { gap: 6 },
  label: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  hint: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17 },
  link: { fontFamily: fonts.bold, fontSize: 14, textDecorationLine: 'underline' },
  msg: { fontFamily: fonts.bold, fontSize: 14, textAlign: 'center' },
  msgError: { padding: 12, borderRadius: 14, borderWidth: 2, borderColor: palette.coral, textAlign: 'left' },

  avatarBlock: { alignItems: 'center', gap: 10 },
  avatarBtn: { width: 112, height: 112 },
  avatar: { width: 112, height: 112, borderRadius: 56 },
  avatarLetter: { fontFamily: fonts.display, fontSize: 44, color: palette.noche },
  avatarBadge: {
    position: 'absolute', right: 0, bottom: 0, width: 36, height: 36, borderRadius: 18,
    backgroundColor: palette.coral, borderWidth: 3, borderColor: palette.crema, alignItems: 'center', justifyContent: 'center',
  },

  cover: { height: 170, alignItems: 'center', justifyContent: 'center' },
  coverBtn: {
    position: 'absolute', right: 16, top: 14, height: 36, paddingHorizontal: 12, borderRadius: 999,
    backgroundColor: 'rgba(26,26,46,0.7)', flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  coverBtnText: { fontFamily: fonts.bold, fontSize: 13, color: palette.crema },
  logoBtn: { position: 'absolute', left: 20, bottom: -40, width: 88, height: 88, borderRadius: 24, borderWidth: 4, overflow: 'hidden' },
  logoImg: { width: '100%', height: '100%', borderRadius: 20 },
  logoLetter: { fontFamily: fonts.display, fontSize: 34, color: palette.crema },
  logoHint: { marginLeft: 108, minHeight: 40, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },

  mapWrap: { height: 160, borderRadius: 16, overflow: 'hidden' },
  mapPill: { position: 'absolute', left: 10, bottom: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  mapPillText: { fontFamily: fonts.bold, fontSize: 12 },
});
