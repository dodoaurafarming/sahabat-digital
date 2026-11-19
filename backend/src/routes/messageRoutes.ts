// backend/src/routes/messageRoutes.ts
import { Router } from 'express';
import multer from 'multer';
import { verifyToken } from '../middleware/auth';
import { getMessages, sendTextMessage, sendImageMessage, deleteMessage, markAsRead } from '../controllers/messageController';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/:roomId', verifyToken, getMessages);
router.post('/text', verifyToken, sendTextMessage);
router.post('/image', verifyToken, upload.single('image'), sendImageMessage);
router.delete('/:messageId', verifyToken, deleteMessage);
router.patch('/:roomId/read', verifyToken, markAsRead); // BARU

export default router;