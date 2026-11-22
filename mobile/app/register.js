import { useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { router, Link } from 'expo-router';
import api from '../src/lib/api';
import AuthScreen, {
  useAuthColors,
  AuthField,
  AuthHeroIcon,
  PasswordField,
} from '../src/components/AuthScreen';
import AccountTypePicker from '../src/components/AccountTypePicker';
import Button from '../src/components/Button';
import { ClipboardList, Mail, MailCheck, User } from '../src/lib/icons';
import { palette, fonts } from '../src/lib/theme';
import { CONTACT_EMAIL } from '../src/lib/config';

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
  const mismatch = !!passwordConfirm && password !== passwordConfirm;
  const isEntity = accountType === 'vet' || accountType === 'shelter';

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
    const subtitle = restored ? (
      <>
        Te mandamos un link a <Text style={styles.strong}>{email}</Text> para confirmar que sos vos. Al
        tocarlo, tus reportes y datos vuelven intactos.
      </>
    ) : (
      <>
        Te mandamos un link a <Text style={styles.strong}>{email}</Text> para confirmar tu cuenta.
        Después de tocarlo, iniciá sesión.
      </>
    );
    return (
      <AuthScreen
        compact
        hero={<AuthHeroIcon icon={MailCheck} color={palette.teal} />}
        title={title}
        subtitle={subtitle}
        footer={
          <Text style={[styles.footerText, { color: c.text }]}>
            ¿No te llegó?{' '}
            <Text onPress={resendVerification} style={[styles.footerLink, { color: c.title }]}>
              Reenviar mail
            </Text>
          </Text>
        }
      >
        {accountType === 'shelter' && !restored ? (
          <View style={styles.notice}>
            <View style={styles.noticeKickerRow}>
              <ClipboardList size={15} color={palette.arena} strokeWidth={2} />
              <Text style={styles.noticeKicker}>Un paso más</Text>
            </View>
            <Text style={styles.noticeTitle}>
              Para publicar mascotas en adopción tenés que verificar que representás a un refugio o protectora.
            </Text>
            <Text style={styles.noticeText}>
              Enviá a {CONTACT_EMAIL} los comprobantes que tengas (papeles de la ONG, cuenta bancaria a nombre del
              refugio, redes, etc.) desde el email de tu cuenta.
            </Text>
            <Text style={styles.noticeText}>
              Mientras tanto podés editar el perfil. Un admin te aprueba y ya podés publicar.
            </Text>
          </View>
        ) : null}
        <Button title="Ir al login" onPress={() => router.replace('/login')} />
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      compact
      title="Crear cuenta"
      subtitle="Unite a la comunidad de búsqueda y rescate de Mimo"
      footer={
        <Text style={[styles.footerText, { color: c.text }]}>
          ¿Ya tenés cuenta?{' '}
          <Link href="/login" style={[styles.footerLink, { color: c.title }]}>
            Iniciar sesión
          </Link>
        </Text>
      }
    >
      <AccountTypePicker
        label="Tipo de cuenta"
        value={accountType}
        onChange={setAccountType}
        disabled={loading}
      />

      <View style={styles.fields}>
        <AuthField
          label={isEntity ? 'Nombre del responsable' : 'Nombre completo'}
          icon={User}
          value={name}
          onChangeText={setName}
          placeholder="Nombre y apellido"
          autoCapitalize="words"
          editable={!loading}
        />

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
          editable={!loading}
        />

        <PasswordField
          label="Contraseña"
          value={password}
          onChangeText={setPassword}
          placeholder="Mínimo 6 caracteres"
          autoComplete="password-new"
          editable={!loading}
        />

        <PasswordField
          label="Repetir contraseña"
          value={passwordConfirm}
          onChangeText={setPasswordConfirm}
          placeholder="Escribí la contraseña de nuevo"
          autoComplete="password-new"
          editable={!loading}
          error={mismatch ? 'Las contraseñas no coinciden.' : undefined}
        />

        {error ? <Text style={[styles.error, { color: c.coral }]}>{error}</Text> : null}

        <Button
          title={isEntity ? 'Crear cuenta y continuar' : 'Crear cuenta'}
          onPress={handleRegister}
          loading={loading}
          disabled={!canSubmit}
          style={styles.submit}
        />
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  // gap 14 del cuerpo + 10 = los 24 que separan los grupos en el diseño.
  fields: { gap: 14, marginTop: 10 },
  submit: { marginTop: 6 },
  error: { fontFamily: fonts.bold, fontSize: 13, textAlign: 'center' },
  strong: { fontFamily: fonts.bold },
  footerText: { fontFamily: fonts.regular, fontSize: 15, textAlign: 'center' },
  footerLink: { fontFamily: fonts.bold, textDecorationLine: 'underline' },
  notice: { backgroundColor: palette.teal, borderRadius: 24, padding: 18, gap: 8 },
  noticeKickerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  noticeKicker: {
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: palette.arena,
  },
  noticeTitle: { fontFamily: fonts.display, fontSize: 18, lineHeight: 23, color: palette.arena },
  noticeText: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: palette.arena },
});
