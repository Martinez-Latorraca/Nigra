import { useEffect, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { exchangeAppleToken, formatAppleFullName } from '../../lib/oauth';

export default function AppleButton({ onStart, onSuccess, onError, onCancel, disabled }) {
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
      onError(err.response?.data?.error || err.message || 'No se pudo iniciar sesión con Apple');
    }
  };

  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
      cornerRadius={999}
      style={[styles.button, disabled && styles.disabled]}
      onPress={handlePress}
    />
  );
}

const styles = StyleSheet.create({
  button: { height: 56, marginTop: 8 },
  disabled: { opacity: 0.5 },
});
