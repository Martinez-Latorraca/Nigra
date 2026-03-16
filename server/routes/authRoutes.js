import express from 'express';
import { register, login, deleteAccount } from '../controllers/authController.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.delete('/me', authenticateToken, deleteAccount);

export default router;