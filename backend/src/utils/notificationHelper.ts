// backend/src/utils/notificationHelper.ts
import { prisma } from '../config/prisma';
import { NotificationType } from '@prisma/client';

export async function createNotification(
  userId: number,
  title: string,
  type: 'chat' | 'material',
) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        type: type as NotificationType,
      },
    });
    return notification;
  } catch (error) {
    console.error('Gagal membuat notifikasi:', error);
    return null;
  }
}