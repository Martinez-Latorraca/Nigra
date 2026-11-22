import { useEffect, useState } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Preferencia de apariencia: 'auto' (sigue al teléfono), 'light' o 'dark'.
// Se guarda en el dispositivo y se aplica con Appearance.setColorScheme, así
// useColorScheme() (y por lo tanto useTheme) y los componentes nativos
// (Alert, teclado, selector de fecha) respetan la elección.
const KEY = 'mimo.appearance';
export const APPEARANCE_OPTIONS = ['auto', 'light', 'dark'];

let current = 'auto';
const listeners = new Set();

function apply(pref) {
  // 'unspecified' = volver a seguir al sistema.
  Appearance.setColorScheme(pref === 'auto' ? 'unspecified' : pref);
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
  listeners.forEach((l) => l(current));
}

export async function setAppearance(pref) {
  if (!APPEARANCE_OPTIONS.includes(pref)) return;
  current = pref;
  apply(pref);
  listeners.forEach((l) => l(pref));
  try {
    await AsyncStorage.setItem(KEY, pref);
  } catch {
    // si no se pudo guardar, vale para esta sesión
  }
}

export function useAppearance() {
  const [pref, setPref] = useState(current);
  useEffect(() => {
    listeners.add(setPref);
    setPref(current);
    return () => listeners.delete(setPref);
  }, []);
  return pref;
}
