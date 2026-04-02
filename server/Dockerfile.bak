# Stage 1: Dependencies
FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
# Instalamos solo lo necesario para que el contenedor pese menos
RUN npm ci --only=production

# Stage 2: Production Image
FROM node:22-alpine
WORKDIR /app

# Traemos las dependencias del Stage 1
COPY --from=dependencies /app/node_modules ./node_modules

# COPIAMOS TODO EL CÓDIGO (Aquí estaba el error)
# Usamos "." para copiar todos los archivos del directorio actual (server)
COPY . .

# Seguridad: Creamos un usuario que no sea root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
# Le damos permiso al usuario sobre la carpeta /app
RUN chown -R nodejs:nodejs /app
USER nodejs

# El puerto 10000 es el estándar de Render, pero Express usará process.env.PORT
EXPOSE 10000

# Arrancamos
CMD ["node", "index.js"]