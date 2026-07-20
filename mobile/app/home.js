import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, router } from 'expo-router';
import { useSelector } from 'react-redux';
import api from '../src/lib/api';
import { useTheme } from '../src/lib/theme';
import MenuButton from '../src/components/MenuButton';

const SUCCESS_STORIES = [
  { id: 1, name: 'Morocha', days: 3, img: 'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?q=80&w=500' },
  { id: 2, name: 'Rocco', days: 1, img: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?q=80&w=500' },
  { id: 3, name: 'Luna', days: 5, img: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=500' },
];

const PROTOCOL = [
  { n: '01', t: 'Registro', d: 'Cargamos la imagen en nuestra red neuronal para extraer rasgos biométricos únicos.' },
  { n: '02', t: 'Análisis', d: 'Comparamos el vector con miles de reportes usando pgvector y distancia geográfica.' },
  { n: '03', t: 'Conexión', d: 'Si hay match, habilitamos un canal de contacto para coordinar el reencuentro.' },
];

const soon = (feature) =>
  Alert.alert('Próximamente', `${feature} va a estar disponible en una próxima versión de Mimo mobile.`);

export default function Home() {
  const { data, token } = useSelector((s) => s.user);
  const c = useTheme();

  // Vets destacadas para la card de descubribilidad. Fetch fire-and-forget:
  // si falla, la card muestra iniciales genéricas — no bloquea el home.
  const [vetsPreview, setVetsPreview] = useState([]);
  const [vetsTotal, setVetsTotal] = useState(0);
  useEffect(() => {
    api.get('/api/vets', { params: { limit: 4 } })
      .then(({ data: d }) => {
        setVetsPreview(d?.vets || []);
        setVetsTotal(d?.total || 0);
      })
      .catch(() => {});
  }, []);

  if (!token) return <Redirect href="/login" />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.topBar}>
          <Text style={[styles.hello, { color: c.subtitle }]} numberOfLines={1}>
            Hola, <Text style={{ color: c.title, fontWeight: '700' }}>{data?.name || 'usuario'}</Text>
          </Text>
          <MenuButton />
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={[styles.kicker, { color: '#FF5C6C' }]}>COMUNIDAD DE VIGILANCIA ANIMAL</Text>
          <Text style={[styles.heroTitle, { color: c.title }]}>mimo</Text>
          <Text style={[styles.heroSub, { color: c.subtitle }]}>
            La comunidad civil que usa visión computacional para conectar mascotas perdidas con sus familias.
          </Text>
        </View>

        {/* Acción principal: Buscar / Reportar (flujo unificado) */}
        <Pressable
          style={[styles.bigCard, { backgroundColor: c.primary }]}
          onPress={() => router.push('/report')}
        >
          <Text style={[styles.bigCardTitle, { color: c.primaryText }]}>Perdí / Encontré.</Text>
          <Text style={[styles.bigCardSub, { color: c.primaryText, opacity: 0.7 }]}>
            Subí una foto y la IA busca coincidencias al instante. Si no aparece, publicás el reporte en un paso.
          </Text>
          <View style={[styles.pill, { backgroundColor: c.primaryText }]}>
            <Text style={[styles.pillText, { color: c.primary }]}>Empezar</Text>
          </View>
        </Pressable>

        {/* Veterinarias aliadas — descubribilidad del directorio */}
        <Pressable
          style={[styles.vetsCard, { backgroundColor: c.card, borderColor: c.cardBorder }]}
          onPress={() => router.push('/vets')}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.smallCardTitle, { color: c.title }]}>Veterinarias aliadas.</Text>
            <Text style={[styles.smallCardSub, { color: c.subtitle }]}>
              Clínicas de tu zona que reciben alertas y ayudan a reencontrar mascotas.
            </Text>
          </View>
          <View style={styles.vetsStack}>
            {(vetsPreview.length > 0 ? vetsPreview : Array(4).fill(null)).map((v, i) => (
              <View
                key={v?.id || i}
                style={[styles.vetChip, { marginLeft: i === 0 ? 0 : -12, zIndex: 10 - i }]}
              >
                {v?.logo_url ? (
                  <Image source={{ uri: v.logo_url }} style={styles.vetChipImg} />
                ) : (
                  <Text style={styles.vetChipLetter}>{v?.name?.charAt(0) || '🏥'}</Text>
                )}
              </View>
            ))}
            {vetsTotal > 4 && (
              <View style={[styles.vetChip, styles.vetChipMore, { marginLeft: -12 }]}>
                <Text style={styles.vetChipMoreText}>+{vetsTotal - 4}</Text>
              </View>
            )}
          </View>
        </Pressable>

        {/* Explorar */}
        <View style={styles.row}>
          <Pressable
            style={[styles.smallCard, { backgroundColor: c.card, borderColor: c.cardBorder }]}
            onPress={() => router.push('/pets')}
          >
            <Text style={[styles.smallCardTitle, { color: c.title }]}>Explorar.</Text>
            <Text style={[styles.smallCardSub, { color: c.subtitle }]}>
              Navegá los reportes activos de la comunidad.
            </Text>
          </Pressable>
        </View>

        {/* Reencuentros */}
        <Text style={[styles.sectionKicker, { color: '#22C55E' }]}>HISTORIAS CON FINAL FELIZ</Text>
        <Text style={[styles.sectionTitle, { color: c.title }]}>Reencuentros exitosos.</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stories}>
          {SUCCESS_STORIES.map((s) => (
            <View key={s.id} style={styles.story}>
              <Image source={{ uri: s.img }} style={styles.storyImg} />
              <View style={styles.storyOverlay}>
                <Text style={styles.storyName}>{s.name}</Text>
                <Text style={styles.storyDays}>
                  Reencontrado en {s.days} {s.days === 1 ? 'día' : 'días'}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Protocol */}
        <Text style={[styles.protocolTitle, { color: c.label }]}>MIMO PROTOCOL</Text>
        {PROTOCOL.map((p) => (
          <View key={p.n} style={styles.protocolRow}>
            <Text style={[styles.protocolNum, { color: c.title }]}>{p.n}</Text>
            <View style={styles.protocolBody}>
              <Text style={[styles.protocolStep, { color: c.title }]}>{p.t}</Text>
              <Text style={[styles.protocolDesc, { color: c.subtitle }]}>{p.d}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 48 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hello: { fontSize: 15, fontWeight: '500', flex: 1 },
  hero: { marginTop: 32, marginBottom: 28 },
  kicker: { fontSize: 10, fontWeight: '700', letterSpacing: 3, marginBottom: 8 },
  heroTitle: { fontSize: 64, fontWeight: '700', letterSpacing: -2 },
  heroSub: { fontSize: 16, fontWeight: '500', lineHeight: 22, marginTop: 8 },
  bigCard: { borderRadius: 36, padding: 28, gap: 12, minHeight: 220, justifyContent: 'space-between' },
  bigCardTitle: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  bigCardSub: { fontSize: 15, lineHeight: 21 },
  pill: { alignSelf: 'flex-start', paddingHorizontal: 22, paddingVertical: 12, borderRadius: 999, marginTop: 8 },
  pillText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5 },
  row: { flexDirection: 'row', gap: 12, marginTop: 12 },
  smallCard: { flex: 1, borderRadius: 28, padding: 20, borderWidth: 1, gap: 6, minHeight: 150 },
  vetsCard: {
    marginTop: 12,
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  vetsStack: { flexDirection: 'row', alignItems: 'center' },
  vetChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF5C6C',
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  vetChipImg: { width: '100%', height: '100%' },
  vetChipLetter: { color: '#fff', fontWeight: '800', fontSize: 14 },
  vetChipMore: { backgroundColor: '#1A1A2E' },
  vetChipMoreText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  smallCardTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  smallCardSub: { fontSize: 13, lineHeight: 18 },
  sectionKicker: { fontSize: 10, fontWeight: '700', letterSpacing: 3, marginTop: 40, marginBottom: 6 },
  sectionTitle: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5, marginBottom: 16 },
  stories: { marginHorizontal: -20, paddingHorizontal: 20 },
  story: { width: 160, height: 213, borderRadius: 28, overflow: 'hidden', marginRight: 14, backgroundColor: '#E5E7EB' },
  storyImg: { width: '100%', height: '100%' },
  storyOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: 'rgba(0,0,0,0.45)' },
  storyName: { color: '#fff', fontSize: 18, fontWeight: '700' },
  storyDays: { color: '#E5E7EB', fontSize: 12, fontWeight: '500' },
  protocolTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 3, marginTop: 44, marginBottom: 16 },
  protocolRow: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  protocolNum: { fontSize: 14, fontWeight: '700', width: 28 },
  protocolBody: { flex: 1 },
  protocolStep: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  protocolDesc: { fontSize: 13, lineHeight: 19 },
});
