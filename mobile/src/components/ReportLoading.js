import { useEffect, useRef, useState } from 'react';
import { View, Text, Image, Pressable, ScrollView, Animated, Easing, StyleSheet, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import MimoPin from '../../assets/mimo-pin.svg';
import { useTheme, palette, fonts } from '../lib/theme';
import { Coffee, Star, Tag, ArrowRight } from '../lib/icons';
import { useLoadingSlides } from '../lib/loadingSlides';
import { SPONSOR_TIERS } from '../lib/sponsorTiers';
import { MP_DONATION_URL } from '../lib/config';
import api from '../lib/api';

// Pantalla de espera del reporte (Buscando.dc.html / Publicando.dc.html /
// Carrusel-espera.dc.html). Arriba: pin con aros de pulso, título, frase y
// barra de progreso. Abajo: carrusel de slides que vienen del servidor; si no
// hay slides (hoy, hasta que haya sponsors reales) no se muestra. Cuando la
// búsqueda termina, report.js desmonta esto y el carrusel se corta solo.

const MODES = {
  search: {
    title: 'Buscando coincidencias',
    footer: 'Te llevamos a los resultados apenas estén listos.',
    phrases: [
      'Comparando la foto con reportes cercanos…',
      'Revisando reportes de la zona…',
      'Fijándonos en la especie y el color…',
    ],
  },
  publish: {
    title: 'Publicando tu reporte',
    footer: 'Te llevamos a tu reporte apenas esté publicado.',
    phrases: [
      'Subiendo las fotos…',
      'Avisando a vecinos y veterinarias de la zona…',
      'Preparando la ficha…',
    ],
  },
};

const SLIDE_MS = 5000;
const ARENA = palette.arena;

export default function ReportLoading({ mode = 'search' }) {
  const c = useTheme();
  const { title, footer, phrases } = MODES[mode] || MODES.search;
  const slides = useLoadingSlides();
  const [phraseIdx, setPhraseIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setPhraseIdx((p) => (p + 1) % phrases.length), 3000);
    return () => clearInterval(t);
  }, [phrases.length]);

  // Pulso de los aros y progreso: no sabemos cuánto falta, así que la barra
  // avanza rápido al principio y se frena cerca del final.
  const pulse = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    const prog = Animated.timing(progress, {
      toValue: 0.92,
      duration: 12000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    prog.start();
    return () => {
      loop.stop();
      prog.stop();
    };
  }, [pulse, progress]);

  const ring = (from, to) => ({
    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [from, to] }) }],
  });

  const hasSlides = slides.length > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}>
      <View style={[styles.top, !hasSlides && styles.topAlone]}>
        <View style={styles.pinWrap}>
          <Animated.View style={[styles.ring, styles.ringOuter, ring(0.94, 1.04)]} />
          <Animated.View style={[styles.ring, styles.ringInner, ring(0.96, 1.06)]} />
          <MimoPin width={52} height={64} />
        </View>
        <Text style={[styles.title, { color: c.title }]}>{title}</Text>
        <Text style={[styles.phrase, { color: c.text }]}>{phrases[phraseIdx]}</Text>
        <View style={[styles.track, { backgroundColor: c.isDark ? '#33334F' : ARENA }]}>
          <Animated.View
            style={[
              styles.fill,
              { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
            ]}
          />
        </View>
      </View>

      {hasSlides ? <Carousel slides={slides} /> : null}

      <Text style={[styles.footer, { color: c.subtitle }]}>{footer}</Text>
    </SafeAreaView>
  );
}

function Carousel({ slides }) {
  const c = useTheme();
  const scroller = useRef(null);
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const bar = useRef(new Animated.Value(0)).current;

  // Cada slide dura SLIDE_MS; al terminar pasa al siguiente (en loop). Si la
  // persona desliza, se reinicia el tiempo desde el slide al que llegó.
  useEffect(() => {
    if (!width) return undefined;
    bar.setValue(0);
    const anim = Animated.timing(bar, { toValue: 1, duration: SLIDE_MS, easing: Easing.linear, useNativeDriver: false });
    anim.start(({ finished }) => {
      if (!finished) return;
      const next = (index + 1) % slides.length;
      scroller.current?.scrollTo({ x: next * width, animated: true });
      setIndex(next);
    });
    return () => anim.stop();
  }, [index, width, slides.length, bar]);

  const onSwipeEnd = (e) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index && i >= 0 && i < slides.length) setIndex(i);
  };

  const trackColor = c.isDark ? 'rgba(255,246,240,0.18)' : 'rgba(26,26,46,0.12)';
  const barColor = c.isDark ? palette.crema : palette.noche;

  return (
    <View style={styles.carousel}>
      <View style={styles.bars}>
        {slides.map((s, i) => (
          <View key={s.id ?? i} style={[styles.barTrack, { backgroundColor: trackColor }]}>
            <Animated.View
              style={[
                styles.barFill,
                { backgroundColor: barColor },
                i < index
                  ? { width: '100%' }
                  : i === index
                    ? { width: bar.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }
                    : { width: 0 },
              ]}
            />
          </View>
        ))}
      </View>
      <View style={styles.slidesBox} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width ? (
          <ScrollView
            ref={scroller}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onSwipeEnd}
          >
            {slides.map((s, i) => (
              <View key={s.id ?? i} style={{ width, height: '100%' }}>
                <Slide slide={s} />
              </View>
            ))}
          </ScrollView>
        ) : null}
      </View>
    </View>
  );
}

