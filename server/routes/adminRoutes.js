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
} from '../controllers/adminController.js';

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

export default router;
