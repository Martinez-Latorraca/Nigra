import { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { LoginManager, AccessToken } from 'react-native-fbsdk-next';
import {
  fetchOAuthLinks,
  linkGoogleToAccount,
  linkFacebookToAccount,
  unlinkOAuthProvider,
} from '../lib/oauth';
import { palette, fonts } from '../lib/theme';
import { Link } from '../lib/icons';

const PROVIDERS = [
  { id: 'google', label: 'Google', letter: 'G' },
  { id: 'facebook', label: 'Facebook', letter: 'f' },
];

export default function LinkedAccounts({ c }) {
  const [links, setLinks] = useState([]);
  const [hasPassword, setHasPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const reload = useCallback(async () => {
    try {
      const data = await fetchOAuthLinks();
      setLinks(data.links || []);
      setHasPassword(!!data.hasPassword);
    } catch {
      // silent — pantalla queda vacía
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const clearMessages = () => { setError(''); setNotice(''); };

  const linkGoogle = async () => {
    clearMessages();
    setBusy('google');
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      await GoogleSignin.signOut();
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken ?? response.idToken;
      if (!idToken) throw new Error('Google no devolvió un id_token');
      await linkGoogleToAccount(idToken);
      setNotice('Google vinculada correctamente.');
      await reload();
    } catch (e) {
      if (e.code === statusCodes.SIGN_IN_CANCELLED || e.code === statusCodes.IN_PROGRESS) {
        // cancelado en silencio
      } else {
        setError(e.response?.data?.error || e.message || 'No se pudo vincular Google');
      }
    } finally {
      setBusy(null);
    }
  };

  const linkFacebook = async () => {
    clearMessages();
    setBusy('facebook');
    try {
      LoginManager.logOut();
      const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);
      if (result.isCancelled) return;
      const tokenData = await AccessToken.getCurrentAccessToken();
      if (!tokenData?.accessToken) throw new Error('Facebook no devolvió un access token');
      await linkFacebookToAccount(tokenData.accessToken.toString());
      setNotice('Facebook vinculada correctamente.');
      await reload();
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'No se pudo vincular Facebook');
    } finally {
      setBusy(null);
    }
  };

  const unlink = async (provider) => {
    clearMessages();
    setBusy(provider);
    try {
      await unlinkOAuthProvider(provider);
      setNotice(`${provider} desvinculada.`);
      await reload();
    } catch (e) {
      setError(e.response?.data?.error || 'No se pudo desvincular la cuenta');
    } finally {
      setBusy(null);
    }
  };

  const linkedSet = new Set(links.map((l) => l.provider));

  return (
    <View style={[styles.card, { backgroundColor: c.card }]}>
      <View style={styles.titleRow}>
        <Link size={15} color={c.text} strokeWidth={2} />
        <Text style={[styles.title, { color: c.text }]}>Cuentas vinculadas</Text>
      </View>
      <Text style={[styles.subtitle, { color: c.text }]}>Iniciá sesión más rápido con tus otras cuentas.</Text>

      {loading ? (
        <ActivityIndicator color={c.title} style={{ marginTop: 12 }} />
      ) : (
        PROVIDERS.map((p, i) => {
          const isLinked = linkedSet.has(p.id);
          const isOnlyMethod = isLinked && !hasPassword && links.length === 1;
          const isBusy = busy === p.id;
          const disabled = isBusy || (isLinked && isOnlyMethod);
          const handler = isLinked ? () => unlink(p.id) : p.id === 'google' ? linkGoogle : linkFacebook;
          return (
            <View key={p.id} style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: c.cardBorder }]}>
              <View style={[styles.logo, { backgroundColor: c.bg }]}>
                <Text style={[styles.logoText, { color: c.text }]}>{p.letter}</Text>
              </View>
              <View style={styles.texts}>
                <Text style={[styles.label, { color: c.title }]}>{p.label}</Text>
                <View style={styles.stateRow}>
                  <View
                    style={[
                      styles.dot,
                      isLinked ? { backgroundColor: palette.teal } : { backgroundColor: palette.arena, borderWidth: 1, borderColor: palette.noche },
                    ]}
                  />
                  <Text style={[styles.state, { color: c.text }]}>{isLinked ? 'Conectada' : 'No conectada'}</Text>
                </View>
              </View>
              <Pressable
                onPress={handler}
                disabled={disabled}
                style={({ pressed }) => [
                  styles.action,
                  isLinked ? styles.actionOutline : styles.actionDark,
                  { opacity: disabled ? 0.35 : pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={[styles.actionText, { color: isLinked ? palette.noche : palette.crema }]}>
                  {isBusy ? '···' : isLinked ? 'Desvincular' : 'Conectar'}
                </Text>
              </Pressable>
            </View>
          );
        })
      )}

      {!!error && <Text style={[styles.msg, styles.error, { color: c.text }]}>{error}</Text>}
      {!!notice && <Text style={[styles.msg, styles.notice, { color: c.text }]}>{notice}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 18, borderRadius: 24, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  subtitle: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  logo: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontFamily: fonts.display, fontSize: 18 },
  texts: { flex: 1, gap: 2 },
  label: { fontFamily: fonts.bold, fontSize: 15 },
  stateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  state: { fontFamily: fonts.regular, fontSize: 13 },
  action: { height: 40, borderRadius: 12, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  actionOutline: { borderWidth: 2, borderColor: palette.noche },
  actionDark: { backgroundColor: palette.noche, paddingHorizontal: 16 },
  actionText: { fontFamily: fonts.bold, fontSize: 13 },
  msg: { marginTop: 8, padding: 12, borderRadius: 14, fontFamily: fonts.bold, fontSize: 13, borderWidth: 2 },
  error: { borderColor: palette.coral },
  notice: { borderColor: palette.teal },
});
