# Nigra — Handoff / Contexto de Proyecto

**Fecha:** 2026-07-01
**Para qué es este archivo:** pegar el contenido (o referenciarlo) al iniciar una sesión de Claude Code en otra máquina para retomar sin perder contexto.

---

## Qué es Nigra
Red civil para conectar mascotas perdidas con sus familias usando visión computacional. Monorepo con **backend** (Express/Node + Postgres/pgvector + Socket.io), **web client** (React + Vite + Tailwind) y **mobile** (Expo SDK 54 / React Native, Android).

Repo: `Martinez-Latorraca/Nigra` (GitHub, main branch, solo-repo workflow → commit directo a main, sin PRs).

**Deploy:** Render (`https://nigra-server.onrender.com`) sirve el backend y el build del web client desde un Dockerfile único.

---

## Estructura del repo
```
Nigra/
├── server/          # Express + Socket.io + Postgres (Supabase)
├── client/          # React + Vite (web)
├── mobile/          # Expo SDK 54 (Android dev build)
└── Dockerfile       # multi-stage: client build + server prod
```

**Dueño:** Nicolás Martínez Latorraca (`nicomar2004@gmail.com`).

---

## Estado — Lo que YA está funcionando

### Backend (server/)
- **Auth**: email/password, Google, Facebook, Apple (Apple solo código, no probado). Account-linking por email verificado.
- **Pets**: report, search visual (MobileNet embeddings + tfjs-node + pgvector con operador `<=>` para distancia coseno + TTA con 3 variantes + LEAST en SQL), umbral 0.25.
- **Feed** (`GET /api/pets`), **my-reports**, **getById** (con address lazy reverse-geocodeado).
- **Estado "Reunida"**: columna `resolved_at` en `pets`, endpoint `PATCH /:id/resolve`, filtro en feed/search/match.
- **Address search**: `GET /api/geo/search` (Google Geocoding API, biased a Uruguay).
- **Chat en tiempo real**: Socket.io con auth JWT. Eventos: `join_pet_chat`, `send_pet_message`, `receive_pet_message`, `new_notification`, `new_match_notification`.
- **Push notifications** (Expo Push API):
  - Chat: al recibir mensaje.
  - Match: cuando al reportar hay candidatas visualmente similares en el pool opuesto.
- **Notifications persistidas**: tabla `notifications` (id, user_id, type, data JSONB, read_at, created_at). Endpoints `GET /api/notifications` y `PATCH /:id/read`.
- **Tests**: Vitest + supertest (27 passing) en `server/tests/`. Cubre auth, pets, messages, users.
- **Migraciones idempotentes** en `ensureSchema()` al arrancar (agregó `users.push_token`, `pets.resolved_at`, tabla `notifications`).

### Mobile (mobile/)
- Auth con email + Google + Facebook nativos (Apple solo código).
- **Cámara custom** con silueta de chow-chow como guía + auto-crop a la cara + controles (flash off/auto/on, torch, girar, zoom).
- **Flujo unificado** (`app/report.js`): elegís situación → foto+datos → pre-búsqueda automática en el pool opuesto → muestra candidatas o pasa a publicar. Reemplaza los flujos separados de "Búsqueda visual" y "Reportar".
- **Pet detail** (`app/pet/[id].js`): chat, llamar, compartir. Dueño: "Marcar como reunida" (verde), "Reabrir reporte", "Eliminar publicación" (rojo).
- **Chat real 1:1** (`app/chat/[petId].js`) con manejo de teclado manual (edge-to-edge de Expo 54 rompe KeyboardAvoidingView).
- **Inbox** (`app/messages.js`) que mergea chats + matches ordenados por recency.
- **Sidebar** compartido (`SidebarProvider` + `<MenuButton />`): Inicio, Buscar, Explorar, Perfil, Mensajes (badge), Cerrar sesión. Ícono del sidebar según `theme.isDark` (`Mimo-logo-paw.svg` es aparte, es el logo principal).
- **Perfil** (`app/profile.js`) con mis registros + botón "Nuevo reporte".
- **Push notifications** end-to-end: Firebase project `fir-5c8c9` + FCM V1 service account cargada en EAS + PushProvider mobile-side. Tap del push navega a `/chat/[petId]` o `/pet/[id]` según `data.type`.
- **BannerHost global**: toast in-app para mensajes y matches nuevos cuando NO estás en la pantalla relevante. Auto-dismiss 4s, tap navega.
- Logo Mimo (`Mimo-logo-paw.svg`) en AuthScreen.

