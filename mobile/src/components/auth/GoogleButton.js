import { Pressable, Text, ActivityIndicator, StyleSheet } from 'react-native';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { GOOGLE_CLIENT_ID_WEB, GOOGLE_CLIENT_ID_IOS } from '../../lib/config';
import { exchangeGoogleToken } from '../../lib/oauth';

GoogleSignin.configure({
  webClientId: GOOGLE_CLIENT_ID_WEB,
  iosClientId: GOOGLE_CLIENT_ID_IOS,
});

export default function GoogleButton({ onStart, onSuccess, onError, onCancel, loading, disabled }) {
  const handlePress = async () => {
    onStart();
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      await GoogleSignin.signOut();
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken ?? response.idToken;
      if (!idToken) {
        onError('Google no devolvió un id_token');
        return;
      }
      const data = await exchangeGoogleToken(idToken);
      onSuccess(data);
    } catch (error) {
      if (
        error.code === statusCodes.SIGN_IN_CANCELLED ||
        error.code === statusCodes.IN_PROGRESS
      ) {
        onCancel();
        return;
      }
      onError(
        error.response?.data?.error || error.message || 'No se pudo iniciar sesión con Google'
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
