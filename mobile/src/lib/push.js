import { useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useSelector } from 'react-redux';
import { router } from 'expo-router';
import api from './api';
import { store } from '../store/store';
import { updateLocationIfPermitted } from './location';

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

// Fábrica testable del handler que se ejecuta cuando el user toca un push.
// Valida receiver_id contra el user logueado para bloquear notifs de otras
// cuentas (bug detectado antes: al re-loguearse con otra cuenta en el mismo
// device, tocar un push viejo enlazaba el chat con la cuenta equivocada).
export function createNotificationResponseHandler({ getUser, alert, navigate } = {}) {
  return function handleNotificationResponse(response) {
    const data = response?.notification?.request?.content?.data || {};
    const user = getUser();
    const currentUserId = user?.id;

    if (data.receiver_id != null) {
      if (currentUserId == null) {
        alert(
          'Iniciá sesión',
          'Necesitás iniciar sesión con la cuenta que recibió esta notificación para abrirla.'
        );
        return;
      }
      if (Number(data.receiver_id) !== Number(currentUserId)) {
        alert(
          'Notificación de otra cuenta',
          `Esta notificación no era para tu cuenta actual${
            user?.name ? ` (${user.name})` : ''
          }. Iniciá sesión con la cuenta correcta para verla.`
        );
        return;
      }
    }

    if (data.type === 'message' && data.pet_id && data.otherUserId) {
      navigate({
        pathname: `/chat/${data.pet_id}`,
        params: {
          otherUserId: String(data.otherUserId),
          name: data.name || '',
          photo: data.photo || '',
        },
      });
    } else if ((data.type === 'match' || data.type === 'nearby_lost' || data.type === 'nearby_found') && data.pet_id) {
      navigate(`/pet/${data.pet_id}`);
    }
  };
}

const handleNotificationResponse = createNotificationResponseHandler({
  getUser: () => store.getState().user.data,
  alert: Alert.alert,
  navigate: (arg) => router.push(arg),
});

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
      console.log('📲 Push token obtenido (registrando en el backend)');
      api
        .post('/api/users/push-token', { token: expoToken })
        .then(() => console.log('📲 Push token registrado en el backend'))
        .catch((e) => console.warn('📲 Push token POST falló:', e?.message));
    });
    // Aprovechamos el ciclo del token para actualizar la última ubicación
    // conocida — la usa el server para mandar alertas de mascotas cerca
    // (feature opt-in vía notify_nearby). Fire-and-forget, silencioso.
    updateLocationIfPermitted().catch(() => {});
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