### Web client (client/)
- Auth (email + Google + Facebook, con linking).
- **Flujo unificado** (`pages/Find.jsx`) espejando mobile.
- Pet detail con `ChatWidget` (Socket.io ya existente) + estado Reunida (botón verde + reabrir + badge azul).
- Inbox/Profile.
- Favicon cambiado a `Mimo-logo-paw.svg`.

---

## Pendientes conocidos

### Bloqueadores
- **Build mobile está roto ahora mismo**: errores de CMake / codegen del New Architecture tras `prebuild --clean` para reinstalar tras el commit del banner + notifications. Última cosa charlada: probar `./gradlew clean` en `android/`, si no funciona borrar `node_modules/@react-native-async-storage/async-storage/android/build` (y de google-signin y react-native-webview), si no funciona borrar `node_modules` + `android/` completos y reinstalar.
- **Apple Sign In** en mobile y web: bloqueado por cuenta gratis de Apple Developer. En web además necesita Services ID (pago). No re-proponer hasta que Nico consiga cuenta paga.
- **iOS app**: nunca buildeada (free Apple + no Mac).

### Testing pendiente por el usuario (features codeadas, no probadas en dispositivo)
- Toast BannerHost al recibir chat + al recibir match.
- Inbox merge de chats + matches.
- Push de match al reportar (backend armado, no verificado end-to-end).

### Mejoras diferidas
- **Hosting pago + dominio propio**: Nico va a comprar cuando pueda. Hasta entonces el cold-start del login (~30-60s la primera vez tras inactividad) es un limitante aceptado. **NO re-proponer keep-warm pings o Render pago** — la decisión es esperar la migración de hosting.
- Modelo de matching mejor (re-ID en vez de MobileNet): descartado, no vale el costo con TF.js en Render free.
- Tests del backend para `report-pet` y `search-pet` (multipart + Cloudinary + AI worker) y para socket handlers, OAuth, admin.
- E2E (Playwright para web, Detox para mobile).
- Web: paridad con mobile del BannerHost y merge de matches en inbox.
- Web: logo Mimo visible en Login/Register/Navbar (solo el favicon ya usa Mimo).

### En espera del usuario
- **Rediseño Figma**: charlado pero no arrancado. Nico va a pasar screenshots pantalla por pantalla + assets.

---

## Decisiones y constraints clave

- **Solo-repo, sin PRs**: commit directo a `main`, sin branches ni PR ceremony.
- **SSL interception en la máquina de Nico**: git/Node/Java fallan con cert errors. Usar flags por herramienta:
  - `git`: `-c http.sslBackend=schannel` (necesario para `git push`)
  - `npm`/`node`: `NODE_OPTIONS=--use-system-ca` (o `$env:NODE_OPTIONS="--use-system-ca"` en PowerShell)
  - `gradle`/Java: no fue necesario porque la cache local ya tenía las deps
- **Render free tier**: acepta el cold-start. NO pushear keep-warm o Render pago (ya charlado, decisión firme).
- **Idioma**: todo en español (mensajes UX, commits, docs). Nico habla español (Uruguay).
- **Estilo de comits**: Conventional Commits (`feat:`, `fix:`, `chore:`, etc.), en español, con `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`.
- **PowerShell heredoc quirks**: al commitear con mensajes multilínea, siempre usar `bash` heredoc con `git commit -m "$(cat <<'EOF' ... EOF)"`, NO PowerShell here-strings (rompen con comillas dobles). El `'@` de PowerShell tiene que estar en columna 0.

---

## Setup en la otra PC

