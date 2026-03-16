import express from 'express';
import { reportPet, searchPet, getMyReports, deleteReport } from '../controllers/petController.js';
import { upload } from '../middlewares/upload.js';
import { authenticateToken } from '../middlewares/auth.js';
import { sendMessage } from '../controllers/messageController.js';

const router = express.Router();

// Nota cómo inyectamos los middlewares antes del controlador
router.post('/report-pet', authenticateToken, upload.single('image'), reportPet);
router.post('/search-pet', upload.single('image'), searchPet);
router.get('/my-reports', authenticateToken, getMyReports);
router.delete('/:id', authenticateToken, deleteReport);
router.post('/messages', authenticateToken, sendMessage);

export default router;