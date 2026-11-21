import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Image,
  StyleSheet,
  Keyboard,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import api from '../../src/lib/api';
import { useTheme, palette, fonts } from '../../src/lib/theme';
import { useSocket } from '../../src/lib/socket';
import { ChevronLeft, Ellipsis, Check, Shield, SendHorizontal, Info, Ban } from '../../src/lib/icons';
import { translateType, translateColor } from '../../src/lib/translations';
import DonationBanner from '../../src/components/DonationBanner';
import ReportModal from '../../src/components/ReportModal';
import StatusChip from '../../src/components/StatusChip';
import { resetDismissal, selectDonationVisible } from '../../src/store/donationSlice';

// Etiqueta del separador de día: "Hoy", "Ayer" o la fecha.
function dayLabel(iso) {
  const d = new Date(iso);
  const now = new Date();
  const start = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((start(now) - start(d)) / 86400000);
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
}
const timeOf = (iso) =>
  iso ? new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '';

export default function Chat() {
  const { petId, otherUserId, name, photo } = useLocalSearchParams();
  const c = useTheme();
  const dispatch = useDispatch();
  const me = useSelector((s) => s.user.data);
  const { socket, refreshInbox } = useSocket();

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [pet, setPet] = useState(null); // { user_id, resolved_at, resolved_with_user_id, name }
  const [blocked, setBlocked] = useState(false);
  const [resolving, setResolving] = useState(false);
  // Denuncia: null = cerrado; { messageId } = abierto (messageId null = denunciar al user).
  const [reportTarget, setReportTarget] = useState(null);
  const scrollRef = useRef(null);
  const insets = useSafeAreaInsets();
  const [kbHeight, setKbHeight] = useState(0);

  const donationVisible = useSelector(selectDonationVisible(petId));

  // Manejo del teclado manual (edge-to-edge).
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => setKbHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKbHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const belongsHere = useCallback(
    (m) =>
      String(m.pet_id) === String(petId) &&
      (String(m.sender_id) === String(otherUserId) || String(m.receiver_id) === String(otherUserId)),
    [petId, otherUserId]
  );

  const addMessage = useCallback(
    (m) => setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m])),
    []
  );

  const markRead = useCallback(async () => {
    try {
      await api.put('/api/messages/read', {
        pet_id: Number(petId),
        other_user_id: Number(otherUserId),
      });
      refreshInbox();
    } catch { /* no crítico */ }
  }, [petId, otherUserId, refreshInbox]);

  // Cargamos historial + info del pet en paralelo.
  useEffect(() => {
    let active = true;
    Promise.all([
      api.get(`/api/messages/${petId}/${otherUserId}`, { params: { page: 1, limit: 30 } }),
      api.get(`/api/pets/${petId}`),
    ])
      .then(([msgRes, petRes]) => {
        if (!active) return;
        setMessages(Array.isArray(msgRes.data.messages) ? msgRes.data.messages : []);
        setBlocked(!!msgRes.data.blocked);
        setPet(petRes.data);
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [petId, otherUserId]);

  useEffect(() => { markRead(); }, [markRead]);

  // Socket: mensajes + eventos de resolve/reopen.
  useEffect(() => {
    if (!socket) return;
    socket.emit('join_pet_chat', { pet_id: petId });

    const onReceive = (m) => {
      if (!belongsHere(m)) return;
      addMessage(m);
      if (String(m.sender_id) === String(otherUserId)) markRead();
    };
    const onResolved = (payload) => {
      if (String(payload.pet_id) !== String(petId)) return;
      setPet((prev) => prev ? {
        ...prev,
        resolved_at: payload.resolved_at,
        resolved_with_user_id: payload.resolved_with_user_id,
      } : prev);
    };
    const onReopened = (payload) => {
      if (String(payload.pet_id) !== String(petId)) return;
      setPet((prev) => prev ? { ...prev, resolved_at: null, resolved_with_user_id: null } : prev);
      dispatch(resetDismissal(petId));
    };

    socket.on('receive_pet_message', onReceive);
    socket.on('pet_resolved', onResolved);
    socket.on('pet_reopened', onReopened);
    return () => {
      socket.off('receive_pet_message', onReceive);
      socket.off('pet_resolved', onResolved);
      socket.off('pet_reopened', onReopened);
    };
  }, [socket, petId, otherUserId, belongsHere, addMessage, markRead, dispatch]);

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(t);
  }, [messages, kbHeight]);

  const send = () => {
    const content = text.trim();
    if (!content || !socket) return;
    socket.emit('send_pet_message', {
      pet_id: petId, receiver_id: otherUserId,
      content, petPhoto: photo, senderName: me?.name,
    });
    setText('');
  };

  const isOwner = pet && Number(pet.user_id) === Number(me?.id);
  const isResolved = pet && pet.resolved_at != null;
  const iAmPartOfReunion = pet && (
    (isOwner && String(pet.resolved_with_user_id) === String(otherUserId)) ||
    (!isOwner && Number(pet.resolved_with_user_id) === Number(me?.id))
  );
  const chatIsClosedElsewhere = isResolved && !iAmPartOfReunion;

  const confirmResolve = () => {
    Alert.alert(
      '¿Cerrar el caso?',
      `Vas a marcar${pet?.name ? ` a ${pet.name}` : ''} como reunida. Se le avisa a la otra persona y podrás ver un mensaje de gracias.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sí, cerrar caso', onPress: doResolve },
      ]
    );
  };

  // Tras enviar una denuncia. Si bloqueó, la conversación queda oculta:
  // refrescamos inbox y volvemos. Si no, solo confirmamos.
  const onReportDone = (blocked) => {
    setReportTarget(null);
    if (blocked) {
      refreshInbox();
      Alert.alert('Listo', 'Enviamos tu denuncia y bloqueaste a esta persona.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } else {
      Alert.alert('Gracias', 'Recibimos tu denuncia. Un admin la va a revisar.');
    }
  };

  const doResolve = async () => {
    setResolving(true);
    try {
      const { data } = await api.patch(`/api/pets/${petId}/resolve`, {
        resolved: true,
        resolved_with_user_id: Number(otherUserId),
      });
      setPet((prev) => prev ? {
        ...prev,
        resolved_at: data.resolved_at,
        resolved_with_user_id: data.resolved_with_user_id,
      } : prev);
      dispatch(resetDismissal(petId));
    } catch (e) {
      Alert.alert('Error', 'No se pudo cerrar el caso. Probá de nuevo.');
    } finally {
      setResolving(false);
    }
  };


  const otherName = name || 'Conversación';
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const petMeta = [pet?.name, translateType(pet?.type), translateColor(pet?.color)].filter(Boolean).map(cap).join(' · ');
  const inputDisabled = isResolved || blocked;
  let lastDay = null;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: c.bg, paddingBottom: kbHeight }]}
      edges={['top']}
    >
      <View style={[styles.header, { backgroundColor: c.card }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={[styles.roundBtn, { backgroundColor: c.bg }]} accessibilityLabel="Volver">
            <ChevronLeft size={24} color={c.text} strokeWidth={2} />
          </Pressable>
          <View style={styles.avatar}>
            <Text style={styles.avatarLetter}>{otherName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.flex}>
            <Text style={[styles.title, { color: c.title }]} numberOfLines={1}>{otherName}</Text>
            <Text style={[styles.subtitle, { color: c.text }]}>
              {isResolved ? 'Caso cerrado ✓' : 'Comunidad Mimo'}
            </Text>
          </View>
          {otherUserId ? (
            <Pressable
              onPress={() => setReportTarget({ messageId: null })}
              hitSlop={8}
              style={[styles.roundBtn, { backgroundColor: c.bg }]}
              accessibilityLabel="Más opciones"
            >
              <Ellipsis size={22} color={c.text} strokeWidth={2} />
            </Pressable>
          ) : null}
        </View>

        {pet ? (
          <Pressable
            onPress={() => router.push(`/pet/${petId}`)}
            style={({ pressed }) => [styles.petCard, { backgroundColor: c.bg, opacity: pressed ? 0.85 : 1 }]}
          >
            {photo || pet.photo_url ? (
              <Image source={{ uri: String(photo || pet.photo_url) }} style={[styles.petThumb, { backgroundColor: c.arena }]} />
            ) : (
              <View style={[styles.petThumb, { backgroundColor: c.arena }]} />
            )}
            <View style={styles.flex}>
              <StatusChip
                status={isResolved ? 'reunited' : pet.status}
                label={isResolved ? 'Reencontrada' : undefined}
              />
              <Text style={[styles.petMeta, { color: c.text }]} numberOfLines={1}>{petMeta}</Text>
            </View>
            {isOwner && !isResolved ? (
              <Pressable
                onPress={confirmResolve}
                disabled={resolving}
                style={[styles.closeBtn, resolving && styles.disabled]}
                hitSlop={6}
              >
                <Check size={14} color={palette.arena} strokeWidth={2.5} />
                <Text style={styles.closeBtnText}>{resolving ? '…' : 'Cerrar caso'}</Text>
              </Pressable>
            ) : null}
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.flex1}
        contentContainerStyle={styles.messages}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.safety, { backgroundColor: c.arena }]}>
          <Shield size={14} color={c.text} strokeWidth={2} />
          <Text style={[styles.safetyText, { color: c.text }]}>Si se encuentran, que sea en un lugar público.</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={c.text} style={{ marginTop: 40 }} />
        ) : messages.length === 0 ? (
          <Text style={[styles.empty, { color: c.text }]}>
            Todavía no hay mensajes. Escribí el primero.
          </Text>
        ) : (
          messages.map((m) => {
            const mine = String(m.sender_id) === String(me?.id);
            const day = m.created_at ? dayLabel(m.created_at) : null;
            const showDay = day && day !== lastDay;
            lastDay = day || lastDay;
            return (
              <View key={m.id}>
                {showDay ? <Text style={[styles.day, { color: c.text }]}>{day}</Text> : null}
                <View style={[styles.msg, { alignItems: mine ? 'flex-end' : 'flex-start' }]}>
                  <Pressable
                    // Long-press en un mensaje del otro → denunciar ese mensaje.
                    onLongPress={!mine ? () => setReportTarget({ messageId: m.id }) : undefined}
                    delayLongPress={350}
                    style={[styles.bubble, mine ? styles.bubbleMine : [styles.bubbleOther, { backgroundColor: c.card }]]}
                  >
                    <Text style={[styles.bubbleText, { color: mine ? palette.crema : c.text }]}>{m.content}</Text>
                  </Pressable>
                  <View style={styles.meta}>
                    <Text style={[styles.time, { color: c.text }]}>{timeOf(m.created_at)}</Text>
                    {mine && m.is_read ? <Check size={12} color={c.text} strokeWidth={2.5} /> : null}
                  </View>
                </View>
              </View>
            );
          })
        )}

        {iAmPartOfReunion ? (
          <Text style={styles.closedPill}>
            Caso cerrado{pet?.name ? ` · ${pet.name} volvió a casa` : ''}
          </Text>
        ) : null}

        {iAmPartOfReunion && donationVisible ? (
          <DonationBanner petId={petId} petName={pet?.name} />
        ) : null}

        {chatIsClosedElsewhere ? (
          <View style={[styles.note, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
            <Info size={18} color={c.text} strokeWidth={2} />
            <Text style={[styles.noteText, { color: c.text }]}>
              Este reporte ya se cerró: el dueño se reunió con otra persona.
            </Text>
          </View>
        ) : null}

        {blocked ? (
          <View style={[styles.note, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
            <Ban size={18} color={c.text} strokeWidth={2} />
            <Text style={[styles.noteText, { color: c.text }]}>
              Bloqueaste a esta persona. No pueden intercambiar mensajes.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.inputBar, { backgroundColor: c.card, paddingBottom: insets.bottom + 10 }]}>
        <View style={[styles.inputWrap, { backgroundColor: c.bg }, inputDisabled && styles.disabled]}>
          <TextInput
            style={[styles.input, { color: c.inputText }]}
            value={text}
            onChangeText={setText}
            placeholder={
              blocked ? 'Bloqueaste a esta persona'
                : isResolved ? 'El caso está cerrado'
                : 'Escribí un mensaje…'
            }
            placeholderTextColor="rgba(26,26,46,0.45)"
            editable={!inputDisabled}
            multiline
          />
        </View>
        <Pressable
          style={[styles.sendBtn, (!text.trim() || inputDisabled) && styles.disabled]}
          onPress={send}
          disabled={!text.trim() || inputDisabled}
          accessibilityLabel="Enviar"
        >
          <SendHorizontal size={22} color={palette.arena} strokeWidth={2} />
        </Pressable>
      </View>

      <ReportModal
        visible={reportTarget !== null}
        onClose={() => setReportTarget(null)}
        reportedUserId={Number(otherUserId)}
        reportedName={name}
        messageId={reportTarget?.messageId ?? null}
        petId={Number(petId)}
        onDone={onReportDone}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1, minWidth: 0, gap: 2 },
  flex1: { flex: 1 },
  disabled: { opacity: 0.45 },

  header: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 12,
    shadowColor: palette.noche,
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  roundBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: palette.violeta, alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { fontFamily: fonts.display, fontSize: 18, color: palette.noche },
  title: { fontFamily: fonts.display, fontSize: 17 },
  subtitle: { fontFamily: fonts.regular, fontSize: 12 },
  petCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 18 },
  petThumb: { width: 44, height: 44, borderRadius: 12 },
  petMeta: { fontFamily: fonts.bold, fontSize: 13 },
  closeBtn: {
    height: 36, paddingHorizontal: 12, borderRadius: 12, backgroundColor: palette.violeta,
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  closeBtnText: { fontFamily: fonts.bold, fontSize: 12, color: palette.arena },

  messages: { paddingHorizontal: 20, paddingVertical: 16, gap: 12, flexGrow: 1 },
  safety: {
    alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
  },
  safetyText: { fontFamily: fonts.medium, fontSize: 12 },
  empty: { textAlign: 'center', marginTop: 40, fontFamily: fonts.regular, fontSize: 15 },
  day: {
    textAlign: 'center', fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase',
    marginTop: 4, marginBottom: 12,
  },
  msg: { gap: 4 },
  bubble: { maxWidth: 260, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMine: {
    backgroundColor: palette.noche, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 6,
  },
  bubbleOther: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderBottomRightRadius: 20, borderBottomLeftRadius: 6 },
  bubbleText: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  time: { fontFamily: fonts.medium, fontSize: 11 },

  closedPill: {
    alignSelf: 'center', marginTop: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
    backgroundColor: palette.violeta, color: palette.arena, fontFamily: fonts.bold, fontSize: 12, overflow: 'hidden',
  },
  note: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: 20, borderWidth: 1,
  },
  noteText: { flex: 1, fontFamily: fonts.bold, fontSize: 14, lineHeight: 20 },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 16, paddingTop: 10,
    shadowColor: palette.noche, shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: -4 }, elevation: 4,
  },
  inputWrap: { flex: 1, minHeight: 48, borderRadius: 24, paddingHorizontal: 16, justifyContent: 'center' },
  input: { fontFamily: fonts.regular, fontSize: 15, maxHeight: 120, paddingVertical: 12 },
  sendBtn: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: palette.coral, alignItems: 'center', justifyContent: 'center',
  },
});
