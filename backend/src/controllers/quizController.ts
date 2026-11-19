// backend/src/controllers/quizController.ts
import { type Response } from 'express';
import { prisma } from '../config/prisma';
import { type AuthRequest } from '../middleware/auth';

interface SaveScoreBody {
  score?: number;
  totalQuestions?: number;
}

export const saveScore = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      res.status(401).json({ message: 'User tidak terautentikasi.' });
      return;
    }

    if (userRole !== 'student') {
      res.status(403).json({ message: 'Akses ditolak. Hanya siswa yang dapat menyimpan skor kuis.' });
      return;
    }

    const { score, totalQuestions = 10 } = req.body as SaveScoreBody;

    if (score === undefined || score === null || typeof score !== 'number') {
      res.status(400).json({ message: 'Skor (score) wajib diisi dan harus berupa angka.' });
      return;
    }

    const newScore = await prisma.quizScore.create({
      data: {
        studentId: userId,
        score,
        totalQuestions,
      },
    });

    res.status(201).json({ message: 'Skor berhasil disimpan.', score: newScore });
  } catch (error) {
    res.status(500).json({
      message: 'Terjadi kesalahan pada server saat menyimpan skor.',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const getScores = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      res.status(401).json({ message: 'User tidak terautentikasi.' });
      return;
    }

    if (userRole !== 'student') {
      res.status(403).json({ message: 'Akses ditolak. Hanya siswa yang dapat melihat riwayat skor.' });
      return;
    }

    const scores = await prisma.quizScore.findMany({
      where: { studentId: userId },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ scores });
  } catch (error) {
    res.status(500).json({
      message: 'Terjadi kesalahan pada server saat mengambil riwayat skor.',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};