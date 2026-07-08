import * as Location from 'expo-location';
import api from './api';

// Actualiza la última ubicación conocida del user en el server, SI ya tiene
// permiso concedido. No lanza prompts nuevos — el permiso se pide cuando el
// user reporta/busca. Fire-and-forget: no bloqueamos ningún flow.
export async function updateLocationIfPermitted() {
    try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') return { skipped: true, reason: 'no_permission' };

        const loc = await Location.getLastKnownPositionAsync().catch(() => null)
            || await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!loc?.coords) return { skipped: true, reason: 'no_coords' };

        const { latitude, longitude } = loc.coords;
        await api.patch('/api/users/location', { lat: latitude, lng: longitude });
        return { ok: true, lat: latitude, lng: longitude };
    } catch (e) {
        // Silencioso — el flow de la app no depende de esto.
        return { skipped: true, reason: e?.message || 'error' };
    }
}
