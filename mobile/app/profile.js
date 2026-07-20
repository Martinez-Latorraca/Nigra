import { useEffect, useState, useCallback } from 'react';
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
import VetPanel from '../src/components/VetPanel';

const RADIUS_PRESETS = [5, 15, 25, 50];

// Form de edición inline del user (nombre + foto). Espejo web de UserEditForm
// en client/src/pages/Profile.jsx. Al guardar despacha updateUserData para
// que el hero refleje los cambios sin re-login.
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

  const inputStyle = [
    formStyles.input,
    { backgroundColor: c.bg, color: c.title, borderColor: c.cardBorder },
  ];

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
        <Pressable
          onPress={pickAvatar}
          disabled={uploading}
          style={[formStyles.pickBtn, { borderColor: c.cardBorder }]}
        >
          <Text style={[formStyles.pickBtnText, { color: c.title }]}>
            {uploading ? 'Subiendo…' : 'Cambiar'}
          </Text>
        </Pressable>
      </View>

      <Text style={[formStyles.label, { color: c.subtitle, marginTop: 12 }]}>NOMBRE</Text>
      <TextInput style={inputStyle} value={name} onChangeText={setName} />

      <Text style={[formStyles.label, { color: c.subtitle, marginTop: 12 }]}>EMAIL</Text>
      <TextInput
        style={[inputStyle, { opacity: 0.6 }]}
        value={user?.email || ''}
        editable={false}
      />
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
      {msg ? <Text style={[formStyles.msg, { color: '#3ECFB2' }]}>{msg}</Text> : null}
      {err ? <Text style={[formStyles.msg, { color: '#EF4444' }]}>{err}</Text> : null}
    </View>
  );
}

