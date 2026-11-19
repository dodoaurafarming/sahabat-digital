// src/pages/CurhatStudentPage.tsx
import { useState, useEffect } from 'react';
import { TeacherCard } from '../components/curhat/TeacherCard';
import api from '../utils/api';
import { pusherClient } from '../utils/pusherClient'; // ✅ tambah import

export interface ChatTeacherInfo {
  id: string;
  name: string;
  subject: string;
  isOnline: boolean;
  colorTheme: string;
  avatarSrc?: string;
}

interface CurhatStudentPageProps {
  currentUser: any;
  onBackHome: () => void;
  onOpenChat: (roomId: number, teacher: ChatTeacherInfo) => void;
}

interface Teacher {
  id: number;
  name: string;
  subject: string;
  isOnline: boolean;
  colorTheme: string;
  avatarUrl?: string;
}

export function CurhatStudentPage({ currentUser, onBackHome, onOpenChat }: CurhatStudentPageProps) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Cek pembatasan kelas
  const isRestricted = currentUser?.role === 'student' && currentUser?.kelas && currentUser.kelas < 4;

  // Jika dibatasi, tampilkan halaman pesan ramah dan HENTIKAN eksekusi di sini
  if (isRestricted) {
    return (
      <div className="relative flex min-h-[calc(100vh-80px)] w-full items-center justify-center overflow-hidden bg-[#F3F8FC] py-10 sm:py-16">
        <div aria-hidden="true" className="pointer-events-none absolute -top-20 -left-20 h-80 w-80 rounded-full bg-[#00B5D8]/20 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute top-1/3 -right-24 h-96 w-96 rounded-full bg-[#7BB642]/20 blur-3xl" />
        <div className="relative z-10 mx-auto max-w-2xl px-4 text-center">
          <div className="rounded-[2.5rem] bg-white p-8 shadow-xl sm:p-12">
            <div className="mb-6 text-7xl">🌟</div>
            <h1 className="font-playful text-3xl font-bold text-[#2B569A] sm:text-4xl">Halo, Adik-adik Hebat! 👋</h1>
            <p className="font-clean mt-6 text-lg leading-relaxed text-slate-600">
              Fitur <span className="font-bold text-[#00B5D8]">Ruang Curhat</span> khusus untuk kakak-kakak{' '}
              <span className="font-bold">kelas 4, 5, dan 6</span> ya.
            </p>
            <p className="font-clean mt-4 text-base leading-relaxed text-slate-500">
              Kalau kamu masih di kelas 1, 2, atau 3, jangan khawatir! Kamu tetap bisa{' '}
              <span className="font-bold text-[#7BB642]">belajar di Pusat Materi</span> dan{' '}
              <span className="font-bold text-[#7BB642]">asik di Latihan Soal</span>. Untuk bercerita, silakan ke
              Bapak/Ibu Guru di kelas atau Orang Tua di rumah. 🎒✨
            </p>
            <button
              type="button"
              onClick={onBackHome}
              className="font-playful mt-8 inline-flex cursor-pointer items-center justify-center rounded-full bg-[#00B5D8] px-8 py-3.5 text-base font-bold text-white shadow-md transition hover:bg-[#2B569A]"
            >
              Kembali ke Beranda
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Logika normal HANYA untuk kelas 4-6
  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        setIsLoading(true);
        const response = await api.get('/users/teachers');
        const data = response.data.teachers || response.data;
        if (Array.isArray(data)) {
          setTeachers(data);
        }
      } catch (error) {
        console.error('Gagal memuat daftar guru:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTeachers();
  }, []);

    // ✅ Dengar perubahan status online guru secara real-time
  useEffect(() => {
    if (isRestricted) return;
    const channel = pusherClient.subscribe('user-status');

    const handleStatusChange = (data: { userId: number; isOnline: boolean }) => {
      setTeachers((prev) =>
        prev.map((t) =>
          t.id === data.userId ? { ...t, isOnline: data.isOnline } : t
        )
      );
    };

    channel.bind('user_status_change', handleStatusChange);
    return () => {
      channel.unbind('user_status_change', handleStatusChange);
      pusherClient.unsubscribe('user-status');
    };
  }, [isRestricted]);

  const handleStartChat = async (teacher: Teacher) => {
    try {
      const response = await api.post('/chats', { teacherId: Number(teacher.id) });
      const roomId = response.data?.room?.id ?? response.data?.id;

      if (!roomId) {
        throw new Error('Respons backend tidak berisi roomId.');
      }

      const chatTeacherInfo: ChatTeacherInfo = {
        id: String(teacher.id),
        name: teacher.name,
        subject: teacher.subject,
        isOnline: teacher.isOnline,
        colorTheme: teacher.colorTheme,
        avatarSrc: teacher.avatarUrl,
      };

      if (typeof onOpenChat === 'function') {
        onOpenChat(Number(roomId), chatTeacherInfo);
      } else {
        console.error('Prop onOpenChat tidak diterima dari App.tsx');
      }
    } catch (error: any) {
      console.error('❌ Error memulai obrolan:', {
        status: error.response?.status,
        message: error.response?.data?.message,
        detail: error.response?.data?.error,
        raw: error.message,
      });
      alert(
        'Gagal memulai obrolan.\n\n' +
          'Status: ' + (error.response?.status ?? 'N/A') + '\n' +
          'Pesan: ' + (error.response?.data?.message ?? error.message)
      );
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-80px)] w-full overflow-hidden bg-[#F3F8FC] py-10 sm:py-16">
      <div aria-hidden="true" className="pointer-events-none absolute -top-20 -left-20 h-80 w-80 rounded-full bg-[#00B5D8]/20 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute top-1/3 -right-24 h-96 w-96 rounded-full bg-[#7BB642]/20 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 left-1/3 h-80 w-80 rounded-full bg-[#FEF08A]/50 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onBackHome}
          aria-label="Kembali ke Beranda"
          className="mb-6 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-slate-100 bg-white text-[#2B569A] shadow-md transition-colors hover:bg-[#2B569A] hover:text-white"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>

        <h1 className="font-playful inline-block text-3xl font-bold text-[#2B569A] transition-transform hover:scale-105 sm:text-5xl">
          Pilih Pendampingmu
        </h1>
        <p className="font-clean mt-3 mb-10 max-w-xl text-base text-slate-600 sm:text-lg">
          Pilih guru yang ingin kamu ajak bicara. Ceritamu aman dan rahasia.
        </p>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#2B569A] border-t-transparent"></div>
          </div>
        ) : teachers.length === 0 ? (
          <div className="rounded-3xl bg-white p-12 text-center shadow-xs">
            <p className="font-playful text-lg font-bold text-[#2B569A]">
              Belum ada guru yang terdaftar.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {teachers.map((teacher) => (
              <TeacherCard
                key={teacher.id}
                name={teacher.name}
                subject={teacher.subject}
                isOnline={teacher.isOnline}
                avatarSrc={teacher.avatarUrl}
                colorTheme={teacher.colorTheme}
                onStartChat={() => handleStartChat(teacher)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CurhatStudentPage;