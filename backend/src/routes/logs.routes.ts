import { Router } from 'express';
import { listActivityLogs, getDashboardStats } from '../controllers/logs.controller.js';
import { requireAdminAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAdminAuth);

router.get('/', listActivityLogs);
router.get('/stats', getDashboardStats);

export default router;
