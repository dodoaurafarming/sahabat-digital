// backend/src/routes/adminRoutes.ts
import { Router } from 'express';
import { verifyToken, requireAdmin } from '../middleware/auth';
import {
  getPendingTeachers,
  approveTeacher,
  rejectTeacher,
} from '../controllers/adminController';

const router = Router();

router.get('/teachers/pending', verifyToken, requireAdmin, getPendingTeachers);
router.patch('/teachers/:id/approve', verifyToken, requireAdmin, approveTeacher);
router.patch('/teachers/:id/reject', verifyToken, requireAdmin, rejectTeacher);

export default router; // ⚠️ WAJIB