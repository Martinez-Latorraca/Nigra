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

const PROVIDERS = [
  { id: 'google', label: 'Google' },
  { id: 'facebook', label: 'Facebook' },
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
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
      <Text style={[styles.title, { color: c.subtitle }]}>CUENTAS VINCULADAS</Text>

      {loading ? (
        <ActivityIndicator color={c.title} style={{ marginTop: 12 }} />
      ) : (
        PROVIDERS.map((p) => {
          const isLinked = linkedSet.has(p.id);
          const isOnlyMethod = isLinked && !hasPassword && links.length === 1;
          const isBusy = busy === p.id;
          const handler = isLinked ? () => unlink(p.id) : p.id === 'google' ? linkGoogle : linkFacebook;
          return (
            <View key={p.id} style={styles.row}>
              <View style={styles.left}>
                <View style={[styles.dot, { backgroundColor: isLinked ? '#22C55E' : '#E5E7EB' }]} />
                <Text style={[styles.label, { color: c.title }]}>{p.label}</Text>
                <Text style={[styles.state, { color: c.subtitle }]}>
                  {isLinked ? 'Conectada' : 'No conectada'}
                </Text>
              </View>
              <Pressable
                onPress={handler}
                disabled={isBusy || (isLinked && isOnlyMethod)}
                style={({ pressed }) => [
                  styles.action,
                  { opacity: isBusy || (isLinked && isOnlyMethod) ? 0.3 : pressed ? 0.6 : 1 },
                ]}
              >
                <Text
                  style={[
                    styles.actionText,
                    { color: isLinked ? '#EF4444' : c.title },
                  ]}
                >
                  {isBusy ? '···' : isLinked ? 'Desvincular' : 'Conectar'}
                </Text>
              </Pressable>
            </View>
          );
        })
      )}

      {!!error && <Text style={styles.error}>{error}</Text>}
      {!!notice && <Text style={styles.notice}>{notice}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 20,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
  },
  title: { fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  left: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: 15, fontWeight: '700' },
  state: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
  action: { paddingVertical: 6, paddingHorizontal: 8 },
  actionText: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
  error: {
    marginTop: 12,
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
    padding: 10,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
  },
  notice: {
    marginTop: 12,
    backgroundColor: '#DCFCE7',
    color: '#15803D',
    padding: 10,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
  },
});
