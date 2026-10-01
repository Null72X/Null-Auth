import { Router } from 'express';
import {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  toggleUserStatus,
  extendUser,
  resetUserHwid,
  deleteUser,
  bulkUserActions,
  createUserSchema,
  updateUserSchema,
  extendUserSchema,
  setUserHwidSchema,
  bulkUserActionSchema,
} from '../controllers/users.controller.js';
import { requireAdminAuth } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';

const router = Router();

router.use(requireAdminAuth);

router.get('/', listUsers);
router.get('/:id', getUserById);
router.post('/', validateBody(createUserSchema), createUser);
router.patch('/:id', validateBody(updateUserSchema), updateUser);
router.put('/:id', validateBody(updateUserSchema), updateUser);
router.patch('/:id/status', toggleUserStatus);
router.post('/:id/extend', validateBody(extendUserSchema), extendUser);
router.post('/:id/reset-hwid', validateBody(setUserHwidSchema), resetUserHwid);
router.delete('/:id', deleteUser);
router.post('/bulk-action', validateBody(bulkUserActionSchema), bulkUserActions);

export default router;
