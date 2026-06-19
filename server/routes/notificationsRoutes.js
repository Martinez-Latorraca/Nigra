import express from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import { getMyNotifications, markNotificationRead } from '../controllers/notificationController.js';

const router = express.Router();

router.get('/', authenticateToken, getMyNotifications);
router.patch('/:id/read', authenticateToken, markNotificationRead);

export default router;
