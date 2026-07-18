import { Pressable, View, StyleSheet } from 'react-native';
import { useTheme } from '../lib/theme';
import { useSocket } from '../lib/socket';
import { useSidebar } from '../lib/sidebar';
import MimoPaw from '../../assets/menu-icon-paw.svg';

export default function MenuButton() {
  const c = useTheme();
  const { unreadCount } = useSocket();
  const { open } = useSidebar();
  return (
    <Pressable onPress={open} hitSlop={12} style={styles.btn}>
      <MimoPaw width={28} height={28} />
      {unreadCount > 0 ? <View style={[styles.dot, { borderColor: c.bg }]} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { position: 'relative', padding: 4 },
  dot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
    borderWidth: 2,
  },
});
