import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { exchangeAppleToken, formatAppleFullName } from '../../lib/oauth';
import AppleLogo from '../../../assets/social/apple.svg';
import SocialButton from './SocialButton';

export default function AppleButton({ onStart, onSuccess, onError, onCancel, loading, disabled }) {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    AppleAuthentication.isAvailableAsync().then(setAvailable);
  }, []);

  if (!available) return null;

  const handlePress = async () => {
    onStart();
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        onError('Apple no devolvió un identity token');
        return;
      }
      const data = await exchangeAppleToken(
        credential.identityToken,
        formatAppleFullName(credential.fullName)
      );
      onSuccess(data);
    } catch (err) {
      if (err.code === 'ERR_REQUEST_CANCELED') {
        onCancel();
        return;
      }
      onError(err.response?.data?.error || err.message || 'No se pudo iniciar sesión con Apple', err.response?.data?.code);
    }
  };

  // Botón propio con el logo de Apple (permitido por sus guías) para que
  // quede igual a los de Google y Facebook.
  return (
    <SocialButton
      Logo={AppleLogo}
      label="Continuar con Apple"
      dark
      onPress={handlePress}
      loading={loading}
      disabled={disabled}
    />
  );
}