export default function Profile() {
  const c = useTheme();
  const user = useSelector((s) => s.user.data);
  const token = useSelector((s) => s.user.token);
  const dispatch = useDispatch();

  const [reports, setReports] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [editing, setEditing] = useState(false);

  // Alertas granulares (perdidas / encontradas / radio). Espejo del web.
  // Fuente: /api/users/me → notify_lost, notify_found, notify_radius_km.
  const [receivesLost, setReceivesLost] = useState(false);
  const [receivesFound, setReceivesFound] = useState(false);
  const [radius, setRadius] = useState(5);
  const [savingAlerts, setSavingAlerts] = useState(false);
  const [alertsMsg, setAlertsMsg] = useState('');

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

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Hidratamos preferencias de notificación desde el server + avatar_url
  // por si el user viejo se logueó antes de que el server lo devolviera.
  useEffect(() => {
    api.get('/api/users/me')
      .then(({ data }) => {
        setReceivesLost(!!data?.notify_lost);
        setReceivesFound(!!data?.notify_found);
        if (Number.isFinite(data?.notify_radius_km)) setRadius(data.notify_radius_km);
        if (data?.avatar_url && data.avatar_url !== user?.avatar_url) {
          dispatch(updateUserData({ avatar_url: data.avatar_url }));
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveAlerts = async () => {
    setSavingAlerts(true);
    setAlertsMsg('');
    try {
      await api.patch('/api/users/notify-nearby', {
        notify_lost: receivesLost,
        notify_found: receivesFound,
        notify_radius_km: radius,
      });
      if (receivesLost || receivesFound) {
        // Al activar, aprovechamos para pushear la ubicación actual al server
        // — así las alertas empiezan a funcionar sin esperar al próximo ciclo.
        updateLocationIfPermitted().catch(() => {});
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
          <Text
            style={[
              styles.cardStatus,
              { color: isResolved ? '#3B82F6' : isLost ? '#EF4444' : '#22C55E' },
            ]}
          >
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

  const header = (
    <View>
      <View style={styles.headerTop}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[styles.back, { color: c.subtitle }]}>‹ Volver</Text>
        </Pressable>
        <MenuButton />
      </View>

      <Text style={[styles.kicker, { color: c.subtitle }]}>MI CUENTA</Text>
      <View style={styles.heroRow}>
        {user?.avatar_url ? (
          <Image source={{ uri: user.avatar_url }} style={styles.heroAvatar} />
        ) : (
          <View style={[styles.heroAvatar, styles.heroAvatarFallback]}>
            <Text style={styles.heroAvatarLetter}>{(user?.name || '?').charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: c.title }]}>{user?.name || 'Usuario'}.</Text>
          {user?.email ? <Text style={[styles.email, { color: c.subtitle }]}>{user.email}</Text> : null}
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
        <UserEditForm
          user={user}
          c={c}
          dispatch={dispatch}
          onClose={() => setEditing(false)}
        />
      ) : null}

      <View style={[styles.statCard, { backgroundColor: c.primary }]}>
        <View>
          <Text style={[styles.statLabel, { color: c.primaryText, opacity: 0.6 }]}>Reportes activos</Text>
          <Text style={[styles.statNumber, { color: c.primaryText }]}>{total}</Text>
        </View>
        <Pressable
          style={[styles.newBtn, { backgroundColor: c.primaryText }]}
          onPress={() => router.push('/report')}
        >
          <Text style={[styles.newBtnText, { color: c.primary }]}>Nuevo reporte</Text>
        </Pressable>
      </View>

      {/* Configuración de alertas — 3 controles (espejo del web).
          Para vets, el VetPanel de abajo tiene su propia configuración; esta
          es para las notificaciones push del user en su rol de comunidad. */}
      <View style={[styles.alertsCard, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
        <Text style={[styles.alertsKicker, { color: c.subtitle }]}>CONFIGURACIÓN DE ALERTAS</Text>

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
                  <Text
                    style={[
                      styles.radiusPresetText,
                      { color: active ? '#fff' : c.title },
                    ]}
                  >
                    {r} km
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable
          onPress={saveAlerts}
          disabled={savingAlerts}
          style={[styles.saveAlertsBtn, savingAlerts && { opacity: 0.5 }]}
        >
          <Text style={styles.saveAlertsBtnText}>
            {savingAlerts ? 'Guardando…' : 'Guardar cambios'}
          </Text>
        </Pressable>
        {alertsMsg ? (
          <Text style={[styles.alertsMsg, { color: c.subtitle }]}>{alertsMsg}</Text>
        ) : null}
      </View>

      <LinkedAccounts c={c} />

      {user?.has_vet ? <VetPanel /> : null}

      {/* Cerrar sesión / Eliminar cuenta */}
      <Pressable onPress={handleLogout} style={[styles.logoutBtn]}>
        <Text style={styles.logoutBtnText}>Cerrar sesión</Text>
      </Pressable>
      <Pressable onPress={handleDeleteAccount} style={[styles.deleteBtn]}>
        <Text style={styles.deleteBtnText}>Eliminar cuenta</Text>
      </Pressable>

      <Text style={[styles.sectionTitle, { color: c.title }]}>Mis registros</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator color={c.title} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}>
      <FlatList
        data={reports}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ListHeaderComponent={header}
        contentContainerStyle={styles.scroll}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: c.subtitle }]}>
            Todavía no publicaste ningún reporte.
          </Text>
        }
        ListFooterComponent={
          page < totalPages ? (
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
  name: { fontSize: 36, fontWeight: '700', letterSpacing: -1 },
  email: { fontSize: 13, marginTop: 2 },
  editBtn: { alignSelf: 'flex-start', marginTop: 12, borderRadius: 999, paddingHorizontal: 20, paddingVertical: 10 },
  editBtnText: { fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  statCard: {
    borderRadius: 28,
    padding: 24,
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  statLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5 },
  statNumber: { fontSize: 48, fontWeight: '700', letterSpacing: -1 },
  newBtn: { borderRadius: 999, paddingHorizontal: 20, paddingVertical: 12 },
  newBtnText: { fontWeight: '700', fontSize: 13 },

  alertsCard: { marginTop: 20, padding: 18, borderRadius: 24, borderWidth: 1 },
  alertsKicker: { fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 12 },
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
  radiusPresets: { flexDirection: 'row', gap: 8, marginTop: 12 },
  radiusPreset: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  radiusPresetText: { fontSize: 13, fontWeight: '700' },
  saveAlertsBtn: { backgroundColor: '#1A1A2E', borderRadius: 999, paddingVertical: 14, alignItems: 'center', marginTop: 6 },
  saveAlertsBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  alertsMsg: { textAlign: 'center', fontSize: 12, marginTop: 8, fontWeight: '600' },

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
  msg: { textAlign: 'center', fontSize: 12, marginTop: 8, fontWeight: '700' },
});