function useOpenSlide(slide) {
  const router = useRouter();
  return () => {
    if (slide.type === 'donacion') {
      api.post('/api/donations/click', { pet_id: null }).catch(() => {});
      Linking.openURL(slide.link || MP_DONATION_URL).catch(() => {});
      return;
    }
    if (slide.route) router.push(slide.route);
    else if (slide.link) Linking.openURL(slide.link).catch(() => {});
  };
}

function Slide({ slide }) {
  switch (slide.type) {
    case 'vet':
      return <VetSlide slide={slide} />;
    case 'donacion':
      return <DonationSlide slide={slide} />;
    case 'producto':
      return <ProductSlide slide={slide} />;
    case 'consejo':
      return <TipSlide slide={slide} />;
    default:
      return null;
  }
}

function AdBadge() {
  return (
    <View style={styles.adBadge}>
      <Text style={styles.adBadgeText}>Publicidad</Text>
    </View>
  );
}

function SlideButton({ title, onPress, outline, arrow, tall }) {
  const fg = outline ? ARENA : palette.crema;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.slideBtn,
        tall && { height: 52, borderRadius: 16 },
        outline ? styles.slideBtnOutline : { backgroundColor: palette.noche },
        { opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Text style={[styles.slideBtnText, { color: fg }]}>{title}</Text>
      {arrow ? <ArrowRight size={18} color={fg} strokeWidth={2} /> : null}
    </Pressable>
  );
}

function ImageArea({ uri, height, children }) {
  const c = useTheme();
  return (
    <View style={[styles.imageArea, { height, backgroundColor: c.isDark ? '#33334F' : ARENA }]}>
      {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
      <View style={styles.badgePos}>
        <AdBadge />
      </View>
      {children}
    </View>
  );
}

function VetSlide({ slide }) {
  const c = useTheme();
  const open = useOpenSlide(slide);
  const vet = slide.vet || {};
  const tier = SPONSOR_TIERS[vet.plan] || SPONSOR_TIERS.sponsor_basic;
  const initial = (vet.name || slide.title || 'V').trim().charAt(0).toUpperCase();
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderWidth: 2, borderColor: tier.color }]}>
      <ImageArea uri={slide.image_url} height={150}>
        <View style={[styles.logo, { borderColor: c.card }]}>
          {vet.logo_url ? (
            <Image source={{ uri: vet.logo_url }} style={StyleSheet.absoluteFill} />
          ) : (
            <Text style={styles.logoText}>{initial}</Text>
          )}
        </View>
      </ImageArea>
      <View style={[styles.cardBody, { paddingTop: 36 }]}>
        <View style={[styles.tierBadge, { backgroundColor: tier.color }]}>
          <Star size={11} color={ARENA} fill={ARENA} strokeWidth={0} />
          <Text style={styles.tierText}>{`${tier.label} · ${tier.tierLabel}`}</Text>
        </View>
        <Text style={[styles.cardTitle, { color: c.title }]} numberOfLines={2}>{slide.title || vet.name}</Text>
        {slide.text ? <Text style={[styles.cardText, { color: c.text }]}>{slide.text}</Text> : null}
        {slide.button_text ? <SlideButton title={slide.button_text} onPress={open} /> : null}
      </View>
    </View>
  );
}

function DonationSlide({ slide }) {
  const open = useOpenSlide(slide);
  return (
    <View style={[styles.card, styles.colorCard, { backgroundColor: palette.coral }]}>
      <View style={styles.coffeeTile}>
        <Coffee size={34} color={ARENA} strokeWidth={2} />
      </View>
      <Text style={styles.donTitle}>{slide.title}</Text>
      {slide.text ? <Text style={styles.colorText}>{slide.text}</Text> : null}
      <SlideButton title={slide.button_text || 'Donar por Mercado Pago'} onPress={open} tall />
    </View>
  );
}

