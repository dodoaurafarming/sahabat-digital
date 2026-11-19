// backend/src/routes/quizRoutes.ts
import { Router } from 'express';
import { verifyToken } from '../middleware/auth';
import { saveScore, getScores } from '../controllers/quizController';

const router = Router();

router.post('/', verifyToken, saveScore);
router.get('/', verifyToken, getScores);

export default router;