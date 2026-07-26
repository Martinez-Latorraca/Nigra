import express from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import { requireAdmin } from '../middlewares/adminAuth.js';
import validate from '../middlewares/validate.js';
import { updateRoleSchema } from '../schemas/adminSchemas.js';
import {
    getDashboardStats,
    getAllUsers,
    deleteUser,
    updateUserRole,
    adminGetAllPets,
    adminDeletePet,
    adminGetConversations,
    adminGetConversationMessages,
    adminDeleteMessage,
    backfillEmbeddings,
    listDeletedUserMatches,
    markDeletedUserMatchRead,
} from '../controllers/adminController.js';
import { adminListReports, adminUpdateReportStatus } from '../controllers/reportController.js';

const router = express.Router();

// Todas las rutas requieren autenticación + rol admin
router.use(authenticateToken, requireAdmin);

// Dashboard
router.get('/stats', getDashboardStats);

// Usuarios
router.get('/users', getAllUsers);
router.patch('/users/:id/role', validate(updateRoleSchema), updateUserRole);
router.delete('/users/:id', deleteUser);

// Mascotas / Reportes
router.get('/pets', adminGetAllPets);
router.delete('/pets/:id', adminDeletePet);

// Mensajes
router.get('/conversations', adminGetConversations);
router.get('/conversations/:pet_id/:user_a/:user_b', adminGetConversationMessages);
router.delete('/messages/:id', adminDeleteMessage);

// Mantenimiento
router.post('/backfill-embeddings', backfillEmbeddings);

// Alertas: matches de mascotas cuyos dueños se dieron de baja.
router.get('/deleted-user-matches', listDeletedUserMatches);
router.patch('/deleted-user-matches/:id/read', markDeletedUserMatchRead);

// Denuncias de usuarios/mensajes (trust & safety).
router.get('/reports', adminListReports);
router.patch('/reports/:id', adminUpdateReportStatus);

export default router;
