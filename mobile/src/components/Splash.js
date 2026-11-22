import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import MimoPin from '../../assets/mimo-pin.svg';
import RED from '../../assets/splash/splash-red.json';
import { palette, fonts } from '../lib/theme';
import Wordmark from './Wordmark';

// Splash "opción B" (Splash-B.dc.html + Splash-storyboard.dc.html): una red
// de nodos y líneas crece desde abajo por tandas, el pin cae con un rebote
// corto, aparece "mimo" y después el lema. Se monta encima del navigator
// mientras la app hidrata; onFinish se dispara al terminar la salida.
// Los datos de la red vienen del handoff (assets/splash/splash-red.json).

const AnimatedLine = Animated.createAnimatedComponent(Line);

const BANDS = [0, 1, 2, 3];
const NODE_HALF = RED.nodeShapeSize / 2;
const EXIT_MIN_MS = 1800; // la salida empieza a los 1,8 s (mínimo del handoff)
const EXIT_MS = 400;

const lineLength = (l) => Math.hypot(l.x2 - l.x1, l.y2 - l.y1);

// "Pop" de los nodos: 0 → 1,35 → 1 (t de 0 a 1).
const popScale = (t) => (t <= 0 ? 0 : t < 0.6 ? (t / 0.6) * 1.35 : 1.35 - ((t - 0.6) / 0.4) * 0.35);

export default function Splash({ onFinish }) {
  const { width, height } = useWindowDimensions();
  const [reduceMotion, setReduceMotion] = useState(null);

  // Un valor por tanda para líneas y otro para nodos: alcanza con 8 animaciones
  // en vez de una por elemento.
  const lineProgress = useRef(BANDS.map(() => new Animated.Value(0))).current;
  const nodeProgress = useRef(BANDS.map(() => new Animated.Value(0))).current;
  const pin = useRef(new Animated.Value(0)).current; // 0 → 1 caída
  const shadow = useRef(new Animated.Value(0)).current;
  const word = useRef(new Animated.Value(0)).current;
  const lema = useRef(new Animated.Value(0)).current;
  const exit = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current; // solo con reducir movimiento

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => setReduceMotion(!!v))
      .catch(() => setReduceMotion(false));
  }, []);

  useEffect(() => {
    if (reduceMotion === null) return;
    const t = (v, toValue, duration, delay, easing = Easing.out(Easing.ease), native = true) =>
      Animated.timing(v, { toValue, duration, delay, easing, useNativeDriver: native });

    let intro;
    if (reduceMotion) {
      lineProgress.forEach((v) => v.setValue(1));
      nodeProgress.forEach((v) => v.setValue(1));
      pin.setValue(1);
      shadow.setValue(1);
      word.setValue(1);
      lema.setValue(1);
      intro = t(fade, 1, 400, 0);
    } else {
      fade.setValue(1);
      intro = Animated.parallel([
        // Las props de SVG no van por el driver nativo.
        ...BANDS.map((b) => t(lineProgress[b], 1, 650, 100 + 160 * b, Easing.out(Easing.ease), false)),
        ...BANDS.map((b) => t(nodeProgress[b], 1, 320, 350 + 150 * b, Easing.linear, false)),
        t(pin, 1, 600, 450, Easing.linear),
        t(shadow, 1, 450, 600, Easing.linear),
        t(word, 1, 350, 950),
        t(lema, 1, 300, 1300),
      ]);
    }
    const all = Animated.parallel([
      intro,
      Animated.sequence([Animated.delay(EXIT_MIN_MS), t(exit, 1, EXIT_MS, 0, Easing.in(Easing.ease))]),
    ]);
    all.start(({ finished }) => finished && onFinish?.());
    return () => all.stop();
  }, [reduceMotion, lineProgress, nodeProgress, pin, shadow, word, lema, exit, fade, onFinish]);

  // Escala de los nodos por tanda. Las props `scale` animadas de react-native-svg
  // no se aplican en Android, así que se re-renderiza con el valor de cada tanda
  // (4 listeners, solo durante los 320 ms de cada "pop").
  const [nodeT, setNodeT] = useState(() => BANDS.map(() => 0));
  useEffect(() => {
    const ids = nodeProgress.map((v, b) =>
      v.addListener(({ value }) =>
        setNodeT((prev) => {
          if (prev[b] === value) return prev;
          const next = prev.slice();
          next[b] = value;
          return next;
        })
      )
    );
    return () => nodeProgress.forEach((v, b) => v.removeListener(ids[b]));
  }, [nodeProgress]);

  const lines = useMemo(() => RED.lines.map((l) => ({ ...l, len: lineLength(l) })), []);

  // Caída del pin (storyboard): -90 → +6 → -3 → 0, con la opacidad entrando al principio.
  const pinStyle = {
    opacity: pin.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 1] }),
    transform: [
      { translateY: pin.interpolate({ inputRange: [0, 0.6, 0.8, 1], outputRange: [-90, 6, -3, 0] }) },
    ],
  };
  const shadowStyle = {
    opacity: shadow.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, 0.25, 0.18] }),
    transform: [{ scaleX: shadow.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, 1.2, 1] }) }],
  };
  const wordStyle = {
    opacity: word,
    transform: [{ translateY: word.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
  };
  const exitStyle = {
    opacity: Animated.multiply(fade, exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })),
    transform: [{ scale: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) }],
  };

  return (
    <Animated.View pointerEvents="none" style={[styles.root, exitStyle]}>
      <Svg
        width={width}
        height={height}
        viewBox={`0 0 ${RED.viewBox[0]} ${RED.viewBox[1]}`}
        preserveAspectRatio="xMidYMax slice"
        style={StyleSheet.absoluteFill}
      >
        {lines.map((l, i) => (
          <AnimatedLine
            key={`l${i}`}
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
            stroke={l.color}
            strokeWidth={l.width}
            strokeOpacity={l.opacity}
            strokeLinecap="round"
            strokeDasharray={[l.len, l.len]}
            strokeDashoffset={lineProgress[l.band].interpolate({ inputRange: [0, 1], outputRange: [l.len, 0] })}
          />
        ))}
        {RED.nodes.map((n, i) => {
          const k = ((n.r * 2) / RED.nodeShapeSize) * popScale(nodeT[n.band]);
          if (k <= 0) return null;
          return (
            <Path
              key={`n${i}`}
              d={RED.nodeShape}
              fill={n.color}
              fillOpacity={n.opacity}
              transform={`translate(${n.x} ${n.y}) scale(${k}) translate(${-NODE_HALF} ${-NODE_HALF})`}
            />
          );
        })}
      </Svg>

      <View style={[styles.center, { top: (height * 150) / 844 }]}>
        <Animated.View style={pinStyle}>
          <MimoPin width={96} height={118} />
        </Animated.View>
        <Animated.View style={[styles.shadow, shadowStyle]} />
        <Animated.View style={[styles.word, wordStyle]}>
          <Wordmark size={46} showPin={false} />
        </Animated.View>
        <Animated.Text style={[styles.lema, { opacity: lema }]}>Cada mascota merece un mimo</Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, backgroundColor: palette.crema, zIndex: 999 },
  center: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  shadow: { width: 46, height: 8, marginTop: 6, borderRadius: 23, backgroundColor: palette.noche },
  word: { marginTop: 16 },
  lema: { marginTop: 22, fontFamily: fonts.medium, fontSize: 17, color: palette.noche, textAlign: 'center' },
});
