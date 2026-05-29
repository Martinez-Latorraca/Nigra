import { useEffect } from 'react';
import { View, Text, Pressable, Image, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSelector } from 'react-redux';
import { useTheme } from '../src/lib/theme';
import { useSocket } from '../src/lib/socket';
import MenuButton from '../src/components/MenuButton';

export default function Messages() {
  const c = useTheme();
  const me = useSelector((s) => s.user.data);
  const { inbox, refreshInbox } = useSocket();

  useEffect(() => {
    refreshInbox();
  }, [refreshInbox]);

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

  const renderItem = ({ item }) => {
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
        data={inbox}
        keyExtractor={(item) => `${item.pet_id}-${item.other_user_id}`}
        renderItem={renderItem}
        contentContainerStyle={inbox.length === 0 && styles.emptyWrap}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: c.subtitle }]}>
            No tenés conversaciones todavía. Cuando contactes (o te contacten) por una mascota, aparecen acá.
          </Text>
        }
      />
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
  preview: { fontSize: 14, marginTop: 2 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  emptyWrap: { flexGrow: 1, justifyContent: 'center' },
  empty: { textAlign: 'center', fontSize: 14, paddingHorizontal: 40, lineHeight: 20 },
});
