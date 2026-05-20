import { useEffect } from 'react';
import { Pressable, Text, ActivityIndicator, StyleSheet } from 'react-native';
import * as Facebook from 'expo-auth-session/providers/facebook';
import { FACEBOOK_APP_ID } from '../../lib/config';
import { exchangeFacebookToken } from '../../lib/oauth';

export default function FacebookButton({ onStart, onSuccess, onError, onCancel, loading, disabled }) {
  const [request, response, promptAsync] = Facebook.useAuthRequest({
    clientId: FACEBOOK_APP_ID,
  });

  useEffect(() => {
    if (!response) return;
    if (response.type === 'success') {
      const accessToken =
        response.authentication?.accessToken || response.params?.access_token;
      if (!accessToken) {
        onError('Facebook no devolvió un access_token');
        return;
      }
      exchangeFacebookToken(accessToken)
        .then(onSuccess)
        .catch((err) =>
          onError(err.response?.data?.error || 'No se pudo iniciar sesión con Facebook')
        );
    } else if (response.type === 'error') {
      onError('No se pudo iniciar sesión con Facebook');
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
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.text}>Continuar con Facebook</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#1877F2',
    borderRadius: 999,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  text: { color: '#fff', fontWeight: '600', fontSize: 16 },
  disabled: { opacity: 0.5 },
});
