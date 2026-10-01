import { Router } from 'express';
import {
  authenticateLicense,
  authenticateHwid,
  authenticateUser,
  licenseAuthSchema,
  hwidAuthSchema,
  userAuthSchema,
} from '../controllers/clientAuth.controller.js';
import { clientAuthRateLimiter } from '../middleware/rateLimiter.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';

const router = Router();

router.post('/license/authenticate', clientAuthRateLimiter, validateBody(licenseAuthSchema), authenticateLicense);
router.post('/auth/license', clientAuthRateLimiter, validateBody(licenseAuthSchema), authenticateLicense);

router.post('/hwid/authenticate', clientAuthRateLimiter, validateBody(hwidAuthSchema), authenticateHwid);
router.post('/auth/hwid', clientAuthRateLimiter, validateBody(hwidAuthSchema), authenticateHwid);

router.post('/user/authenticate', clientAuthRateLimiter, validateBody(userAuthSchema), authenticateUser);
router.post('/auth/user', clientAuthRateLimiter, validateBody(userAuthSchema), authenticateUser);

export default router;
