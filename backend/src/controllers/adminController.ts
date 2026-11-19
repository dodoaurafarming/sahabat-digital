// backend/src/controllers/adminController.ts
import { type Response } from 'express';
import { AccountStatus, Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { type AuthRequest } from '../middleware/auth';

export const getPendingTeachers = async (
  _req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const teachers = await prisma.user.findMany({
      where: { role: Role.teacher, status: AccountStatus.PENDING },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        username: true,
        nip: true,
        subject: true,
        createdAt: true,
      },
    });
    console.log(`[admin] Guru pending ditemukan: ${teachers.length}`);
    res.status(200).json({ teachers });
  } catch (error) {
    console.error('[admin] Gagal ambil guru pending:', error);
    res.status(500).json({
      message: 'Gagal mengambil daftar guru pending.',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const approveTeacher = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const teacher = await prisma.user.findUnique({ where: { id: Number(id) } });
    if (!teacher || teacher.role !== Role.teacher) {
      res.status(404).json({ message: 'Guru tidak ditemukan.' });
      return;
    }
    const updated = await prisma.user.update({
      where: { id: Number(id) },
      data: { status: AccountStatus.ACTIVE, rejectReason: null },
      select: { id: true, name: true },
    });
    res.status(200).json({ message: 'Guru berhasil disetujui.', teacher: updated });
  } catch (error) {
    res.status(500).json({
      message: 'Gagal menyetujui guru.',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const rejectTeacher = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body as { reason?: string };
    const teacher = await prisma.user.findUnique({ where: { id: Number(id) } });
    if (!teacher || teacher.role !== Role.teacher) {
      res.status(404).json({ message: 'Guru tidak ditemukan.' });
      return;
    }
    const updated = await prisma.user.update({
      where: { id: Number(id) },
      data: {
        status: AccountStatus.REJECTED,
        rejectReason: reason?.trim() || 'Verifikasi identitas guru tidak berhasil.',
      },
      select: { id: true, name: true },
    });
    res.status(200).json({ message: 'Guru ditolak.', teacher: updated });
  } catch (error) {
    res.status(500).json({
      message: 'Gagal menolak guru.',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};