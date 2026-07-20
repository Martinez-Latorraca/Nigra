import express from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import { upload } from '../middlewares/upload.js';
import validate from '../middlewares/validate.js';
import { updateLocationSchema, updateMeSchema, updateNotifyNearbySchema } from '../schemas/userSchemas.js';
import {
    registerPushToken,
    updateLocation,
    updateMe,
    uploadMyAvatar,
    updateNotifyNearby,
    getMe,
    deleteMe,
} from '../controllers/userController.js';

const router = express.Router();

router.get('/me', authenticateToken, getMe);
router.patch('/me', authenticateToken, validate(updateMeSchema), updateMe);
router.delete('/me', authenticateToken, deleteMe);
router.post('/me/avatar', authenticateToken, upload.single('image'), uploadMyAvatar);
router.post('/push-token', authenticateToken, registerPushToken);
router.patch('/location', authenticateToken, validate(updateLocationSchema), updateLocation);
router.patch('/notify-nearby', authenticateToken, validate(updateNotifyNearbySchema), updateNotifyNearby);

export default router;
