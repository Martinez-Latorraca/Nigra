import express from 'express';
import { register, login, deleteAccount, forgotPassword, resetPassword } from '../controllers/authController.js';
import { loginWithGoogle, loginWithApple, loginWithFacebook } from '../controllers/oauthController.js';
import { authenticateToken } from '../middlewares/auth.js';
import { authLimiter } from '../middlewares/rateLimiter.js';
import validate from '../middlewares/validate.js';
import {
    registerSchema,
    loginSchema,
    googleLoginSchema,
    appleLoginSchema,
    facebookLoginSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
} from '../schemas/authSchemas.js';

const router = express.Router();

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/google', authLimiter, validate(googleLoginSchema), loginWithGoogle);
router.post('/apple', authLimiter, validate(appleLoginSchema), loginWithApple);
router.post('/facebook', authLimiter, validate(facebookLoginSchema), loginWithFacebook);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), resetPassword);
router.delete('/me', authenticateToken, deleteAccount);

export default router;