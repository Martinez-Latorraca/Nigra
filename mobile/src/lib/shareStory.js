import { SITE_URL } from './config';

// "Compartir como historia" (Compartir.dc.html): baja la imagen vertical
// 1080×1920 que arma el servidor (/og/:kind/:id/story.jpg, la misma lógica que
// la vista previa del link) y abre la hoja del sistema para mandarla a
// Instagram, WhatsApp, etc.
//
// expo-sharing y expo-file-system son módulos nativos: se cargan acá adentro
// para que un build viejo que no los tiene no se rompa al abrir la ficha.
// En ese caso storyAvailable() da false y la opción no se muestra.

function nativeModules() {
  try {
    return {
      Sharing: require('expo-sharing'),
      FS: require('expo-file-system'),
    };
  } catch {
    return null;
  }
}

export async function storyAvailable() {
  const m = nativeModules();
  if (!m) return false;
  try {
    return await m.Sharing.isAvailableAsync();
  } catch {
    return false;
  }
}

// kind: 'pet' | 'adoption'.
export async function shareStory(kind, id) {
  const m = nativeModules();
  if (!m) throw new Error('sharing-unavailable');
  const { File, Paths } = m.FS;
  const dest = new File(Paths.cache, `mimo-historia-${kind}-${id}.jpg`);
  const file = await File.downloadFileAsync(`${SITE_URL}/og/${kind}/${id}/story.jpg`, dest, { idempotent: true });
  await m.Sharing.shareAsync(file.uri, { mimeType: 'image/jpeg', UTI: 'public.jpeg', dialogTitle: 'Compartir como historia' });
}
