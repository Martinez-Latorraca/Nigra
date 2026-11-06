import { View, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../lib/theme';

// Tarjeta blanca, sin sombra. Con onPress se vuelve tocable.
export default function Card({ onPress, style, children, ...rest }) {
  const c = useTheme();
  const base = [styles.card, { backgroundColor: c.card }];
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [...base, { opacity: pressed ? 0.85 : 1 }, style]} {...rest}>
        {children}
      </Pressable>
    );
  }
  return (
    <View style={[...base, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, padding: 16 },
});
