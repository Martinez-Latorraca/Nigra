import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  Image,
  StyleSheet,
  ActivityIndicator,
  Linking,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import api from '../../src/lib/api';
import { useTheme } from '../../src/lib/theme';
import MenuButton from '../../src/components/MenuButton';

const STATUS_LABEL = { lost: 'Perdida', found: 'Encontrada' };

function StatTile({ label, value, hint, accent, c }) {
  return (
    <View style={[styles.stat, { backgroundColor: c.card, borderColor: c.cardBorder, borderTopColor: accent, borderTopWidth: 3 }]}>
      <Text style={[styles.statLabel, { color: c.subtitle }]}>{label}</Text>
      <Text style={[styles.statValue, { color: c.title }]}>{value}</Text>
      {hint ? <Text style={[styles.statHint, { color: c.subtitle }]}>{hint}</Text> : null}
    </View>
  );
}

export default function VetDashboard() {
  const c = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
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
      setError(e.response?.data?.error || 'Error cargando dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
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
      <SafeAreaView style={[styles.container, styles.centered, { backgroundColor: c.bg }]}>
        <ActivityIndicator color={c.title} />
      </SafeAreaView>
    );
  }

  if (error === 'No tenés una veterinaria registrada.') {
    return (
      <SafeAreaView style={[styles.container, styles.centered, { backgroundColor: c.bg }]}>
        <Text style={[styles.kicker, { color: c.subtitle }]}>PANEL VET</Text>
        <Text style={[styles.title, { color: c.title, textAlign: 'center' }]}>
          Todavía no tenés una vet.
        </Text>
        <Text style={[styles.subtitle, { color: c.subtitle, textAlign: 'center' }]}>
          Registrate como veterinaria para publicar mascotas encontradas y sumarte a la red.
        </Text>
        <Pressable onPress={() => router.replace('/vets')} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Ir al directorio</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={[styles.container, styles.centered, { backgroundColor: c.bg }]}>
        <Text style={[styles.subtitle, { color: c.subtitle }]}>{error || 'Error inesperado.'}</Text>
      </SafeAreaView>
    );
  }

  const { vet, stats, recent_pets, recent_alerts } = data;
  const maxRadius = vet.plan === 'ally' ? 5 : 50;
  const successRate = stats.total_pets > 0
    ? Math.round((stats.resolved_pets / stats.total_pets) * 100)
    : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={c.title}
          />
        }
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={[styles.back, { color: c.subtitle }]}>‹ Volver</Text>
          </Pressable>
          <MenuButton />
        </View>

        <Text style={[styles.kicker, { color: c.subtitle }]}>PANEL VET</Text>
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

        {/* Config de alertas */}
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

        {/* Últimas publicaciones */}
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

        {/* Alertas recientes */}
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center', padding: 20 },
  scroll: { padding: 20, paddingBottom: 40, gap: 16 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  back: { fontSize: 15, fontWeight: '600' },
  kicker: { fontSize: 10, fontWeight: '700', letterSpacing: 2.5, marginTop: 4 },
  title: { fontSize: 30, fontWeight: '700', letterSpacing: -0.8, marginTop: 4 },
  subtitle: { fontSize: 13, lineHeight: 19, marginTop: 8 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 8 },
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

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
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
    marginTop: 8,
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

  backBtn: { backgroundColor: '#1A1A2E', borderRadius: 999, paddingHorizontal: 24, paddingVertical: 12, marginTop: 20 },
  backBtnText: { color: '#fff', fontWeight: '700' },
});
