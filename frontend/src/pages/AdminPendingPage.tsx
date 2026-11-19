// src/pages/AdminPendingPage.tsx
import { useState, useEffect } from 'react';
import api from '../utils/api';

interface PendingTeacher {
  id: number;
  name: string;
  username: string;
  nip: string | null;
  subject: string | null;
  createdAt: string;
}

export function AdminPendingPage() {
  const [teachers, setTeachers] = useState<PendingTeacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);
  const [message, setMessage] = useState<string>('');

  const fetchPending = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/admin/teachers/pending');
      setTeachers(response.data.teachers || []);
    } catch (error) {
      console.error('Gagal memuat guru pending:', error);
      setMessage('✗ Gagal memuat daftar. Cek console server (prisma generate & seed sudah jalan?).');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleApprove = async (teacher: PendingTeacher) => {
    if (!window.confirm(`Setujui akun guru "${teacher.name}"?`)) return;
    setActionId(teacher.id);
    setMessage('');
    try {
      await api.patch(`/admin/teachers/${teacher.id}/approve`);
      setTeachers((prev) => prev.filter((t) => t.id !== teacher.id));
      setMessage(`✓ ${teacher.name} berhasil disetujui.`);
    } catch (error) {
      console.error('Gagal menyetujui:', error);
      setMessage('✗ Gagal menyetujui guru.');
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (teacher: PendingTeacher) => {
    const reason = window.prompt(`Alasan menolak "${teacher.name}" (opsional):`, 'Verifikasi identitas tidak berhasil.');
    if (reason === null) return;
    setActionId(teacher.id);
    setMessage('');
    try {
      await api.patch(`/admin/teachers/${teacher.id}/reject`, { reason });
      setTeachers((prev) => prev.filter((t) => t.id !== teacher.id));
      setMessage(`✗ ${teacher.name} ditolak.`);
    } catch (error) {
      console.error('Gagal menolak:', error);
      setMessage('✗ Gagal menolak guru.');
    } finally {
      setActionId(null);
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-playful text-3xl font-bold text-[#2B569A] sm:text-4xl">Persetujuan Guru</h1>
          <p className="font-clean mt-2 text-sm text-slate-600 sm:text-base">
            Verifikasi identitas guru baru sebelum mengaktifkan akun mereka.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchPending}
          disabled={isLoading}
          className="font-clean shrink-0 cursor-pointer rounded-full bg-white px-4 py-2 text-xs font-bold text-[#2B569A] shadow-sm ring-1 ring-slate-200 transition hover:bg-[#F3F8FC] disabled:opacity-60"
        >
          {isLoading ? 'Memuat...' : '↻ Refresh'}
        </button>
      </div>

      {message && (
        <div className="font-clean mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#2B569A] shadow-sm">
          {message}
        </div>
      )}

      <div className="mt-6 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#2B569A] border-t-transparent"></div>
          </div>
        ) : teachers.length === 0 ? (
          <div className="rounded-3xl bg-white p-12 text-center shadow-xs">
            <p className="font-playful text-lg font-bold text-[#2B569A]">Tidak ada guru menunggu</p>
            <p className="font-clean mt-1 text-sm text-slate-500">
              Semua permintaan sudah diproses. Klik <span className="font-bold">↻ Refresh</span> untuk cek ulang,
              atau pastikan <span className="font-bold">npx prisma db seed</span> sudah dijalankan.
            </p>
          </div>
        ) : (
          teachers.map((teacher) => (
            <div
              key={teacher.id}
              className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <h2 className="font-playful truncate text-lg font-bold text-[#0F294A]">{teacher.name}</h2>
                <p className="font-clean text-xs text-slate-500">
                  @{teacher.username} • Daftar {formatDate(teacher.createdAt)}
                </p>
                <div className="font-clean mt-1 flex flex-wrap gap-3 text-xs text-slate-600">
                  <span>NIP: <span className="font-semibold text-[#2B569A]">{teacher.nip || '-'}</span></span>
                  <span>Mapel: <span className="font-semibold text-[#2B569A]">{teacher.subject || '-'}</span></span>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => handleReject(teacher)}
                  disabled={actionId === teacher.id}
                  className="font-clean cursor-pointer rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                >
                  Tolak
                </button>
                <button
                  type="button"
                  onClick={() => handleApprove(teacher)}
                  disabled={actionId === teacher.id}
                  className="font-clean cursor-pointer rounded-full bg-[#7BB642] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#2B569A] disabled:opacity-50"
                >
                  {actionId === teacher.id ? 'Memproses...' : 'Setujui'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default AdminPendingPage;