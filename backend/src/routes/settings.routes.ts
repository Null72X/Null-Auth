import { Router } from 'express';
import { getSettings, updateWebhookSettings, testWebhook } from '../controllers/settings.controller.js';
import { requireAdminAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAdminAuth);

router.get('/', getSettings);
router.post('/webhook', updateWebhookSettings);
router.post('/webhook/test', testWebhook);

export default router;
