import express from 'express';
import { getMyMessages, getChatHistory, readPetMessages, sendMessage, uploadChatImage } from '../controllers/messageController.js';
import { upload } from '../middlewares/upload.js';
import { chatImageLimiter } from '../middlewares/rateLimiter.js';
import { authenticateToken } from '../middlewares/auth.js';
import validate from '../middlewares/validate.js';
import { sendMessageSchema, readMessagesSchema } from '../schemas/messageSchemas.js';

const router = express.Router();

router.get('/inbox', authenticateToken, getMyMessages);
router.post('/image', authenticateToken, chatImageLimiter, upload.single('image'), uploadChatImage);
router.get('/:pet_id/:otherUserId', authenticateToken, getChatHistory);
router.put('/read', authenticateToken, validate(readMessagesSchema), readPetMessages);
router.post('/messages', authenticateToken, validate(sendMessageSchema), sendMessage);



export default router;