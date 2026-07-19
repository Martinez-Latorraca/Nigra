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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSelector } from 'react-redux';
import api from '../src/lib/api';
import { updateLocationIfPermitted } from '../src/lib/location';
import { useTheme } from '../src/lib/theme';
import MenuButton from '../src/components/MenuButton';
import LinkedAccounts from '../src/components/LinkedAccounts';
import VetPanel from '../src/components/VetPanel';

export default function Profile() {
  const c = useTheme();
  const user = useSelector((s) => s.user.data);

  const [reports, setReports] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [notifyNearby, setNotifyNearby] = useState(false);
  const [savingToggle, setSavingToggle] = useState(false);

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

  // Hidratamos el estado del toggle desde el server (fuente de verdad).
  useEffect(() => {
    api.get('/api/users/me')
      .then(({ data }) => setNotifyNearby(!!data?.notify_nearby))
      .catch(() => {});
  }, []);

  const handleToggleNotify = async (next) => {
    setNotifyNearby(next); // optimistic
    setSavingToggle(true);
    try {
      await api.patch('/api/users/notify-nearby', { enabled: next });
      if (next) {
        // Al activar, aprovechamos para pushear la ubicación actual al server
        // — así las alertas empiezan a funcionar sin esperar al próximo ciclo
        // del push provider.
        updateLocationIfPermitted().catch(() => {});
      }
    } catch {
      setNotifyNearby(!next); // rollback
    } finally {
      setSavingToggle(false);
    }
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
      <Text style={[styles.name, { color: c.title }]}>{user?.name || 'Usuario'}.</Text>
      {user?.email ? <Text style={[styles.email, { color: c.subtitle }]}>{user.email}</Text> : null}

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

      <View style={[styles.settingsCard, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={[styles.settingTitle, { color: c.title }]}>Alertas de mascotas cerca</Text>
          <Text style={[styles.settingBody, { color: c.subtitle }]}>
            Te avisamos cuando reporten una mascota perdida o encontrada a menos de 5km tuyo.
          </Text>
        </View>
        <Switch
          value={notifyNearby}
          onValueChange={handleToggleNotify}
          disabled={savingToggle}
          trackColor={{ false: '#E5E7EB', true: c.primary }}
        />
      </View>

      <LinkedAccounts c={c} />

      {user?.has_vet ? <VetPanel /> : null}

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
  name: { fontSize: 44, fontWeight: '700', letterSpacing: -1, marginTop: 4 },
  email: { fontSize: 14, marginTop: 2 },
  statCard: {
    borderRadius: 28,
    padding: 24,
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  statLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5 },
  statNumber: { fontSize: 48, fontWeight: '700', letterSpacing: -1 },
  newBtn: { borderRadius: 999, paddingHorizontal: 20, paddingVertical: 12 },
  newBtnText: { fontWeight: '700', fontSize: 13 },
  settingsCard: {
    marginTop: 20,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingTitle: { fontSize: 15, fontWeight: '700' },
  settingBody: { fontSize: 12, marginTop: 4, lineHeight: 17 },
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
