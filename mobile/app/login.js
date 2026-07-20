import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { router, Link } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import api from '../src/lib/api';
import {
  GOOGLE_CLIENT_ID_WEB,
  GOOGLE_CLIENT_ID_IOS,
  GOOGLE_CLIENT_ID_ANDROID,
} from '../src/lib/config';
import { setCredentials } from '../src/store/userSlice';
import AuthScreen, { useAuthColors } from '../src/components/AuthScreen';
import GoogleButton from '../src/components/auth/GoogleButton';
import AppleButton from '../src/components/auth/AppleButton';
import FacebookButton from '../src/components/auth/FacebookButton';

WebBrowser.maybeCompleteAuthSession();

const googleConfigured = !!(GOOGLE_CLIENT_ID_WEB || GOOGLE_CLIENT_ID_IOS || GOOGLE_CLIENT_ID_ANDROID);
const facebookConfigured = true; // native SDK configured via app.json plugin
const anySocialConfigured = googleConfigured || facebookConfigured || Platform.OS === 'ios';

export default function Login() {
  const dispatch = useDispatch();
  const c = useAuthColors();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notVerified, setNotVerified] = useState(false);
  const [accountDeleted, setAccountDeleted] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [loadingProvider, setLoadingProvider] = useState(null);

  const busy = loadingProvider !== null;

  const handleSocialSuccess = (data) => {
    dispatch(setCredentials({ user: data.user, token: data.token }));
    setLoadingProvider(null);
    if (data.user?.has_vet && !data.user.vet_approved) {
      router.replace('/profile');
    } else {
      router.replace('/home');
    }
  };
  const handleSocialError = (msg, code) => {
    if (code === 'account_deleted') {
      setAccountDeleted(true);
    } else {
      setError(msg);
    }
    setLoadingProvider(null);
  };
  const handleSocialCancel = () => setLoadingProvider(null);
  const startSocial = (provider) => {
    setError('');
    setLoadingProvider(provider);
  };

  const handleEmailLogin = async () => {
    setError('');
    setNotVerified(false);
    setAccountDeleted(false);
    setResendMsg('');
    setLoadingProvider('email');
    try {
      const { data } = await api.post('/api/auth/login', { email, password });
      dispatch(setCredentials({ user: data.user, token: data.token }));
      if (data.user?.has_vet && !data.user.vet_approved) {
        router.replace('/profile');
      } else {
        router.replace('/home');
      }
    } catch (err) {
      const status = err.response?.status;
      const code = err.response?.data?.code;
      if (status === 403 && code === 'email_not_verified') {
        setNotVerified(true);
      } else if (status === 403 && code === 'account_deleted') {
        setAccountDeleted(true);
      } else {
        setError(err.response?.data?.error || 'No se pudo iniciar sesión');
      }
    } finally {
      setLoadingProvider(null);
    }
  };

  const resendVerification = async () => {
    setResendMsg('Enviando…');
    try {
      await api.post('/api/auth/resend-verification', { email });
      setResendMsg('Listo — revisá tu email.');
    } catch {
      setResendMsg('No se pudo reenviar. Probá de nuevo.');
    }
  };

  return (
    <AuthScreen
      title="Bienvenido"
      subtitle="Inicia sesión en Mimo"
      footer={
        <Text style={[styles.footerText, { color: c.subtitle }]}>
          ¿Nuevo en Mimo?{' '}
          <Link href="/register" style={[styles.footerLink, { color: c.title }]}>
            Crear cuenta
          </Link>
        </Text>
      }
    >
      <Text style={[styles.label, { color: c.label }]}>Email</Text>
      <TextInput
        style={[styles.input, { backgroundColor: c.inputBg, color: c.inputText }]}
        value={email}
        onChangeText={setEmail}
        placeholder="nombre@ejemplo.com"
        placeholderTextColor={c.label}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        autoComplete="email"
        editable={!busy}
      />

      <Text style={[styles.label, { color: c.label }]}>Contraseña</Text>
      <TextInput
        style={[styles.input, { backgroundColor: c.inputBg, color: c.inputText }]}
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        placeholderTextColor={c.label}
        secureTextEntry
        autoComplete="password"
        editable={!busy}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {notVerified ? (
        <View style={styles.notVerified}>
          <Text style={styles.notVerifiedTitle}>
            📬 Verificá tu email antes de iniciar sesión.
          </Text>
          <Pressable
            onPress={resendVerification}
            style={[styles.button, { backgroundColor: '#1A1A2E', marginTop: 10 }]}
          >
            <Text style={[styles.buttonText, { color: '#fff' }]}>
              Reenviar mail de verificación
            </Text>
          </Pressable>
          {resendMsg ? <Text style={styles.notVerifiedMsg}>{resendMsg}</Text> : null}
        </View>
      ) : null}

      {accountDeleted ? (
        <View style={styles.accountDeleted}>
          <Text style={styles.accountDeletedTitle}>
            Esta cuenta fue eliminada. Podés recuperarla creándola nuevamente con este mismo email.
          </Text>
          <Pressable
            onPress={() => router.push('/register')}
            style={[styles.button, { backgroundColor: '#FF5C6C', marginTop: 10 }]}
          >
            <Text style={[styles.buttonText, { color: '#fff' }]}>Ir a crear cuenta</Text>
          </Pressable>
        </View>
      ) : null}

      <Pressable
        style={[
          styles.button,
          { backgroundColor: c.primary, marginTop: 16 },
          (busy || !email || !password) && styles.buttonDisabled,
        ]}
        onPress={handleEmailLogin}
        disabled={busy || !email || !password}
      >
        {loadingProvider === 'email' ? (
          <ActivityIndicator color={c.primaryText} />
        ) : (
          <Text style={[styles.buttonText, { color: c.primaryText }]}>Iniciar sesión</Text>
        )}
      </Pressable>

      <Link href="/forgot-password" style={[styles.forgotLink, { color: c.subtitle }]}>
        ¿Olvidaste tu contraseña?
      </Link>

      {anySocialConfigured && (
        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: c.divider }]} />
          <Text style={[styles.dividerText, { color: c.label }]}>o continuá con</Text>
          <View style={[styles.dividerLine, { backgroundColor: c.divider }]} />
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
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 12,
  },
  input: { borderRadius: 16, padding: 16, fontSize: 16 },
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
  notVerified: {
    backgroundColor: '#FFF7ED',
    padding: 16,
    borderRadius: 16,
    marginTop: 12,
  },
  notVerifiedTitle: { color: '#9A3412', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  notVerifiedMsg: { color: '#9A3412', fontSize: 12, textAlign: 'center', marginTop: 8 },
  accountDeleted: {
    backgroundColor: '#FEE2E2',
    padding: 16,
    borderRadius: 16,
    marginTop: 12,
  },
  accountDeletedTitle: { color: '#B91C1C', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  button: {
    borderRadius: 999,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    height: 56,
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontWeight: '600', fontSize: 16 },
  divider: { flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 8 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, paddingHorizontal: 12, fontWeight: '500' },
  footerText: { fontSize: 14, fontWeight: '500' },
  footerLink: { fontWeight: '700' },
  forgotLink: { fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 12 },
});
