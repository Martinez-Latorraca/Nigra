import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, router } from 'expo-router';
import { useSelector } from 'react-redux';
import { useTheme, palette, fonts, onColor } from '../src/lib/theme';
import { useSocket } from '../src/lib/socket';
import { Bell, Search, Camera, Map, HeartHandshake, HouseHeart, Stethoscope } from '../src/lib/icons';
import Wordmark from '../src/components/Wordmark';
import TabBar, { useTabBarSpace } from '../src/components/TabBar';

// Accesos a las secciones (grilla 2×2). Cada una con el color de su sección.
const SECTIONS = [
  { key: 'pets', title: 'Explorar', sub: 'Reportes de mascotas en tu zona.', color: palette.sol, icon: Map, href: '/pets' },
  { key: 'adoptions', title: 'En adopción', sub: 'Mascotas que buscan una familia.', color: palette.violeta, icon: HeartHandshake, href: '/adoptions' },
  { key: 'shelters', title: 'Refugios', sub: 'Conocé y apoyá a los refugios aliados.', color: palette.teal, icon: HouseHeart, href: '/shelters' },
  { key: 'vets', title: 'Veterinarias', sub: 'Clínicas cerca que reciben alertas.', color: palette.noche, icon: Stethoscope, href: '/vets' },
];

export default function Home() {
  const { data, token } = useSelector((s) => s.user);
  const { unreadCount } = useSocket();
  const c = useTheme();
  const bottomSpace = useTabBarSpace();

  if (!token) return <Redirect href="/login" />;

  const name = data?.name || 'usuario';

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: c.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomSpace }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Encabezado: logo · notificaciones · perfil */}
        <View style={styles.topBar}>
          <Wordmark size={26} />
          <View style={styles.topActions}>
            {/* Las notificaciones viven en Mensajes junto con los chats. */}
            <Pressable
              onPress={() => router.push('/messages')}
              accessibilityRole="button"
              accessibilityLabel="Notificaciones"
              style={[styles.roundBtn, { backgroundColor: c.card }]}
            >
              <Bell size={22} color={c.text} strokeWidth={2} />
              {unreadCount > 0 ? <View style={[styles.bellDot, { borderColor: c.card }]} /> : null}
            </Pressable>
            <Pressable
              onPress={() => router.push('/profile')}
              accessibilityRole="button"
              accessibilityLabel="Mi perfil"
              style={[styles.roundBtn, { backgroundColor: palette.violeta }]}
            >
              <Text style={styles.avatarLetter}>{name.charAt(0).toUpperCase()}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.greeting}>
          <Text style={[styles.hello, { color: c.title }]} numberOfLines={1}>
            Hola, {name}
          </Text>
          <Text style={[styles.tagline, { color: c.text }]}>
            Una comunidad que ayuda a las mascotas a volver a casa.
          </Text>
        </View>

        {/* Acción principal: los dos botones entran al mismo flujo de reporte. */}
        <View style={styles.hero}>
          <View style={styles.heroTexts}>
            <Text style={styles.heroTitle}>¿Perdiste o encontraste una mascota?</Text>
            <Text style={styles.heroSub}>
              Subí una foto y la buscamos entre los reportes cercanos. Si no aparece, publicás el aviso en un paso.
            </Text>
          </View>
          <View style={styles.heroButtons}>
            <Pressable
              onPress={() => router.push('/report')}
              style={({ pressed }) => [styles.heroBtn, { backgroundColor: palette.noche, opacity: pressed ? 0.85 : 1 }]}
            >
              <Search size={18} color={palette.crema} strokeWidth={2} />
              <Text style={[styles.heroBtnText, { color: palette.crema }]}>Perdí la mía</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/report')}
              style={({ pressed }) => [styles.heroBtn, { backgroundColor: palette.crema, opacity: pressed ? 0.85 : 1 }]}
            >
              <Camera size={18} color={palette.noche} strokeWidth={2} />
              <Text style={[styles.heroBtnText, { color: palette.noche }]}>Encontré una</Text>
            </Pressable>
          </View>
        </View>

        {/* Secciones */}
        <View style={styles.grid}>
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const fg = onColor(s.color);
            return (
              <Pressable
                key={s.key}
                onPress={() => router.push(s.href)}
                style={({ pressed }) => [styles.sectionCard, { backgroundColor: s.color === palette.noche ? c.nocheSurface : s.color, opacity: pressed ? 0.85 : 1 }]}
              >
                <Icon size={28} color={fg} strokeWidth={2} />
                <View style={styles.sectionTexts}>
                  <Text style={[styles.sectionTitle, { color: fg }]}>{s.title}</Text>
                  <Text style={[styles.sectionSub, { color: fg }]}>{s.sub}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <TabBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 16, gap: 24 },
  topBar: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roundBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  bellDot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: palette.coral,
    borderWidth: 2,
  },
  avatarLetter: { fontFamily: fonts.display, fontSize: 18, color: palette.noche },
  greeting: { gap: 4 },
  hello: { fontFamily: fonts.display, fontSize: 28, lineHeight: 32 },
  tagline: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23 },
  hero: { backgroundColor: palette.coral, borderRadius: 28, padding: 24, gap: 16 },
  heroTexts: { gap: 8 },
  heroTitle: { fontFamily: fonts.display, fontSize: 26, lineHeight: 30, color: palette.arena },
  heroSub: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: palette.arena },
  heroButtons: { flexDirection: 'row', gap: 10 },
  heroBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  heroBtnText: { fontFamily: fonts.bold, fontSize: 15 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  sectionCard: {
    // Dos columnas: (100% - gap 12) / 2
    width: '48.3%',
    flexGrow: 1,
    minHeight: 148,
    borderRadius: 24,
    padding: 18,
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTexts: { gap: 4 },
  sectionTitle: { fontFamily: fonts.display, fontSize: 19 },
  sectionSub: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
});
