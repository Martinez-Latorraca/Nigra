import * as SecureStore from 'expo-secure-store';

// Adaptador de storage para redux-persist que usa expo-secure-store en vez de
// AsyncStorage. Va detrás de iOS Keychain / Android EncryptedSharedPreferences,
// donde solo la app puede leer el dato (incluso en devices con root).
//
// SecureStore no permite ":" en las keys — redux-persist usa "persist:<name>"
// por defecto, así que reemplazamos ":" por "_" al escribir/leer/borrar.
const encodeKey = (k) => String(k).replace(/:/g, '_');

const secureStorage = {
    getItem: (key) => SecureStore.getItemAsync(encodeKey(key)),
    setItem: (key, value) => SecureStore.setItemAsync(encodeKey(key), value),
    removeItem: (key) => SecureStore.deleteItemAsync(encodeKey(key)),
};

export default secureStorage;
