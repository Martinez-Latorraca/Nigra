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
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import * as ImagePicker from 'expo-image-picker';
import api from '../src/lib/api';
import { updateLocationIfPermitted } from '../src/lib/location';
import { useTheme } from '../src/lib/theme';
import { clearCredentials, updateUserData } from '../src/store/userSlice';
import MenuButton from '../src/components/MenuButton';
import LinkedAccounts from '../src/components/LinkedAccounts';
import MapPicker from '../src/components/MapPicker';
import ShelterPanel from '../src/components/ShelterPanel';
import { adRadiusOf } from '../src/lib/sponsorTiers';

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

  const inputStyle = [formStyles.input, { backgroundColor: c.bg, color: c.title, borderColor: c.cardBorder }];

  return (
    <View style={[formStyles.wrapper, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
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
        <Pressable onPress={pickAvatar} disabled={uploading} style={[formStyles.pickBtn, { borderColor: c.cardBorder }]}>
          <Text style={[formStyles.pickBtnText, { color: c.title }]}>{uploading ? 'Subiendo…' : 'Cambiar'}</Text>
        </Pressable>
      </View>

      <Text style={[formStyles.label, { color: c.subtitle, marginTop: 12 }]}>NOMBRE</Text>
      <TextInput style={inputStyle} value={name} onChangeText={setName} />

      <Text style={[formStyles.label, { color: c.subtitle, marginTop: 12 }]}>EMAIL</Text>
      <TextInput style={[inputStyle, { opacity: 0.6 }]} value={user?.email || ''} editable={false} />
      <Text style={[formStyles.hint, { color: c.subtitle }]}>
        Para cambiar tu email escribinos a somos.mimo.app@gmail.com.
      </Text>

      <Pressable
        onPress={save}
        disabled={saving || !name.trim()}
        style={[formStyles.saveBtn, (saving || !name.trim()) && { opacity: 0.5 }]}
      >
        <Text style={formStyles.saveBtnText}>{saving ? 'Guardando…' : 'Guardar cambios'}</Text>
      </Pressable>
      {msg ? <Text style={[formStyles.savedMsg, { color: '#3ECFB2' }]}>{msg}</Text> : null}
      {err ? <Text style={[formStyles.savedMsg, { color: '#EF4444' }]}>{err}</Text> : null}
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

  const inputStyle = [formStyles.input, { backgroundColor: c.bg, color: c.title, borderColor: c.cardBorder }];

  return (
    <View style={[formStyles.wrapper, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
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
            <View style={[formStyles.logoImg, formStyles.avatarFallback]}>
              <Text style={formStyles.avatarLetter}>{vet.name.charAt(0)}</Text>
            </View>
          )}
          <Pressable
            onPress={() => pickAndUpload('logo')}
            disabled={uploadingKind !== null}
            style={[formStyles.pickBtn, { borderColor: c.cardBorder }]}
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
            style={[formStyles.pickBtn, { borderColor: c.cardBorder }]}
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
                    ? { backgroundColor: '#FF5C6C', borderColor: '#FF5C6C' }
                    : { backgroundColor: c.bg, borderColor: c.cardBorder },
                ]}
              >
                <Text style={[formStyles.chipText, { color: active ? '#fff' : c.title }]}>
                  {active ? '✓ ' : ''}{s}
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
      {err ? <Text style={[formStyles.savedMsg, { color: '#EF4444' }]}>{err}</Text> : null}
    </View>
  );
}

function StatTile({ label, value, hint, accent, c }) {
  return (
    <View style={[styles.stat, { backgroundColor: c.card, borderColor: c.cardBorder, borderTopColor: accent, borderTopWidth: 3 }]}>
      <Text style={[styles.statLabel, { color: c.subtitle }]}>{label}</Text>
      <Text style={[styles.statValue, { color: c.title }]}>{value}</Text>
      {hint ? <Text style={[styles.statHint, { color: c.subtitle }]}>{hint}</Text> : null}
    </View>
  );
}

