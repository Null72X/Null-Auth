import { Router } from 'express';
import {
  listHwidEntries,
  getHwidById,
  addHwidEntry,
  updateHwidEntry,
  toggleHwidStatus,
  extendHwid,
  deleteHwidEntry,
  addHwidSchema,
  updateHwidSchema,
  extendHwidSchema,
} from '../controllers/hwid.controller.js';
import { requireAdminAuth } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';

const router = Router();

router.use(requireAdminAuth);

router.get('/', listHwidEntries);
router.get('/:id', getHwidById);
router.post('/', validateBody(addHwidSchema), addHwidEntry);
router.patch('/:id', validateBody(updateHwidSchema), updateHwidEntry);
router.patch('/:id/status', toggleHwidStatus);
router.post('/:id/extend', validateBody(extendHwidSchema), extendHwid);
router.delete('/:id', deleteHwidEntry);

export default router;
