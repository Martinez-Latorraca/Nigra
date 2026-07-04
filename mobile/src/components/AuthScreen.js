import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Logo from '../../assets/Mimo-logo-paw.svg';
import { useTheme } from '../lib/theme';

// Re-exported so existing auth screens can keep importing from here.
export { useTheme as useAuthColors } from '../lib/theme';

export default function AuthScreen({ title, subtitle, footer, children }) {
  const c = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.logoWrap}>
            <Logo width={76} height={76} />
          </View>

          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
            <Text style={[styles.title, { color: c.title }]}>{title}</Text>
            {subtitle ? <Text style={[styles.subtitle, { color: c.subtitle }]}>{subtitle}</Text> : null}
            {children}
          </View>

          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoWrap: { alignItems: 'center', marginBottom: 24 },
  card: { borderRadius: 32, padding: 32, gap: 8, borderWidth: 1 },
  title: { fontSize: 32, fontWeight: '700', textAlign: 'center', letterSpacing: -0.5 },
  subtitle: { textAlign: 'center', marginBottom: 16, fontWeight: '500' },
  footer: { marginTop: 24, alignItems: 'center' },
});
