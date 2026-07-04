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
import { useTheme } from '../../src/lib/theme';
import { useSocket } from '../../src/lib/socket';
import DonationBanner from '../../src/components/DonationBanner';
import { resetDismissal, selectDonationVisible } from '../../src/store/donationSlice';

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
  const [resolving, setResolving] = useState(false);
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

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: c.bg, paddingBottom: kbHeight }]}
      edges={['top']}
    >
      <View style={[styles.header, { borderBottomColor: c.divider }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[styles.back, { color: c.subtitle }]}>‹</Text>
        </Pressable>
        {photo ? <Image source={{ uri: String(photo) }} style={styles.avatar} /> : null}
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: c.title }]} numberOfLines={1}>
            {name || 'Conversación'}
          </Text>
          <Text style={[styles.subtitle, { color: c.subtitle }]}>
            {isResolved ? 'Caso cerrado ✓' : 'Comunidad Mimo'}
          </Text>
        </View>
        {isOwner && !isResolved ? (
          <Pressable
            onPress={confirmResolve}
            disabled={resolving}
            style={[styles.closeBtn, { backgroundColor: c.primary }, resolving && styles.disabled]}
            hitSlop={6}
          >
            <Text style={[styles.closeBtnText, { color: c.primaryText }]}>
              {resolving ? '…' : 'Cerrar caso'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={styles.messages}
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <ActivityIndicator color={c.subtitle} style={{ marginTop: 40 }} />
        ) : messages.length === 0 ? (
          <Text style={[styles.empty, { color: c.subtitle }]}>
            Todavía no hay mensajes. Escribí el primero.
          </Text>
        ) : (
          messages.map((m) => {
            const mine = String(m.sender_id) === String(me?.id);
            return (
              <View
                key={m.id}
                style={[styles.bubbleRow, { justifyContent: mine ? 'flex-end' : 'flex-start' }]}
              >
                <View
                  style={[
                    styles.bubble,
                    mine
                      ? { backgroundColor: c.primary }
                      : { backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder },
                  ]}
                >
                  <Text style={{ color: mine ? c.primaryText : c.text, fontSize: 15 }}>
                    {m.content}
                  </Text>
                </View>
              </View>
            );
          })
        )}

        {iAmPartOfReunion && donationVisible ? (
          <DonationBanner petId={petId} petName={pet?.name} />
        ) : null}

        {chatIsClosedElsewhere ? (
          <View style={[styles.closedNote, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
            <Text style={[styles.closedNoteText, { color: c.subtitle }]}>
              Este reporte ya se cerró — el dueño se reunió con otra persona.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.inputRow,
          {
            borderTopColor: c.divider,
            backgroundColor: c.bg,
            paddingBottom: insets.bottom + 10,
          },
        ]}
      >
        <TextInput
          style={[styles.input, { backgroundColor: c.inputBg, color: c.inputText }]}
          value={text}
          onChangeText={setText}
          placeholder="Escribí un mensaje…"
          placeholderTextColor={c.label}
          multiline
        />
        <Pressable
          style={[styles.sendBtn, { backgroundColor: c.primary }, !text.trim() && styles.disabled]}
          onPress={send}
          disabled={!text.trim()}
        >
          <Text style={[styles.sendText, { color: c.primaryText }]}>→</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: { fontSize: 30, fontWeight: '700', width: 24 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E5E7EB' },
  title: { fontSize: 16, fontWeight: '700' },
  subtitle: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  closeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  closeBtnText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  messages: { padding: 16, gap: 10, flexGrow: 1 },
  empty: { textAlign: 'center', marginTop: 60, fontSize: 14 },
  bubbleRow: { flexDirection: 'row' },
  bubble: { maxWidth: '82%', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22 },
  closedNote: {
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  closedNoteText: { fontSize: 13, textAlign: 'center', fontStyle: 'italic' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: { flex: 1, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, maxHeight: 120 },
  sendBtn: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  sendText: { fontSize: 22, fontWeight: '700' },
  disabled: { opacity: 0.4 },
});
