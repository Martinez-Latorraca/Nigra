import express from 'express';
import { reportPet, searchPet, getMyReports, deleteReport, getPetById, getAllPets, getAvailableColors } from '../controllers/petController.js';
import { upload } from '../middlewares/upload.js';
import { authenticateToken } from '../middlewares/auth.js';
import { searchLimiter, reportLimiter } from '../middlewares/rateLimiter.js';
import validate from '../middlewares/validate.js';
import { reportPetSchema, searchPetSchema } from '../schemas/petSchemas.js';

const router = express.Router();

const reportFields = upload.fields([
    { name: 'image', maxCount: 1 },         // La foto del recorte (Principal)
    { name: 'extra_images', maxCount: 5 }   // Las fotos de apoyo (Galería)
]);

// Nota cómo inyectamos los middlewares antes del controlador
router.get('/my-reports', authenticateToken, getMyReports);
router.get('/colors', getAvailableColors);
router.get('/:pet_id', getPetById);
router.get('/', getAllPets);
router.delete('/:id', authenticateToken, deleteReport);
router.post('/search-pet', searchLimiter, upload.single('image'), validate(searchPetSchema), searchPet);
router.post('/report-pet', authenticateToken, reportLimiter, reportFields, validate(reportPetSchema), reportPet);

export default router;