import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import api from '../src/lib/api';
import {
  GOOGLE_CLIENT_ID_WEB,
  GOOGLE_CLIENT_ID_IOS,
  GOOGLE_CLIENT_ID_ANDROID,
  FACEBOOK_APP_ID,
} from '../src/lib/config';
import { setCredentials } from '../src/store/userSlice';
import GoogleButton from '../src/components/auth/GoogleButton';
import AppleButton from '../src/components/auth/AppleButton';
import FacebookButton from '../src/components/auth/FacebookButton';

WebBrowser.maybeCompleteAuthSession();

const googleConfigured = !!(GOOGLE_CLIENT_ID_WEB || GOOGLE_CLIENT_ID_IOS || GOOGLE_CLIENT_ID_ANDROID);
const facebookConfigured = !!FACEBOOK_APP_ID;
const anySocialConfigured = googleConfigured || facebookConfigured || Platform.OS === 'ios';

export default function Login() {
  const dispatch = useDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loadingProvider, setLoadingProvider] = useState(null);

  const busy = loadingProvider !== null;

  const handleSocialSuccess = (data) => {
    dispatch(setCredentials({ user: data.user, token: data.token }));
    setLoadingProvider(null);
    router.replace('/home');
  };

  const handleSocialError = (msg) => {
    setError(msg);
    setLoadingProvider(null);
  };

  const handleSocialCancel = () => setLoadingProvider(null);

  const startSocial = (provider) => {
    setError('');
    setLoadingProvider(provider);
  };

  const handleEmailLogin = async () => {
    setError('');
    setLoadingProvider('email');
    try {
      const { data } = await api.post('/api/auth/login', { email, password });
      dispatch(setCredentials({ user: data.user, token: data.token }));
      router.replace('/home');
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo iniciar sesión');
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.title}>Bienvenido</Text>
            <Text style={styles.subtitle}>Inicia sesión en Nigra</Text>

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="nombre@ejemplo.com"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="email"
              editable={!busy}
            />

            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              autoComplete="password"
              editable={!busy}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              style={[
                styles.button,
                styles.buttonPrimary,
                (busy || !email || !password) && styles.buttonDisabled,
              ]}
              onPress={handleEmailLogin}
              disabled={busy || !email || !password}
            >
              {loadingProvider === 'email' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonPrimaryText}>Iniciar sesión</Text>
              )}
            </Pressable>

            {anySocialConfigured && (
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>o continuá con</Text>
                <View style={styles.dividerLine} />
              </View>
            )}

            {googleConfigured && (
              <GoogleButton
                onStart={() => startSocial('google')}
                onSuccess={handleSocialSuccess}
                onError={handleSocialError}
                onCancel={handleSocialCancel}
                loading={loadingProvider === 'google'}
                disabled={busy && loadingProvider !== 'google'}
              />
            )}

            <AppleButton
              onStart={() => startSocial('apple')}
              onSuccess={handleSocialSuccess}
              onError={handleSocialError}
              onCancel={handleSocialCancel}
              disabled={busy && loadingProvider !== 'apple'}
            />

            {facebookConfigured && (
              <FacebookButton
                onStart={() => startSocial('facebook')}
                onSuccess={handleSocialSuccess}
                onError={handleSocialError}
                onCancel={handleSocialCancel}
                loading={loadingProvider === 'facebook'}
                disabled={busy && loadingProvider !== 'facebook'}
              />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F7' },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 32, padding: 32, gap: 8 },
  title: { fontSize: 32, fontWeight: '700', color: '#000', textAlign: 'center' },
  subtitle: { color: '#9CA3AF', textAlign: 'center', marginBottom: 16 },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 12,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#111827',
  },
  error: {
    color: '#EF4444',
    textAlign: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 16,
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
  },
  button: {
    borderRadius: 999,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    height: 56,
    justifyContent: 'center',
  },
  buttonPrimary: { backgroundColor: '#000', marginTop: 16 },
  buttonPrimaryText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  buttonDisabled: { opacity: 0.5 },
  divider: { flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { color: '#9CA3AF', fontSize: 12, paddingHorizontal: 12, fontWeight: '500' },
});
