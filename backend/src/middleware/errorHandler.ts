// backend/src/middleware/errorHandler.ts
import { type Request, type Response, type NextFunction } from 'express';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  console.error('[Global Error Handler]:', err);

  let statusCode = 500;
  let message = 'Terjadi kesalahan internal pada server.';
  let errorDetails: any = process.env.NODE_ENV === 'development' ? err.message : undefined;

  if (err instanceof PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      statusCode = 400;
      message = 'Data dengan nilai unik tersebut sudah ada.';
    } else if (err.code === 'P2025') {
      statusCode = 404;
      message = 'Data tidak ditemukan.';
    }
  } else if (err.name === 'ValidationError' || err.statusCode === 400) {
    statusCode = 400;
    message = err.message || 'Permintaan tidak valid.';
  } else if (err.name === 'UnauthorizedError' || err.statusCode === 401) {
    statusCode = 401;
    message = 'Akses tidak diizinkan. Silakan login.';
  }

  res.status(statusCode).json({
    success: false,
    message,
    error: errorDetails,
  });
};