// ------------------------------------------------------------------ //
// Profile — página única para users y vets. Espejo mobile del Profile
// unificado del web (client/src/pages/Profile.jsx).
// ------------------------------------------------------------------ //
export default function Profile() {
  const c = useTheme();
  const user = useSelector((s) => s.user.data);
  const dispatch = useDispatch();

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
    const isLost = item.status === 'lost';
    const isResolved = !!item.resolved_at;
    return (
      <Pressable
        onPress={() => router.push(`/pet/${item.id}`)}
        style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}
      >
        <Image source={{ uri: item.photo_url }} style={styles.cardImg} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardStatus, { color: isResolved ? '#3B82F6' : isLost ? '#EF4444' : '#22C55E' }]}>
            {isResolved ? 'Reencontrada ✓' : isLost ? 'Buscando' : 'Registrado'}
          </Text>
          <Text style={[styles.cardTitle, { color: c.title }]} numberOfLines={1}>
            {item.description && item.description !== 'Desconocido' ? item.description : 'Sin descripción'}
          </Text>
          <Text style={[styles.cardHint, { color: c.subtitle }]}>Ver publicación ›</Text>
        </View>
      </Pressable>
    );
  };

  // ---- Loading combinado ---- //
  if (loading || (isVet && !vetLoaded)) {
    return (
      <SafeAreaView style={[styles.container, styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator color={c.title} />
      </SafeAreaView>
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

  const header = (
    <View>
      <View style={styles.headerTop}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[styles.back, { color: c.subtitle }]}>‹ Volver</Text>
        </Pressable>
        <MenuButton />
      </View>

      <Text style={[styles.kicker, { color: c.subtitle }]}>MI CUENTA</Text>

      {/* HERO unificado: avatar (foto o inicial) + nombre + badges (si vet) o email (si user) */}
      <View style={styles.heroRow}>
        {displayAvatar ? (
          <Image source={{ uri: displayAvatar }} style={styles.heroAvatar} />
        ) : (
          <View style={[styles.heroAvatar, styles.heroAvatarFallback]}>
            <Text style={styles.heroAvatarLetter}>{displayName.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: c.title }]}>{displayName}.</Text>
          {isVet && vet ? (
            <View style={styles.badgeRow}>
              {vet.is_sponsor ? (
                <View style={styles.sponsorBadge}>
                  <Text style={styles.sponsorText}>⭐ SOCIO MIMO</Text>
                </View>
              ) : (
                <View style={[styles.miniBadge, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
                  <Text style={[styles.miniBadgeText, { color: c.subtitle }]}>ALIADA</Text>
                </View>
              )}
              {!vet.approved && (
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingText}>PENDIENTE</Text>
                </View>
              )}
            </View>
          ) : user?.email ? (
            <Text style={[styles.email, { color: c.subtitle }]}>{user.email}</Text>
          ) : null}
        </View>
      </View>

      <Pressable
        onPress={() => setEditing((v) => !v)}
        style={[styles.editBtn, { backgroundColor: c.primary }]}
      >
        <Text style={[styles.editBtnText, { color: c.primaryText }]}>
          {editing ? 'Cerrar' : 'Editar perfil'}
        </Text>
      </Pressable>

      {editing ? (
        isVet && vet ? (
          <VetEditForm
            vet={vet}
            c={c}
            onClose={() => setEditing(false)}
            onSaved={fetchVetDashboard}
          />
        ) : (
          <UserEditForm user={user} c={c} dispatch={dispatch} onClose={() => setEditing(false)} />
        )
      ) : null}

      {/* STATS del vet — solo si es vet */}
      {isVet && vetDash ? (
        <View style={styles.statsGrid}>
          <StatTile c={c} accent="#FF5C6C" label="MASCOTAS PUBLICADAS" value={vetDash.stats.total_pets} />
          <StatTile c={c} accent="#3ECFB2" label="REENCONTRADAS"
            value={vetDash.stats.resolved_pets}
            hint={successRate !== null ? `${successRate}% tasa` : null}
          />
          <StatTile c={c} accent="#FFB830" label="ALERTAS"
            value={vetDash.stats.total_alerts}
            hint={vetDash.stats.unread_alerts > 0 ? `${vetDash.stats.unread_alerts} sin leer` : 'al día'}
          />
          <StatTile c={c} accent="#9B6DFF" label="RADIO"
            value={`${vet.alert_radius_km} km`}
          />
        </View>
      ) : null}

      {/* Métricas de publicidad (solo sponsors — ally no aparece como ad) */}
      {isVet && vet?.is_sponsor && vetDash?.ad_stats_30d ? (
        <View style={{ marginTop: 8 }}>
          <View style={styles.adStatsHeader}>
            <Text style={[styles.adStatsKicker, { color: c.subtitle }]}>
              MÉTRICAS DE PUBLICIDAD
              {adRadiusOf(vet) ? <Text style={{ color: c.text }}>  ·  alcance {adRadiusOf(vet)} km</Text> : null}
            </Text>
            <Text style={[styles.adStatsSub, { color: c.subtitle }]}>Últimos 30 días</Text>
          </View>
          <View style={styles.statsGrid}>
            <StatTile c={c} accent="#9B6DFF" label="IMPRESIONES"
              value={String(vetDash.ad_stats_30d.impressions)}
            />
            <StatTile c={c} accent="#FF5C6C" label="CLICKS EN TU CARD"
              value={String(vetDash.ad_stats_30d.ad_clicks)}
            />
            <StatTile c={c} accent="#3ECFB2" label="CONTACTOS"
              value={String(vetDash.ad_stats_30d.contact_clicks)}
              hint="WA · tel · web · IG"
            />
          </View>
        </View>
      ) : null}

      {/* Reportes activos (user) — solo si NO es vet, para no duplicar con stats */}
      {!isVet ? (
        <View style={[styles.statCard, { backgroundColor: c.primary }]}>
          <View>
            <Text style={[styles.statCardLabel, { color: c.primaryText, opacity: 0.6 }]}>Reportes activos</Text>
            <Text style={[styles.statNumber, { color: c.primaryText }]}>{total}</Text>
          </View>
          <Pressable
            style={[styles.newBtn, { backgroundColor: c.primaryText }]}
            onPress={() => router.push('/report')}
          >
            <Text style={[styles.newBtnText, { color: c.primary }]}>Nuevo reporte</Text>
          </Pressable>
        </View>
      ) : null}

      {/* SPONSOR CTA — solo si es vet no sponsor */}
      {isVet && vet && !vet.is_sponsor ? (
        <View style={styles.ctaSponsor}>
          <Text style={styles.ctaKicker}>SUMATE COMO</Text>
          <Text style={styles.ctaTitle}>Socio Mimo ⭐</Text>
          <Text style={styles.ctaBody}>
            Alcance hasta 50 km, card destacada en el directorio, badge visible en cada
            publicación y dashboard extendido.
          </Text>
          <Pressable
            onPress={() =>
              Linking.openURL('mailto:somos.mimo.app@gmail.com?subject=Quiero%20ser%20Socio%20Mimo')
            }
            style={styles.ctaBtn}
          >
            <Text style={styles.ctaBtnText}>Contactar</Text>
          </Pressable>
        </View>
      ) : null}

      {/* MIS REPORTES (vet) — lista completa con paginación. Reemplaza al
          bloque "ÚLTIMAS PUBLICACIONES" de vetDash (que estaba limitado a 5)
          y también al bloque duplicado "Mis registros" que iba al final. */}
      {isVet ? (
        <View style={[styles.section, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
          <Text style={[styles.sectionKicker, { color: c.subtitle }]}>MIS REPORTES</Text>
          {reports.length === 0 ? (
            <Text style={[styles.empty, { color: c.subtitle }]}>Todavía no publicaste ningún reporte.</Text>
          ) : (
            reports.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => router.push(`/pet/${p.id}`)}
                style={[styles.itemRow, { borderColor: c.cardBorder }]}
              >
                {p.photo_url ? (
                  <Image source={{ uri: p.photo_url }} style={styles.itemImg} />
                ) : (
                  <View style={[styles.itemImg, { backgroundColor: c.bg }]} />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: c.title }]} numberOfLines={1}>
                    {p.name || (p.status === 'lost' ? 'Sin nombre' : 'Encontrada')}
                  </Text>
                  <Text style={[styles.itemSub, { color: c.subtitle }]} numberOfLines={1}>
                    {p.address || 'Sin ubicación'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.itemChip,
                    {
                      backgroundColor: p.resolved_at
                        ? '#3ECFB2'
                        : p.status === 'lost'
                        ? '#FF5C6C'
                        : '#FFB830',
                    },
                  ]}
                >
                  <Text style={styles.itemChipText}>
                    {p.resolved_at ? 'REENCONTRADA' : STATUS_LABEL[p.status]?.toUpperCase()}
                  </Text>
                </View>
              </Pressable>
            ))
          )}
          {page < totalPages ? (
            <Pressable
              style={[styles.moreBtn, { borderColor: c.cardBorder, marginTop: 12 }]}
              onPress={() => fetchReports(page + 1, true)}
              disabled={loadingMore}
            >
              <Text style={[styles.moreBtnText, { color: c.text }]}>
                {loadingMore ? 'Cargando…' : `Cargar más (${page} de ${totalPages})`}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* ALERTAS RECIENTES vet */}
      {isVet && vetDash ? (
        <View style={[styles.section, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
          <Text style={[styles.sectionKicker, { color: c.subtitle }]}>ALERTAS RECIENTES</Text>
          {vetDash.recent_alerts.length === 0 ? (
            <Text style={[styles.empty, { color: c.subtitle }]}>Sin alertas por ahora.</Text>
          ) : (
            vetDash.recent_alerts.map((a) => {
              const isLost = a.type === 'nearby_vet_lost';
              const petId = a.data?.pet_id;
              return (
                <Pressable
                  key={a.id}
                  onPress={() => petId && router.push(`/pet/${petId}`)}
                  style={[styles.itemRow, { borderColor: c.cardBorder }]}
                >
                  {a.pet_photo ? (
                    <Image source={{ uri: a.pet_photo }} style={styles.itemImg} />
                  ) : (
                    <View style={[styles.itemImg, { backgroundColor: c.bg }]} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.alertKicker, { color: isLost ? '#FF5C6C' : '#3ECFB2' }]}>
                      {isLost ? 'PERDIDA CERCA' : 'ENCONTRADA CERCA'}
                    </Text>
                    <Text style={[styles.itemTitle, { color: c.title }]} numberOfLines={1}>
                      {a.pet_name || 'Sin nombre'}
                    </Text>
                    <Text style={[styles.itemSub, { color: c.subtitle }]} numberOfLines={1}>
                      {a.pet_address || 'Sin ubicación'}
                    </Text>
                  </View>
                  {!a.read_at ? <View style={styles.unreadDot} /> : null}
                </Pressable>
              );
            })
          )}
        </View>
      ) : null}

      {/* CONFIGURACIÓN DE ALERTAS — mismos 3 controles para user y vet. El
          endpoint destino cambia en saveAlerts según isVet. El cap del radio
          (5km) solo aplica si es una vet en plan ally. */}
      <View style={[styles.section, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
        <Text style={[styles.sectionKicker, { color: c.subtitle }]}>CONFIGURACIÓN DE ALERTAS</Text>

        <View style={[styles.toggleRow, { borderColor: c.cardBorder }]}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={[styles.toggleTitle, { color: c.title }]}>Mascotas perdidas</Text>
            <Text style={[styles.toggleHint, { color: c.subtitle }]}>
              Recibir alerta cuando reporten una perdida en tu radio.
            </Text>
          </View>
          <Switch
            value={receivesLost}
            onValueChange={setReceivesLost}
            trackColor={{ false: '#E5E7EB', true: '#FF5C6C' }}
          />
        </View>

        <View style={[styles.toggleRow, { borderColor: c.cardBorder }]}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={[styles.toggleTitle, { color: c.title }]}>Mascotas encontradas</Text>
            <Text style={[styles.toggleHint, { color: c.subtitle }]}>
              Recibir alerta cuando reporten una encontrada.
            </Text>
          </View>
          <Switch
            value={receivesFound}
            onValueChange={setReceivesFound}
            trackColor={{ false: '#E5E7EB', true: '#FF5C6C' }}
          />
        </View>

        <View style={[styles.radiusBox, { borderColor: c.cardBorder }]}>
          <View style={styles.radiusHeader}>
            <Text style={[styles.toggleTitle, { color: c.title }]}>Radio de alerta</Text>
            <Text style={styles.radiusValue}>{radius} km</Text>
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
                    {
                      backgroundColor: active ? '#FF5C6C' : c.bg,
                      borderColor: active ? '#FF5C6C' : c.cardBorder,
                    },
                  ]}
                >
                  <Text style={[styles.radiusPresetText, { color: active ? '#fff' : c.title }]}>
                    {r} km
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable onPress={saveAlerts} disabled={savingAlerts} style={[styles.saveBtn, savingAlerts && { opacity: 0.5 }]}>
          <Text style={styles.saveBtnText}>{savingAlerts ? 'Guardando…' : 'Guardar cambios'}</Text>
        </Pressable>
        {alertsMsg ? <Text style={[styles.savedMsg, { color: c.subtitle }]}>{alertsMsg}</Text> : null}
      </View>

      <LinkedAccounts c={c} />

      <Pressable onPress={handleLogout} style={styles.logoutBtn}>
        <Text style={styles.logoutBtnText}>Cerrar sesión</Text>
      </Pressable>
      <Pressable onPress={handleDeleteAccount} style={styles.deleteBtn}>
        <Text style={styles.deleteBtnText}>Eliminar cuenta</Text>
      </Pressable>

      {/* "Mis registros" solo para users no-vet — para vets ya se muestra
          en el bloque MIS REPORTES arriba (en el medio del profile). */}
      {!isVet ? <Text style={[styles.sectionTitle, { color: c.title }]}>Mis registros</Text> : null}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}>
      <FlatList
        // Vet: reports ya se renderiza inline en el header (bloque MIS REPORTES).
        // Non-vet: data={reports} + ListEmptyComponent + ListFooterComponent como antes.
        data={isVet ? [] : reports}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ListHeaderComponent={header}
        contentContainerStyle={styles.scroll}
        ListEmptyComponent={
          !isVet ? (
            <Text style={[styles.empty, { color: c.subtitle }]}>
              Todavía no publicaste ningún reporte.
            </Text>
          ) : null
        }
        ListFooterComponent={
          !isVet && page < totalPages ? (
            <Pressable
              style={[styles.moreBtn, { borderColor: c.cardBorder }]}
              onPress={() => fetchReports(page + 1, true)}
              disabled={loadingMore}
            >
              <Text style={[styles.moreBtnText, { color: c.text }]}>
                {loadingMore ? 'Cargando…' : `Cargar más (${page} de ${totalPages})`}
              </Text>
            </Pressable>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

// ------------------------------------------------------------------ //
// Styles
// ------------------------------------------------------------------ //
const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 20, paddingBottom: 40, gap: 12 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  back: { fontSize: 15, fontWeight: '600' },
  kicker: { fontSize: 10, fontWeight: '700', letterSpacing: 3 },

  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 4 },
  heroAvatar: { width: 68, height: 68, borderRadius: 20, backgroundColor: '#F0EBE8' },
  heroAvatarFallback: { backgroundColor: '#FF5C6C', alignItems: 'center', justifyContent: 'center' },
  heroAvatarLetter: { color: '#fff', fontWeight: '800', fontSize: 30 },
  name: { fontSize: 32, fontWeight: '700', letterSpacing: -1 },
  email: { fontSize: 13, marginTop: 2 },

  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  sponsorBadge: { backgroundColor: '#FFB830', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  sponsorText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  miniBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  miniBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  pendingBadge: { backgroundColor: '#FEE2E2', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  pendingText: { color: '#DC2626', fontSize: 9, fontWeight: '800', letterSpacing: 1 },

  editBtn: { alignSelf: 'flex-start', marginTop: 12, borderRadius: 999, paddingHorizontal: 20, paddingVertical: 10 },
  editBtnText: { fontSize: 12, fontWeight: '800', letterSpacing: 1 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  adStatsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  adStatsKicker: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  adStatsSub: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
  stat: {
    flex: 1,
    minWidth: '46%',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  statLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },
  statValue: { fontSize: 26, fontWeight: '700', marginTop: 6, letterSpacing: -0.5 },
  statHint: { fontSize: 11, marginTop: 2, fontWeight: '500' },

  statCard: {
    borderRadius: 28,
    padding: 24,
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  statCardLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5 },
  statNumber: { fontSize: 48, fontWeight: '700', letterSpacing: -1 },
  newBtn: { borderRadius: 999, paddingHorizontal: 20, paddingVertical: 12 },
  newBtnText: { fontWeight: '700', fontSize: 13 },

  ctaSponsor: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: '#FFB830',
    marginTop: 16,
  },
  ctaKicker: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  ctaTitle: { color: '#fff', fontSize: 26, fontWeight: '700', letterSpacing: -0.6, marginTop: 4 },
  ctaBody: { color: 'rgba(255,255,255,0.92)', fontSize: 13, lineHeight: 19, marginTop: 8 },
  ctaBtn: { backgroundColor: '#fff', borderRadius: 999, paddingVertical: 12, paddingHorizontal: 24, alignSelf: 'flex-start', marginTop: 14 },
  ctaBtnText: { color: '#1A1A2E', fontWeight: '700' },

  section: { borderRadius: 24, padding: 18, borderWidth: 1, marginTop: 16 },
  sectionKicker: { fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 12 },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  toggleTitle: { fontSize: 14, fontWeight: '700' },
  toggleHint: { fontSize: 11, marginTop: 3, lineHeight: 15 },

  radiusBox: { padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  radiusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  radiusValue: { fontSize: 22, fontWeight: '700', color: '#FF5C6C' },
  radiusPresets: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 4 },
  radiusPreset: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  radiusPresetText: { fontSize: 13, fontWeight: '700' },

  saveBtn: { backgroundColor: '#1A1A2E', borderRadius: 999, paddingVertical: 14, alignItems: 'center', marginTop: 6 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  savedMsg: { textAlign: 'center', fontSize: 12, marginTop: 8, fontWeight: '600' },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  itemImg: { width: 48, height: 48, borderRadius: 12 },
  itemTitle: { fontSize: 14, fontWeight: '700' },
  itemSub: { fontSize: 11, marginTop: 2 },
  alertKicker: { fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  itemChip: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  itemChipText: { color: '#fff', fontSize: 8, fontWeight: '800', letterSpacing: 0.8 },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF5C6C' },

  logoutBtn: { marginTop: 20, backgroundColor: '#3ECFB2', borderRadius: 999, paddingVertical: 14, alignItems: 'center' },
  logoutBtnText: { color: '#fff', fontWeight: '800', fontSize: 13, letterSpacing: 1.2, textTransform: 'uppercase' },
  deleteBtn: { marginTop: 10, backgroundColor: '#FF5C6C', borderRadius: 999, paddingVertical: 14, alignItems: 'center' },
  deleteBtnText: { color: '#fff', fontWeight: '800', fontSize: 13, letterSpacing: 1.2, textTransform: 'uppercase' },

  sectionTitle: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5, marginTop: 28, marginBottom: 4 },

  card: {
    flexDirection: 'row',
    gap: 14,
    padding: 12,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
  },
  cardImg: { width: 80, height: 80, borderRadius: 18, backgroundColor: '#E5E7EB' },
  cardStatus: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 2 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  cardHint: { fontSize: 12, fontWeight: '600' },
  empty: { textAlign: 'center', fontSize: 14, marginTop: 30 },
  moreBtn: { borderRadius: 999, paddingVertical: 14, alignItems: 'center', borderWidth: 1, marginTop: 8 },
  moreBtnText: { fontWeight: '700', fontSize: 13 },
});

const formStyles = StyleSheet.create({
  wrapper: { marginTop: 12, padding: 18, borderRadius: 24, borderWidth: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  kicker: { fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  close: { fontSize: 12, fontWeight: '700' },
  label: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, marginBottom: 6 },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
  hint: { fontSize: 11, marginTop: 6, lineHeight: 15 },
  avatar: { width: 60, height: 60, borderRadius: 16, backgroundColor: '#F0EBE8' },
  avatarFallback: { backgroundColor: '#FF5C6C', alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: '#fff', fontWeight: '800', fontSize: 24 },
  pickBtn: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1 },
  pickBtnText: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  saveBtn: { backgroundColor: '#1A1A2E', borderRadius: 999, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  savedMsg: { textAlign: 'center', fontSize: 12, marginTop: 8, fontWeight: '700' },
  imageRow: { flexDirection: 'row', gap: 12, marginBottom: 6 },
  logoImg: { width: 60, height: 60, borderRadius: 16, backgroundColor: '#F0EBE8' },
  coverImg: { width: 96, height: 60, borderRadius: 16 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  chip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  chipText: { fontSize: 12, fontWeight: '700' },
  mapWrap: {
    height: 240,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F0EBE8',
    marginTop: 2,
  },
});
