import express from 'express';
import {
    createVet,
    getMyVet,
    updateMyVet,
    updateMyVetAlerts,
    getMyVetDashboard,
    uploadMyVetImage,
    deleteMyVet,
    listVets,
    listVetAds,
    nearbyVets,
    getVetBySlug,
    listPendingVets,
    listActiveVets,
    setVetApproval,
    setVetPlan,
    trackAdClick,
    trackContactClick,
    trackImpressions,
} from '../controllers/vetController.js';
import { authenticateToken } from '../middlewares/auth.js';
import { requireAdmin } from '../middlewares/adminAuth.js';
import { upload } from '../middlewares/upload.js';
import validate from '../middlewares/validate.js';
import {
    createVetSchema,
    updateVetSchema,
    updateVetAlertsSchema,
    nearbyVetsSchema,
    listVetsSchema,
    trackImpressionsSchema,
} from '../schemas/vetSchemas.js';

const router = express.Router();

// Público
router.get('/', validate(listVetsSchema, 'query'), listVets);
router.get('/ads', listVetAds);
router.get('/nearby', validate(nearbyVetsSchema, 'query'), nearbyVets);

// Tracking público. No auth: analytics no debe forzar login del user.
// Ver [[project-vet-sponsor-model]].
router.post('/events/impressions', validate(trackImpressionsSchema), trackImpressions);
router.post('/:id/click', trackAdClick);
router.post('/:id/contact-click', trackContactClick);

// Admin (montado antes de /:slug para no colisionar).
router.get('/admin/pending', authenticateToken, requireAdmin, listPendingVets);
router.get('/admin/active', authenticateToken, requireAdmin, listActiveVets);
router.patch('/admin/:id/approve', authenticateToken, requireAdmin, setVetApproval);
router.patch('/admin/:id/plan', authenticateToken, requireAdmin, setVetPlan);

// Owner: /me antes de /:slug para no colisionar.
router.post('/', authenticateToken, validate(createVetSchema), createVet);
router.get('/me', authenticateToken, getMyVet);
router.get('/me/dashboard', authenticateToken, getMyVetDashboard);
router.patch('/me', authenticateToken, validate(updateVetSchema), updateMyVet);
router.patch('/me/alerts', authenticateToken, validate(updateVetAlertsSchema), updateMyVetAlerts);
router.post('/me/image', authenticateToken, upload.single('image'), uploadMyVetImage);
router.delete('/me', authenticateToken, deleteMyVet);

// Público (después de todas las rutas específicas).
router.get('/:slug', getVetBySlug);

export default router;
