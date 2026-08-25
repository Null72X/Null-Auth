import { Router } from 'express';
import adminAuthRoutes from './adminAuth.routes.js';
import appsRoutes from './apps.routes.js';
import licensesRoutes from './licenses.routes.js';
import hwidRoutes from './hwid.routes.js';
import logsRoutes from './logs.routes.js';
import clientAuthRoutes from './clientAuth.routes.js';

const router = Router();

// Version 1 API Base Routes
router.use('/admin/auth', adminAuthRoutes);
router.use('/admin/apps', appsRoutes);
router.use('/admin/licenses', licensesRoutes);
router.use('/admin/hwid', hwidRoutes);
router.use('/admin/logs', logsRoutes);
router.use('/client', clientAuthRoutes);

export default router;
