import { Router } from 'express';
import {
  authenticateLicense,
  authenticateHwid,
  licenseAuthSchema,
  hwidAuthSchema,
} from '../controllers/clientAuth.controller.js';
import { clientAuthRateLimiter } from '../middleware/rateLimiter.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';

const router = Router();

router.post('/license/authenticate', clientAuthRateLimiter, validateBody(licenseAuthSchema), authenticateLicense);
router.post('/hwid/authenticate', clientAuthRateLimiter, validateBody(hwidAuthSchema), authenticateHwid);

export default router;
