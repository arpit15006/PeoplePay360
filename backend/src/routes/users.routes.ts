import { Router } from 'express';
import { Role } from '@prisma/client';

import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
} from '../controllers/users.controller';

const router = Router();

// User management is Admin only: the PRD grants role assignment and permission
// updates to Admin alone, and every other role is defined without it.
router.use(authenticate);
router.use(authorize(Role.ADMIN));

router.get('/', listUsers);
router.get('/:id', getUser);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;
