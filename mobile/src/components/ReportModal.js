import { useState } from 'react';
import {
  Modal, View, Text, Pressable, TextInput, Switch, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import api from '../lib/api';
import { useTheme } from '../lib/theme';

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
        <Pressable style={[styles.sheet, { backgroundColor: c.card }]} onPress={() => {}}>
          <View style={styles.handle} />
          <Text style={[styles.title, { color: c.title }]}>
            {messageId ? 'Denunciar mensaje' : `Denunciar a ${reportedName || 'esta persona'}`}
          </Text>
          <Text style={[styles.sub, { color: c.subtitle }]}>
            Un admin revisa las denuncias. Esto no le avisa a la persona.
          </Text>

          <Text style={[styles.label, { color: c.subtitle }]}>MOTIVO</Text>
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
                      ? { backgroundColor: '#FF5C6C', borderColor: '#FF5C6C' }
                      : { backgroundColor: c.bg, borderColor: c.cardBorder },
                  ]}
                >
                  <Text style={[styles.chipText, { color: active ? '#fff' : c.title }]}>{r.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.label, { color: c.subtitle, marginTop: 16 }]}>NOTA (OPCIONAL)</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Contá qué pasó (opcional)"
            placeholderTextColor={c.subtitle}
            multiline
            maxLength={1000}
            style={[styles.input, { color: c.title, borderColor: c.cardBorder, backgroundColor: c.bg }]}
          />

          <View style={[styles.blockRow, { borderColor: c.cardBorder }]}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={[styles.blockTitle, { color: c.title }]}>Bloquear a esta persona</Text>
              <Text style={[styles.blockHint, { color: c.subtitle }]}>
                Dejás de ver y recibir sus mensajes.
              </Text>
            </View>
            <Switch value={block} onValueChange={setBlock} trackColor={{ false: '#E5E7EB', true: '#FF5C6C' }} />
          </View>

          <Pressable
            onPress={submit}
            disabled={sending}
            style={[styles.submitBtn, sending && { opacity: 0.5 }]}
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Enviar denuncia</Text>
            )}
          </Pressable>
          <Pressable onPress={close} style={styles.cancelBtn}>
            <Text style={[styles.cancelText, { color: c.subtitle }]}>Cancelar</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 34,
  },
  handle: {
    alignSelf: 'center', width: 40, height: 4, borderRadius: 999,
    backgroundColor: 'rgba(128,128,128,0.4)', marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  sub: { fontSize: 12, marginTop: 6, lineHeight: 17 },
  label: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginTop: 20, marginBottom: 8 },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 9 },
  chipText: { fontSize: 13, fontWeight: '700' },
  input: {
    borderRadius: 16, borderWidth: 1, padding: 14, fontSize: 14, minHeight: 80, textAlignVertical: 'top',
  },
  blockRow: {
    flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, marginTop: 20, paddingTop: 16,
  },
  blockTitle: { fontSize: 15, fontWeight: '700' },
  blockHint: { fontSize: 12, marginTop: 2 },
  submitBtn: {
    marginTop: 20, backgroundColor: '#FF5C6C', borderRadius: 999, paddingVertical: 15, alignItems: 'center',
  },
  submitText: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  cancelBtn: { marginTop: 10, alignItems: 'center', paddingVertical: 8 },
  cancelText: { fontSize: 14, fontWeight: '600' },
});
