import { createContext, useContext, useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import { useTheme } from '../lib/theme';

// Esqueletos de carga (Estados.dc.html): bloques Arena con la forma del
// contenido, en lugar de un ActivityIndicator suelto. Todos los bloques de
// un grupo laten juntos con una sola animación.
const PulseContext = createContext(null);

function usePulse() {
  const v = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 0.5, duration: 700, useNativeDriver: true }),
        Animated.timing(v, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return v;
}

// Bloque suelto. width/height/radius como en el diseño.
export function Skeleton({ width = '100%', height = 16, radius = 8, style }) {
  const c = useTheme();
  const opacity = useContext(PulseContext) || 1;
  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: c.isDark ? '#33334F' : c.arena, opacity }, style]}
    />
  );
}

function PulseGroup({ children, style }) {
  const opacity = usePulse();
  return (
    <PulseContext.Provider value={opacity}>
      <View style={style} accessibilityLabel="Cargando" accessibilityRole="progressbar">
        {children}
      </View>
    </PulseContext.Provider>
  );
}

// Tarjeta de lista: foto de 104 a la izquierda, chip y líneas de texto.
function SkeletonCard() {
  const c = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: c.card }]}>
      <Skeleton width={104} height={104} radius={18} />
      <View style={styles.cardTexts}>
        <Skeleton width={70} height={18} radius={999} />
        <Skeleton width="80%" height={18} />
        <Skeleton width="60%" height={14} />
        <Skeleton width="40%" height={12} />
      </View>
    </View>
  );
}

// Lista cargando: `count` tarjetas.
export function SkeletonList({ count = 3, style }) {
  return (
    <PulseGroup style={[styles.list, style]}>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </PulseGroup>
  );
}

// Ficha cargando: foto grande, chip, título, chips de datos y un bloque.
export function SkeletonDetail({ style }) {
  return (
    <PulseGroup style={style}>
      <Skeleton height={300} radius={0} />
      <View style={styles.detailBody}>
        <Skeleton width={90} height={24} radius={999} />
        <Skeleton width="65%" height={30} />
        <View style={styles.row}>
          <Skeleton width={70} height={30} radius={999} />
          <Skeleton width={80} height={30} radius={999} />
          <Skeleton width={60} height={30} radius={999} />
        </View>
        <Skeleton height={90} radius={24} />
      </View>
    </PulseGroup>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 20, paddingTop: 12, gap: 12 },
  card: { flexDirection: 'row', gap: 14, padding: 12, borderRadius: 24 },
  cardTexts: { flex: 1, gap: 10, paddingTop: 4 },
  detailBody: { padding: 20, gap: 12 },
  row: { flexDirection: 'row', gap: 8 },
});
