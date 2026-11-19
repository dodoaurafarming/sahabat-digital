import type { SDClass, UserSession } from '../types';

export function canAccessCurhat(session: UserSession): boolean {
  if (session.role !== 'student' || !session.kelas) return false;
  return session.kelas >= 3;
}

export function getClassAccessLabel(kelas?: SDClass): string {
  if (!kelas) return 'Belum login';
  return kelas >= 3
    ? `Kelas ${kelas} — Akses Penuh (Materi, Quiz, Curhat & Feedback Guru)`
    : `Kelas ${kelas} — Akses Materi & Quiz (Curhat dibatasi untuk Kelas 3–6)`;
}