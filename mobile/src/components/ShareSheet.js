import { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, Share, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme, palette, fonts } from '../lib/theme';
import { Link, ImageIcon } from '../lib/icons';
import { storyAvailable, shareStory } from '../lib/shareStory';
import { toast } from '../lib/feedback';

// Hoja del botón Compartir (Compartir.dc.html): "Enviar link" (texto + link,
// arma la vista previa en WhatsApp) o "Compartir como historia" (imagen
// vertical para Instagram y estados). Si el build no tiene expo-sharing, la
// hoja no se abre y Compartir manda el link directo.
export function useShareSheet({ message, kind, id }) {
  const [visible, setVisible] = useState(false);
  const [canStory, setCanStory] = useState(false);

  useEffect(() => {
    let alive = true;
    storyAvailable().then((ok) => { if (alive) setCanStory(ok); });
    return () => { alive = false; };
  }, []);

  const sendLink = () => Share.share({ message });
  const open = () => (canStory ? setVisible(true) : sendLink());

  const sheet = (
    <ShareSheet
      visible={visible}
      onClose={() => setVisible(false)}
      onLink={() => { setVisible(false); sendLink(); }}
      onStory={() => shareStory(kind, id)}
    />
  );
  return { open, sheet };
}

function ShareSheet({ visible, onClose, onLink, onStory }) {
  const c = useTheme();
  const [busy, setBusy] = useState(false);

  const story = async () => {
    setBusy(true);
    try {
      await onStory();
      onClose();
    } catch {
      toast('No se pudo armar la historia. Probá de nuevo.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const Option = ({ icon, color, title, sub, onPress, loading }) => {
    const Icon = icon;
    return (
      <Pressable
        onPress={onPress}
        disabled={busy}
        style={({ pressed }) => [styles.option, { backgroundColor: c.card, borderColor: c.cardBorder, opacity: pressed ? 0.85 : 1 }]}
      >
        <View style={[styles.optionIcon, { backgroundColor: color }]}>
          {loading ? <ActivityIndicator color={palette.crema} /> : <Icon size={22} color={palette.crema} strokeWidth={2} />}
        </View>
        <View style={styles.optionText}>
          <Text style={[styles.optionTitle, { color: c.title }]}>{title}</Text>
          <Text style={[styles.optionSub, { color: c.text }]}>{sub}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={busy ? undefined : onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: c.bg }]} onPress={() => {}}>
          <View style={styles.handle} />
          <Text style={[styles.title, { color: c.title }]}>Compartir</Text>
          <Option
            icon={Link}
            color={palette.noche}
            title="Enviar link"
            sub="Por WhatsApp, mensaje o redes, con la vista previa de la ficha."
            onPress={onLink}
          />
          <Option
            icon={ImageIcon}
            color={palette.coral}
            title="Compartir como historia"
            sub="Una imagen vertical para Instagram o tu estado de WhatsApp."
            onPress={story}
            loading={busy}
          />
          <Pressable onPress={onClose} disabled={busy} style={styles.cancelBtn}>
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
    borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 10, paddingHorizontal: 20, paddingBottom: 34, gap: 12,
  },
  handle: {
    alignSelf: 'center', width: 44, height: 5, borderRadius: 999,
    backgroundColor: palette.arena, borderWidth: 1, borderColor: 'rgba(26,26,46,0.12)', marginBottom: 4,
  },
  title: { fontFamily: fonts.display, fontSize: 22, lineHeight: 26, marginBottom: 2 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 20, borderWidth: 1 },
  optionIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  optionText: { flex: 1 },
  optionTitle: { fontFamily: fonts.bold, fontSize: 16 },
  optionSub: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, marginTop: 2 },
  cancelBtn: { height: 40, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontFamily: fonts.medium, fontSize: 14, textDecorationLine: 'underline' },
});
