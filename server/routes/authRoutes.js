import express from 'express';
import {
    register, login, deleteAccount, forgotPassword, resetPassword,
    verifyEmail, resendVerification,
} from '../controllers/authController.js';
import {
    loginWithGoogle,
    loginWithApple,
    loginWithFacebook,
    linkGoogle,
    linkApple,
    linkFacebook,
    listOAuthLinks,
    unlinkOAuthProvider,
} from '../controllers/oauthController.js';
import { authenticateToken } from '../middlewares/auth.js';
import { authLimiter } from '../middlewares/rateLimiter.js';
import validate from '../middlewares/validate.js';
import {
    registerSchema,
    loginSchema,
    googleLoginSchema,
    appleLoginSchema,
    facebookLoginSchema,
    linkGoogleSchema,
    linkAppleSchema,
    linkFacebookSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    verifyEmailSchema,
    resendVerificationSchema,
} from '../schemas/authSchemas.js';

const router = express.Router();

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/google', authLimiter, validate(googleLoginSchema), loginWithGoogle);
router.post('/apple', authLimiter, validate(appleLoginSchema), loginWithApple);
router.post('/facebook', authLimiter, validate(facebookLoginSchema), loginWithFacebook);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), resetPassword);
router.post('/verify-email', authLimiter, validate(verifyEmailSchema), verifyEmail);
router.post('/resend-verification', authLimiter, validate(resendVerificationSchema), resendVerification);
router.delete('/me', authenticateToken, deleteAccount);

// OAuth link/unlink desde el perfil (requiere JWT).
router.get('/links', authenticateToken, listOAuthLinks);
router.post('/link/google', authenticateToken, validate(linkGoogleSchema), linkGoogle);
router.post('/link/apple', authenticateToken, validate(linkAppleSchema), linkApple);
router.post('/link/facebook', authenticateToken, validate(linkFacebookSchema), linkFacebook);
router.delete('/link/:provider', authenticateToken, unlinkOAuthProvider);

export default router;
