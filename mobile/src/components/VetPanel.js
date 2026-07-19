import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Switch,
  TextInput,
  Image,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import api from '../lib/api';
import { useTheme } from '../lib/theme';

const STATUS_LABEL = { lost: 'Perdida', found: 'Encontrada' };

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
  const [servicesInput, setServicesInput] = useState((vet.services || []).join(', '));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [uploadingKind, setUploadingKind] = useState(null);
  const [logoUrl, setLogoUrl] = useState(vet.logo_url || '');
  const [coverUrl, setCoverUrl] = useState(vet.cover_url || '');

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
      const services = servicesInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const body = { ...form, services };
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

  const inputStyle = [
    formStyles.input,
    { backgroundColor: c.bg, color: c.title, borderColor: c.cardBorder },
  ];

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
            <View style={[formStyles.logoImg, formStyles.logoFallback]}>
              <Text style={formStyles.logoLetter}>{vet.name.charAt(0)}</Text>
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
        <Text style={[formStyles.label, { color: c.subtitle }]}>SERVICIOS (separá por coma)</Text>
        <TextInput
          style={inputStyle}
          value={servicesInput}
          onChangeText={setServicesInput}
          placeholder="Consultas, Vacunación, Cirugía…"
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

export default function VetPanel() {
  const c = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [receivesLost, setReceivesLost] = useState(false);
  const [receivesFound, setReceivesFound] = useState(false);
  const [radius, setRadius] = useState(5);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/api/vets/me/dashboard');
      setData(data);
      setReceivesLost(data.vet.receives_lost);
      setReceivesFound(data.vet.receives_found);
      setRadius(data.vet.alert_radius_km);
      setError('');
    } catch (e) {
      setError(e.response?.data?.error || 'Error cargando panel vet.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveAlerts = async () => {
    setSaving(true);
    setSavedMsg('');
    try {
      await api.patch('/api/vets/me/alerts', {
        receives_lost: receivesLost,
        receives_found: receivesFound,
        alert_radius_km: radius,
      });
      setSavedMsg('Guardado.');
      setTimeout(() => setSavedMsg(''), 2500);
    } catch (e) {
      setSavedMsg(e.response?.data?.error || 'Error guardando.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={c.title} />
      </View>
    );
  }

  if (error || !data) {
    return null;
  }

  const { vet, stats, recent_pets, recent_alerts } = data;
  const maxRadius = vet.plan === 'ally' ? 5 : 50;
  const successRate = stats.total_pets > 0
    ? Math.round((stats.resolved_pets / stats.total_pets) * 100)
    : null;

  return (
    <View style={styles.wrapper}>
      <View style={styles.headerRow}>
        <Text style={[styles.kicker, { color: c.subtitle }]}>PANEL VET</Text>
        <Pressable
          onPress={() => setEditing((v) => !v)}
          style={styles.editBtn}
        >
          <Text style={styles.editBtnText}>{editing ? 'Cerrar' : 'Editar'}</Text>
        </Pressable>
      </View>
      <View style={styles.heroRow}>
        {vet.logo_url ? (
          <Image source={{ uri: vet.logo_url }} style={styles.logo} />
        ) : (
          <View style={[styles.logo, styles.logoFallback]}>
            <Text style={styles.logoLetter}>{vet.name.charAt(0)}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: c.title }]}>{vet.name}.</Text>
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
        </View>
      </View>

      {editing ? (
        <VetEditForm
          vet={vet}
          c={c}
          onClose={() => setEditing(false)}
          onSaved={() => load()}
        />
      ) : null}

      <View style={styles.statsGrid}>
        <StatTile c={c} accent="#FF5C6C" label="MASCOTAS PUBLICADAS" value={stats.total_pets} />
        <StatTile c={c} accent="#3ECFB2" label="REENCONTRADAS"
          value={stats.resolved_pets}
          hint={successRate !== null ? `${successRate}% tasa` : null}
        />
        <StatTile c={c} accent="#FFB830" label="ALERTAS"
          value={stats.total_alerts}
          hint={stats.unread_alerts > 0 ? `${stats.unread_alerts} sin leer` : 'al día'}
        />
        <StatTile c={c} accent="#9B6DFF" label="RADIO"
          value={`${vet.alert_radius_km} km`}
          hint={vet.plan === 'ally' ? 'Ally' : 'Socio Mimo'}
        />
      </View>

      {!vet.is_sponsor && (
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
      )}

      <View style={[styles.section, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
        <Text style={[styles.sectionKicker, { color: c.subtitle }]}>CONFIGURACIÓN DE ALERTAS</Text>

        <View style={[styles.toggleRow, { borderColor: c.cardBorder }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.toggleTitle, { color: c.title }]}>Mascotas perdidas</Text>
            <Text style={[styles.toggleHint, { color: c.subtitle }]}>
              Recibir alertas cuando reporten una mascota perdida.
            </Text>
          </View>
          <Switch
            value={receivesLost}
            onValueChange={setReceivesLost}
            trackColor={{ false: '#E5E7EB', true: '#FF5C6C' }}
          />
        </View>

        <View style={[styles.toggleRow, { borderColor: c.cardBorder }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.toggleTitle, { color: c.title }]}>Mascotas encontradas</Text>
            <Text style={[styles.toggleHint, { color: c.subtitle }]}>
              Recibir alertas cuando reporten una mascota encontrada.
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
            {[5, 15, 50].map((r) => {
              const disabled = r > maxRadius;
              const active = radius === r;
              return (
                <Pressable
                  key={r}
                  onPress={() => !disabled && setRadius(r)}
                  disabled={disabled}
                  style={[
                    styles.radiusPreset,
                    {
                      backgroundColor: active ? '#FF5C6C' : c.bg,
                      borderColor: active ? '#FF5C6C' : c.cardBorder,
                      opacity: disabled ? 0.3 : 1,
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
          <Text style={[styles.toggleHint, { color: c.subtitle }]}>
            {vet.plan === 'ally'
              ? 'Ally · máx 5 km. Socio Mimo extiende hasta 50 km.'
              : 'Socio Mimo · hasta 50 km.'}
          </Text>
        </View>

        <Pressable onPress={saveAlerts} disabled={saving} style={[styles.saveBtn, saving && { opacity: 0.5 }]}>
          <Text style={styles.saveBtnText}>{saving ? 'Guardando…' : 'Guardar cambios'}</Text>
        </Pressable>
        {savedMsg ? <Text style={[styles.savedMsg, { color: c.subtitle }]}>{savedMsg}</Text> : null}
      </View>

      <View style={[styles.section, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
        <Text style={[styles.sectionKicker, { color: c.subtitle }]}>ÚLTIMAS PUBLICACIONES</Text>
        {recent_pets.length === 0 ? (
          <Text style={[styles.empty, { color: c.subtitle }]}>Todavía no publicaste mascotas.</Text>
        ) : (
          recent_pets.map((p) => (
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
      </View>

      <View style={[styles.section, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
        <Text style={[styles.sectionKicker, { color: c.subtitle }]}>ALERTAS RECIENTES</Text>
        {recent_alerts.length === 0 ? (
          <Text style={[styles.empty, { color: c.subtitle }]}>Sin alertas por ahora.</Text>
        ) : (
          recent_alerts.map((a) => {
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 16, marginTop: 24 },
  loading: { padding: 20, alignItems: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  editBtn: { backgroundColor: '#1A1A2E', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
  editBtnText: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  kicker: { fontSize: 10, fontWeight: '700', letterSpacing: 2.5 },
  title: { fontSize: 26, fontWeight: '700', letterSpacing: -0.8, marginTop: 4 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  logo: { width: 60, height: 60, borderRadius: 16, backgroundColor: '#F0EBE8' },
  logoFallback: { backgroundColor: '#FF5C6C', alignItems: 'center', justifyContent: 'center' },
  logoLetter: { color: '#fff', fontWeight: '800', fontSize: 24 },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  sponsorBadge: { backgroundColor: '#FFB830', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  sponsorText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  miniBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  miniBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  pendingBadge: { backgroundColor: '#FEE2E2', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  pendingText: { color: '#DC2626', fontSize: 9, fontWeight: '800', letterSpacing: 1 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
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

  ctaSponsor: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: '#FFB830',
  },
  ctaKicker: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  ctaTitle: { color: '#fff', fontSize: 26, fontWeight: '700', letterSpacing: -0.6, marginTop: 4 },
  ctaBody: { color: 'rgba(255,255,255,0.92)', fontSize: 13, lineHeight: 19, marginTop: 8 },
  ctaBtn: { backgroundColor: '#fff', borderRadius: 999, paddingVertical: 12, paddingHorizontal: 24, alignSelf: 'flex-start', marginTop: 14 },
  ctaBtnText: { color: '#1A1A2E', fontWeight: '700' },

  section: { borderRadius: 24, padding: 18, borderWidth: 1 },
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
  radiusPresets: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 10 },
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

  empty: { textAlign: 'center', fontSize: 13, padding: 16 },
});

const formStyles = StyleSheet.create({
  wrapper: { borderRadius: 24, padding: 18, borderWidth: 1, marginTop: 4 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  kicker: { fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  close: { fontSize: 12, fontWeight: '700' },
  label: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, marginTop: 4, marginBottom: 6 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  imageRow: { flexDirection: 'row', gap: 12, marginBottom: 6 },
  logoImg: { width: 60, height: 60, borderRadius: 16, backgroundColor: '#F0EBE8' },
  logoFallback: { backgroundColor: '#FF5C6C', alignItems: 'center', justifyContent: 'center' },
  logoLetter: { color: '#fff', fontWeight: '800', fontSize: 24 },
  coverImg: { width: 96, height: 60, borderRadius: 16 },
  pickBtn: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  pickBtnText: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  saveBtn: {
    backgroundColor: '#1A1A2E',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  savedMsg: { textAlign: 'center', fontSize: 12, marginTop: 8, fontWeight: '700' },
});
