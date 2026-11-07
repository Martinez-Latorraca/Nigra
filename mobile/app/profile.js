import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Switch,
  Alert,
  TextInput,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import * as ImagePicker from 'expo-image-picker';
import api from '../src/lib/api';
import { updateLocationIfPermitted } from '../src/lib/location';
import { useTheme, palette, fonts, sectionColors, onColor } from '../src/lib/theme';
import { ChevronRight, Pencil, Plus, Bell, LogOut, Star, Check } from '../src/lib/icons';
import { clearCredentials, updateUserData } from '../src/store/userSlice';
import LinkedAccounts from '../src/components/LinkedAccounts';
import MapPicker from '../src/components/MapPicker';
import ShelterPanel from '../src/components/ShelterPanel';
import { adRadiusOf, SPONSOR_TIERS } from '../src/lib/sponsorTiers';
import SectionHeader from '../src/components/SectionHeader';
import StatusChip from '../src/components/StatusChip';
import SponsorBadge from '../src/components/SponsorBadge';
import Button from '../src/components/Button';
import TabBar, { useTabBarSpace } from '../src/components/TabBar';
import { CONTACT_EMAIL, mailtoContact } from '../src/lib/config';

const STATUS_LABEL = { lost: 'Perdida', found: 'Encontrada' };
// Radio de push notifications, mismos presets para user y vet — sponsor no
// cambia el rango. Ver [[project_vet_sponsor_model]] en memoria.
const RADIUS_PRESETS = [5, 15, 25, 50];

// Debe coincidir con el catálogo del web (client SERVICE_CATALOG) y del
// directorio (mobile/app/vets/index.js).
const SERVICE_CATALOG = [
  'Consultas',
  'Vacunación',
  'Cirugía',
  'Urgencias 24h',
  'Peluquería',
  'Baño',
  'Radiología',
  'Ecografía',
  'Laboratorio',
  'Guardería',
  'Adiestramiento',
  'Atención a domicilio',
];

