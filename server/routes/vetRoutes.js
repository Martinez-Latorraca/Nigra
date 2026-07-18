import express from 'express';
import {
    createVet,
    getMyVet,
    updateMyVet,
    updateMyVetAlerts,
    getMyVetDashboard,
    deleteMyVet,
    listVets,
    nearbyVets,
    getVetBySlug,
    listPendingVets,
    setVetApproval,
} from '../controllers/vetController.js';
import { authenticateToken } from '../middlewares/auth.js';
import { requireAdmin } from '../middlewares/adminAuth.js';
import validate from '../middlewares/validate.js';
import {
    createVetSchema,
    updateVetSchema,
    updateVetAlertsSchema,
    nearbyVetsSchema,
    listVetsSchema,
} from '../schemas/vetSchemas.js';

const router = express.Router();

// Público
router.get('/', validate(listVetsSchema, 'query'), listVets);
router.get('/nearby', validate(nearbyVetsSchema, 'query'), nearbyVets);

// Admin (montado antes de /:slug para no colisionar).
router.get('/admin/pending', authenticateToken, requireAdmin, listPendingVets);
router.patch('/admin/:id/approve', authenticateToken, requireAdmin, setVetApproval);

// Owner: /me antes de /:slug para no colisionar.
router.post('/', authenticateToken, validate(createVetSchema), createVet);
router.get('/me', authenticateToken, getMyVet);
router.get('/me/dashboard', authenticateToken, getMyVetDashboard);
router.patch('/me', authenticateToken, validate(updateVetSchema), updateMyVet);
router.patch('/me/alerts', authenticateToken, validate(updateVetAlertsSchema), updateMyVetAlerts);
router.delete('/me', authenticateToken, deleteMyVet);

// Público (después de todas las rutas específicas).
router.get('/:slug', getVetBySlug);

export default router;
