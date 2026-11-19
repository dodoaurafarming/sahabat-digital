// backend/src/middleware/auth.ts
import { type Request, type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { type Role } from '@prisma/client';

export interface AuthPayload {
  id: number;
  role: Role;
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export const verifyToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Akses ditolak. Token tidak ditemukan.' });
      return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      res.status(401).json({ message: 'Akses ditolak. Token tidak ditemukan.' });
      return;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      res.status(500).json({ message: 'Konfigurasi JWT_SECRET belum diatur di server.' });
      return;
    }

    try {
      const decoded = jwt.verify(token, secret) as AuthPayload;
      req.user = {
        id: decoded.id,
        role: decoded.role,
      };
      next();
    } catch {
      res.status(403).json({ message: 'Token tidak valid atau telah kedaluwarsa.' });
    }
  } catch (error) {
    res.status(500).json({
      message: 'Terjadi kesalahan pada server saat memverifikasi token.',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Middleware khusus untuk memastikan user adalah admin
export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ message: 'Akses khusus administrator.' });
    return;
  }
  next();
};