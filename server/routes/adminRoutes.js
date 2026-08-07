import express from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import { requireAdmin } from '../middlewares/adminAuth.js';
import validate from '../middlewares/validate.js';
import { updateRoleSchema, setAccountTypeSchema } from '../schemas/adminSchemas.js';
import {
    getDashboardStats,
    getMatchStats,
    getAllUsers,
    deleteUser,
    updateUserRole,
    setUserAccountType,
    banUser,
    adminGetAllPets,
    adminDeletePet,
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
router.get('/match-stats', getMatchStats);

// Usuarios
router.get('/users', getAllUsers);
router.patch('/users/:id/role', validate(updateRoleSchema), updateUserRole);
// Convertir a veterinaria/refugio — salida manual para las cuentas creadas con
// OAuth, donde el account_type del formulario de registro no existe.
router.patch('/users/:id/account-type', validate(setAccountTypeSchema), setUserAccountType);
// Expulsión por moderación: soft delete + veto del email para que no pueda
// volver a registrarse ni entrar con login social.
router.post('/users/:id/ban', banUser);
router.delete('/users/:id', deleteUser);

// Mascotas / Reportes
router.get('/pets', adminGetAllPets);
router.delete('/pets/:id', adminDeletePet);

// Mensajes — moderación puntual desde una denuncia. NO hay browse-all de
// conversaciones (se quitó por privacidad: era vigilancia general de DMs).
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
