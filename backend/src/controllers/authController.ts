// backend/src/controllers/authController.ts
import { type Request, type Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Role, AccountStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { createNotification } from '../utils/notificationHelper';
import { pusher } from '../utils/pusher'; // ✅ GANTI getIO DENGAN PUSHER

interface RegisterRequestBody {
  username?: string;
  password?: string;
  name?: string;
  role?: Role;
  kelas?: number | string;
  gender?: string;
  nip?: string;
  subject?: string;
}

interface LoginRequestBody {
  username?: string;
  password?: string;
  role?: Role;
}

// Validasi NIP: 8 hingga 18 digit angka
const NIP_REGEX = /^[0-9]{8,18}$/;

export const register = async (
  req: Request<Record<string, never>, unknown, RegisterRequestBody>,
  res: Response,
): Promise<void> => {
  try {
    const { username, password, name, role, kelas, gender, nip, subject } = req.body;

    if (!username || !password || !name || !role) {
      res.status(400).json({
        message: 'Username, password, nama, dan role wajib diisi.',
      });
      return;
    }

    if (role !== Role.student && role !== Role.teacher) {
      res.status(400).json({
        message: 'Role tidak valid. Pilih student atau teacher.',
      });
      return;
    }

    const existingUser = await prisma.user.findUnique({
      where: { username: username.trim() },
    });
    if (existingUser) {
      res.status(400).json({
        message: 'Username sudah digunakan. Silakan pilih username lain.',
      });
      return;
    }

    // Lapisan keamanan: validasi format NIP untuk guru
    if (role === Role.teacher) {
      if (!nip || !NIP_REGEX.test(nip.trim())) {
        res.status(400).json({
          message: 'NIP harus berupa angka 8–18 digit. Cek kembali ya.',
        });
        return;
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const parsedKelas =
      role === Role.student && kelas !== undefined && kelas !== ''
        ? Number(kelas)
        : null;

    // Siswa langsung ACTIVE, Guru harus di-approve admin (PENDING)
    const status = role === Role.teacher ? AccountStatus.PENDING : AccountStatus.ACTIVE;

    const newUser = await prisma.user.create({
      data: {
        username: username.trim(),
        password: hashedPassword,
        name: name.trim(),
        role,
        status,
        kelas: parsedKelas !== null && !Number.isNaN(parsedKelas) ? parsedKelas : null,
        gender: role === Role.student ? (gender ?? null) : null,
        nip: role === Role.teacher ? (nip ?? null) : null,
        subject: role === Role.teacher ? (subject ?? null) : null,
      },
    });

    // ✅ Notifikasi ke semua admin saat guru baru mendaftar (MENGGUNAKAN PUSHER)
    if (role === Role.teacher) {
      try {
        const admins = await prisma.user.findMany({
          where: { role: Role.admin },
          select: { id: true },
        });
        
        for (const admin of admins) {
          const notif = await createNotification(
            admin.id,
            `Guru baru menunggu persetujuan: ${newUser.name}`,
            'chat', // Menggunakan tipe 'chat' sebagai notifikasi umum
          );
          
          if (notif) {
            // Trigger ke channel personal admin (sesuai dengan frontend: `user-${userId}`)
            await pusher.trigger(
              `user-${admin.id}`,       // Channel name
              'receive_notification',    // Event name
              notif                      // Data payload
            );
          }
        }
      } catch (notifErr) {
        console.error('Gagal membuat notifikasi admin via Pusher:', notifErr);
      }
    }

    const { password: _removedPassword, ...userWithoutPassword } = newUser;
    res.status(201).json({
      message: 'Registrasi berhasil.',
      user: userWithoutPassword,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Terjadi kesalahan pada server saat melakukan registrasi.',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const login = async (
  req: Request<Record<string, never>, unknown, LoginRequestBody>,
  res: Response,
): Promise<void> => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password) {
      res.status(400).json({ message: 'Username dan password wajib diisi.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { username: username.trim() },
    });
    if (!user) {
      res.status(400).json({ message: 'Username atau password salah.' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(400).json({ message: 'Username atau password salah.' });
      return;
    }

    // Validasi role yang dipilih di UI vs akun asli
    if (role && user.role !== role) {
      const expected = user.role === Role.student ? 'Siswa' : user.role === Role.admin ? 'Administrator' : 'Guru';
      res.status(403).json({
        message: `Akun ini terdaftar sebagai ${expected}. Silakan pilih tab "${expected}" untuk masuk ya. 😊`,
      });
      return;
    }

    // 🔒 Cek status akun sebelum memberikan akses
    if (user.status === AccountStatus.PENDING) {
      res.status(403).json({
        message: 'Akun guru kamu sedang menunggu persetujuan administrator. Silakan coba lagi nanti ya. 🙏',
      });
      return;
    }

    if (user.status === AccountStatus.REJECTED) {
      res.status(403).json({
        message: user.rejectReason
          ? `Akun guru kamu belum disetujui. Alasan: ${user.rejectReason}`
          : 'Akun guru kamu belum disetujui oleh administrator.',
      });
      return;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      res.status(500).json({ message: 'Konfigurasi JWT_SECRET belum diatur di server.' });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { isOnline: true },
    });

    try {
      await pusher.trigger('user-status', 'user_status_change', {
        userId: updatedUser.id,
        isOnline: true,
      });
    } catch (e) {
      console.error('Gagal broadcast status online:', e);
    }

    const token = jwt.sign(
      { id: updatedUser.id, role: updatedUser.role },
      secret,
      { expiresIn: '7d' },
    );

    const { password: _removedPassword, ...userWithoutPassword } = updatedUser;
    res.status(200).json({ message: 'Login berhasil.', token, user: userWithoutPassword });
  } catch (error) {
    res.status(500).json({
      message: 'Terjadi kesalahan pada server saat melakukan login.',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const presence = async (
  req: Request<Record<string, never>, unknown, { online?: boolean }>,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const online = req.body?.online ?? false;
    if (!userId) {
      res.status(401).json({ message: 'User tidak terautentikasi.' });
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { isOnline: online },
    });

    // Broadcast perubahan status ke semua yang mendengarkan channel 'user-status'
    await pusher.trigger('user-status', 'user_status_change', {
      userId,
      isOnline: online,
    });

    res.status(200).json({ message: 'Status diperbarui.' });
  } catch (error) {
    res.status(500).json({
      message: 'Gagal memperbarui status kehadiran.',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};