function ProductSlide({ slide }) {
  const c = useTheme();
  const open = useOpenSlide(slide);
  return (
    <View style={[styles.card, { backgroundColor: c.card }]}>
      <ImageArea uri={slide.image_url} height={170} />
      <View style={styles.cardBody}>
        {slide.brand ? <Text style={[styles.eyebrow, { color: c.text }]}>{slide.brand}</Text> : null}
        <Text style={[styles.cardTitle, { color: c.title }]} numberOfLines={2}>{slide.title}</Text>
        {slide.text ? <Text style={[styles.cardText, { color: c.text }]}>{slide.text}</Text> : null}
        {slide.code ? (
          <View style={[styles.code, { borderColor: c.title }]}>
            <Tag size={16} color={c.title} strokeWidth={2} />
            <Text style={[styles.codeText, { color: c.title }]}>{slide.code}</Text>
          </View>
        ) : null}
        {slide.button_text ? <SlideButton title={slide.button_text} onPress={open} arrow /> : null}
      </View>
    </View>
  );
}

function TipSlide({ slide }) {
  const open = useOpenSlide(slide);
  const hasAction = slide.button_text && (slide.route || slide.link);
  return (
    <View style={[styles.card, styles.colorCard, { backgroundColor: palette.teal }]}>
      <Text style={[styles.eyebrow, { color: ARENA }]}>Mientras esperás</Text>
      <Text style={styles.tipTitle}>{slide.title}</Text>
      {slide.text ? <Text style={styles.colorText}>{slide.text}</Text> : null}
      {Array.isArray(slide.items) && slide.items.length ? (
        <View style={styles.list}>
          {slide.items.map((it, i) => (
            <View key={i} style={styles.listRow}>
              <Text style={[styles.colorText, styles.listNum]}>{`${i + 1}.`}</Text>
              <Text style={[styles.colorText, { flex: 1 }]}>{it}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {hasAction ? <SlideButton title={slide.button_text} onPress={open} outline arrow /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 40, paddingHorizontal: 20, paddingBottom: 28, gap: 18 },
  top: { alignItems: 'center', gap: 10 },
  topAlone: { flex: 1, justifyContent: 'center' },
  pinWrap: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', borderRadius: 999 },
  ringOuter: { width: 120, height: 120, backgroundColor: 'rgba(255,92,108,0.12)' },
  ringInner: { width: 84, height: 84, backgroundColor: 'rgba(255,92,108,0.18)' },
  title: { fontFamily: fonts.display, fontSize: 24, textAlign: 'center' },
  phrase: { fontFamily: fonts.bold, fontSize: 14, textAlign: 'center' },
  track: { width: 180, height: 6, borderRadius: 999, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999, backgroundColor: palette.coral },
  footer: { fontFamily: fonts.medium, fontSize: 12, textAlign: 'center' },

  carousel: { flex: 1, minHeight: 0, gap: 10 },
  bars: { flexDirection: 'row', gap: 6 },
  barTrack: { flex: 1, height: 4, borderRadius: 999, overflow: 'hidden' },
  barFill: { height: '100%' },
  slidesBox: { flex: 1, minHeight: 0 },

  card: { flex: 1, borderRadius: 28, overflow: 'hidden' },
  colorCard: { padding: 22, gap: 12 },
  cardBody: { flex: 1, padding: 18, gap: 8 },
  imageArea: { position: 'relative' },
  badgePos: { position: 'absolute', top: 12, left: 12 },
  adBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, backgroundColor: 'rgba(26,26,46,0.8)' },
  adBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: palette.crema,
  },
  logo: {
    position: 'absolute',
    left: 16,
    bottom: -28,
    width: 64,
    height: 64,
    borderWidth: 4,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: palette.noche,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { fontFamily: fonts.display, fontSize: 26, color: palette.crema },
  tierBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 20,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  tierText: { fontFamily: fonts.bold, fontSize: 11, color: ARENA },
  cardTitle: { fontFamily: fonts.display, fontSize: 20 },
  cardText: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  eyebrow: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  code: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 10,
  },
  codeText: { fontFamily: fonts.display, fontSize: 16, letterSpacing: 1 },
  slideBtn: {
    marginTop: 'auto',
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  slideBtnOutline: { borderWidth: 2, borderColor: ARENA },
  slideBtnText: { fontFamily: fonts.bold, fontSize: 15 },

  coffeeTile: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donTitle: { marginTop: 8, fontFamily: fonts.display, fontSize: 26, lineHeight: 30, color: ARENA },
  tipTitle: { fontFamily: fonts.display, fontSize: 24, lineHeight: 29, color: ARENA },
  colorText: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: ARENA },
  list: { marginTop: 4, gap: 8 },
  listRow: { flexDirection: 'row', gap: 6 },
  listNum: { width: 18 },
});
