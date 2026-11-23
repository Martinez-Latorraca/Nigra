import { useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, Image, FlatList, StyleSheet, Modal, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useSelector } from 'react-redux';
import { useTheme, palette, fonts } from '../src/lib/theme';
import { useSocket } from '../src/lib/socket';
import { ChevronRight, Sparkle, PartyPopper, MessageCircle, Search, SearchX, X } from '../src/lib/icons';
import EmptyState from '../src/components/EmptyState';
import api from '../src/lib/api';
import DonationBanner from '../src/components/DonationBanner';
import TabBar, { useTabBarSpace } from '../src/components/TabBar';

// Hora corta para la lista: "12:40" hoy, "Ayer", día de la semana en la
// última semana y fecha corta antes de eso.
function shortTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const startOfDay = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
  if (days === 0) return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  if (days === 1) return 'Ayer';
  if (days < 7) {
    const w = d.toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', '');
    return w.charAt(0).toUpperCase() + w.slice(1);
  }
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }).replace('.', '');
}

export default function Messages() {
  const c = useTheme();
  const bottomSpace = useTabBarSpace();
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

  const unreadCount = items.filter((i) =>
    i.kind === 'chat'
      ? !i.is_read && Number(i.receiver_id) === Number(me?.id)
      : i.kind === 'match' && !i.read_at
  ).length;
  // Buscador (Mensajes.dc.html): filtra las conversaciones por persona o
  // mascota, en la app. Mientras se busca se ocultan las coincidencias y el
  // "¿te reencontraste?", que no son conversaciones.
  const [query, setQuery] = useState('');
  const norm = (t) => (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const hasChats = items.some((i) => i.kind === 'chat');
  const visibleItems = query.trim()
    ? items.filter(
        (i) => i.kind === 'chat' && `${norm(i.other_user_name)} ${norm(i.pet_name)}`.includes(norm(query.trim()))
      )
    : items;
  const firstChatKey = visibleItems.find((i) => i.kind === 'chat')?.key;

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

  // "Sobre Luna · Perdido" + punto de color (Mensajes.dc.html). El inbox trae
  // pet_name / pet_status / pet_resolved_at; si el server todavía no los
  // manda, la fila queda como antes.
  const petState = (item) => {
    if (!item.pet_status) return null;
    if (item.pet_resolved_at) {
      return { about: `Sobre ${item.pet_name || 'la mascota'} · Reencontrada`, dot: (t) => t.nocheSmall };
    }
    if (item.pet_status === 'lost') {
      return { about: `Sobre ${item.pet_name || 'la mascota'} · Perdido`, dot: () => palette.coral };
    }
    return { about: `Sobre ${item.pet_name || 'una encontrada'} · Encontrado`, dot: () => palette.teal };
  };

  const renderItem = ({ item }) => {
    if (item.kind === 'chat') {
      const unread = !item.is_read && Number(item.receiver_id) === Number(me?.id);
      const mineLast = Number(item.sender_id) === Number(me?.id);
      return (
        <View style={styles.itemWrap}>
          {item.key === firstChatKey ? (
            <Text style={[styles.label, styles.groupLabel, { color: c.text }]}>Conversaciones</Text>
          ) : null}
          <Pressable
            onPress={() => openChat(item)}
            style={({ pressed }) => [styles.row, { backgroundColor: c.card, opacity: pressed ? 0.85 : 1 }]}
          >
            <View>
              <Image source={{ uri: item.photo_url }} style={[styles.thumb, { backgroundColor: c.photo }]} />
              {petState(item) ? (
                <View style={[styles.stateDot, { backgroundColor: petState(item).dot(c), borderColor: c.card }]} />
              ) : null}
            </View>
            <View style={styles.flex}>
              <View style={styles.rowTop}>
                <Text style={[styles.name, { color: c.title }]} numberOfLines={1}>
                  {item.other_user_name || 'Usuario'}
                </Text>
                <Text style={[styles.time, { color: c.text, fontFamily: unread ? fonts.bold : fonts.medium }]}>
                  {shortTime(item.created_at)}
                </Text>
              </View>
              {petState(item) ? (
                <Text style={[styles.about, { color: c.text }]} numberOfLines={1}>
                  {petState(item).about}
                </Text>
              ) : null}
              <View style={styles.previewRow}>
                <Text
                  style={[styles.preview, { color: c.text, fontFamily: unread ? fonts.bold : fonts.regular }]}
                  numberOfLines={1}
                >
                  {mineLast ? 'Vos: ' : ''}
                  {item.content}
                </Text>
                {unread ? <View style={styles.dot} /> : null}
              </View>
            </View>
          </Pressable>
        </View>
      );
    }
    // kind === 'reminder' — follow-up accionable "¿te reencontraste?".
    if (item.kind === 'reminder') {
      const petName = item.data?.pet_name;
      const busy = answering === item.data?.pet_id;
      return (
        <View style={styles.itemWrap}>
          <View style={styles.reminder}>
            <View style={styles.reminderLabelRow}>
              <Sparkle size={15} color={palette.arena} strokeWidth={2} />
              <Text style={[styles.label, { color: palette.arena }]}>¿Te reencontraste?</Text>
            </View>
            <Text style={styles.reminderTitle}>
              ¿Pudiste reunirte con {petName ? petName : 'tu mascota'}?
            </Text>
            {busy ? (
              <ActivityIndicator color={palette.arena} />
            ) : (
              <View style={styles.reminderBtns}>
                <Pressable onPress={() => answerReminder(item, 'reunited')} style={[styles.reminderBtn, styles.reminderBtnDark]}>
                  <Text style={[styles.reminderBtnText, { color: palette.crema }]}>Sí, la recuperé</Text>
                </Pressable>
                <Pressable onPress={() => answerReminder(item, 'not_matched')} style={[styles.reminderBtn, styles.reminderBtnOutline]}>
                  <Text style={[styles.reminderBtnText, { color: palette.arena }]}>No era</Text>
                </Pressable>
                <Pressable onPress={() => answerReminder(item, 'later')} style={[styles.reminderBtn, styles.reminderBtnOutline]}>
                  <Text style={[styles.reminderBtnText, { color: palette.arena }]}>Todavía no</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      );
    }
    // kind === 'match'
    const unread = !item.read_at;
    const photo = item.data?.photo_url;
    return (
      <View style={styles.itemWrap}>
        <Pressable
          onPress={() => openMatch(item)}
          style={({ pressed }) => [
            styles.row,
            { backgroundColor: c.card, opacity: pressed ? 0.85 : 1 },
            unread && styles.matchUnread,
          ]}
        >
          {photo ? (
            <Image source={{ uri: photo }} style={[styles.thumb, { backgroundColor: c.photo }]} />
          ) : (
            <View style={[styles.thumb, { backgroundColor: c.photo }]} />
          )}
          <View style={styles.flex}>
            <Text style={[styles.label, styles.matchLabel, { color: c.text }]}>Posible coincidencia</Text>
            <Text
              style={[styles.matchText, { color: c.title, fontFamily: unread ? fonts.bold : fonts.regular }]}
              numberOfLines={2}
            >
              Reportaron una mascota similar{item.data?.match_name ? ` a ${item.data.match_name}` : ''}. ¿Es la tuya?
            </Text>
          </View>
          <ChevronRight size={20} color={c.text} strokeWidth={2} />
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: c.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.title }]}>Mensajes</Text>
        {unreadCount > 0 ? (
          <View style={styles.unreadPill}>
            <Text style={styles.unreadPillText}>{unreadCount} sin leer</Text>
          </View>
        ) : null}
      </View>

      {hasChats ? (
        <View style={[styles.search, { backgroundColor: c.inputBg, borderColor: c.cardBorder }]}>
          <Search size={18} color={c.text} strokeWidth={2} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar por persona o mascota"
            placeholderTextColor={c.placeholder}
            accessibilityLabel="Buscar conversación"
            returnKeyType="search"
            style={[styles.searchInput, { color: c.inputText }]}
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Borrar búsqueda">
              <X size={18} color={c.text} strokeWidth={2} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <FlatList
        data={visibleItems}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        contentContainerStyle={[{ paddingBottom: bottomSpace }, visibleItems.length === 0 && styles.emptyWrap]}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          query.trim() ? (
            <EmptyState
              icon={SearchX}
              color={palette.coral}
              title="No encontramos conversaciones"
              text="Probá con otro nombre de persona o de mascota."
              action={{ title: 'Limpiar búsqueda', variant: 'outline', onPress: () => setQuery('') }}
            />
          ) : (
          <EmptyState
            icon={MessageCircle}
            color={palette.coral}
            title="Todavía no hay conversaciones"
            text="Cuando contactes (o te contacten) por una mascota, aparece acá."
          />
          )
        }
      />

      {/* Celebración post-reencuentro — el momento de más aprecio, con la
          donación ahí mismo. */}
      <Modal visible={!!celebration} transparent animationType="fade" onRequestClose={() => setCelebration(null)}>
        <View style={styles.celebrationBackdrop}>
          <View style={[styles.celebrationCard, { backgroundColor: c.bg }]}>
            <View style={styles.celebrationIcon}>
              <PartyPopper size={36} color={palette.arena} strokeWidth={2} />
            </View>
            <Text style={[styles.celebrationTitle, { color: c.title }]}>
              {celebration?.petName ? `¡${celebration.petName} volvió a casa!` : '¡Volvió a casa!'}
            </Text>
            <Text style={[styles.celebrationSub, { color: c.text }]}>
              Cerramos el caso. Gracias por avisarnos.
            </Text>
            {celebration ? (
              <DonationBanner
                petId={celebration.petId}
                petName={celebration.petName}
                onDismiss={() => setCelebration(null)}
              />
            ) : null}
            <Pressable onPress={() => setCelebration(null)} style={styles.celebrationClose}>
              <Text style={[styles.celebrationCloseText, { color: c.text }]}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <TabBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1, minWidth: 0, gap: 3 },
  search: {
    marginHorizontal: 20, marginBottom: 12, height: 52, paddingHorizontal: 16, borderWidth: 1, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  searchInput: { flex: 1, height: 44, fontFamily: fonts.regular, fontSize: 15, paddingVertical: 0 },
  header: {
    height: 48, marginTop: 16, marginBottom: 20, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  title: { fontFamily: fonts.display, fontSize: 34, lineHeight: 40 },
  about: { fontFamily: fonts.bold, fontSize: 12 },
  stateDot: { position: 'absolute', right: -4, bottom: -4, width: 14, height: 14, borderRadius: 7, borderWidth: 3 },
  unreadPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: palette.coral },
  unreadPillText: { fontFamily: fonts.bold, fontSize: 13, color: palette.arena },

  itemWrap: { paddingHorizontal: 20, marginBottom: 10 },
  label: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  groupLabel: { marginTop: 10, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 20 },
  thumb: { width: 56, height: 56, borderRadius: 18 },
  rowTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  name: { flex: 1, fontFamily: fonts.display, fontSize: 16 },
  time: { fontSize: 12 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  preview: { flex: 1, fontSize: 14 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: palette.coral },

  matchUnread: { borderWidth: 2, borderColor: palette.coral },
  matchLabel: { fontSize: 11 },
  matchText: { fontSize: 14, lineHeight: 19 },

  reminder: { backgroundColor: palette.teal, borderRadius: 24, padding: 18, gap: 12 },
  reminderLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reminderTitle: { fontFamily: fonts.display, fontSize: 20, lineHeight: 24, color: palette.arena },
  reminderBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reminderBtn: { height: 40, paddingHorizontal: 14, borderRadius: 12, justifyContent: 'center' },
  reminderBtnDark: { backgroundColor: palette.noche },
  reminderBtnOutline: { borderWidth: 2, borderColor: palette.arena },
  reminderBtnText: { fontFamily: fonts.bold, fontSize: 13 },

  emptyWrap: { flexGrow: 1, justifyContent: 'center' },

  celebrationBackdrop: {
    flex: 1, backgroundColor: 'rgba(26,26,46,0.55)', justifyContent: 'center', padding: 20,
  },
  celebrationCard: { borderRadius: 28, paddingTop: 28, paddingHorizontal: 20, paddingBottom: 16, alignItems: 'center', gap: 12 },
  celebrationIcon: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: palette.violeta, alignItems: 'center', justifyContent: 'center',
  },
  celebrationTitle: { fontFamily: fonts.display, fontSize: 26, lineHeight: 30, textAlign: 'center' },
  celebrationSub: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 4 },
  celebrationClose: { height: 44, paddingHorizontal: 20, justifyContent: 'center' },
  celebrationCloseText: { fontFamily: fonts.medium, fontSize: 14, textDecorationLine: 'underline' },
});
