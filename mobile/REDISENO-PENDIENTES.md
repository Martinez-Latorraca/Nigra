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
- **Mensajes:** buscador de conversaciones.
- **Refugio pendiente:** botón "Enviar comprobantes" (mailto).
- **Adopción adoptada:** tarjeta "Final feliz" con botón a otras mascotas en adopción.

## Bugs encontrados al rediseñar (no son visuales, no se tocaron)


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

- **"Sobre [Nombre] · Perdido" y punto de color sobre la foto** · el diseño muestra en cada
  conversación el nombre y el estado de la mascota. `GET /api/messages/inbox` no devuelve
  `pets.name` ni `pets.status`/`resolved_at`: hay que sumarlos al SELECT.

## Web

- **Registro de vet en la web con otra lista de servicios** · `client/src/pages/VetRegister.jsx`
  usa `SERVICE_SUGGESTIONS` ("Consulta general", "Emergencias 24h"…) mientras `Profile.jsx`
  y `Vets.jsx` usan el catálogo único (Consultas, Urgencias 24h…). Lo que carga una vet al
  registrarse desde la web no coincide con los filtros del directorio. En mobile ya se
  unificó (`src/lib/services.js`); falta hacer lo mismo en la web.