// ------------------------------------------------------------------ //
// UserEditForm — edita nombre + foto del user (no-vet).
// ------------------------------------------------------------------ //
function UserEditForm({ user, c, dispatch, onClose }) {
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

  const inputStyle = [formStyles.input, { backgroundColor: c.inputBg, color: c.inputText, borderColor: c.cardBorder }];

  return (
    <View style={[formStyles.wrapper, { backgroundColor: c.card }]}>
      <View style={formStyles.headerRow}>
        <Text style={[formStyles.kicker, { color: c.subtitle }]}>EDITAR PERFIL</Text>
        <Pressable onPress={onClose} hitSlop={10}>
          <Text style={[formStyles.close, { color: c.subtitle }]}>Cerrar</Text>
        </Pressable>
      </View>

      <Text style={[formStyles.label, { color: c.subtitle }]}>FOTO DE PERFIL</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={formStyles.avatar} />
        ) : (
          <View style={[formStyles.avatar, formStyles.avatarFallback]}>
            <Text style={formStyles.avatarLetter}>{(user?.name || '?').charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <Pressable onPress={pickAvatar} disabled={uploading} style={formStyles.pickBtn}>
          <Text style={[formStyles.pickBtnText, { color: c.title }]}>{uploading ? 'Subiendo…' : 'Cambiar'}</Text>
        </Pressable>
      </View>

      <Text style={[formStyles.label, { color: c.subtitle, marginTop: 12 }]}>NOMBRE</Text>
      <TextInput style={inputStyle} value={name} onChangeText={setName} />

      <Text style={[formStyles.label, { color: c.subtitle, marginTop: 12 }]}>EMAIL</Text>
      <TextInput style={[inputStyle, { opacity: 0.6 }]} value={user?.email || ''} editable={false} />
      <Text style={[formStyles.hint, { color: c.subtitle }]}>
        Para cambiar tu email escribinos a {CONTACT_EMAIL}.
      </Text>

      <Pressable
        onPress={save}
        disabled={saving || !name.trim()}
        style={[formStyles.saveBtn, (saving || !name.trim()) && { opacity: 0.5 }]}
      >
        <Text style={formStyles.saveBtnText}>{saving ? 'Guardando…' : 'Guardar cambios'}</Text>
      </Pressable>
      {msg ? <Text style={[formStyles.savedMsg, { color: '#3ECFB2' }]}>{msg}</Text> : null}
      {err ? <Text style={[formStyles.savedMsg, { color: palette.coral }]}>{err}</Text> : null}
    </View>
  );
}

// ------------------------------------------------------------------ //
// VetEditForm — edita todos los datos de la vet incluyendo logo, portada,
// mapa y catálogo de servicios.
// ------------------------------------------------------------------ //
function VetEditForm({ vet, c, onClose, onSaved }) {
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
  const initialServices = vet.services || [];
  const catalogSet = new Set(SERVICE_CATALOG);
  const [servicesSelected, setServicesSelected] = useState(
    () => new Set(initialServices.filter((s) => catalogSet.has(s)))
  );
  const [servicesOther, setServicesOther] = useState(
    initialServices.filter((s) => !catalogSet.has(s)).join(', ')
  );
  const toggleService = (s) => {
    setServicesSelected((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [uploadingKind, setUploadingKind] = useState(null);
  const [logoUrl, setLogoUrl] = useState(vet.logo_url || '');
  const [coverUrl, setCoverUrl] = useState(vet.cover_url || '');
  const [mapPosition, setMapPosition] = useState(
    vet.lat != null && vet.lng != null ? { lat: vet.lat, lng: vet.lng } : null
  );

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
      const otros = servicesOther.split(',').map((s) => s.trim()).filter(Boolean);
      const services = [...SERVICE_CATALOG.filter((s) => servicesSelected.has(s)), ...otros];
      const body = { ...form, services };
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

  const inputStyle = [formStyles.input, { backgroundColor: c.inputBg, color: c.inputText, borderColor: c.cardBorder }];

  return (
    <View style={[formStyles.wrapper, { backgroundColor: c.card }]}>
      <View style={formStyles.headerRow}>
        <Text style={[formStyles.kicker, { color: c.subtitle }]}>EDITAR PERFIL VET</Text>
        <Pressable onPress={onClose} hitSlop={10}>
          <Text style={[formStyles.close, { color: c.subtitle }]}>Cerrar</Text>
        </Pressable>
      </View>

      <View style={formStyles.imageRow}>
        <View style={{ flex: 1, alignItems: 'flex-start' }}>
          <Text style={[formStyles.label, { color: c.subtitle }]}>LOGO</Text>
          {logoUrl ? (
            <Image source={{ uri: logoUrl }} style={formStyles.logoImg} />
          ) : (
            <View style={[formStyles.logoImg, formStyles.avatarFallback, { backgroundColor: palette.noche }]}>
              <Text style={[formStyles.avatarLetter, { color: palette.crema }]}>{vet.name.charAt(0)}</Text>
            </View>
          )}
          <Pressable
            onPress={() => pickAndUpload('logo')}
            disabled={uploadingKind !== null}
            style={formStyles.pickBtn}
          >
            <Text style={[formStyles.pickBtnText, { color: c.title }]}>
              {uploadingKind === 'logo' ? 'Subiendo…' : 'Cambiar'}
            </Text>
          </Pressable>
        </View>
        <View style={{ flex: 1, alignItems: 'flex-start' }}>
          <Text style={[formStyles.label, { color: c.subtitle }]}>PORTADA</Text>
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} style={formStyles.coverImg} />
          ) : (
            <View style={[formStyles.coverImg, { backgroundColor: c.bg }]} />
          )}
          <Pressable
            onPress={() => pickAndUpload('cover')}
            disabled={uploadingKind !== null}
            style={formStyles.pickBtn}
          >
            <Text style={[formStyles.pickBtnText, { color: c.title }]}>
              {uploadingKind === 'cover' ? 'Subiendo…' : 'Cambiar'}
            </Text>
          </Pressable>
        </View>
      </View>

      {[
        { k: 'name', label: 'NOMBRE' },
        { k: 'phone', label: 'TELÉFONO', placeholder: '+598 …' },
        { k: 'whatsapp', label: 'WHATSAPP', placeholder: '+598 …' },
        { k: 'website', label: 'SITIO WEB', placeholder: 'https://…' },
        { k: 'instagram', label: 'INSTAGRAM', placeholder: '@handle' },
        { k: 'city', label: 'CIUDAD' },
        { k: 'address', label: 'DIRECCIÓN' },
      ].map((f) => (
        <View key={f.k} style={{ marginTop: 10 }}>
          <Text style={[formStyles.label, { color: c.subtitle }]}>{f.label}</Text>
          <TextInput
            style={inputStyle}
            value={form[f.k]}
            onChangeText={update(f.k)}
            placeholder={f.placeholder}
            placeholderTextColor={c.subtitle}
          />
        </View>
      ))}

      <View style={{ marginTop: 10 }}>
        <Text style={[formStyles.label, { color: c.subtitle }]}>UBICACIÓN EN EL MAPA</Text>
        <View style={formStyles.mapWrap}>
          <MapPicker
            value={mapPosition}
            onChange={(lat, lng) => setMapPosition({ lat, lng })}
            style={{ flex: 1 }}
          />
        </View>
        <Text style={[formStyles.hint, { color: c.subtitle }]}>
          Sin marcar acá, tu vet no aparece en el filtro "Cerca mío" del directorio.
        </Text>
      </View>

      <View style={{ marginTop: 10 }}>
        <Text style={[formStyles.label, { color: c.subtitle }]}>SOBRE LA CLÍNICA</Text>
        <TextInput
          style={[inputStyle, { minHeight: 80, textAlignVertical: 'top' }]}
          value={form.bio}
          onChangeText={update('bio')}
          multiline
          placeholder="Contá qué hacen, especialidades, horarios…"
          placeholderTextColor={c.subtitle}
        />
      </View>

      <View style={{ marginTop: 10 }}>
        <Text style={[formStyles.label, { color: c.subtitle }]}>SERVICIOS</Text>
        <View style={formStyles.chipsRow}>
          {SERVICE_CATALOG.map((s) => {
            const active = servicesSelected.has(s);
            return (
              <Pressable
                key={s}
                onPress={() => toggleService(s)}
                style={[
                  formStyles.chip,
                  active
                    ? { backgroundColor: palette.noche, borderColor: palette.noche }
                    : { backgroundColor: c.card, borderColor: c.cardBorder },
                ]}
              >
                <Text style={[formStyles.chipText, { color: active ? palette.crema : c.title }]}>
                  {s}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ marginTop: 10 }}>
        <Text style={[formStyles.label, { color: c.subtitle }]}>OTROS (separá por coma)</Text>
        <TextInput
          style={inputStyle}
          value={servicesOther}
          onChangeText={setServicesOther}
          placeholder="Ej: Homeopatía, Nutrición, Odontología…"
          placeholderTextColor={c.subtitle}
        />
      </View>

      <Pressable onPress={save} disabled={saving} style={[formStyles.saveBtn, saving && { opacity: 0.5 }]}>
        <Text style={formStyles.saveBtnText}>{saving ? 'Guardando…' : 'Guardar cambios'}</Text>
      </Pressable>
      {msg ? <Text style={[formStyles.savedMsg, { color: '#3ECFB2' }]}>{msg}</Text> : null}
      {err ? <Text style={[formStyles.savedMsg, { color: palette.coral }]}>{err}</Text> : null}
    </View>
  );
}

// ------------------------------------------------------------------ //
// Piezas de presentación del perfil.
// ------------------------------------------------------------------ //
function StatTile({ label, value, hint, accent, c }) {
  return (
    <View style={[styles.stat, { backgroundColor: c.card, borderTopColor: accent }]}>
      <Text style={[styles.statLabel, { color: c.text }]}>{label}</Text>
      <Text style={[styles.statValue, { color: c.title }]}>{value}</Text>
      {hint ? <Text style={[styles.statHint, { color: c.text }]}>{hint}</Text> : null}
    </View>
  );
}

function MetricTile({ label, value, c }) {
  return (
    <View style={[styles.metric, { backgroundColor: c.bg }]}>
      <Text style={[styles.metricValue, { color: c.title }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: c.text }]}>{label}</Text>
    </View>
  );
}

// Fila de la lista de reportes / alertas: foto, chip de estado, título,
// bajada y flecha.
function RecordRow({ photo, status, chipLabel, title, subtitle, unread, onPress, c }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, { backgroundColor: c.card, opacity: pressed ? 0.85 : 1 }]}
    >
      {photo ? (
        <Image source={{ uri: photo }} style={[styles.rowImg, { backgroundColor: c.arena }]} />
      ) : (
        <View style={[styles.rowImg, { backgroundColor: c.arena }]} />
      )}
      <View style={styles.rowBody}>
        <StatusChip status={status} label={chipLabel} />
        <Text style={[styles.rowTitle, { color: c.title }]} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={[styles.rowSub, { color: c.text }]} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {unread ? <View style={styles.unreadDot} /> : null}
      <ChevronRight size={20} color={c.text} strokeWidth={2} />
    </Pressable>
  );
}

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

