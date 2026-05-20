import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LogoDark from '../../assets/nigra.svg';
import LogoLight from '../../assets/nigra-white.svg';

export function useAuthColors() {
  const isDark = useColorScheme() === 'dark';
  return {
    isDark,
    bg: isDark ? '#0A0A0A' : '#F5F5F7',
    card: isDark ? '#1C1C1E' : '#FFFFFF',
    cardBorder: isDark ? '#2C2C2E' : '#F0F0F0',
    title: isDark ? '#FFFFFF' : '#000000',
    subtitle: '#9CA3AF',
    label: '#9CA3AF',
    inputBg: isDark ? '#2C2C2E' : '#F9FAFB',
    inputText: isDark ? '#FFFFFF' : '#111827',
    primary: isDark ? '#FFFFFF' : '#000000',
    primaryText: isDark ? '#000000' : '#FFFFFF',
    divider: isDark ? '#3A3A3C' : '#E5E7EB',
    socialBg: isDark ? '#2C2C2E' : '#FFFFFF',
    socialBorder: isDark ? '#3A3A3C' : '#E5E7EB',
    socialText: isDark ? '#FFFFFF' : '#111827',
  };
}

export default function AuthScreen({ title, subtitle, footer, children }) {
  const c = useAuthColors();
  const Logo = c.isDark ? LogoLight : LogoDark;

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
