import { useSyncExternalStore } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Preferencia de apariencia: 'auto' (sigue al teléfono), 'light' o 'dark'.
// Se guarda en el dispositivo y se aplica con Appearance.setColorScheme para
// que los componentes nativos (Alert, teclado, selector de fecha) la respeten.
//
// Ojo: Appearance.setColorScheme no avisa a useColorScheme() (actualiza su
// caché sin emitir "change"), y al volver a 'auto' la lectura inmediata puede
// devolver el modo forzado anterior. Por eso useTheme se suscribe a este store
// y en 'auto' volvemos a leer el esquema un momento después.
const KEY = 'mimo.appearance';
export const APPEARANCE_OPTIONS = ['auto', 'light', 'dark'];

let current = 'auto';
let version = 0;
const listeners = new Set();

function notify() {
  version += 1;
  listeners.forEach((l) => l());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function apply(pref) {
  // 'unspecified' = volver a seguir al sistema.
  Appearance.setColorScheme(pref === 'auto' ? 'unspecified' : pref);
  notify();
  if (pref === 'auto') {
    // El cambio nativo corre en el hilo de UI: releer cuando ya se aplicó.
    setTimeout(() => {
      if (current !== 'auto') return;
      Appearance.setColorScheme('unspecified');
      notify();
    }, 300);
  }
}

// Se llama una vez al arrancar (app/_layout.js), mientras sigue el splash nativo.
export async function loadAppearance() {
  try {
    const saved = await AsyncStorage.getItem(KEY);
    if (APPEARANCE_OPTIONS.includes(saved)) current = saved;
  } catch {
    // sin preferencia guardada: automático
  }
  apply(current);
}

export async function setAppearance(pref) {
  if (!APPEARANCE_OPTIONS.includes(pref)) return;
  current = pref;
  apply(pref);
  try {
    await AsyncStorage.setItem(KEY, pref);
  } catch {
    // si no se pudo guardar, vale para esta sesión
  }
}

export function getAppearance() {
  return current;
}

// Preferencia elegida ('auto' | 'light' | 'dark'); re-renderiza al cambiar.
export function useAppearance() {
  useSyncExternalStore(subscribe, () => version);
  return current;
}

// true/false según la preferencia y, en 'auto', el esquema del sistema.
export function useIsDark(systemScheme) {
  useSyncExternalStore(subscribe, () => version);
  if (current === 'dark') return true;
  if (current === 'light') return false;
  return (Appearance.getColorScheme() ?? systemScheme) === 'dark';
}
