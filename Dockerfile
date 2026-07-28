# Stage 1: Build del Client (React/Vite)
FROM node:22-slim AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ .
ENV VITE_API_URL=https://mimo.uy
# IDs públicos de OAuth (se inlinean en el bundle del cliente).
ENV VITE_GOOGLE_CLIENT_ID=862423802458-7ivoqalvkr1ve65p3qratl6104ul2s71.apps.googleusercontent.com
ENV VITE_FACEBOOK_APP_ID=1532502761799512
RUN npm run build

# Stage 2: Dependencias del Server
# Usamos slim (Debian) en vez de Alpine porque tfjs-node depende de libtensorflow.so
# compilada contra glibc; en Alpine (musl) falla con "ld-linux-x86-64.so.2 not found".
FROM node:22-slim AS server-deps
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install --omit=dev

# Stage 3: Production Image
FROM node:22-slim
WORKDIR /app

# Traemos las dependencias del server
COPY --from=server-deps /app/server/node_modules ./server/node_modules

# Copiamos el código del server
COPY server/ ./server/

# Traemos el build del client
COPY --from=client-build /app/client/dist ./client/dist

# Seguridad: corremos como el usuario `node` (uid 1000) que ya viene en la imagen oficial.
USER node

EXPOSE 10000

WORKDIR /app/server
# --import ./instrument.js: precarga Sentry ANTES de importar express/pg, para
# que la auto-instrumentación de ESM funcione (sin esto Sentry avisa "express
# is not instrumented"). Los errores se capturan igual, pero así llega el
# contexto de request completo.
CMD ["node", "--import", "./instrument.js", "index.js"]
