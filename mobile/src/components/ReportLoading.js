import { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, palette, fonts } from '../lib/theme';
import Wordmark from './Wordmark';
import Button from './Button';

const PHRASES = [
  'Iniciando motor de IA...',
  'Analizando rasgos faciales de la mascota...',
  'Extrayendo vectores biométricos...',
  'Buscando coincidencias en la Comunidad Mimo...',
  'Procesando imágenes en alta resolución...',
  'Generando reporte inteligente...',
];

// TODO(contenido): el anuncio por defecto es de ejemplo (código con la marca
// vieja). Ver REDISENO-PENDIENTES.md.
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
        <Wordmark size={30} />
        <ActivityIndicator size="large" color={palette.coral} />
        <Text style={[styles.phrase, { color: c.text }]}>{PHRASES[idx]}</Text>
      </View>

      {/* Publicidad patrocinada */}
      <View style={[styles.ad, { backgroundColor: c.card }]}>
        <Text style={[styles.sponsored, { color: c.text }]}>Contenido patrocinado</Text>
        <Text style={[styles.adTitle, { color: c.title }]}>{title}</Text>
        <Text style={[styles.adDesc, { color: c.text }]}>{description}</Text>
        <Button title={buttonText} onPress={() => Linking.openURL(link)} style={styles.adBtn} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 40 },
  top: { alignItems: 'center', gap: 20 },
  phrase: {
    fontFamily: fonts.bold,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
  },
  ad: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  sponsored: {
    fontFamily: fonts.bold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  adTitle: { fontFamily: fonts.display, fontSize: 20, textAlign: 'center' },
  adDesc: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 12 },
  adBtn: { alignSelf: 'stretch' },
});
