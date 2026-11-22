import { forwardRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MimoPin from '../../assets/mimo-pin.svg';
import { useTheme, fonts, onColor } from '../lib/theme';
import { Eye, EyeOff, Lock } from '../lib/icons';
import Wordmark from './Wordmark';
import FormField from './FormField';

// Re-exported so existing auth screens can keep importing from here.
export { useTheme as useAuthColors } from '../lib/theme';

// Pantallas de login / registro / recuperar (Login.dc.html): fondo Crema sin
// tarjeta, pin + "mimo" arriba, título y bajada centrados, el contenido y el
// pie pegado abajo. `hero` reemplaza el logo (p. ej. <AuthHeroIcon />) y
// `compact` achica el pin y los espacios (registro, que es más largo).
export default function AuthScreen({ title, subtitle, footer, hero, compact, children }) {
  const c = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, compact && styles.scrollCompact]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {hero || (
            <View style={styles.logoWrap}>
              {compact ? <MimoPin width={44} height={54} /> : <MimoPin width={56} height={69} />}
              <Wordmark size={40} showPin={false} color={c.title} />
            </View>
          )}

          <View style={styles.heading}>
            <Text style={[styles.title, { color: c.title }]}>{title}</Text>
            {subtitle ? <Text style={[styles.subtitle, { color: c.text }]}>{subtitle}</Text> : null}
          </View>

          <View style={styles.body}>{children}</View>

          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Tile de 88 con un ícono, en lugar del logo (Recuperar, Registro-ok).
export function AuthHeroIcon({ icon: Icon, color }) {
  return (
    <View style={[styles.heroTile, { backgroundColor: color }]}>
      <Icon size={42} color={onColor(color)} strokeWidth={2} />
    </View>
  );
}

// Campo de las pantallas de auth: el FormField de siempre con caja blanca,
// borde Arena y 52 de alto.
export const AuthField = forwardRef(function AuthField({ boxStyle, ...props }, ref) {
  const c = useTheme();
  return (
    <FormField
      ref={ref}
      boxStyle={[styles.fieldBox, { backgroundColor: c.inputBg, borderColor: c.cardBorder }, boxStyle]}
      {...props}
    />
  );
});

// Contraseña con el botón del ojo para mostrarla.
export const PasswordField = forwardRef(function PasswordField(props, ref) {
  const c = useTheme();
  const [visible, setVisible] = useState(false);
  const EyeIcon = visible ? EyeOff : Eye;
  return (
    <AuthField
      ref={ref}
      icon={Lock}
      secureTextEntry={!visible}
      autoCapitalize="none"
      autoCorrect={false}
      right={
        <Pressable
          onPress={() => setVisible((v) => !v)}
          style={styles.eyeBtn}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          <EyeIcon size={20} color={c.text} strokeWidth={2} />
        </Pressable>
      }
      {...props}
    />
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 48, paddingBottom: 32, gap: 28 },
  scrollCompact: { paddingTop: 40, gap: 24 },
  heroTile: { alignSelf: 'center', width: 88, height: 88, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  logoWrap: { alignItems: 'center', gap: 10 },
  heading: { gap: 6 },
  title: { fontFamily: fonts.display, fontSize: 30, lineHeight: 33, textAlign: 'center' },
  subtitle: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, textAlign: 'center' },
  body: { gap: 14 },
  footer: { marginTop: 'auto' },
  fieldBox: { height: 52, minHeight: 52, borderRadius: 16, borderWidth: 1, paddingRight: 6 },
  eyeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
