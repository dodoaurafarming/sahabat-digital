// backend/src/routes/chatRoutes.ts
import { Router } from 'express';
import { verifyToken } from '../middleware/auth';
import { getRooms, createOrGetRoom, updateTheme, hideAllMessages, hideRoom } from '../controllers/chatRoomController';

const router = Router();

router.get('/', verifyToken, getRooms);
router.post('/', verifyToken, createOrGetRoom);
router.patch('/:roomId/theme', verifyToken, updateTheme);
router.post('/:roomId/hide-all', verifyToken, hideAllMessages);
router.post('/:roomId/hide', verifyToken, hideRoom); // BARU

export default router;