import { useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, Image, FlatList, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useSelector } from 'react-redux';
import { useTheme } from '../src/lib/theme';
import { useSocket } from '../src/lib/socket';
import api from '../src/lib/api';
import MenuButton from '../src/components/MenuButton';
import DonationBanner from '../src/components/DonationBanner';

export default function Messages() {
  const c = useTheme();
  const me = useSelector((s) => s.user.data);
  const { inbox, notifications, refreshInbox, refreshNotifications, markNotificationRead } = useSocket();
  // Celebración post-reencuentro: { petId, petName } | null.
  const [celebration, setCelebration] = useState(null);
  const [answering, setAnswering] = useState(null); // pet_id que se está respondiendo

  // Refresca cada vez que la pantalla toma foco (no solo en mount), así al
  // volver desde el chat la lista muestra el último mensaje sin quedar stale.
  useFocusEffect(
    useCallback(() => {
      refreshInbox();
      refreshNotifications();
    }, [refreshInbox, refreshNotifications])
  );

  // Mergeamos chats y notifications en una sola lista ordenada por recency.
  const items = useMemo(() => {
    const chats = inbox.map((c) => ({
      kind: 'chat',
      key: `chat-${c.pet_id}-${c.other_user_id}`,
      sortDate: c.created_at,
      ...c,
    }));
    const matches = notifications
      .filter((n) => n.type === 'match')
      .map((n) => ({
        kind: 'match',
        key: `notif-${n.id}`,
        sortDate: n.created_at,
        ...n,
      }));
    // Follow-up "¿te reencontraste?" — solo mientras no lo respondan (unread).
    const reminders = notifications
      .filter((n) => n.type === 'resolve_reminder' && !n.read_at)
      .map((n) => ({
        kind: 'reminder',
        key: `notif-${n.id}`,
        sortDate: n.created_at,
        ...n,
      }));
    return [...chats, ...matches, ...reminders].sort(
      (a, b) => new Date(b.sortDate) - new Date(a.sortDate)
    );
  }, [inbox, notifications]);

  // Respuesta al follow-up. reunited → celebración + donación; el resto
  // solo cierra la pregunta. El server marca la notif leída → desaparece.
  const answerReminder = async (item, outcome) => {
    const petId = item.data?.pet_id;
    if (!petId || answering) return;
    setAnswering(petId);
    try {
      const { data } = await api.post(`/api/pets/${petId}/reunion-outcome`, { outcome });
      if (outcome === 'reunited' && data?.resolved) {
        setCelebration({ petId, petName: data.pet_name || item.data?.pet_name });
      }
    } catch { /* silencioso */ }
    finally {
      setAnswering(null);
      refreshNotifications();
      refreshInbox();
    }
  };

  const openChat = (item) => {
    router.push({
      pathname: `/chat/${item.pet_id}`,
      params: {
        otherUserId: String(item.other_user_id),
        name: item.other_user_name || 'Conversación',
        photo: item.photo_url || '',
      },
    });
  };

  const openMatch = (item) => {
    if (!item.read_at) markNotificationRead(item.id);
    const petId = item.data?.pet_id;
    if (petId) router.push(`/pet/${petId}`);
  };

  const renderItem = ({ item }) => {
    if (item.kind === 'chat') {
      const unread = !item.is_read && Number(item.receiver_id) === Number(me?.id);
      const mineLast = Number(item.sender_id) === Number(me?.id);
      return (
        <Pressable
          onPress={() => openChat(item)}
          style={[styles.row, { borderBottomColor: c.divider }]}
        >
          <Image source={{ uri: item.photo_url }} style={styles.avatar} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: c.title }]} numberOfLines={1}>
              {item.other_user_name || 'Usuario'}
            </Text>
            <Text
              style={[styles.preview, { color: unread ? c.text : c.subtitle, fontWeight: unread ? '700' : '400' }]}
              numberOfLines={1}
            >
              {mineLast ? 'Vos: ' : ''}
              {item.content}
            </Text>
          </View>
          {unread ? <View style={[styles.dot, { backgroundColor: '#22C55E' }]} /> : null}
        </Pressable>
      );
    }
    // kind === 'reminder' — follow-up accionable "¿te reencontraste?".
    if (item.kind === 'reminder') {
      const petName = item.data?.pet_name;
      const busy = answering === item.data?.pet_id;
      return (
        <View style={[styles.reminderCard, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
          <Text style={[styles.kicker, { color: '#22C55E' }]}>¿TE REENCONTRASTE?</Text>
          <Text style={[styles.reminderText, { color: c.title }]}>
            ¿Pudiste reunirte con {petName ? petName : 'tu mascota'}?
          </Text>
          {busy ? (
            <ActivityIndicator color={c.title} style={{ marginTop: 12 }} />
          ) : (
            <View style={styles.reminderBtns}>
              <Pressable onPress={() => answerReminder(item, 'reunited')} style={[styles.reminderBtn, styles.reminderBtnPrimary]}>
                <Text style={styles.reminderBtnPrimaryText}>Sí, la recuperé 🎉</Text>
              </Pressable>
              <Pressable onPress={() => answerReminder(item, 'not_matched')} style={[styles.reminderBtn, { borderColor: c.cardBorder }]}>
                <Text style={[styles.reminderBtnText, { color: c.subtitle }]}>No era</Text>
              </Pressable>
              <Pressable onPress={() => answerReminder(item, 'later')} style={[styles.reminderBtn, { borderColor: c.cardBorder }]}>
                <Text style={[styles.reminderBtnText, { color: c.subtitle }]}>Todavía no</Text>
              </Pressable>
            </View>
          )}
        </View>
      );
    }
    // kind === 'match'
    const unread = !item.read_at;
    const photo = item.data?.photo_url;
    return (
      <Pressable
        onPress={() => openMatch(item)}
        style={[styles.row, { borderBottomColor: c.divider }]}
      >
        {photo ? <Image source={{ uri: photo }} style={styles.avatar} /> : <View style={styles.avatar} />}
        <View style={{ flex: 1 }}>
          <Text style={[styles.kicker, { color: '#3B82F6' }]}>POSIBLE COINCIDENCIA</Text>
          <Text
            style={[styles.preview, { color: unread ? c.text : c.subtitle, fontWeight: unread ? '700' : '400' }]}
            numberOfLines={2}
          >
            Reportaron una mascota similar{item.data?.match_name ? ` a ${item.data.match_name}` : ''}. ¿Es la tuya?
          </Text>
        </View>
        {unread ? <View style={[styles.dot, { backgroundColor: '#3B82F6' }]} /> : null}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={[styles.back, { color: c.subtitle }]}>‹ Volver</Text>
          </Pressable>
          <MenuButton />
        </View>
        <Text style={[styles.title, { color: c.title }]}>Mensajes</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        contentContainerStyle={items.length === 0 && styles.emptyWrap}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: c.subtitle }]}>
            No tenés actividad todavía. Cuando contactes (o te contacten) por una mascota, aparece acá.
          </Text>
        }
      />

      {/* Celebración post-reencuentro — el momento de más aprecio, con la
          donación ahí mismo. */}
      <Modal visible={!!celebration} transparent animationType="fade" onRequestClose={() => setCelebration(null)}>
        <View style={styles.celebrationBackdrop}>
          <View style={[styles.celebrationCard, { backgroundColor: c.bg }]}>
            <Text style={styles.celebrationEmoji}>🎉</Text>
            <Text style={[styles.celebrationTitle, { color: c.title }]}>
              {celebration?.petName ? `¡${celebration.petName} volvió a casa!` : '¡Volvió a casa!'}
            </Text>
            <Text style={[styles.celebrationSub, { color: c.subtitle }]}>
              Cerramos el caso. Gracias por avisarnos 💛
            </Text>
            {celebration ? (
              <DonationBanner
                petId={celebration.petId}
                petName={celebration.petName}
                onDismiss={() => setCelebration(null)}
              />
            ) : null}
            <Pressable onPress={() => setCelebration(null)} style={styles.celebrationClose}>
              <Text style={[styles.celebrationCloseText, { color: c.subtitle }]}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, gap: 4 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  back: { fontSize: 15, fontWeight: '600' },
  title: { fontSize: 34, fontWeight: '700', letterSpacing: -0.5 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#E5E7EB' },
  name: { fontSize: 16, fontWeight: '700' },
  kicker: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 4 },
  preview: { fontSize: 14, marginTop: 2 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  emptyWrap: { flexGrow: 1, justifyContent: 'center' },
  empty: { textAlign: 'center', fontSize: 14, paddingHorizontal: 40, lineHeight: 20 },

  reminderCard: {
    marginHorizontal: 16, marginVertical: 8, padding: 16, borderRadius: 20, borderWidth: 1,
  },
  reminderText: { fontSize: 16, fontWeight: '700', marginTop: 6 },
  reminderBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  reminderBtn: {
    borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: 'transparent',
  },
  reminderBtnPrimary: { backgroundColor: '#22C55E' },
  reminderBtnPrimaryText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  reminderBtnText: { fontSize: 13, fontWeight: '700' },

  celebrationBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 24,
  },
  celebrationCard: { borderRadius: 28, padding: 24, alignItems: 'center' },
  celebrationEmoji: { fontSize: 52 },
  celebrationTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, marginTop: 8, textAlign: 'center' },
  celebrationSub: { fontSize: 14, marginTop: 6, marginBottom: 16, textAlign: 'center' },
  celebrationClose: { marginTop: 12, paddingVertical: 8 },
  celebrationCloseText: { fontSize: 14, fontWeight: '600' },
});
