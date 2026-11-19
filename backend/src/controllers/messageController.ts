// backend/src/controllers/messageController.ts
import { type Response } from 'express';
import { prisma } from '../config/prisma';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary';
import { createNotification } from '../utils/notificationHelper';
import { pusher } from '../utils/pusher';
import { type AuthRequest } from '../middleware/auth';

export const getMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;
    const userRole = req.user?.role;

    const hideField = userRole === 'teacher' ? 'hiddenByTeacher' : 'hiddenByStudent';
    const messages = await prisma.message.findMany({
      where: {
        chatRoomId: Number(roomId),
        [hideField]: false,
      },
      orderBy: { createdAt: 'asc' },
    });

    res.status(200).json({ messages });
  } catch (error) {
    res.status(500).json({
      message: 'Terjadi kesalahan pada server saat mengambil pesan.',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Helper: emit pesan ke chat room + notifikasi ke personal room lawan bicara
async function broadcastMessage(
  roomId: number,
  senderId: number,
  senderName: string,
  preview: string,
  messageData: any,
): Promise<void> {
  try {
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      select: { studentId: true, teacherId: true },
    });
    if (!room) return;

    const recipientId = senderId === room.studentId ? room.teacherId : room.studentId;

    // 1. Emit pesan ke chat room agar lawan bicara yang sedang di ChatRoomPage langsung terima
    await pusher.trigger(
  `room-${roomId}`,
  'receive_message',
  messageData
);

    // 2. Buat notifikasi dan emit ke personal room lawan bicara
    const notif = await createNotification(
      recipientId,
      `Pesan baru dari ${senderName}: "${preview}"`,
      'chat',
    );

    if (notif) {
      await pusher.trigger(
  `user-${recipientId}`,  // channel
  'receive_notification',  // event
  notif                    // data
);
    }
  } catch (error) {
    console.error('Gagal broadcast pesan:', error);
  }
}

export const sendTextMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'User tidak terautentikasi.' });
      return;
    }

    const { roomId, text } = req.body;
    if (!roomId || !text) {
      res.status(400).json({ message: 'Room ID dan teks pesan wajib disediakan.' });
      return;
    }

    const message = await prisma.message.create({
      data: { chatRoomId: Number(roomId), senderId: userId, text },
      include: { sender: { select: { name: true } } },
    });

    // Broadcast ke chat room + notifikasi ke lawan bicara
    await broadcastMessage(
      Number(roomId),
      userId,
      message.sender.name,
      text.slice(0, 40),
      message,
    );

    res.status(201).json({ message });
  } catch (error) {
    res.status(500).json({
      message: 'Terjadi kesalahan pada server saat mengirim pesan teks.',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const sendImageMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'User tidak terautentikasi.' });
      return;
    }
    if (!req.file) {
      res.status(400).json({ message: 'File gambar tidak ditemukan.' });
      return;
    }

    const { roomId } = req.body;
    if (!roomId) {
      res.status(400).json({ message: 'Room ID wajib disediakan.' });
      return;
    }

    const { url, publicId } = await uploadToCloudinary(req.file.buffer, 'chats');

    const message = await prisma.message.create({
      data: {
        chatRoomId: Number(roomId),
        senderId: userId,
        imageUrl: url,
        imagePublicId: publicId,
      },
      include: { sender: { select: { name: true } } },
    });

    // Broadcast ke chat room + notifikasi ke lawan bicara
    await broadcastMessage(
      Number(roomId),
      userId,
      message.sender.name,
      '📷 Foto',
      message,
    );

    res.status(201).json({ message });
  } catch (error) {
    res.status(500).json({
      message: 'Terjadi kesalahan pada server saat mengirim pesan gambar.',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// backend/src/controllers/messageController.ts
// Tambahkan fungsi ini di file yang sama

export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId || !userRole) {
      res.status(401).json({ message: 'User tidak terautentikasi.' });
      return;
    }

    // Tandai semua pesan di room ini sebagai sudah dibaca
    // Untuk guru: tandai pesan dari siswa
    // Untuk siswa: tandai pesan dari guru
    const room = await prisma.chatRoom.findUnique({
      where: { id: Number(roomId) },
      select: { studentId: true, teacherId: true },
    });

    if (!room) {
      res.status(404).json({ message: 'Room tidak ditemukan.' });
      return;
    }

    const senderId = userRole === 'teacher' ? room.studentId : room.teacherId;

    await prisma.message.updateMany({
      where: {
        chatRoomId: Number(roomId),
        senderId: senderId,
        isRead: false,
      },
      data: { isRead: true },
    });

    res.status(200).json({ message: 'Pesan ditandai sebagai sudah dibaca.' });
  } catch (error) {
    res.status(500).json({
      message: 'Terjadi kesalahan pada server.',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const deleteMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { messageId } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId || !userRole) {
      res.status(401).json({ message: 'User tidak terautentikasi.' });
      return;
    }

    const message = await prisma.message.findUnique({
      where: { id: Number(messageId) },
    });
    if (!message) {
      res.status(404).json({ message: 'Pesan tidak ditemukan.' });
      return;
    }

    const hideField = userRole === 'teacher' ? 'hiddenByTeacher' : 'hiddenByStudent';
    await prisma.message.update({
      where: { id: Number(messageId) },
      data: { [hideField]: true },
    });

    res.status(200).json({ message: 'Pesan berhasil dihapus dari sisi Anda.' });
  } catch (error) {
    res.status(500).json({
      message: 'Terjadi kesalahan pada server saat menghapus pesan.',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};