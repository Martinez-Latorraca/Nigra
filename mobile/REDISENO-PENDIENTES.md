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

## Mensajes (`Mensajes.dc.html`)


## Web

- **Registro de vet en la web con otra lista de servicios** · `client/src/pages/VetRegister.jsx`
  usa `SERVICE_SUGGESTIONS` ("Consulta general", "Emergencias 24h"…) mientras `Profile.jsx`
  y `Vets.jsx` usan el catálogo único (Consultas, Urgencias 24h…). Lo que carga una vet al
  registrarse desde la web no coincide con los filtros del directorio. En mobile ya se
  unificó (`src/lib/services.js`); falta hacer lo mismo en la web.
