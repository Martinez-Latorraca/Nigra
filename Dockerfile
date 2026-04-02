# Stage 1: Build del Client (React/Vite)
FROM node:22-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ .
ENV VITE_API_URL=https://nigra-server.onrender.com
RUN npm run build

# Stage 2: Dependencias del Server
FROM node:22-alpine AS server-deps
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install --only=production

# Stage 3: Production Image
FROM node:22-alpine
WORKDIR /app

# Traemos las dependencias del server
COPY --from=server-deps /app/server/node_modules ./server/node_modules

# Copiamos el código del server
COPY server/ ./server/

# Traemos el build del client
COPY --from=client-build /app/client/dist ./client/dist

# Seguridad: usuario no root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 10000

WORKDIR /app/server
CMD ["node", "index.js"]
