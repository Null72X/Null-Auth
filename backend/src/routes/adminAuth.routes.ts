import { Router } from 'express';
import { login, logout, me, changePassword, loginSchema, changePasswordSchema } from '../controllers/adminAuth.controller.js';
import { requireAdminAuth } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { loginRateLimiter } from '../middleware/rateLimiter.middleware.js';

const router = Router();

router.post('/login', loginRateLimiter, validateBody(loginSchema), login);
router.get('/me', requireAdminAuth, me);
router.post('/logout', requireAdminAuth, logout);
router.put('/change-password', requireAdminAuth, validateBody(changePasswordSchema), changePassword);

export default router;
