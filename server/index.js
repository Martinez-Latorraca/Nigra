import express from 'express';
import cors from 'cors';
import { loadModel } from './ai.js';

// Importar rutas
import authRoutes from './routes/authRoutes.js';
import petRoutes from './routes/petRoutes.js';

const app = express();
const port = 3000;

// Middlewares globales
app.use(cors());
app.use(express.json());

// Montar las rutas
app.use('/api/auth', authRoutes); // Rutas de auth (ej: /api/auth/login)
app.use('/api/pets', petRoutes);  // Rutas de mascotas (ej: /api/pets/search-pet)

// Inicialización del Servidor
app.listen(port, async () => {
    console.log('⏳ Cargando IA y arrancando servidor...');
    await loadModel();
    console.log(`🚀 Servidor listo y escuchando en http://localhost:${port}`);
});