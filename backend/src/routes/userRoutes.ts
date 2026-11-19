// backend/src/routes/userRoutes.ts
import { Router } from 'express';
import multer from 'multer';
import { verifyToken } from '../middleware/auth';
import { getProfile, updateProfile, uploadAvatar, getTeachers } from '../controllers/userController';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/profile', verifyToken, getProfile);
router.put('/profile', verifyToken, updateProfile);
router.post('/avatar', verifyToken, upload.single('avatar'), uploadAvatar);
router.get('/teachers', verifyToken, getTeachers);

export default router;