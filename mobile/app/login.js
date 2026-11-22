import { useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
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
import AuthScreen, { useAuthColors, AuthField, PasswordField } from '../src/components/AuthScreen';
import Button from '../src/components/Button';
import GoogleButton from '../src/components/auth/GoogleButton';
import AppleButton from '../src/components/auth/AppleButton';
import FacebookButton from '../src/components/auth/FacebookButton';
import { Mail, MailWarning, UserX } from '../src/lib/icons';
import { fonts } from '../src/lib/theme';

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
    // Cuenta recién creada por este login social: preguntamos una única vez si
    // es particular, veterinaria o refugio. El proveedor solo nos dio nombre y
    // mail, así que es el único momento para capturarlo (ver /account-type).
    if (data.is_new) {
      router.replace('/account-type');
    } else if (data.user?.has_shelter) {
      // Refugios (aprobados o no) van directo a su panel.
      router.replace('/profile');
    } else if (data.user?.has_vet && !data.user.vet_approved) {
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
      setResendMsg('Listo, revisá tu email.');
    } catch {
      setResendMsg('No se pudo reenviar. Probá de nuevo.');
    }
  };

  return (
    <AuthScreen
      title="Bienvenido"
      subtitle="Iniciá sesión en Mimo"
      footer={
        <Text style={[styles.footerText, { color: c.text }]}>
          ¿Nuevo en Mimo?{' '}
          <Link href="/register" style={[styles.footerLink, { color: c.title }]}>
            Crear cuenta
          </Link>
        </Text>
      }
    >
      <AuthField
        label="Email"
        icon={Mail}
        value={email}
        onChangeText={setEmail}
        placeholder="nombre@ejemplo.com"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        autoComplete="email"
        editable={!busy}
      />

      <PasswordField
        label="Contraseña"
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        autoComplete="password"
        editable={!busy}
      />

      {error ? <Text style={[styles.error, { color: c.coral }]}>{error}</Text> : null}

      {notVerified ? (
        <View accessibilityRole="alert" style={[styles.alert, { backgroundColor: c.card, borderColor: c.sol }]}>
          <View style={styles.alertRow}>
            <View style={[styles.alertIcon, { backgroundColor: c.sol }]}>
              <MailWarning size={20} color={c.arena} strokeWidth={2} />
            </View>
            <Text style={[styles.alertText, { color: c.title }]}>
              Verificá tu email antes de iniciar sesión.
            </Text>
          </View>
          <Button
            variant="dark"
            title="Reenviar mail de verificación"
            onPress={resendVerification}
            style={styles.alertBtn}
            textStyle={styles.alertBtnText}
          />
          {resendMsg ? <Text style={[styles.alertMsg, { color: c.title }]}>{resendMsg}</Text> : null}
        </View>
      ) : null}

      {accountDeleted ? (
        <View accessibilityRole="alert" style={[styles.alert, { backgroundColor: c.card, borderColor: c.coral }]}>
          <View style={styles.alertRow}>
            <View style={[styles.alertIcon, { backgroundColor: c.coral }]}>
              <UserX size={20} color={c.arena} strokeWidth={2} />
            </View>
            <Text style={[styles.alertText, { color: c.title }]}>
              Esta cuenta fue eliminada. Podés recuperarla creándola nuevamente con este mismo email.
            </Text>
          </View>
          <Button
            title="Ir a crear cuenta"
            onPress={() => router.push('/register')}
            style={styles.alertBtn}
            textStyle={styles.alertBtnText}
          />
        </View>
      ) : null}

      <Link href="/forgot-password" style={[styles.forgotLink, { color: c.title }]}>
        ¿Olvidaste tu contraseña?
      </Link>

      <Button
        title="Iniciar sesión"
        onPress={handleEmailLogin}
        loading={loadingProvider === 'email'}
        disabled={busy || !email || !password}
      />

      {anySocialConfigured ? (
        <View style={styles.social}>
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: c.divider }]} />
            <Text style={[styles.dividerText, { color: c.text }]}>o continuá con</Text>
            <View style={[styles.dividerLine, { backgroundColor: c.divider }]} />
          </View>

          {googleConfigured ? (
            <GoogleButton
              onStart={() => startSocial('google')}
              onSuccess={handleSocialSuccess}
              onError={handleSocialError}
              onCancel={handleSocialCancel}
              loading={loadingProvider === 'google'}
              disabled={busy && loadingProvider !== 'google'}
            />
          ) : null}

          <AppleButton
            onStart={() => startSocial('apple')}
            onSuccess={handleSocialSuccess}
            onError={handleSocialError}
            onCancel={handleSocialCancel}
            loading={loadingProvider === 'apple'}
            disabled={busy && loadingProvider !== 'apple'}
          />

          {facebookConfigured ? (
            <FacebookButton
              onStart={() => startSocial('facebook')}
              onSuccess={handleSocialSuccess}
              onError={handleSocialError}
              onCancel={handleSocialCancel}
              loading={loadingProvider === 'facebook'}
              disabled={busy && loadingProvider !== 'facebook'}
            />
          ) : null}
        </View>
      ) : null}
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  error: { fontFamily: fonts.bold, fontSize: 13, textAlign: 'center' },
  alert: { borderWidth: 2, borderRadius: 20, padding: 14, gap: 12 },
  alertRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  alertIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  alertText: { flex: 1, fontFamily: fonts.bold, fontSize: 14, lineHeight: 20 },
  alertBtn: { height: 46, borderRadius: 14 },
  alertBtnText: { fontSize: 14 },
  alertMsg: { fontFamily: fonts.bold, fontSize: 13, textAlign: 'center' },
  forgotLink: { alignSelf: 'flex-end', fontFamily: fonts.bold, fontSize: 14, textDecorationLine: 'underline' },
  // gap 14 del cuerpo + 14 = los 28 que separan los grupos en el diseño.
  social: { gap: 12, marginTop: 14 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontFamily: fonts.bold, fontSize: 13 },
  footerText: { fontFamily: fonts.regular, fontSize: 15 },
  footerLink: { fontFamily: fonts.bold, textDecorationLine: 'underline' },
});
