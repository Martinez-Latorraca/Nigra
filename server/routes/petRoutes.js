import express from 'express';
import { reportPet, searchPet, getMyReports, deleteReport } from '../controllers/petController.js';
import { upload } from '../middlewares/upload.js';
import { authenticateToken } from '../middlewares/auth.js';
import { getMyMessages, getPetMessages, readPetMessages, sendMessage } from '../controllers/messageController.js';

const router = express.Router();

// Nota cómo inyectamos los middlewares antes del controlador
router.get('/my-reports', authenticateToken, getMyReports);
router.get('/messages/inbox', authenticateToken, getMyMessages);
router.get('/:petID/messages', authenticateToken, getPetMessages);
router.put('/:petID/messages/read', authenticateToken, readPetMessages);
router.delete('/:id', authenticateToken, deleteReport);
router.post('/messages', authenticateToken, sendMessage);
router.post('/search-pet', upload.single('image'), searchPet);
router.post('/report-pet', authenticateToken, upload.single('image'), reportPet);

export default router;