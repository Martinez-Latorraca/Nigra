import { useState } from 'react';
import { Text, TextInput, Pressable, StyleSheet, ActivityIndicator, View } from 'react-native';
import { router, Link } from 'expo-router';
import api from '../src/lib/api';
import AuthScreen, { useAuthColors } from '../src/components/AuthScreen';

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
      <AuthScreen title="Revisá tu casilla" subtitle={`Si ${email} está en Mimo, te mandamos el link.`}>
        <Text style={[styles.body, { color: c.subtitle }]}>
          El link tarda un par de minutos. Cuando lo recibas, tocalo desde el email para elegir una nueva contraseña.
        </Text>
        <Pressable
          style={[styles.button, { backgroundColor: c.primary, marginTop: 16 }]}
          onPress={() => router.replace('/login')}
        >
          <Text style={[styles.buttonText, { color: c.primaryText }]}>Volver al login</Text>
        </Pressable>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      title="Recuperar cuenta"
      subtitle="Te mandamos un link para reiniciar tu contraseña"
      footer={
        <Link href="/login" style={[styles.footerLink, { color: c.subtitle }]}>
          Volver al login
        </Link>
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

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[
          styles.button,
          { backgroundColor: c.primary, marginTop: 16 },
          (busy || !email) && styles.buttonDisabled,
        ]}
        onPress={handleSubmit}
        disabled={busy || !email}
      >
        {busy ? (
          <ActivityIndicator color={c.primaryText} />
        ) : (
          <Text style={[styles.buttonText, { color: c.primaryText }]}>Enviar link</Text>
        )}
      </Pressable>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginTop: 12 },
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
  body: { fontSize: 14, lineHeight: 20 },
  button: { borderRadius: 999, padding: 16, alignItems: 'center', height: 56, justifyContent: 'center' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontWeight: '600', fontSize: 16 },
  footerLink: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
});
