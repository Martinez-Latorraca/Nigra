import express from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import validate from '../middlewares/validate.js';
import { updateLocationSchema, updateNotifyNearbySchema } from '../schemas/userSchemas.js';
import {
    registerPushToken,
    updateLocation,
    updateNotifyNearby,
    getMe,
} from '../controllers/userController.js';

const router = express.Router();

router.get('/me', authenticateToken, getMe);
router.post('/push-token', authenticateToken, registerPushToken);
router.patch('/location', authenticateToken, validate(updateLocationSchema), updateLocation);
router.patch('/notify-nearby', authenticateToken, validate(updateNotifyNearbySchema), updateNotifyNearby);

export default router;
