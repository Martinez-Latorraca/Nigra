import { useState } from 'react';
import { Text, TextInput, Pressable, View, StyleSheet, ActivityIndicator } from 'react-native';
import { router, Link } from 'expo-router';
import api from '../src/lib/api';
import AuthScreen, { useAuthColors } from '../src/components/AuthScreen';

const ACCOUNT_TYPES = [
  {
    id: 'user',
    emoji: '🐾',
    title: 'Busco / reporto mascotas',
    desc: 'Uso Mimo para encontrar o reportar mascotas.',
  },
  {
    id: 'vet',
    emoji: '🏥',
    title: 'Represento una veterinaria',
    desc: 'Publico mascotas encontradas y recibo alertas.',
  },
];

export default function Register() {
  const c = useAuthColors();
  const [accountType, setAccountType] = useState('user');
  const [registered, setRegistered] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [restored, setRestored] = useState(false);
  const [requiresVerification, setRequiresVerification] = useState(false);

  const canSubmit =
    name.trim() && email.trim() && password.length >= 6 && password === passwordConfirm;

  const handleRegister = async () => {
    setError('');
    if (password !== passwordConfirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/register', { name, email, password, account_type: accountType });
      setRestored(!!data.restored);
      setRequiresVerification(!!data.requires_verification);
      setRegistered(true);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  const resendVerification = async () => {
    try {
      await api.post('/api/auth/resend-verification', { email });
    } catch {
      // silencioso — el server siempre devuelve 200
    }
  };

  if (registered) {
    const title = restored ? 'Recuperando tu cuenta' : 'Revisá tu email';
    const subtitle = restored
      ? `Te mandamos un link a ${email} para confirmar que sos vos. Al tocarlo, tus reportes y datos vuelven intactos.`
      : `Te mandamos un link a ${email} para confirmar tu cuenta. Después de tocarlo, iniciá sesión.`;
    return (
      <AuthScreen title={title} subtitle={subtitle}>
        <Pressable
          style={[styles.button, { backgroundColor: c.primary, marginTop: 8 }]}
          onPress={() => router.replace('/login')}
        >
          <Text style={[styles.buttonText, { color: c.primaryText }]}>Ir al login</Text>
        </Pressable>
        <Pressable style={{ marginTop: 12 }} onPress={resendVerification}>
          <Text style={[styles.footerText, { color: c.subtitle, textAlign: 'center' }]}>
            ¿No te llegó?{' '}
            <Text style={[styles.footerLink, { color: c.title }]}>Reenviar mail</Text>
          </Text>
        </Pressable>
      </AuthScreen>
    );
  }

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
      <Text style={[styles.label, { color: c.label }]}>Tipo de cuenta</Text>
      <View style={{ gap: 8, marginTop: 8 }}>
        {ACCOUNT_TYPES.map((t) => {
          const active = accountType === t.id;
          return (
            <Pressable
              key={t.id}
              onPress={() => setAccountType(t.id)}
              disabled={loading}
              style={[
                styles.typeCard,
                {
                  backgroundColor: active ? c.inputBg : 'transparent',
                  borderColor: active ? c.title : c.label,
                  borderWidth: active ? 2 : 1,
                },
              ]}
            >
              <Text style={styles.typeEmoji}>{t.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.typeTitle, { color: c.inputText }]}>{t.title}</Text>
                <Text style={[styles.typeDesc, { color: c.subtitle }]}>{t.desc}</Text>
              </View>
              <View
                style={[
                  styles.typeRadio,
                  { borderColor: active ? c.title : c.label, backgroundColor: active ? c.title : 'transparent' },
                ]}
              />
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.label, { color: c.label }]}>
        {accountType === 'vet' ? 'Nombre del responsable' : 'Nombre completo'}
      </Text>
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

      <Text style={[styles.label, { color: c.label }]}>Repetir contraseña</Text>
      <TextInput
        style={[
          styles.input,
          { backgroundColor: c.inputBg, color: c.inputText },
          passwordConfirm && password !== passwordConfirm ? styles.inputError : null,
        ]}
        value={passwordConfirm}
        onChangeText={setPasswordConfirm}
        placeholder="Escribí la contraseña de nuevo"
        placeholderTextColor={c.label}
        secureTextEntry
        autoComplete="password-new"
        editable={!loading}
      />
      {passwordConfirm && password !== passwordConfirm ? (
        <Text style={[styles.hint, { color: '#EF4444' }]}>Las contraseñas no coinciden.</Text>
      ) : null}

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
          <Text style={[styles.buttonText, { color: c.primaryText }]}>
            {accountType === 'vet' ? 'Crear cuenta y continuar' : 'Crear cuenta'}
          </Text>
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
  inputError: { borderWidth: 1, borderColor: '#EF4444' },
  hint: { fontSize: 11, marginTop: 6, lineHeight: 15 },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    padding: 12,
  },
  typeEmoji: { fontSize: 22 },
  typeTitle: { fontSize: 14, fontWeight: '700' },
  typeDesc: { fontSize: 11, marginTop: 2, lineHeight: 15 },
  typeRadio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2 },
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
