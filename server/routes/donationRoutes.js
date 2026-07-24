import express from 'express';
import { trackDonationClick, getDonationStats } from '../controllers/donationController.js';
import { optionalAuth, authenticateToken } from '../middlewares/auth.js';
import { requireAdmin } from '../middlewares/adminAuth.js';

const router = express.Router();

// Público (auth opcional: enriquece con user_id si está logueado).
router.post('/click', optionalAuth, trackDonationClick);

// Admin: stats agregadas.
router.get('/stats', authenticateToken, requireAdmin, getDonationStats);

export default router;
