import { useEffect, useState } from 'react';
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
import * as Google from 'expo-auth-session/providers/google';
import * as Facebook from 'expo-auth-session/providers/facebook';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import api from '../src/lib/api';
import {
  exchangeGoogleToken,
  exchangeAppleToken,
  exchangeFacebookToken,
  formatAppleFullName,
} from '../src/lib/oauth';
import {
  GOOGLE_CLIENT_ID_WEB,
  GOOGLE_CLIENT_ID_IOS,
  GOOGLE_CLIENT_ID_ANDROID,
  FACEBOOK_APP_ID,
} from '../src/lib/config';
import { setCredentials } from '../src/store/userSlice';

WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  const dispatch = useDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loadingProvider, setLoadingProvider] = useState(null);
  const [appleAvailable, setAppleAvailable] = useState(false);

  const [googleRequest, googleResponse, promptGoogle] = Google.useIdTokenAuthRequest({
    clientId: GOOGLE_CLIENT_ID_WEB,
    iosClientId: GOOGLE_CLIENT_ID_IOS,
    androidClientId: GOOGLE_CLIENT_ID_ANDROID,
  });

  const [fbRequest, fbResponse, promptFacebook] = Facebook.useAuthRequest({
    clientId: FACEBOOK_APP_ID,
  });

  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
    }
  }, []);

  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const idToken = googleResponse.params?.id_token;
      if (idToken) handleProviderToken('google', () => exchangeGoogleToken(idToken));
    } else if (googleResponse?.type === 'error') {
      setError('No se pudo iniciar sesión con Google');
      setLoadingProvider(null);
    }
  }, [googleResponse]);

  useEffect(() => {
    if (fbResponse?.type === 'success') {
      const accessToken = fbResponse.authentication?.accessToken || fbResponse.params?.access_token;
      if (accessToken) handleProviderToken('facebook', () => exchangeFacebookToken(accessToken));
    } else if (fbResponse?.type === 'error') {
      setError('No se pudo iniciar sesión con Facebook');
      setLoadingProvider(null);
    }
  }, [fbResponse]);

  const handleProviderToken = async (provider, exchangeFn) => {
    setError('');
    setLoadingProvider(provider);
    try {
      const data = await exchangeFn();
      dispatch(setCredentials({ user: data.user, token: data.token }));
      router.replace('/home');
    } catch (err) {
      setError(err.response?.data?.error || `No se pudo iniciar sesión con ${provider}`);
    } finally {
      setLoadingProvider(null);
    }
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

  const handleGoogleLogin = async () => {
    setError('');
    setLoadingProvider('google');
    const result = await promptGoogle();
    if (result?.type !== 'success') setLoadingProvider(null);
  };

  const handleFacebookLogin = async () => {
    setError('');
    setLoadingProvider('facebook');
    const result = await promptFacebook();
    if (result?.type !== 'success') setLoadingProvider(null);
  };

  const handleAppleLogin = async () => {
    setError('');
    setLoadingProvider('apple');
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) throw new Error('Apple no devolvió un identity token');
      const data = await exchangeAppleToken(
        credential.identityToken,
        formatAppleFullName(credential.fullName)
      );
      dispatch(setCredentials({ user: data.user, token: data.token }));
      router.replace('/home');
    } catch (err) {
      if (err.code === 'ERR_REQUEST_CANCELED') {
        setLoadingProvider(null);
        return;
      }
      setError(err.response?.data?.error || err.message || 'No se pudo iniciar sesión con Apple');
    } finally {
      setLoadingProvider(null);
    }
  };

  const busy = loadingProvider !== null;

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

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>o continuá con</Text>
              <View style={styles.dividerLine} />
            </View>

            <Pressable
              style={[styles.button, styles.buttonSocial, busy && styles.buttonDisabled]}
              onPress={handleGoogleLogin}
              disabled={busy || !googleRequest}
            >
              {loadingProvider === 'google' ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.buttonSocialText}>Continuar con Google</Text>
              )}
            </Pressable>

            {appleAvailable && (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={999}
                style={styles.appleButton}
                onPress={handleAppleLogin}
              />
            )}

            <Pressable
              style={[styles.button, styles.buttonFacebook, busy && styles.buttonDisabled]}
              onPress={handleFacebookLogin}
              disabled={busy || !fbRequest}
            >
              {loadingProvider === 'facebook' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonFacebookText}>Continuar con Facebook</Text>
              )}
            </Pressable>
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
  buttonSocial: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB' },
  buttonSocialText: { color: '#111827', fontWeight: '600', fontSize: 16 },
  buttonFacebook: { backgroundColor: '#1877F2' },
  buttonFacebookText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  buttonDisabled: { opacity: 0.5 },
  appleButton: { height: 56, marginTop: 8 },
  divider: { flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { color: '#9CA3AF', fontSize: 12, paddingHorizontal: 12, fontWeight: '500' },
});
