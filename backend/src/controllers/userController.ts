// backend/src/controllers/userController.ts
import { type Response } from 'express';
import bcrypt from 'bcrypt';
import { Prisma, Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary';
import { type AuthRequest } from '../middleware/auth';

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'User tidak terautentikasi.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        avatarUrl: true,
        isOnline: true,
        kelas: true,
        gender: true,
        frameColor: true,
        nip: true,
        subject: true,
        colorTheme: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ message: 'User tidak ditemukan.' });
      return;
    }

    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({
      message: 'Terjadi kesalahan pada server saat mengambil profil.',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

interface UpdateProfileBody {
  name?: string;
  password?: string;
  frameColor?: string;
  colorTheme?: string;
}

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'User tidak terautentikasi.' });
      return;
    }

    const { name, password, frameColor, colorTheme } = req.body as UpdateProfileBody;
    const updateData: Prisma.UserUpdateInput = {};

    if (name) updateData.name = name.trim();
    if (frameColor) updateData.frameColor = frameColor;
    if (colorTheme) updateData.colorTheme = colorTheme;

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        avatarUrl: true,
        isOnline: true,
        kelas: true,
        gender: true,
        frameColor: true,
        nip: true,
        subject: true,
        colorTheme: true,
      },
    });

    res.status(200).json({ message: 'Profil berhasil diperbarui.', user: updatedUser });
  } catch (error) {
    res.status(500).json({
      message: 'Terjadi kesalahan pada server saat memperbarui profil.',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const uploadAvatar = async (req: AuthRequest, res: Response): Promise<void> => {
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

    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!currentUser) {
      res.status(404).json({ message: 'User tidak ditemukan.' });
      return;
    }

    const { url, publicId } = await uploadToCloudinary(req.file.buffer, 'avatars');

    if (currentUser.avatarPublicId) {
      await deleteFromCloudinary(currentUser.avatarPublicId);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: url, avatarPublicId: publicId },
      select: { id: true, avatarUrl: true, avatarPublicId: true },
    });

    res.status(200).json({
      message: 'Avatar berhasil diperbarui.',
      avatarUrl: updatedUser.avatarUrl,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Terjadi kesalahan pada server saat mengunggah avatar.',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const getTeachers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const teachers = await prisma.user.findMany({
      where: { role: Role.teacher },
      select: {
        id: true,
        name: true,
        subject: true,
        isOnline: true,
        avatarUrl: true,
        colorTheme: true,
      },
    });

    res.status(200).json({ teachers });
  } catch (error) {
    res.status(500).json({
      message: 'Terjadi kesalahan pada server saat mengambil daftar guru.',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};