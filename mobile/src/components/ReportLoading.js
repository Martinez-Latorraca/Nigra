import { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, Pressable, StyleSheet, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../lib/theme';

const PHRASES = [
  'Iniciando motor de IA...',
  'Analizando rasgos faciales de la mascota...',
  'Extrayendo vectores biométricos...',
  'Buscando coincidencias en la Comunidad Mimo...',
  'Procesando imágenes en alta resolución...',
  'Generando reporte inteligente...',
];

export default function ReportLoading({
  title = 'Protección inteligente.',
  description = 'Conseguí un collar con tecnología de rastreo y un 20% de descuento usando el código NIGRA20.',
  buttonText = 'Explorar',
  link = 'https://www.mercadolibre.com.uy/',
}) {
  const c = useTheme();
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((p) => (p + 1) % PHRASES.length), 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}>
      {/* Carrusel de carga */}
      <View style={styles.top}>
        <ActivityIndicator size="large" color={c.title} />
        <Text style={[styles.phrase, { color: c.title }]}>{PHRASES[idx]}</Text>
      </View>

      {/* Publicidad patrocinada */}
      <View style={[styles.ad, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
        <Text style={[styles.sponsored, { color: c.label }]}>CONTENIDO PATROCINADO</Text>
        <Text style={[styles.adTitle, { color: c.title }]}>{title}</Text>
        <Text style={[styles.adDesc, { color: c.subtitle }]}>{description}</Text>
        <Pressable style={[styles.adBtn, { backgroundColor: c.primary }]} onPress={() => Linking.openURL(link)}>
          <Text style={[styles.adBtnText, { color: c.primaryText }]}>{buttonText}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 40 },
  top: { alignItems: 'center', gap: 18 },
  phrase: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  ad: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 28,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
  },
  sponsored: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 2.5,
    marginBottom: 14,
  },
  adTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3, marginBottom: 8, textAlign: 'center' },
  adDesc: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 22 },
  adBtn: { borderRadius: 999, paddingHorizontal: 32, paddingVertical: 13 },
  adBtnText: { fontWeight: '700', fontSize: 14 },
});
