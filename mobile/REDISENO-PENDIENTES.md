# Rediseño — funcionalidades nuevas pendientes

El rediseño (handoff en `Downloads/mimo design/HANDOFF.md`) se implementa **solo en lo
visual**. Todo lo que el diseño muestra y la app todavía no hace queda **oculto** y se
anota acá, para decidirlo y hacerlo aparte.

Formato: qué es · dónde aparece en el diseño · qué haría falta.

## Navegación

- **Mapa: botón "Filtros" y chip "Refugios"** · `Mapa.dc.html` · la pantalla Mapa está hecha
  (2026-11-22, reportes abiertos + vets) pero sin estos dos: el botón Filtros no tiene una función
  definida (¿especie? ¿fecha?) y los refugios no tienen ubicación pública por decisión de privacidad
  (es la casa de alguien), así que no van al mapa. Pendiente del servidor: deployar `GET /api/pets/map`.

## Home (`Home-v2.dc.html`)

- **"Cerca tuyo"** · carrusel de reportes con distancia ("a 0,8 km") · `GET /api/pets`
  no filtra ni ordena por distancia: hace falta aceptar `lat`/`lng` en el servidor y
  pedir ubicación en la app.
- **Mimo Protect** · tarjeta "Registrá a tu mascota y pedí su chapita QR" · la feature
  del tag QR no existe (está en el roadmap como parte del wedge).
- **Héroes Mimo** · tarjeta de niveles ("Sos Vecino", 2/5, "Compartí 3 reportes más
  para llegar a Rastreador") · no hay sistema de niveles ni conteo de compartidos.

## Ya listadas en el handoff ("Funcionalidad nueva")

- **Chat:** botón para enviar fotos (hoy solo texto).

## Bugs encontrados al rediseñar (no son visuales, no se tocaron)


## Probar en un teléfono real (el emulador no alcanza)

- **"Usar mi ubicación actual" en Perdí / Encontré** (`9c33dda`) · ya no queda girando: usa la
  última posición conocida o la actual con tope de 8 s. En el emulador no se pudo confirmar que
  complete la ubicación (su GPS simulado no entregaba posición). Probar con GPS real, adentro y afuera.
- **Foto recortada de la cámara** (`8d796d8`) · en el emulador la captura con webcam sale negra,
  así que no se vio el recorte. Confirmar que la foto queda recortada al cuadrado de la silueta
  (perro y gato).
- **Controles de la cámara** · probar todo lo que aparece al sacar la foto: flash (Off / Auto /
  On), luz (linterna), girar cámara (trasera / frontal), zoom (− / +, que el % cambie y la imagen
  se acerque), selector Perro / Gato, disparador y cerrar (X). También la pantalla de permiso
  ("Dar permiso" y "Elegir de la galería") la primera vez que se abre.
- **Anuncios de vets en Explorar** (`36b4fe9`) · en Veterinarias ya salen "Nuestros socios"; en
  Explorar no se llegó a ver un anuncio en la lista.
- **Fotos en el chat** · mandar una foto sacada con la cámara y otra de la galería; que le llegue
  a la otra persona (burbuja + push "Te mandó una foto"), que se abra en pantalla completa y que
  en Mensajes la vista previa diga "Foto". Requiere haber corrido `server/sql/message_images.sql`.

## Próximo build de EAS (no llega por Metro: tiene código nativo)

- **App Links** (`66ca940`) · los links de mimo.uy (`/pet/`, `/adoptions`, `/shelters`, `/vets`)
  abren la app en vez del navegador. Para que Android los verifique: en Render setear
  `ANDROID_CERT_SHA256` con la huella SHA-256 de `eas credentials -p android` (y, cuando esté en
  Play Store, sumar separada por coma la de Play Console → Configuración → Integridad de la app →
  Firma de apps). Deployar el server, chequear `https://mimo.uy/.well-known/assetlinks.json`,
  hacer el build e instalarlo. Probar: `adb shell pm get-app-links com.mimo.app` tiene que decir
  `mimo.uy: verified`, y tocar un link de WhatsApp tiene que abrir la ficha en la app.
- **Compartir como historia** · el botón Compartir de la ficha y de la adopción abre una hoja con
  "Enviar link" y "Compartir como historia" (imagen 1080×1920 del servidor, `/og/.../story.jpg`,
  con `expo-sharing`). En un build sin `expo-sharing` la hoja no aparece y Compartir manda el
  link como antes. El diseño pedía armar la imagen en la app con `react-native-view-shot`; se usa
  la del servidor porque ya existe y es la misma para web y app.

## Diseño que contradice decisiones ya tomadas (no se implementó)

- **"Marcar como reunida" en la ficha propia** (`Mascota-propia.dc.html`) · en el
  commit `0a765fc` se decidió que el caso se cierra **solo desde el chat** (opción A).
  La ficha propia muestra "Esta es tu publicación", Compartir y Eliminar, y "Reabrir"
  si ya está cerrada. Si querés el botón de vuelta, es reactivar `handleResolve(true)`.

## Contenido a revisar (no es diseño)

- **Carrusel de la pantalla de espera: publicidad pendiente hasta tener usuarios reales** ·
  `GET /api/ads/loading` (`server/lib/loadingSlides.js`) sirve hoy solo donación y un consejo
  (distinto si la persona perdió o encontró). Los slides de publicidad — vet socia, producto y
  refugio (este último sin diseño en el handoff, armado igual que el de la vet en Teal) — ya están
  en la app; para activarlos se cargan en `LOADING_SLIDES` y se deploya, sin publicar la app.
  Para verlos en desarrollo: `EXPO_PUBLIC_LOADING_SLIDES_MOCK=1` en `mobile/.env`.

## Detalles visuales que quedaron afuera

- **Cámara: zoom en "1,0×"** · se dejó en porcentaje porque el zoom de expo-camera va de
  0 a 1 y no es un multiplicador real.

## Web

Rediseño de la web hecho el 2026-11-23 (barra, footer, fichas, listados, Inicio, Perdí /
Encontré, cuentas, perfiles, chat, registro de vet). El panel de admin (`9068d35`) y `/privacy`
(`6ad530e`) ya estaban hechos: el punto 13 del handoff está completo.

- ~~Registro de vet en la web con otra lista de servicios~~ · resuelto: `VetRegister.jsx` usa
  el mismo catálogo que el perfil y el directorio.
- **Oculto en la web (igual que en la app):** "Cerca tuyo", Mimo Protect y Héroes Mimo en el
  Inicio; "Ver en el mapa" en Explorar (la web no tiene mapa); "Marcar como reunida" en la
  ficha propia (se cierra desde el chat); Apple en el login (falta la cuenta paga).
- **Refugios sin contadores** (`Web-refugios`: "6 en adopción · 18 adoptadas") · `GET /api/shelters`
  no los trae. Haría falta sumarlos en el servidor.
- **Bandeja de entrada del refugio** (`Web-perfil-refugio`) · los refugios no tienen chat en la web.
- **Filtros de color y fecha en Explorar** · el diseño no los tiene y se sacaron. El buscador
  "barrio o nombre" filtra solo los reportes ya cargados (no hay búsqueda en el servidor).
- **Probar con cuentas reales** (con la sesión de prueba no se pudo): pasos 2 y 3 de
  Perdí / Encontré, panel del refugio (publicar, editar, marcar adoptado), perfil de vet con
  métricas, enviar y ver fotos en el chat web, y el botón de Google en mimo.uy.
