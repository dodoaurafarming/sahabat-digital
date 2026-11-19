// backend/src/controllers/chatRoomController.ts
import { type Response } from 'express';
import { prisma } from '../config/prisma';
import { deleteMultipleFromCloudinary } from '../utils/cloudinary';
import { type AuthRequest } from '../middleware/auth';

export const getRooms = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    if (!userId || !userRole) {
      res.status(401).json({ message: 'User tidak terautentikasi.' });
      return;
    }

    const hideFilter = userRole === 'teacher' ? { hiddenByTeacher: false } : { hiddenByStudent: false };
    const messageHideFilter = userRole === 'teacher' ? { hiddenByTeacher: false } : { hiddenByStudent: false };

    const rooms = await prisma.chatRoom.findMany({
      where: {
        OR: [{ studentId: userId }, { teacherId: userId }],
        ...hideFilter, // BARU: Filter room yang di-hidden
      },
      include: {
        student: { select: { id: true, name: true, avatarUrl: true, isOnline: true, role: true, kelas: true, frameColor: true } },
        teacher: { select: { id: true, name: true, avatarUrl: true, isOnline: true, role: true, subject: true, colorTheme: true } },
        messages: {
          where: messageHideFilter,
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, text: true, imageUrl: true, createdAt: true, senderId: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const roomsWithUnread = await Promise.all(
      rooms.map(async (room) => {
        const senderId = userRole === 'teacher' ? room.studentId : room.teacherId;
        const unreadCount = await prisma.message.count({
          where: {
            chatRoomId: room.id,
            senderId: senderId,
            isRead: false,
            ...messageHideFilter,
          },
        });
        return { ...room, unreadCount };
      })
    );

    res.status(200).json({ rooms: roomsWithUnread });
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan pada server.', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const createOrGetRoom = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    if (!userId || !userRole) {
      res.status(401).json({ message: 'User tidak terautentikasi.' });
      return;
    }

    if (userRole === 'student') {
      const student = await prisma.user.findUnique({ 
        where: { id: userId }, 
        select: { kelas: true } 
      });
      
      if (student && student.kelas && student.kelas < 4) {
        res.status(400).json({
          message: "Halo adik-adik! 👋 Fitur Ruang Curhat ini khusus untuk kakak-kakak kelas 4, 5, dan 6 ya. Kalau kamu kelas 1, 2, atau 3, jangan khawatir! Kamu tetap bisa cerita langsung ke Bapak/Ibu Guru di kelas atau ke orang tua di rumah. Semangat belajarnya! 🌟"
        });
        return;
      }
    }

    const { teacherId, studentId } = req.body;
    const targetStudentId = userRole === 'teacher' ? Number(studentId) : Number(userId);
    const targetTeacherId = userRole === 'student' ? Number(teacherId) : Number(userId);

    if (!targetStudentId || Number.isNaN(targetStudentId) || !targetTeacherId || Number.isNaN(targetTeacherId)) {
      res.status(400).json({ message: 'ID siswa dan guru wajib valid (angka).' });
      return;
    }

    let room = await prisma.chatRoom.findFirst({
      where: { studentId: targetStudentId, teacherId: targetTeacherId },
      include: {
        student: { select: { id: true, name: true, avatarUrl: true, isOnline: true, role: true, kelas: true } },
        teacher: { select: { id: true, name: true, avatarUrl: true, isOnline: true, role: true, subject: true } },
      },
    });

    if (!room) {
      try {
        room = await prisma.chatRoom.create({
          data: { studentId: targetStudentId, teacherId: targetTeacherId },
          include: {
            student: { select: { id: true, name: true, avatarUrl: true, isOnline: true, role: true, kelas: true } },
            teacher: { select: { id: true, name: true, avatarUrl: true, isOnline: true, role: true, subject: true } },
          },
        });
      } catch (createError: any) {
        if (createError?.code === 'P2002') {
          room = await prisma.chatRoom.findFirst({
            where: { studentId: targetStudentId, teacherId: targetTeacherId },
            include: {
              student: { select: { id: true, name: true, avatarUrl: true, isOnline: true, role: true, kelas: true } },
              teacher: { select: { id: true, name: true, avatarUrl: true, isOnline: true, role: true, subject: true } },
            },
          });
        } else {
          throw createError;
        }
      }
    }

    if (!room) {
      res.status(500).json({ message: 'Gagal mengambil atau membuat ruang obrolan.' });
      return;
    }

    res.status(200).json({ room });
  } catch (error) {
    console.error('[createOrGetRoom] ERROR:', error);
    res.status(500).json({
      message: 'Terjadi kesalahan pada server saat membuat atau mengambil ruang obrolan.',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const hideRoom = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;
    const userRole = req.user?.role;

    if (!userRole) {
      res.status(401).json({ message: 'User tidak terautentikasi.' });
      return;
    }

    const hideField = userRole === 'teacher' ? 'hiddenByTeacher' : 'hiddenByStudent';
    
    await prisma.chatRoom.update({
      where: { id: Number(roomId) },
      data: { [hideField]: true },
    });

    res.status(200).json({ message: 'Obrolan berhasil dihapus dari inbox Anda.' });
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan pada server.', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const updateTheme = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;
    const { theme } = req.body;

    if (!theme) {
      res.status(400).json({ message: 'Tema wajib disediakan.' });
      return;
    }

    const updatedRoom = await prisma.chatRoom.update({
      where: { id: Number(roomId) },
      data: { theme },
    });

    res.status(200).json({ message: 'Tema berhasil diperbarui.', room: updatedRoom });
  } catch (error) {
    res.status(500).json({
      message: 'Terjadi kesalahan pada server saat memperbarui tema.',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const hideAllMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const { roomId } = req.params;

    if (!userId || !userRole) {
      res.status(401).json({ message: 'User tidak terautentikasi.' });
      return;
    }

    const hideField = userRole === 'teacher' ? 'hiddenByTeacher' : 'hiddenByStudent';
    await prisma.message.updateMany({
      where: { chatRoomId: Number(roomId) },
      data: { [hideField]: true },
    });

    res.status(200).json({ message: 'Obrolan berhasil dibersihkan dari sisi Anda.' });
  } catch (error) {
    res.status(500).json({
      message: 'Terjadi kesalahan pada server saat membersihkan obrolan.',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};