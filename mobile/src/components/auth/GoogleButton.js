import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { GOOGLE_CLIENT_ID_WEB, GOOGLE_CLIENT_ID_IOS } from '../../lib/config';
import { exchangeGoogleToken } from '../../lib/oauth';
import GoogleLogo from '../../../assets/social/google.svg';
import SocialButton from './SocialButton';

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
        error.response?.data?.error || error.message || 'No se pudo iniciar sesión con Google',
        error.response?.data?.code
      );
    }
  };

  return (
    <SocialButton
      Logo={GoogleLogo}
      label="Continuar con Google"
      onPress={handlePress}
      loading={loading}
      disabled={disabled}
    />
  );
}
