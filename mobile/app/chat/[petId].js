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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useSelector } from 'react-redux';
import api from '../../src/lib/api';
import { useTheme } from '../../src/lib/theme';
import { useSocket } from '../../src/lib/socket';

export default function Chat() {
  const { petId, otherUserId, name, photo } = useLocalSearchParams();
  const c = useTheme();
  const me = useSelector((s) => s.user.data);
  const { socket, refreshInbox } = useSocket();

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);
  const insets = useSafeAreaInsets();
  const [kbHeight, setKbHeight] = useState(0);

  // Manejo del teclado manual: con edge-to-edge, KeyboardAvoidingView no
  // levanta el input de forma confiable en Android. Empujamos el contenido
  // por la altura del teclado.
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => setKbHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKbHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
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
    } catch {
      // no crítico
    }
  }, [petId, otherUserId, refreshInbox]);

  // Historial inicial
  useEffect(() => {
    let active = true;
    api
      .get(`/api/messages/${petId}/${otherUserId}`, { params: { page: 1, limit: 30 } })
      .then(({ data }) => {
        if (active) setMessages(Array.isArray(data.messages) ? data.messages : []);
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [petId, otherUserId]);

  // Marcar leído al abrir
  useEffect(() => {
    markRead();
  }, [markRead]);

  // Socket: unirse a la sala y escuchar mensajes
  useEffect(() => {
    if (!socket) return;
    socket.emit('join_pet_chat', { pet_id: petId });

    const onReceive = (m) => {
      if (!belongsHere(m)) return;
      addMessage(m);
      if (String(m.sender_id) === String(otherUserId)) markRead();
    };
    socket.on('receive_pet_message', onReceive);
    return () => socket.off('receive_pet_message', onReceive);
  }, [socket, petId, otherUserId, belongsHere, addMessage, markRead]);

  // Auto-scroll al final (al recibir mensajes o al abrir el teclado)
  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(t);
  }, [messages, kbHeight]);

  const send = () => {
    const content = text.trim();
    if (!content || !socket) return;
    socket.emit('send_pet_message', {
      pet_id: petId,
      receiver_id: otherUserId,
      content,
      petPhoto: photo,
      senderName: me?.name,
    });
    setText('');
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
          <Text style={[styles.subtitle, { color: c.subtitle }]}>Red Nigra</Text>
        </View>
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
  messages: { padding: 16, gap: 10, flexGrow: 1 },
  empty: { textAlign: 'center', marginTop: 60, fontSize: 14 },
  bubbleRow: { flexDirection: 'row' },
  bubble: { maxWidth: '82%', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22 },
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
