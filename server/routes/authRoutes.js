import express from 'express';
import { register, login, deleteAccount } from '../controllers/authController.js';
import { authenticateToken } from '../middlewares/auth.js';
import { authLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.delete('/me', authenticateToken, deleteAccount);

export default router;