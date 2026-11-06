import { View, Text, StyleSheet } from 'react-native';
import { palette, fonts } from '../lib/theme';
import MimoPin from '../../assets/mimo-pin.svg';

// Logo horizontal: pin Coral + "mimo" en Nunito 800, con la mitad de
// arriba de la "i" en Coral (el punto). `size` = tamaño de la letra.
// showPin={false} deja solo el texto.
export default function Wordmark({ size = 26, color = palette.noche, showPin = true, style }) {
  const text = [styles.text, { fontSize: size, lineHeight: size, color }];
  return (
    <View style={[styles.row, { gap: size * 0.3 }, style]} accessible accessibilityLabel="mimo">
      {showPin ? <MimoPin width={size} height={(size * 148) / 120} /> : null}
      <View style={styles.word}>
        <Text style={text}>m</Text>
        <View>
          <Text style={text}>i</Text>
          <View style={[styles.dotClip, { height: size * 0.47 }]}>
            <Text style={[text, { color: palette.coral }]}>i</Text>
          </View>
        </View>
        <Text style={text}>mo</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  word: { flexDirection: 'row' },
  text: { fontFamily: fonts.displayBold, includeFontPadding: false },
  dotClip: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden' },
});
