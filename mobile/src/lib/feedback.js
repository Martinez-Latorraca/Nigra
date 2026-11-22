// Confirmaciones y avisos breves de la app (Confirmaciones.dc.html y
// Estados.dc.html). Reemplazan a Alert.alert. Los muestra <FeedbackHost />,
// montado una sola vez en app/_layout.js; acá solo hay un emisor mínimo para
// poder llamarlos desde cualquier pantalla sin pasar props.
//
//   if (await confirm({ tone: 'danger', icon: Trash2, title, text, confirmText })) …
//   const v = await choose({ title, text, options: [{ value, icon, color, title, text, selected }] });
//   toast('Listo, guardado.');            toast('No se pudo guardar.', 'error');

let listener = null;

export function setFeedbackListener(fn) {
  listener = fn;
  return () => {
    if (listener === fn) listener = null;
  };
}

// Hoja con ícono, título, texto, nota opcional, botón de la acción y Cancelar.
// tone: 'good' (Violeta) | 'neutral' (Noche) | 'danger' (Coral).
// Resuelve true si confirmó, false si canceló o cerró.
export function confirm(opts) {
  return new Promise((resolve) => {
    if (!listener) return resolve(false);
    listener({ kind: 'confirm', opts, resolve });
  });
}

// Hoja con opciones (p. ej. cámara / galería). Resuelve el `value` elegido o null.
export function choose(opts) {
  return new Promise((resolve) => {
    if (!listener) return resolve(null);
    listener({ kind: 'choose', opts, resolve });
  });
}

// Aviso breve Noche abajo de la pantalla. type: 'success' | 'error'.
export function toast(text, type = 'success') {
  listener?.({ kind: 'toast', opts: { text, type } });
}
