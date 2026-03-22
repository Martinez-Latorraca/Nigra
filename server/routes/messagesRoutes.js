import express from 'express';
import { getMyMessages, getChatHistory, readPetMessages, sendMessage } from '../controllers/messageController.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = express.Router();

router.get('/inbox', authenticateToken, getMyMessages);
router.get('/:pet_id/:otherUserId', authenticateToken, getChatHistory);
router.put('/:pet_id/messages/read', authenticateToken, readPetMessages);
router.post('/messages', authenticateToken, sendMessage);



export default router;