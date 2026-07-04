import { useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useSelector } from 'react-redux';
import { router } from 'expo-router';
import api from './api';
import { store } from '../store/store';

// Foreground: mostrar el banner + reproducir sonido si la app está abierta.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function registerForPush() {
  if (!Device.isDevice) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
  if (!projectId) {
    console.warn('Push: no hay extra.eas.projectId en app.json — corré `npx eas init`.');
    return null;
  }

  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  } catch (e) {
    console.warn('getExpoPushTokenAsync error:', e?.message);
    return null;
  }
}

function handleNotificationResponse(response) {
  const data = response?.notification?.request?.content?.data || {};
  const user = store.getState().user.data;
  const currentUserId = user?.id;

  // Si el push trae receiver_id (versión nueva del server), validamos que el
  // usuario logueado ahora sea el destinatario original. Bloqueamos si no.
  if (data.receiver_id != null) {
    if (currentUserId == null) {
      Alert.alert(
        'Iniciá sesión',
        'Necesitás iniciar sesión con la cuenta que recibió esta notificación para abrirla.'
      );
      return;
    }
    if (Number(data.receiver_id) !== Number(currentUserId)) {
      Alert.alert(
        'Notificación de otra cuenta',
        `Esta notificación no era para tu cuenta actual${
          user?.name ? ` (${user.name})` : ''
        }. Iniciá sesión con la cuenta correcta para verla.`
      );
      return;
    }
  }

  if (data.type === 'message' && data.pet_id && data.otherUserId) {
    router.push({
      pathname: `/chat/${data.pet_id}`,
      params: {
        otherUserId: String(data.otherUserId),
        name: data.name || '',
        photo: data.photo || '',
      },
    });
  } else if (data.type === 'match' && data.pet_id) {
    router.push(`/pet/${data.pet_id}`);
  }
}

export function PushProvider({ children }) {
  const token = useSelector((s) => s.user.token);

  // Registra el push token con el backend cuando el usuario está logueado.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    registerForPush().then((expoToken) => {
      if (cancelled) return;
      if (!expoToken) {
        console.warn('📲 Push: no se obtuvo expo push token');
        return;
      }
      console.log('📲 Push token obtenido:', expoToken.slice(0, 30) + '…');
      api
        .post('/api/users/push-token', { token: expoToken })
        .then(() => console.log('📲 Push token registrado en el backend'))
        .catch((e) => console.warn('📲 Push token POST falló:', e?.message));
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Tap en una notificación → navega.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);
    return () => sub.remove();
  }, []);

  return children;
}
