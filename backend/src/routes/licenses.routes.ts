import { Router } from 'express';
import {
  listLicenses,
  getLicenseById,
  generateLicenses,
  updateLicense,
  toggleLicenseStatus,
  extendLicense,
  resetLicenseHwid,
  deleteLicense,
  bulkLicenseActions,
  generateLicenseSchema,
  updateLicenseSchema,
  extendLicenseSchema,
  setLicenseHwidSchema,
  bulkActionSchema,
} from '../controllers/licenses.controller.js';
import { requireAdminAuth } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';

const router = Router();

router.use(requireAdminAuth);

router.get('/', listLicenses);
router.get('/:id', getLicenseById);
router.post('/generate', validateBody(generateLicenseSchema), generateLicenses);
router.patch('/:id', validateBody(updateLicenseSchema), updateLicense);
router.patch('/:id/status', toggleLicenseStatus);
router.post('/:id/extend', validateBody(extendLicenseSchema), extendLicense);
router.post('/:id/reset-hwid', validateBody(setLicenseHwidSchema), resetLicenseHwid);
router.delete('/:id', deleteLicense);
router.post('/bulk-action', validateBody(bulkActionSchema), bulkLicenseActions);

export default router;
