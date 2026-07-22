import express from 'express';
import {
    createShelter,
    getMyShelter,
    updateMyShelter,
    uploadMyShelterImage,
    deleteMyShelter,
    listShelters,
    getShelterBySlug,
    listPendingShelters,
    setShelterApproval,
} from '../controllers/shelterController.js';
import { authenticateToken } from '../middlewares/auth.js';
import { requireAdmin } from '../middlewares/adminAuth.js';
import { upload } from '../middlewares/upload.js';
import validate from '../middlewares/validate.js';
import {
    createShelterSchema,
    updateShelterSchema,
    listSheltersSchema,
} from '../schemas/shelterSchemas.js';

const router = express.Router();

// Público
router.get('/', validate(listSheltersSchema, 'query'), listShelters);

// Admin (montado antes de /:slug).
router.get('/admin/pending', authenticateToken, requireAdmin, listPendingShelters);
router.patch('/admin/:id/approve', authenticateToken, requireAdmin, setShelterApproval);

// Owner: /me antes de /:slug.
router.post('/', authenticateToken, validate(createShelterSchema), createShelter);
router.get('/me', authenticateToken, getMyShelter);
router.patch('/me', authenticateToken, validate(updateShelterSchema), updateMyShelter);
router.post('/me/image', authenticateToken, upload.single('image'), uploadMyShelterImage);
router.delete('/me', authenticateToken, deleteMyShelter);

// Público (último para no colisionar con /me y /admin).
router.get('/:slug', getShelterBySlug);

export default router;
