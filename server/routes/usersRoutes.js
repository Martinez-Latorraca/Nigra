import express from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import { registerPushToken } from '../controllers/userController.js';

const router = express.Router();

router.post('/push-token', authenticateToken, registerPushToken);

export default router;
