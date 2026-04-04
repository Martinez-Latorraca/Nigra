import express from 'express';
import { getMyMessages, getChatHistory, readPetMessages, sendMessage } from '../controllers/messageController.js';
import { authenticateToken } from '../middlewares/auth.js';
import validate from '../middlewares/validate.js';
import { sendMessageSchema, readMessagesSchema } from '../schemas/messageSchemas.js';

const router = express.Router();

router.get('/inbox', authenticateToken, getMyMessages);
router.get('/:pet_id/:otherUserId', authenticateToken, getChatHistory);
router.put('/read', authenticateToken, validate(readMessagesSchema), readPetMessages);
router.post('/messages', authenticateToken, validate(sendMessageSchema), sendMessage);



export default router;