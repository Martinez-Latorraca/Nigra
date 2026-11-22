import { useState } from 'react';
import {
  Modal, View, Text, Pressable, TextInput, Switch, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import api from '../lib/api';
import { useTheme, palette, fonts } from '../lib/theme';

const REASONS = [
  { key: 'spam', label: 'Spam' },
  { key: 'harassment', label: 'Acoso' },
  { key: 'scam', label: 'Estafa / recompensa' },
  { key: 'inappropriate', label: 'Contenido inapropiado' },
  { key: 'other', label: 'Otro' },
];

// Modal de denuncia. Sirve para reportar a un usuario (messageId null) o un
// mensaje puntual (messageId presente). Incluye toggle de bloqueo (default ON).
// onDone(blocked) se llama tras enviar con éxito.
export default function ReportModal({
  visible, onClose, reportedUserId, reportedName, messageId = null, petId = null, onDone,
}) {
  const c = useTheme();
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [block, setBlock] = useState(true);
  const [sending, setSending] = useState(false);

  const reset = () => { setReason(''); setNote(''); setBlock(true); setSending(false); };

  const submit = async () => {
    if (!reason) return Alert.alert('Elegí un motivo', 'Seleccioná por qué estás denunciando.');
    setSending(true);
    try {
      await api.post('/api/reports', {
        reported_user_id: reportedUserId,
        message_id: messageId,
        pet_id: petId,
        reason,
        note: note.trim() || undefined,
        block,
      });
      const didBlock = block;
      reset();
      onDone?.(didBlock);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'No se pudo enviar la denuncia.');
      setSending(false);
    }
  };

  const close = () => { reset(); onClose?.(); };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={[styles.sheet, { backgroundColor: c.bg }]} onPress={() => {}}>
          <View style={styles.handle} />
          <Text style={[styles.title, { color: c.title }]}>
            {messageId ? 'Denunciar mensaje' : `Denunciar a ${reportedName || 'esta persona'}`}
          </Text>
          <Text style={[styles.sub, { color: c.text }]}>
            Un admin revisa las denuncias. Esto no le avisa a la persona.
          </Text>

          <Text style={[styles.label, { color: c.text }]}>Motivo</Text>
          <View style={styles.reasons}>
            {REASONS.map((r) => {
              const active = reason === r.key;
              return (
                <Pressable
                  key={r.key}
                  onPress={() => setReason(r.key)}
                  style={[
                    styles.chip,
                    active
                      ? { backgroundColor: c.inverseBg, borderColor: c.inverseBg }
                      : { backgroundColor: c.card, borderColor: c.cardBorder },
                  ]}
                >
                  <Text style={[styles.chipText, { color: active ? c.inverseText : c.title, fontFamily: active ? fonts.bold : fonts.medium }]}>{r.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.label, { color: c.text }]}>Nota (opcional)</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Contá qué pasó (opcional)"
            placeholderTextColor={c.placeholder}
            multiline
            maxLength={1000}
            style={[styles.input, { color: c.inputText, borderColor: c.cardBorder, backgroundColor: c.card }]}
          />

          <View style={[styles.blockRow, { backgroundColor: c.card }]}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={[styles.blockTitle, { color: c.title }]}>Bloquear a esta persona</Text>
              <Text style={[styles.blockHint, { color: c.text }]}>
                Dejás de ver y recibir sus mensajes.
              </Text>
            </View>
            <Switch value={block} onValueChange={setBlock} trackColor={{ false: c.divider, true: palette.teal }} thumbColor={palette.blanco} />
          </View>

          <Pressable
            onPress={submit}
            disabled={sending}
            style={[styles.submitBtn, sending && { opacity: 0.5 }]}
          >
            {sending ? (
              <ActivityIndicator color={palette.arena} />
            ) : (
              <Text style={styles.submitText}>Enviar denuncia</Text>
            )}
          </Pressable>
          <Pressable onPress={close} style={styles.cancelBtn}>
            <Text style={[styles.cancelText, { color: c.text }]}>Cancelar</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(26,26,46,0.55)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 10, paddingHorizontal: 20, paddingBottom: 34, gap: 14,
  },
  handle: {
    alignSelf: 'center', width: 44, height: 5, borderRadius: 999,
    backgroundColor: palette.arena, borderWidth: 1, borderColor: 'rgba(26,26,46,0.12)', marginBottom: 4,
  },
  title: { fontFamily: fonts.display, fontSize: 22, lineHeight: 26 },
  sub: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, marginTop: -10 },
  label: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: -4 },
  chip: { height: 38, borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, justifyContent: 'center' },
  chipText: { fontSize: 14 },
  input: {
    borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, minHeight: 84,
    fontFamily: fonts.regular, fontSize: 15, textAlignVertical: 'top', marginTop: -4,
  },
  blockRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 18 },
  blockTitle: { fontFamily: fonts.bold, fontSize: 15 },
  blockHint: { fontFamily: fonts.regular, fontSize: 13, marginTop: 2 },
  submitBtn: {
    height: 52, backgroundColor: palette.coral, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
  },
  submitText: { fontFamily: fonts.bold, color: palette.arena, fontSize: 15 },
  cancelBtn: { height: 40, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontFamily: fonts.medium, fontSize: 14, textDecorationLine: 'underline' },
});
