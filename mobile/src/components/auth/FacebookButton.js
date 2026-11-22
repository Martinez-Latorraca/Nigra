import { LoginManager, AccessToken } from 'react-native-fbsdk-next';
import { exchangeFacebookToken } from '../../lib/oauth';
import FacebookLogo from '../../../assets/social/facebook.svg';
import SocialButton from './SocialButton';

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
        error.response?.data?.error || error.message || 'No se pudo iniciar sesión con Facebook',
        error.response?.data?.code
      );
    }
  };

  return (
    <SocialButton
      Logo={FacebookLogo}
      label="Continuar con Facebook"
      onPress={handlePress}
      loading={loading}
      disabled={disabled}
    />
  );
}
