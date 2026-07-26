import express from 'express';
import {
    createReport,
    listMyBlocks,
    blockUser,
    unblockUser,
} from '../controllers/reportController.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = express.Router();

// Todas requieren auth (denunciar/bloquear es una acción de un user logueado).
router.use(authenticateToken);

router.post('/', createReport);
router.get('/blocks', listMyBlocks);
router.post('/blocks', blockUser);
router.delete('/blocks/:userId', unblockUser);

export default router;
