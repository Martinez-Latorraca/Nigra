import { useState } from 'react';
import { Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useDispatch } from 'react-redux';
import { router, Link } from 'expo-router';
import api from '../src/lib/api';
import { setCredentials } from '../src/store/userSlice';
import AuthScreen, { useAuthColors } from '../src/components/AuthScreen';

export default function Register() {
  const dispatch = useDispatch();
  const c = useAuthColors();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = name.trim() && email.trim() && password.length >= 6;

  const handleRegister = async () => {
    setError('');
    setLoading(true);
    try {
      await api.post('/api/auth/register', { name, email, password });
      // Auto-login después de crear la cuenta.
      const { data } = await api.post('/api/auth/login', { email, password });
      dispatch(setCredentials({ user: data.user, token: data.token }));
      router.replace('/home');
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen
      title="Crear cuenta"
      subtitle="Unite a la comunidad de búsqueda y rescate de Mimo"
      footer={
        <Text style={[styles.footerText, { color: c.subtitle }]}>
          ¿Ya tenés cuenta?{' '}
          <Link href="/login" style={[styles.footerLink, { color: c.title }]}>
            Iniciar sesión
          </Link>
        </Text>
      }
    >
      <Text style={[styles.label, { color: c.label }]}>Nombre completo</Text>
      <TextInput
        style={[styles.input, { backgroundColor: c.inputBg, color: c.inputText }]}
        value={name}
        onChangeText={setName}
        placeholder="Nombre y apellido"
        placeholderTextColor={c.label}
        autoCapitalize="words"
        editable={!loading}
      />

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
        editable={!loading}
      />

      <Text style={[styles.label, { color: c.label }]}>Contraseña</Text>
      <TextInput
        style={[styles.input, { backgroundColor: c.inputBg, color: c.inputText }]}
        value={password}
        onChangeText={setPassword}
        placeholder="Mínimo 6 caracteres"
        placeholderTextColor={c.label}
        secureTextEntry
        autoComplete="password-new"
        editable={!loading}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[
          styles.button,
          { backgroundColor: c.primary, marginTop: 16 },
          (loading || !canSubmit) && styles.buttonDisabled,
        ]}
        onPress={handleRegister}
        disabled={loading || !canSubmit}
      >
        {loading ? (
          <ActivityIndicator color={c.primaryText} />
        ) : (
          <Text style={[styles.buttonText, { color: c.primaryText }]}>Crear cuenta</Text>
        )}
      </Pressable>
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
  button: {
    borderRadius: 999,
    padding: 16,
    alignItems: 'center',
    height: 56,
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontWeight: '600', fontSize: 16 },
  footerText: { fontSize: 14, fontWeight: '500' },
  footerLink: { fontWeight: '700' },
});
