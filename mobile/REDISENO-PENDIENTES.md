# Rediseño — funcionalidades nuevas pendientes

El rediseño (handoff en `Downloads/mimo design/HANDOFF.md`) se implementa **solo en lo
visual**. Todo lo que el diseño muestra y la app todavía no hace queda **oculto** y se
anota acá, para decidirlo y hacerlo aparte.

Formato: qué es · dónde aparece en el diseño · qué haría falta.

## Navegación

- **Pantalla Mapa** · tab "Mapa" de la barra inferior, link "Ver mapa" de la Home ·
  `Mapa.dc.html`: mapa a pantalla completa, buscador, chips de filtro, pins de reportes
  (Coral perdido / Teal encontrado), refugios (cuadrado Sol), vets (cuadrado Noche),
  clusters, ubicación del usuario con radio de alertas, tarjeta del pin seleccionado.
  Hoy el tab Mapa se ve **deshabilitado** (decisión explícita) y el link "Ver mapa" no está.
  Tampoco está el botón "Ver el mapa" del vacío de Explorar (`Estados.dc.html`).

## Home (`Home-v2.dc.html`)

- **"Cerca tuyo"** · carrusel de reportes con distancia ("a 0,8 km") · `GET /api/pets`
  no filtra ni ordena por distancia: hace falta aceptar `lat`/`lng` en el servidor y
  pedir ubicación en la app.
- **Mimo Protect** · tarjeta "Registrá a tu mascota y pedí su chapita QR" · la feature
  del tag QR no existe (está en el roadmap como parte del wedge).
- **Héroes Mimo** · tarjeta de niveles ("Sos Vecino", 2/5, "Compartí 3 reportes más
  para llegar a Rastreador") · no hay sistema de niveles ni conteo de compartidos.
- **Modo oscuro** · `Home-v2-oscuro.dc.html` · los tokens oscuros ya están en
  `src/lib/theme.js`, pero `app.json` fuerza `userInterfaceStyle: "light"`. Activarlo
  requiere revisar todas las pantallas en oscuro.

## Ya listadas en el handoff ("Funcionalidad nueva")

- **Chat:** botón para enviar fotos (hoy solo texto).
- **Cámara:** selector Perro/Gato y siluetas nuevas (Lucide `dog`/`cat`, trazo fijo).
  Ojo: `SILHOUETTE_DP = 400` también define el recorte.
- **Mensajes:** buscador de conversaciones.
- **Refugio pendiente:** botón "Enviar comprobantes" (mailto).
- **Adopción adoptada:** tarjeta "Final feliz" con botón a otras mascotas en adopción.

## Bugs encontrados al rediseñar (no son visuales, no se tocaron)

- **Los anuncios de vets sponsor pueden no aparecer nunca** · `app/pets.js` y
  `app/vets/index.js` · si el usuario dio permiso de ubicación pero el teléfono no
  tiene posición (GPS sin señal, bajo techo, emulador), `getCurrentPositionAsync`
  queda esperando para siempre y el pedido a `/api/vets/ads` nunca sale: no hay
  carrusel "Nuestros socios" ni anuncios en Explorar. Arreglo sugerido: usar
  `getLastKnownPositionAsync` o ponerle un timeout, y si no hay posición pedir los
  anuncios sin coordenadas (orden por plan).
- **El mapa de la ficha de mascota no muestra el mapa** · `src/components/PetMap.js` ·
  los tiles de CARTO (`basemaps.cartocdn.com`) ahora devuelven una imagen
  "API KEY REQUIRED": se ve el punto pero no las calles. Hay que cambiar de proveedor
  de tiles (p. ej. OpenStreetMap con su política de uso, o una key gratuita de
  Stadia/MapTiler). Revisar si la web usa los mismos tiles.

## Diseño que contradice decisiones ya tomadas (no se implementó)

- **"Marcar como reunida" en la ficha propia** (`Mascota-propia.dc.html`) · en el
  commit `0a765fc` se decidió que el caso se cierra **solo desde el chat** (opción A).
  La ficha propia muestra "Esta es tu publicación", Compartir y Eliminar, y "Reabrir"
  si ya está cerrada. Si querés el botón de vuelta, es reactivar `handleResolve(true)`.

## Contenido a revisar (no es diseño)

- **Anuncio de ejemplo en la pantalla de carga del reporte** · `src/components/ReportLoading.js` ·
  mientras se busca la coincidencia se muestra "Contenido patrocinado: Protección inteligente…
  usando el código **NIGRA20**" con un link genérico a mercadolibre.com.uy. Es un placeholder
  con la marca vieja y lo ve cualquiera que reporte. Decidir: sacarlo, reemplazarlo por un
  sponsor real, o mostrar algo propio (p. ej. consejos mientras busca).

## Detalles visuales que quedaron afuera

- **Cámara: oscurecer todo lo que está fuera de la silueta** (`Camara.dc.html` usa una
  máscara Noche al 62 %). Hay que dibujar la máscara a pantalla completa alineada con la
  silueta de 400 dp, que también define el recorte. Conviene hacerlo junto con las
  siluetas nuevas de Perro/Gato.
- **Cámara: zoom en "1,0×"** · se dejó en porcentaje porque el zoom de expo-camera va de
  0 a 1 y no es un multiplicador real.

## Mensajes (`Mensajes.dc.html`)

- **"Sobre [Nombre] · Perdido" y punto de color sobre la foto** · el diseño muestra en cada
  conversación el nombre y el estado de la mascota. `GET /api/messages/inbox` no devuelve
  `pets.name` ni `pets.status`/`resolved_at`: hay que sumarlos al SELECT.
- **Bug: punto de "no leído" en Chats sin nada sin leer** · `unreadCount` de `src/lib/socket.js`
  suma todas las notificaciones sin leer, incluidos tipos que la pantalla Mensajes no muestra
  (solo muestra `match` y `resolve_reminder`). El punto de la TabBar / menú aparece y en la
  lista no hay nada marcado.

## Web

- **Registro de vet en la web con otra lista de servicios** · `client/src/pages/VetRegister.jsx`
  usa `SERVICE_SUGGESTIONS` ("Consulta general", "Emergencias 24h"…) mientras `Profile.jsx`
  y `Vets.jsx` usan el catálogo único (Consultas, Urgencias 24h…). Lo que carga una vet al
  registrarse desde la web no coincide con los filtros del directorio. En mobile ya se
  unificó (`src/lib/services.js`); falta hacer lo mismo en la web.