// ------------------------------------------------------------------ //
// Profile — página única para users y vets. Espejo mobile del Profile
// unificado del web (client/src/pages/Profile.jsx).
// ------------------------------------------------------------------ //
export default function Profile() {
  const c = useTheme();
  const user = useSelector((s) => s.user.data);
  const dispatch = useDispatch();
  const bottomSpace = useTabBarSpace();

  const isVet = !!user?.has_vet;
  const isShelter = !!user?.has_shelter;

  // Reports
  const [reports, setReports] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Vet dashboard (solo si isVet)
  const [vetDash, setVetDash] = useState(null);
  const [vetLoaded, setVetLoaded] = useState(false);

  const [editing, setEditing] = useState(false);

  // Alertas unificadas — mismos 3 controles para user y vet. La fuente y el
  // endpoint destino cambian según isVet en fetch y saveAlerts.
  const [receivesLost, setReceivesLost] = useState(false);
  const [receivesFound, setReceivesFound] = useState(false);
  const [radius, setRadius] = useState(5);
  const [savingAlerts, setSavingAlerts] = useState(false);
  const [alertsMsg, setAlertsMsg] = useState('');

  // ---- Fetches ---- //
  const fetchReports = useCallback(async (pageNum = 1, append = false) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const { data } = await api.get('/api/pets/my-reports', {
        params: { page: pageNum, limit: 10 },
      });
      setReports((prev) => (append ? [...prev, ...data.reports] : data.reports));
      setPage(data.page);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch {
      // silencioso
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  const fetchVetDashboard = useCallback(async () => {
    try {
      const { data } = await api.get('/api/vets/me/dashboard');
      setVetDash(data);
      setReceivesLost(data.vet.receives_lost);
      setReceivesFound(data.vet.receives_found);
      setRadius(data.vet.alert_radius_km);
    } catch { /* silencioso */ }
    finally { setVetLoaded(true); }
  }, []);

  const fetchUserNotify = useCallback(async () => {
    try {
      const { data } = await api.get('/api/users/me');
      setReceivesLost(!!data?.notify_lost);
      setReceivesFound(!!data?.notify_found);
      if (Number.isFinite(data?.notify_radius_km)) setRadius(data.notify_radius_km);
      if (data?.avatar_url && data.avatar_url !== user?.avatar_url) {
        dispatch(updateUserData({ avatar_url: data.avatar_url }));
      }
    } catch { /* silencioso */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchReports();
    if (isVet) fetchVetDashboard();
    else fetchUserNotify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVet]);

  // ---- Handlers ---- //
  const saveAlerts = async () => {
    setSavingAlerts(true);
    setAlertsMsg('');
    try {
      if (isVet && vetDash?.vet) {
        await api.patch('/api/vets/me/alerts', {
          receives_lost: receivesLost,
          receives_found: receivesFound,
          alert_radius_km: radius,
        });
      } else {
        await api.patch('/api/users/notify-nearby', {
          notify_lost: receivesLost,
          notify_found: receivesFound,
          notify_radius_km: radius,
        });
        if (receivesLost || receivesFound) {
          updateLocationIfPermitted().catch(() => {});
        }
      }
      setAlertsMsg('Guardado.');
      setTimeout(() => setAlertsMsg(''), 2500);
    } catch {
      setAlertsMsg('No se pudo guardar.');
    } finally {
      setSavingAlerts(false);
    }
  };

  const handleLogout = () => {
    dispatch(clearCredentials());
    router.replace('/home');
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Eliminar tu cuenta',
      'Tus datos y tus reportes se conservan y podés recuperarla iniciando sesión con este mismo email más adelante.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete('/api/users/me');
              dispatch(clearCredentials());
              router.replace('/home');
            } catch (e) {
              Alert.alert('Error', e.response?.data?.error || 'No se pudo eliminar la cuenta.');
            }
          },
        },
      ]
    );
  };

  // ---- Render helpers ---- //
  const renderItem = ({ item }) => {
    const isResolved = !!item.resolved_at;
    const status = isResolved ? 'reunited' : item.status;
    const label = isResolved ? 'Reencontrada ✓' : STATUS_LABEL[item.status];
    const title = item.name
      || (item.description && item.description !== 'Desconocido' ? item.description : 'Sin descripción');
    return (
      <View style={styles.itemWrap}>
        <RecordRow
          c={c}
          photo={item.photo_url}
          status={status}
          chipLabel={label}
          title={title}
          subtitle="Ver publicación"
          onPress={() => router.push(`/pet/${item.id}`)}
        />
      </View>
    );
  };

  // ---- Loading combinado ---- //
  if (loading || (isVet && !vetLoaded)) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator color={c.title} />
      </View>
    );
  }

  if (!user) return null;

  // Shelter: vista aparte (sin reports, sin alertas nearby, sin chat).
  if (isShelter) return <ShelterPanel />;

  const vet = vetDash?.vet;
  const displayName = isVet && vet?.name ? vet.name : (user?.name || 'Usuario');
  const displayAvatar = isVet ? vet?.logo_url : user?.avatar_url;
  const successRate = vetDash && vetDash.stats.total_pets > 0
    ? Math.round((vetDash.stats.resolved_pets / vetDash.stats.total_pets) * 100)
    : null;
  const headerColor = isVet ? sectionColors.perfilVet : sectionColors.perfilUsuario;
  const fg = onColor(headerColor);
  const subColor = isVet ? '#D9D9E3' : palette.arena;

  const editButton = (
    <Pressable
      onPress={() => setEditing((v) => !v)}
      hitSlop={6}
      style={({ pressed }) => [
        styles.editBtn,
        { borderColor: isVet ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.5)', opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Pencil size={14} color={fg} strokeWidth={2} />
      <Text style={[styles.editBtnText, { color: fg }]}>
        {editing ? 'Cerrar' : isVet ? 'Editar perfil de la clínica' : 'Editar'}
      </Text>
    </Pressable>
  );

  const header = (
    <View>
      <SectionHeader color={headerColor} showBack={false} centerLabel="Mi cuenta" style={styles.sectionHeader}>
        <View style={styles.heroRow}>
          {displayAvatar ? (
            <Image source={{ uri: displayAvatar }} style={[styles.avatar, isVet && styles.avatarSquare]} />
          ) : (
            <View
              style={[
                styles.avatar,
                isVet && styles.avatarSquare,
                { backgroundColor: isVet ? palette.crema : palette.violeta },
              ]}
            >
              <Text style={styles.avatarLetter}>{displayName.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.heroTexts}>
            <Text style={[styles.name, { color: fg }]} numberOfLines={2}>{displayName}</Text>
            {isVet && vet ? (
              <View style={styles.badgeRow}>
                {vet.is_sponsor ? <SponsorBadge vet={vet} /> : null}
                {!vet.is_sponsor ? (
                  <View style={styles.outlineBadge}>
                    <Text style={[styles.outlineBadgeText, { color: fg }]}>Aliada</Text>
                  </View>
                ) : null}
                {!vet.approved ? (
                  <View style={[styles.outlineBadge, styles.pendingBadge]}>
                    <Text style={[styles.outlineBadgeText, { color: palette.noche }]}>Pendiente</Text>
                  </View>
                ) : null}
              </View>
            ) : null}
            {(isVet ? vet?.email : user?.email) ? (
              <Text style={[styles.email, { color: subColor }]} numberOfLines={1}>
                {isVet ? vet.email : user.email}
              </Text>
            ) : null}
          </View>
          {!isVet ? editButton : null}
        </View>
        {isVet ? editButton : null}
      </SectionHeader>

      <View style={styles.body}>
        {editing ? (
          isVet && vet ? (
            <VetEditForm vet={vet} c={c} onClose={() => setEditing(false)} onSaved={fetchVetDashboard} />
          ) : (
            <UserEditForm user={user} c={c} dispatch={dispatch} onClose={() => setEditing(false)} />
          )
        ) : null}

        {/* STATS del vet */}
        {isVet && vetDash ? (
          <View style={styles.statsGrid}>
            <StatTile c={c} accent={palette.coral} label="Mascotas publicadas" value={vetDash.stats.total_pets} />
            <StatTile
              c={c}
              accent={palette.teal}
              label="Reencontradas"
              value={vetDash.stats.resolved_pets}
              hint={successRate !== null ? `${successRate}% tasa` : null}
            />
            <StatTile
              c={c}
              accent={palette.sol}
              label="Alertas"
              value={vetDash.stats.total_alerts}
              hint={vetDash.stats.unread_alerts > 0 ? `${vetDash.stats.unread_alerts} sin leer` : 'al día'}
            />
            <StatTile c={c} accent={palette.violeta} label="Radio" value={`${vet.alert_radius_km} km`} />
          </View>
        ) : null}

        {/* Métricas de publicidad (solo sponsors — ally no aparece como ad) */}
        {isVet && vet?.is_sponsor && vetDash?.ad_stats_30d ? (
          <View style={[styles.card, { backgroundColor: c.card }]}>
            <View>
              <Text style={[styles.cardLabel, { color: c.text }]}>Métricas de publicidad</Text>
              <Text style={[styles.small, { color: c.text }]}>
                Últimos 30 días{adRadiusOf(vet) ? ` · alcance ${adRadiusOf(vet)} km` : ''}
              </Text>
            </View>
            <View style={styles.metricsRow}>
              <MetricTile c={c} label="Impresiones" value={String(vetDash.ad_stats_30d.impressions)} />
              <MetricTile c={c} label="Clicks en tu card" value={String(vetDash.ad_stats_30d.ad_clicks)} />
              <MetricTile c={c} label="Contactos" value={String(vetDash.ad_stats_30d.contact_clicks)} />
            </View>
            <Text style={[styles.tiny, { color: c.text }]}>Contactos: WhatsApp, teléfono, web e Instagram.</Text>
          </View>
        ) : null}

        {/* SPONSOR CTA — solo si es vet no sponsor */}
        {isVet && vet && !vet.is_sponsor ? (
          <View style={[styles.card, styles.ctaCard, { backgroundColor: c.card }]}>
            <View style={{ gap: 4 }}>
              <Text style={[styles.cardLabel, { color: c.text }]}>Sumate como</Text>
              <View style={styles.ctaTitleRow}>
                <Text style={[styles.ctaTitle, { color: c.title }]}>Socio Mimo</Text>
                <Star size={22} color={palette.sol} fill={palette.sol} strokeWidth={2} />
              </View>
            </View>
            <View style={styles.tiersRow}>
              {Object.values(SPONSOR_TIERS).map((t) => (
                <View key={t.tierLabel} style={[styles.tierBox, { backgroundColor: t.color }]}>
                  <Text style={styles.tierName}>{t.tierLabel}</Text>
                  <Text style={styles.tierKm}>{t.adRadiusKm} km</Text>
                  <Text style={styles.tierSub}>de alcance</Text>
                </View>
              ))}
            </View>
            <View style={{ gap: 8 }}>
              {[
                'Card destacada en el directorio y en Explorar',
                'Badge Socio Mimo en cada publicación',
                'Dashboard con métricas de publicidad',
              ].map((b) => (
                <View key={b} style={styles.benefit}>
                  <Check size={16} color={c.text} strokeWidth={2.5} style={{ marginTop: 2 }} />
                  <Text style={[styles.benefitText, { color: c.text }]}>{b}</Text>
                </View>
              ))}
            </View>
            <Button
              variant="dark"
              title="Quiero ser Socio Mimo"
              onPress={() => Linking.openURL(mailtoContact('Quiero ser Socio Mimo'))}
              style={styles.btn52}
              textStyle={styles.btnText15}
            />
          </View>
        ) : null}

        {/* Reportes activos (user) */}
        {!isVet ? (
          <View style={styles.activeCard}>
            <View>
              <Text style={styles.activeLabel}>Reportes activos</Text>
              <Text style={styles.activeNumber}>{total}</Text>
            </View>
            <Button
              icon={Plus}
              title="Nuevo reporte"
              onPress={() => router.push('/report')}
              style={styles.newBtn}
              textStyle={styles.btnText14}
            />
          </View>
        ) : null}

        {/* MIS REPORTES (vet) — lista completa con paginación. */}
        {isVet ? (
          <View style={styles.listSection}>
            <View style={styles.sectionHead}>
              <Text style={[styles.sectionTitle, { color: c.title }]}>Mis reportes</Text>
              <Button
                icon={Plus}
                title="Nuevo"
                onPress={() => router.push('/report')}
                style={styles.smallBtn}
                textStyle={styles.btnText13}
              />
            </View>
            {reports.length === 0 ? (
              <Text style={[styles.empty, { color: c.text }]}>Todavía no publicaste ningún reporte.</Text>
            ) : (
              reports.map((p) => (
                <RecordRow
                  key={p.id}
                  c={c}
                  photo={p.photo_url}
                  status={p.resolved_at ? 'reunited' : p.status}
                  chipLabel={p.resolved_at ? 'Reencontrada ✓' : STATUS_LABEL[p.status]}
                  title={p.name || (p.status === 'lost' ? 'Sin nombre' : 'Encontrada')}
                  subtitle={formatDate(p.created_at) || p.address || 'Sin ubicación'}
                  onPress={() => router.push(`/pet/${p.id}`)}
                />
              ))
            )}
            {page < totalPages ? (
              <Button
                variant="outline"
                title={loadingMore ? 'Cargando…' : `Cargar más (${page} de ${totalPages})`}
                onPress={() => fetchReports(page + 1, true)}
                disabled={loadingMore}
                style={styles.btn52}
                textStyle={styles.btnText15}
              />
            ) : null}
          </View>
        ) : null}

        {/* ALERTAS RECIENTES vet */}
        {isVet && vetDash ? (
          <View style={styles.listSection}>
            <Text style={[styles.sectionTitle, { color: c.title }]}>Alertas recientes</Text>
            {vetDash.recent_alerts.length === 0 ? (
              <Text style={[styles.empty, { color: c.text }]}>Sin alertas por ahora.</Text>
            ) : (
              vetDash.recent_alerts.map((a) => {
                const isLost = a.type === 'nearby_vet_lost';
                const petId = a.data?.pet_id;
                return (
                  <RecordRow
                    key={a.id}
                    c={c}
                    photo={a.pet_photo}
                    status={isLost ? 'lost' : 'found'}
                    chipLabel={isLost ? 'Perdida cerca' : 'Encontrada cerca'}
                    title={a.pet_name || 'Sin nombre'}
                    subtitle={a.pet_address || 'Sin ubicación'}
                    unread={!a.read_at}
                    onPress={() => petId && router.push(`/pet/${petId}`)}
                  />
                );
              })
            )}
          </View>
        ) : null}

        {/* "Mis registros" cierra el header: los items del FlatList se
            renderizan justo después, así que el título tiene que quedar pegado
            a su lista. Todo lo que va debajo (alertas, cuentas vinculadas,
            sesión) vive en el footer. */}
        {!isVet ? <Text style={[styles.sectionTitle, styles.recordsTitle, { color: c.title }]}>Mis registros</Text> : null}
      </View>
    </View>
  );

  // Pie: ajustes y acciones de cuenta. Van DESPUÉS de los registros porque son
  // configuración que se toca una vez, no lo que uno viene a ver al entrar.
  const footer = (
    <View style={styles.footer}>
      {/* CONFIGURACIÓN DE ALERTAS — mismos 3 controles para user y vet. El
          endpoint destino cambia en saveAlerts según isVet. */}
      <View style={[styles.card, styles.alertsCard, { backgroundColor: c.card }]}>
        <View style={styles.cardLabelRow}>
          <Bell size={15} color={c.text} strokeWidth={2} />
          <Text style={[styles.cardLabel, { color: c.text }]}>Configuración de alertas</Text>
        </View>

        <View style={styles.toggleRow}>
          <View style={styles.flex}>
            <Text style={[styles.toggleTitle, { color: c.title }]}>Mascotas perdidas</Text>
            <Text style={[styles.small, { color: c.text }]}>
              Recibir alerta cuando reporten una perdida en tu radio.
            </Text>
          </View>
          <Switch
            value={receivesLost}
            onValueChange={setReceivesLost}
            trackColor={{ false: palette.arena, true: palette.teal }}
            thumbColor={palette.blanco}
          />
        </View>

        <View style={[styles.toggleRow, styles.divided, { borderTopColor: c.cardBorder }]}>
          <View style={styles.flex}>
            <Text style={[styles.toggleTitle, { color: c.title }]}>Mascotas encontradas</Text>
            <Text style={[styles.small, { color: c.text }]}>Recibir alerta cuando reporten una encontrada.</Text>
          </View>
          <Switch
            value={receivesFound}
            onValueChange={setReceivesFound}
            trackColor={{ false: palette.arena, true: palette.teal }}
            thumbColor={palette.blanco}
          />
        </View>

        <View style={[styles.radiusBox, styles.divided, { borderTopColor: c.cardBorder }]}>
          <View style={styles.radiusHeader}>
            <Text style={[styles.toggleTitle, { color: c.title }]}>Radio de alerta</Text>
            <Text style={[styles.radiusValue, { color: c.title }]}>{radius} km</Text>
          </View>
          <View style={styles.radiusPresets}>
            {RADIUS_PRESETS.map((r) => {
              const active = radius === r;
              return (
                <Pressable
                  key={r}
                  onPress={() => setRadius(r)}
                  style={[
                    styles.radiusPreset,
                    active
                      ? { backgroundColor: palette.noche, borderColor: palette.noche }
                      : { backgroundColor: c.card, borderColor: c.cardBorder },
                  ]}
                >
                  <Text style={[styles.radiusPresetText, { color: active ? palette.crema : c.title }]}>{r} km</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Button
          variant="dark"
          title={savingAlerts ? 'Guardando…' : 'Guardar cambios'}
          onPress={saveAlerts}
          disabled={savingAlerts}
          style={[styles.btn52, { marginTop: 12 }]}
          textStyle={styles.btnText15}
        />
        {alertsMsg ? <Text style={[styles.savedMsg, { color: c.text }]}>{alertsMsg}</Text> : null}
      </View>

      <LinkedAccounts c={c} />

      <View style={{ gap: 4 }}>
        <Button
          variant="outline"
          icon={LogOut}
          title="Cerrar sesión"
          onPress={handleLogout}
          style={styles.btn52}
          textStyle={styles.btnText15}
        />
        <Pressable onPress={handleDeleteAccount} style={styles.deleteBtn}>
          <Text style={[styles.deleteBtnText, { color: c.text }]}>Eliminar cuenta</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <FlatList
        // Vet: reports ya se renderiza inline en el header (bloque MIS REPORTES).
        data={isVet ? [] : reports}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingBottom: bottomSpace }}
        ListEmptyComponent={
          !isVet ? (
            <Text style={[styles.empty, { color: c.text }]}>Todavía no publicaste ningún reporte.</Text>
          ) : null
        }
        ListFooterComponent={
          <View style={styles.body}>
            {/* "Cargar más" primero: pertenece a la lista de arriba. */}
            {!isVet && page < totalPages ? (
              <Button
                variant="outline"
                title={loadingMore ? 'Cargando…' : `Cargar más (${page} de ${totalPages})`}
                onPress={() => fetchReports(page + 1, true)}
                disabled={loadingMore}
                style={styles.btn52}
                textStyle={styles.btnText15}
              />
            ) : null}
            {footer}
          </View>
        }
      />
      <TabBar />
    </View>
  );
}

// ------------------------------------------------------------------ //
// Styles
// ------------------------------------------------------------------ //
const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, minWidth: 0 },
  sectionHeader: { marginBottom: 20 },
  body: { paddingHorizontal: 20, gap: 24 },
  footer: { gap: 24, marginTop: 12 },
  itemWrap: { paddingHorizontal: 20, marginBottom: 12 },
  recordsTitle: { marginBottom: 12 },

  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: {
    width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center',
    backgroundColor: palette.arena,
  },
  avatarSquare: { borderRadius: 22 },
  avatarLetter: { fontFamily: fonts.display, fontSize: 30, color: palette.noche },
  heroTexts: { flex: 1, minWidth: 0, gap: 4 },
  name: { fontFamily: fonts.display, fontSize: 26, lineHeight: 30 },
  email: { fontFamily: fonts.regular, fontSize: 14 },
  badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  outlineBadge: {
    height: 20, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center',
  },
  pendingBadge: { backgroundColor: palette.sol, borderColor: palette.sol },
  outlineBadgeText: { fontFamily: fonts.bold, fontSize: 11 },
  editBtn: {
    alignSelf: 'flex-start', height: 40, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  editBtnText: { fontFamily: fonts.bold, fontSize: 13 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: {
    flexGrow: 1, flexBasis: '45%', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 20,
    borderTopWidth: 4, gap: 4,
  },
  statLabel: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.66, textTransform: 'uppercase' },
  statValue: { fontFamily: fonts.display, fontSize: 28, lineHeight: 32 },
  statHint: { fontFamily: fonts.regular, fontSize: 12 },

  card: { borderRadius: 24, padding: 18, gap: 14 },
  cardLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  cardLabel: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  small: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  tiny: { fontFamily: fonts.regular, fontSize: 12 },
  metricsRow: { flexDirection: 'row', gap: 8 },
  metric: { flex: 1, borderRadius: 16, padding: 12, gap: 2 },
  metricValue: { fontFamily: fonts.display, fontSize: 22 },
  metricLabel: { fontFamily: fonts.bold, fontSize: 11 },

  ctaCard: { borderWidth: 2, borderColor: palette.sol },
  ctaTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ctaTitle: { fontFamily: fonts.display, fontSize: 24 },
  tiersRow: { flexDirection: 'row', gap: 8 },
  tierBox: { flex: 1, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 10, gap: 6 },
  tierName: { fontFamily: fonts.bold, fontSize: 12, color: palette.arena },
  tierKm: { fontFamily: fonts.display, fontSize: 20, color: palette.arena },
  tierSub: { fontFamily: fonts.regular, fontSize: 11, color: palette.arena },
  benefit: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  benefitText: { flex: 1, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },

  activeCard: {
    backgroundColor: palette.noche, borderRadius: 24, padding: 20, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between', gap: 16,
  },
  activeLabel: { fontFamily: fonts.bold, fontSize: 13, color: palette.arena },
  activeNumber: { fontFamily: fonts.display, fontSize: 44, lineHeight: 48, color: palette.arena },
  newBtn: { height: 48, borderRadius: 16, paddingHorizontal: 18 },
  smallBtn: { height: 40, borderRadius: 12, paddingHorizontal: 14 },
  btn52: { height: 52, borderRadius: 16 },
  btnText15: { fontSize: 15 },
  btnText14: { fontSize: 14 },
  btnText13: { fontSize: 13 },

  listSection: { gap: 12 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: fonts.display, fontSize: 20 },
  row: { borderRadius: 20, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowImg: { width: 64, height: 64, borderRadius: 14 },
  rowBody: { flex: 1, minWidth: 0, gap: 4 },
  rowTitle: { fontFamily: fonts.display, fontSize: 16 },
  rowSub: { fontFamily: fonts.regular, fontSize: 12 },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: palette.coral },
  empty: { textAlign: 'center', fontFamily: fonts.medium, fontSize: 15, marginTop: 8, paddingHorizontal: 20 },

  alertsCard: { gap: 0 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  divided: { borderTopWidth: 1 },
  toggleTitle: { fontFamily: fonts.bold, fontSize: 15 },
  radiusBox: { paddingTop: 12, paddingBottom: 4, gap: 10 },
  radiusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  radiusValue: { fontFamily: fonts.display, fontSize: 18 },
  radiusPresets: { flexDirection: 'row', gap: 8 },
  radiusPreset: { flex: 1, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  radiusPresetText: { fontFamily: fonts.bold, fontSize: 14 },
  savedMsg: { fontFamily: fonts.bold, textAlign: 'center', fontSize: 13, marginTop: 8 },

  deleteBtn: { height: 48, alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { fontFamily: fonts.medium, fontSize: 14, textDecorationLine: 'underline' },
});

const formStyles = StyleSheet.create({
  wrapper: { marginTop: 12, padding: 18, borderRadius: 24 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  kicker: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  close: { fontFamily: fonts.bold, fontSize: 13, textDecorationLine: 'underline' },
  label: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  input: {
    minHeight: 52, borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: fonts.regular, fontSize: 15,
  },
  hint: { fontFamily: fonts.regular, fontSize: 13, marginTop: 6, lineHeight: 18 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: palette.arena },
  avatarFallback: { backgroundColor: palette.violeta, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontFamily: fonts.display, color: palette.noche, fontSize: 24 },
  pickBtn: { height: 40, borderRadius: 12, paddingHorizontal: 14, borderWidth: 2, borderColor: palette.noche, justifyContent: 'center', marginTop: 8 },
  pickBtnText: { fontFamily: fonts.bold, fontSize: 13 },
  saveBtn: { backgroundColor: palette.noche, borderRadius: 16, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  saveBtnText: { fontFamily: fonts.bold, color: palette.crema, fontSize: 15 },
  savedMsg: { fontFamily: fonts.bold, textAlign: 'center', fontSize: 13, marginTop: 8 },
  imageRow: { flexDirection: 'row', gap: 12, marginBottom: 6 },
  logoImg: { width: 60, height: 60, borderRadius: 18, backgroundColor: palette.arena },
  coverImg: { width: 96, height: 60, borderRadius: 16 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  chip: { height: 40, borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, justifyContent: 'center' },
  chipText: { fontFamily: fonts.medium, fontSize: 14 },
  mapWrap: { height: 240, borderRadius: 16, overflow: 'hidden', backgroundColor: palette.arena, marginTop: 2 },
});
