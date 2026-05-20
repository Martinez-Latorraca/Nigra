import { Pressable, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { LoginManager, AccessToken } from 'react-native-fbsdk-next';
import { exchangeFacebookToken } from '../../lib/oauth';

export default function FacebookButton({ onStart, onSuccess, onError, onCancel, loading, disabled }) {
  const handlePress = async () => {
    onStart();
    try {
      LoginManager.logOut();
      const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);
      if (result.isCancelled) {
        onCancel();
        return;
      }
      const tokenData = await AccessToken.getCurrentAccessToken();
      if (!tokenData?.accessToken) {
        onError('Facebook no devolvió un access token');
        return;
      }
      const data = await exchangeFacebookToken(tokenData.accessToken.toString());
      onSuccess(data);
    } catch (error) {
      onError(
        error.response?.data?.error || error.message || 'No se pudo iniciar sesión con Facebook'
      );
    }
  };

  return (
    <Pressable
      style={[styles.button, disabled && styles.disabled]}
      onPress={handlePress}
      disabled={disabled}
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