1. Instalar Node (>=22), Android Studio + SDK, ADB en PATH (o usar `$LOCALAPPDATA\Android\Sdk\platform-tools\adb`).
2. `git clone https://github.com/Martinez-Latorraca/Nigra.git`
3. En cada carpeta: `NODE_OPTIONS=--use-system-ca npm install` (usar el flag SSL de tu máquina si aplica).
4. **Server**: necesita `.env` con `DATABASE_URL` (Supabase pooled connection), `JWT_SECRET`, `CLOUDINARY_*`, `GOOGLE_CLIENT_ID_*`, `FACEBOOK_APP_SECRET`, `GOOGLE_GEOCODING_API_KEY`. Esos vars están en Render → Environment; copialos de ahí a tu `.env` local.
5. **Client**: `.env` con `VITE_API_URL`, `VITE_GOOGLE_CLIENT_ID`, `VITE_FACEBOOK_APP_ID`. Los IDs públicos también están hardcodeados en el `Dockerfile` de la raíz.
6. **Mobile**: `.env` con `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_GOOGLE_CLIENT_ID_*`. Los IDs de Google y Facebook están en `app.json` (mobile).
7. Para buildear mobile: dev build con `npx expo run:android` (necesita Android SDK + un device conectado).
8. Config de Firebase (`google-services.json`) ya está en `mobile/` commiteado.

---

## Referencias útiles

- **Backend logs**: dashboard.render.com → servicio `nigra-server` → Logs.
- **Supabase**: dashboard.supabase.com → proyecto `iflqcomawtwvtilgdjgf`. Se pausa a los 7 días de inactividad; si el server tira `ENOTFOUND ... tenant/user postgres.iflqcomawtwvtilgdjgf not found`, es que Supabase está pausado → resumir desde el dashboard.
- **Firebase** (para push): `fir-5c8c9` en console.firebase.google.com.
- **EAS** (Expo): projectId `5ef16804-86c2-49a8-b31d-66607e6f3c1a`.
- **Facebook**: App ID `1532502761799512`. Está en modo **desarrollo** (solo testers). Ir Live requiere Business Verification, descartado para portfolio.
- **Google Cloud** para OAuth y Geocoding: client `862423802458-*`.

---

## Auto-memory (contexto persistente entre sesiones)

Nico tiene un sistema de auto-memory local en `C:\Users\Nico\.claude\projects\e--Portfolio-Nigra\memory\`. Los archivos ahí son la fuente de verdad de decisiones/constraints. Los relevantes para retomar el proyecto:

- **`MEMORY.md`** (índice)
- **`feedback_workflow_solo_repo.md`** — commit a main sin PRs
- **`project_ssl_interception_toolchain.md`** — flags per-tool para SSL
- **`project_social_login_status.md`** — estado de Google/Facebook/Apple
- **`project_hosting_plan.md`** — no proponer keep-warm, esperar hosting pago
- **`project_push_notifications.md`** — setup completo de Firebase + FCM V1 + EAS

**Importante:** esos archivos son locales de la PC de Nico y no se sincronizan automáticamente. Si querés preservarlos entre PCs, copialos manualmente o subilos a un sync (OneDrive/Dropbox).

---

## Últimos commits (contexto reciente)

Ver `git log --oneline -20` en el repo. Los más recientes fueron:
- **feat: matches en inbox + banner in-app de notificaciones** — persistencia + socket + BannerHost.
- **test(server): suite de Vitest + supertest** — 27 tests para auth/pets/messages/users.
- **feat(client): espejar estado "Reunida" en el web** — botón + badge + reabrir.
- **feat: estado "Reunida" para cerrar reportes resueltos** — column + endpoint + filtros + UI mobile.
- **chore(mobile): Firebase google-services.json + link en app.json para FCM** — habilita push en Android.

---

## Próximo paso natural (mi sugerencia)

1. **Destrabar el build mobile** (errores de CMake tras el último rebuild).
2. **Probar en dispositivo**: BannerHost + inbox merge + push de match.
3. Después, uno de: arrancar el rediseño Figma (screenshot por screenshot), sumar tests que faltan, o pasar a otro feature.
