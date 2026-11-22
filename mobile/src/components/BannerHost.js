import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSocket } from '../lib/socket';
import { useTheme, palette, fonts } from '../lib/theme';
import { MessageCircle, ScanSearch, X } from '../lib/icons';

// Toast in-app: aparece si llega un mensaje o match y NO estás ya en la
// pantalla correspondiente. Tap → navega. Se auto-cierra a los 4s.
// Diseño: Notif-banner.dc.html (tarjeta blanca, tile Noche para chat y Coral
// para coincidencias).
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
        }. Tocá para ver.`,
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

  const isMatch = banner.kind === 'match';
  const Icon = isMatch ? ScanSearch : MessageCircle;
  const tileBg = isMatch ? palette.coral : c.nocheSmall;
  const tileFg = isMatch ? palette.arena : palette.crema;

  return (
    <Pressable
      style={[styles.wrapper, { top: insets.top + 12 }]}
      accessibilityRole="button"
      onPress={() => {
        banner.onTap?.();
        setBanner(null);
      }}
    >
      <View accessibilityRole="alert" style={[styles.banner, { backgroundColor: c.card }]}>
        <View style={[styles.tile, { backgroundColor: tileBg }]}>
          <Icon size={20} color={tileFg} strokeWidth={2} />
        </View>
        <View style={styles.texts}>
          <Text style={[styles.title, { color: c.title }]} numberOfLines={1}>
            {banner.title}
          </Text>
          <Text style={[styles.body, { color: c.text }]} numberOfLines={2}>
            {banner.body}
          </Text>
        </View>
        <Pressable
          hitSlop={8}
          onPress={() => setBanner(null)}
          accessibilityLabel="Cerrar"
          style={[styles.closeBtn, { backgroundColor: c.bg }]}
        >
          <X size={16} color={c.text} strokeWidth={2.5} />
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
    borderRadius: 20,
    shadowColor: palette.noche,
    shadowOpacity: 0.18,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  tile: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.bold, fontSize: 14 },
  body: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
