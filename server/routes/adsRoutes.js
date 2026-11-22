import express from 'express';
import { activeLoadingSlides } from '../lib/loadingSlides.js';

const router = express.Router();

// Público: slides activos de la pantalla de espera del reporte.
// Una lista vacía significa "no mostrar el carrusel".
router.get('/loading', (req, res) => {
    res.set('Cache-Control', 'public, max-age=300');
    res.json({ slides: activeLoadingSlides() });
});

export default router;
