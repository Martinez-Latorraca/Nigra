import { useEffect } from 'react';
import { Pressable, Text, ActivityIndicator, StyleSheet } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import {
  GOOGLE_CLIENT_ID_WEB,
  GOOGLE_CLIENT_ID_IOS,
  GOOGLE_CLIENT_ID_ANDROID,
} from '../../lib/config';
import { exchangeGoogleToken } from '../../lib/oauth';

export default function GoogleButton({ onStart, onSuccess, onError, onCancel, loading, disabled }) {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: GOOGLE_CLIENT_ID_WEB,
    iosClientId: GOOGLE_CLIENT_ID_IOS,
    androidClientId: GOOGLE_CLIENT_ID_ANDROID,
  });

  useEffect(() => {
    if (!response) return;
    if (response.type === 'success') {
      const idToken = response.params?.id_token;
      if (!idToken) {
        onError('Google no devolvió un id_token');
        return;
      }
      exchangeGoogleToken(idToken)
        .then(onSuccess)
        .catch((err) => onError(err.response?.data?.error || 'No se pudo iniciar sesión con Google'));
    } else if (response.type === 'error') {
      onError('No se pudo iniciar sesión con Google');
    } else {
      onCancel();
    }
  }, [response]);

  const handlePress = async () => {
    onStart();
    await promptAsync();
  };

  return (
    <Pressable
      style={[styles.button, (disabled || !request) && styles.disabled]}
      onPress={handlePress}
      disabled={disabled || !request}
    >
      {loading ? (
        <ActivityIndicator color="#000" />
      ) : (
        <Text style={styles.text}>Continuar con Google</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 999,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  text: { color: '#111827', fontWeight: '600', fontSize: 16 },
  disabled: { opacity: 0.5 },
});
