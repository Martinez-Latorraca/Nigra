import { useEffect, useState } from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSocket } from '../lib/socket';
import { useTheme } from '../lib/theme';

// Toast in-app: aparece si llega un mensaje o match y NO estás ya en la
// pantalla correspondiente. Tap → navega. Se auto-cierra a los 4s.
export default function BannerHost() {
  const c = useTheme();
  const { socket } = useSocket();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [banner, setBanner] = useState(null);

  // Auto-dismiss
  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 4000);
    return () => clearTimeout(t);
  }, [banner]);

  useEffect(() => {
    if (!socket) return;

    const onChatNotification = (n) => {
      // n: { pet_id, petPhoto, sender_id, senderName, content }
      const inChat = pathname === `/chat/${n.pet_id}`;
      if (inChat) return;
      setBanner({
        kind: 'chat',
        title: n.senderName || 'Mensaje nuevo',
        body: n.content,
        photo: n.petPhoto,
        onTap: () =>
          router.push({
            pathname: `/chat/${n.pet_id}`,
            params: {
              otherUserId: String(n.sender_id),
              name: n.senderName || '',
              photo: n.petPhoto || '',
            },
          }),
      });
    };

    const onMatch = (notif) => {
      const petId = notif?.data?.pet_id;
      const inPet = petId != null && pathname === `/pet/${petId}`;
      if (inPet) return;
      setBanner({
        kind: 'match',
        title: 'Posible coincidencia',
        body: `Reportaron una mascota similar${
          notif?.data?.match_name ? ` a ${notif.data.match_name}` : ''
        }. ¿Es la tuya?`,
        photo: notif?.data?.photo_url,
        onTap: () => petId && router.push(`/pet/${petId}`),
      });
    };

    socket.on('new_notification', onChatNotification);
    socket.on('new_match_notification', onMatch);
    return () => {
      socket.off('new_notification', onChatNotification);
      socket.off('new_match_notification', onMatch);
    };
  }, [socket, pathname]);

  if (!banner) return null;

  const accent = banner.kind === 'match' ? '#3B82F6' : c.primary;

  return (
    <Pressable
      style={[styles.wrapper, { top: insets.top + 8 }]}
      onPress={() => {
        banner.onTap?.();
        setBanner(null);
      }}
    >
      <View
        style={[
          styles.banner,
          { backgroundColor: c.card, borderColor: c.cardBorder, borderLeftColor: accent },
        ]}
      >
        {banner.photo ? (
          <Image source={{ uri: banner.photo }} style={styles.avatar} />
        ) : (
          <View style={styles.avatar} />
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: c.title }]} numberOfLines={1}>
            {banner.title}
          </Text>
          <Text style={[styles.body, { color: c.subtitle }]} numberOfLines={2}>
            {banner.body}
          </Text>
        </View>
        <Pressable
          hitSlop={12}
          onPress={() => setBanner(null)}
          style={styles.closeBtn}
        >
          <Text style={[styles.close, { color: c.subtitle }]}>✕</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'absolute', left: 12, right: 12, zIndex: 1000 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E5E7EB' },
  title: { fontSize: 14, fontWeight: '700' },
  body: { fontSize: 13, marginTop: 2 },
  closeBtn: { padding: 4 },
  close: { fontSize: 16, fontWeight: '700' },
});
