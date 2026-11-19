// backend/src/index.ts
import express, { type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { prisma } from './config/prisma';

// Import Routes
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import chatRoutes from './routes/chatRoutes';
import messageRoutes from './routes/messageRoutes';
import notificationRoutes from './routes/notificationRoutes';
import quizRoutes from './routes/quizRoutes';
import adminRoutes from './routes/adminRoutes';

// Import Middleware
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Middleware
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/quiz', quizRoutes);

// ✅ VALIDASI: kalau adminRoutes undefined, tampilkan pesan jelas
if (!adminRoutes) {
  console.error(
    '❌ adminRoutes is undefined!\n' +
      '   → Pastikan file "backend/src/routes/adminRoutes.ts" ADA.\n' +
      '   → Pastikan di dalamnya ada "export default router;" di baris terakhir.',
  );
} else {
  app.use('/api/admin', adminRoutes);
  console.log('✅ Route /api/admin/* terdaftar (teachers/pending, approve, reject).');
}

// Health Check
app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ success: true, status: 'OK', database: 'Connected' });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'ERROR',
      database: 'Disconnected',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Error Handler (harus di paling bawah)
app.use(errorHandler);

// ✅ Jalankan server hanya jika bukan di environment Vercel (Vercel menangani server secara otomatis)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Server Sahabat Digital berjalan di http://localhost:${PORT}`);
    console.log('✅ Real-time menggunakan Pusher (Socket.io telah dihapus).');
  });
}

// ✅ Export default app untuk deployment serverless (Vercel)
export default app;