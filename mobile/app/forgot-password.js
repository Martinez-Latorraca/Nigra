import { useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { router, Link } from 'expo-router';
import api from '../src/lib/api';
import AuthScreen, { useAuthColors, AuthField, AuthHeroIcon } from '../src/components/AuthScreen';
import Button from '../src/components/Button';
import { KeyRound, Mail, MailCheck } from '../src/lib/icons';
import { palette, fonts } from '../src/lib/theme';

export default function ForgotPassword() {
  const c = useAuthColors();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    setBusy(true);
    try {
      await api.post('/api/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error || 'No pudimos procesar tu pedido.');
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <AuthScreen
        compact
        hero={<AuthHeroIcon icon={MailCheck} color={palette.coral} />}
        title="Revisá tu casilla"
        subtitle={
          <>
            Si <Text style={styles.strong}>{email}</Text> está en Mimo, te mandamos el link.
          </>
        }
      >
        <Text style={[styles.body, { backgroundColor: c.card, color: c.text }]}>
          El link tarda un par de minutos. Cuando lo recibas, tocalo desde el email para elegir una nueva contraseña.
        </Text>
        <Button variant="dark" title="Volver al login" onPress={() => router.replace('/login')} style={styles.back} />
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      compact
      hero={<AuthHeroIcon icon={KeyRound} color={palette.coral} />}
      title="Recuperar cuenta"
      subtitle="Te mandamos un link para reiniciar tu contraseña"
      footer={
        <Text style={styles.footer}>
          <Link href="/login" style={[styles.footerLink, { color: c.title }]}>
            Volver al login
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

      {error ? <Text style={[styles.error, { color: c.coral }]}>{error}</Text> : null}

      <Button title="Enviar link" onPress={handleSubmit} loading={busy} disabled={!email} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  strong: { fontFamily: fonts.bold },
  error: { fontFamily: fonts.bold, fontSize: 13, textAlign: 'center' },
  body: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    padding: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  // gap 14 del cuerpo + 10 = los 24 del diseño.
  back: { marginTop: 10 },
  footer: { textAlign: 'center' },
  footerLink: { fontFamily: fonts.bold, fontSize: 15, textDecorationLine: 'underline' },
});
