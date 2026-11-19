// backend/src/controllers/notificationController.ts
import { type Response } from 'express';
import { prisma } from '../config/prisma';
import { type AuthRequest } from '../middleware/auth';

export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'User tidak terautentikasi.' });
      return;
    }

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ notifications });
  } catch (error) {
    res.status(500).json({
      message: 'Terjadi kesalahan pada server saat mengambil notifikasi.',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'User tidak terautentikasi.' });
      return;
    }

    const { id } = req.params;
    const notificationId = Number(id);

    const updatedNotification = await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });

    if (updatedNotification.count === 0) {
      res.status(404).json({ message: 'Notifikasi tidak ditemukan atau bukan milik Anda.' });
      return;
    }

    res.status(200).json({ message: 'Notifikasi berhasil ditandai sebagai telah dibaca.' });
  } catch (error) {
    res.status(500).json({
      message: 'Terjadi kesalahan pada server saat memperbarui notifikasi.',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const markAllAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'User tidak terautentikasi.' });
      return;
    }

    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    res.status(200).json({ message: 'Semua notifikasi berhasil ditandai sebagai telah dibaca.' });
  } catch (error) {
    res.status(500).json({
      message: 'Terjadi kesalahan pada server saat memperbarui semua notifikasi.',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};