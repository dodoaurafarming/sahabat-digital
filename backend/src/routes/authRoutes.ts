// backend/src/routes/authRoutes.ts
import { Router } from 'express';
import { register, login, presence } from '../controllers/authController';
import { verifyToken } from '../middleware/auth'; // ✅ TAMBAHKAN IMPORT INI

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/presence', verifyToken, presence); 

export default router;