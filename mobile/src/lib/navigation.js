import { router } from 'expo-router';

// Volver atrás, o al inicio si no hay pantalla anterior. Pasa cuando la app se
// abre desde un link de mimo.uy (App Links): la ficha es la única pantalla y
// router.back() no haría nada. '/' redirige a /home o /login según la sesión.
export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
