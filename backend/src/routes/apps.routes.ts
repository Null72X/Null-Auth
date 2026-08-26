import { Router } from 'express';
import {
  listApps,
  getAppById,
  createApp,
  updateAppName,
  updateAppVersion,
  toggleAppStatus,
  toggleFreeTrial,
  regenerateSecret,
  deleteApp,
  createAppSchema,
  updateAppNameSchema,
  updateAppVersionSchema,
  updateAppStatusSchema,
  updateFreeTrialSchema,
} from '../controllers/apps.controller.js';
import { requireAdminAuth } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';

const router = Router();

router.use(requireAdminAuth);

router.get('/', listApps);
router.get('/:id', getAppById);
router.post('/', validateBody(createAppSchema), createApp);
router.patch('/:id/name', validateBody(updateAppNameSchema), updateAppName);
router.patch('/:id/version', validateBody(updateAppVersionSchema), updateAppVersion);
router.patch('/:id/status', validateBody(updateAppStatusSchema), toggleAppStatus);
router.patch('/:id/free-trial', validateBody(updateFreeTrialSchema), toggleFreeTrial);
router.post('/:id/regenerate-secret', regenerateSecret);
router.delete('/:id', deleteApp);

export default router;
