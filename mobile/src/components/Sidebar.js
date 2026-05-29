import { Modal, View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { useDispatch } from 'react-redux';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { clearCredentials } from '../store/userSlice';
import { useSocket } from '../lib/socket';

const { width: SCREEN_W } = Dimensions.get('window');
const PANEL_W = Math.min(340, Math.round(SCREEN_W * 0.82));

export default function Sidebar({ visible, onClose, user, c }) {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { unreadCount } = useSocket();

  const go = (path) => {
    onClose();
    setTimeout(() => router.push(path), 50);
  };

  const logout = () => {
    onClose();
    dispatch(clearCredentials());
    router.replace('/login');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View
        style={[
          styles.panel,
          {
            backgroundColor: c.bg,
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 16,
          },
        ]}
      >
        <View style={[styles.headerSection, { borderBottomColor: c.divider }]}>
          <Text style={[styles.kicker, { color: c.subtitle }]}>MI CUENTA</Text>
          <Text style={[styles.name, { color: c.title }]} numberOfLines={1}>
            {user?.name || 'Usuario'}
          </Text>
          {user?.email ? (
            <Text style={[styles.email, { color: c.subtitle }]} numberOfLines={1}>
              {user.email}
            </Text>
          ) : null}
        </View>

        <Pressable
          style={({ pressed }) => [styles.item, pressed && { backgroundColor: c.card }]}
          onPress={() => go('/home')}
        >
          <Text style={[styles.itemText, { color: c.text }]}>Inicio</Text>
          <Text style={[styles.chevron, { color: c.subtitle }]}>›</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.item, pressed && { backgroundColor: c.card }]}
          onPress={() => go('/report')}
        >
          <Text style={[styles.itemText, { color: c.text }]}>Buscar</Text>
          <Text style={[styles.chevron, { color: c.subtitle }]}>›</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.item, pressed && { backgroundColor: c.card }]}
          onPress={() => go('/pets')}
        >
          <Text style={[styles.itemText, { color: c.text }]}>Explorar</Text>
          <Text style={[styles.chevron, { color: c.subtitle }]}>›</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.item, pressed && { backgroundColor: c.card }]}
          onPress={() => go('/profile')}
        >
          <Text style={[styles.itemText, { color: c.text }]}>Perfil</Text>
          <Text style={[styles.chevron, { color: c.subtitle }]}>›</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.item, pressed && { backgroundColor: c.card }]}
          onPress={() => go('/messages')}
        >
          <View style={styles.itemLeft}>
            <Text style={[styles.itemText, { color: c.text }]}>Mensajes</Text>
            {unreadCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.chevron, { color: c.subtitle }]}>›</Text>
        </Pressable>

        <View style={{ flex: 1 }} />

        <Pressable style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  panel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: PANEL_W,
    paddingHorizontal: 20,
  },
  headerSection: {
    paddingBottom: 24,
    marginBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  kicker: { fontSize: 10, fontWeight: '700', letterSpacing: 3, marginBottom: 6 },
  name: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  email: { fontSize: 13, marginTop: 2 },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemText: { fontSize: 16, fontWeight: '600' },
  chevron: { fontSize: 22, fontWeight: '600' },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  logoutBtn: {
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  logoutText: { color: '#EF4444', fontWeight: '700', fontSize: 14 },
});
