// src/pages/ProfilePage.tsx
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import api from '../utils/api';

interface ProfilePageProps {
  role: 'student' | 'teacher';
  onBackHome: () => void;
}

interface FrameColorOption {
  id: string;
  label: string;
  hex: string;
}

const FRAME_COLORS: FrameColorOption[] = [
  { id: 'cyan', label: 'Cyan', hex: '#00B5D8' },
  { id: 'blue', label: 'Biru', hex: '#2B569A' },
  { id: 'green', label: 'Hijau', hex: '#7BB642' },
  { id: 'pink', label: 'Pink', hex: '#F472B6' },
];

export function ProfilePage({ role, onBackHome }: ProfilePageProps) {
  const [fullName, setFullName] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [nip, setNip] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [gender, setGender] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');
  const [frameColor, setFrameColor] = useState<string>('#00B5D8');
  const [colorTheme, setColorTheme] = useState<string>('#2B569A');
  const [avatarSrc, setAvatarSrc] = useState<string>('');
  const [avatarError, setAvatarError] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [quizHistory, setQuizHistory] = useState<any[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get('/users/profile');
        const user = response.data.user;
        setFullName(user.name || '');
        setUsername(user.username || '');
        setNip(user.nip || '');
        setSubject(user.subject || '');
        setGender(user.gender || 'Laki-laki');
        setFrameColor(user.frameColor || '#00B5D8');
        setColorTheme(user.colorTheme || '#2B569A');
        if (user.avatarUrl) {
          setAvatarSrc(user.avatarUrl);
        }

        if (role === 'student') {
          try {
            const quizRes = await api.get('/quiz');
            setQuizHistory(quizRes.data.scores || []);
          } catch (error) {
            console.error('Gagal memuat riwayat kuis:', error);
          }
        }
      } catch (error) {
        console.error('Gagal mengambil data profil:', error);
      }
    };
    fetchProfile();
  }, [role]);

  const userInitial = fullName.trim().charAt(0).toUpperCase() || 'U';
  const activeBorderColor = role === 'teacher' ? colorTheme : frameColor;

  const averageScore = quizHistory.length > 0 
    ? Math.round(quizHistory.reduce((acc, curr) => acc + curr.score, 0) / quizHistory.length) 
    : 0;

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await api.post('/users/avatar', formData);
      setAvatarSrc(response.data.avatarUrl);
      setAvatarError(false);
    } catch (error) {
      console.error('Gagal mengunggah avatar:', error);
      alert('Gagal mengunggah foto. Pastikan ukuran file di bawah 5MB dan formatnya JPG/PNG/WEBP.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSaveProfile = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const payload: any = { name: fullName };
      if (newPassword.trim()) {
        payload.password = newPassword;
      }
      if (role === 'student') {
        payload.frameColor = frameColor;
      } else {
        payload.colorTheme = colorTheme;
      }

      await api.put('/users/profile', payload);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Gagal menyimpan profil:', error);
      alert('Gagal menyimpan perubahan profil.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F3F8FC]">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <button
          type="button"
          onClick={onBackHome}
          className="font-clean mb-6 inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-[#2B569A] shadow-sm transition hover:bg-[#2B569A] hover:text-white sm:text-sm"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span>
            {role === 'teacher' ? 'Kembali ke Kotak Masuk' : 'Kembali ke Beranda'}
          </span>
        </button>

        <div className="rounded-[2.5rem] bg-white p-8 shadow-xl sm:p-12">
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              {avatarSrc && !avatarError ? (
                <img
                  src={avatarSrc}
                  alt={fullName}
                  onError={() => setAvatarError(true)}
                  style={{ borderColor: activeBorderColor }}
                  className="h-32 w-32 rounded-full border-4 object-cover shadow-md transition-colors duration-300"
                />
              ) : (
                <div
                  style={{ borderColor: activeBorderColor, backgroundColor: `${activeBorderColor}20` }}
                  className="font-playful flex h-32 w-32 items-center justify-center rounded-full border-4 text-5xl font-bold text-[#2B569A] shadow-md transition-colors duration-300"
                >
                  {userInitial}
                </div>
              )}
            </div>

            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="font-clean mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-full border border-slate-200 bg-transparent px-4 py-1.5 text-xs font-bold text-[#2B569A] transition-colors hover:border-[#00B5D8] hover:bg-[#F3F8FC] disabled:opacity-50 sm:text-sm"
            >
              {isUploading ? (
                <>
                  <svg className="h-4 w-4 animate-spin text-[#2B569A]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Mengunggah...
                </>
              ) : (
                'Ganti Foto'
              )}
            </button>

            <h1 className="font-playful mt-4 text-3xl font-bold text-[#2B569A]">
              {fullName || (role === 'teacher' ? 'Guru Sahabat Digital' : 'Siswa Sahabat Digital')}
            </h1>

            <span className={`font-playful mt-2 inline-block rounded-full px-4 py-1 text-xs font-bold sm:text-sm ${role === 'teacher' ? 'bg-[#ECFCCB] text-[#166534]' : 'bg-[#F3F8FC] text-[#00B5D8]'}`}>
              {role === 'teacher' ? 'Guru Pendamping' : 'Siswa'}
            </span>
          </div>

          <form onSubmit={handleSaveProfile} className="mt-10 space-y-6">
            {role === 'student' && (
              <>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="profile-fullname" className="font-clean mb-2 block text-xs font-semibold text-slate-600 sm:text-sm">Nama Lengkap</label>
                    <input id="profile-fullname" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="font-clean w-full rounded-2xl border border-slate-200 bg-[#F3F8FC]/60 px-4 py-3 text-sm text-[#0F294A] transition outline-none focus:border-[#00B5D8] focus:bg-white sm:text-base" />
                  </div>
                  <div>
                    <label htmlFor="profile-username" className="font-clean mb-2 block text-xs font-semibold text-slate-600 sm:text-sm">Username</label>
                    <input id="profile-username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required className="font-clean w-full rounded-2xl border border-slate-200 bg-[#F3F8FC]/60 px-4 py-3 text-sm text-[#0F294A] transition outline-none focus:border-[#00B5D8] focus:bg-white sm:text-base" />
                  </div>
                </div>

                <div>
                  <label htmlFor="profile-password" className="font-clean mb-2 block text-xs font-semibold text-slate-600 sm:text-sm">Password Baru</label>
                  <input id="profile-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Kosongkan jika tidak ingin mengubah" className="font-clean w-full rounded-2xl border border-slate-200 bg-[#F3F8FC]/60 px-4 py-3 text-sm text-[#0F294A] placeholder-slate-400 transition outline-none focus:border-[#00B5D8] focus:bg-white sm:text-base" />
                </div>

                <div className="grid grid-cols-1 gap-6 pt-2 sm:grid-cols-2">
                  <div>
                    <span className="font-clean mb-2.5 block text-xs font-semibold text-slate-600 sm:text-sm">Gender</span>
                    <div className="flex gap-3">
                      {(['Laki-laki', 'Perempuan'] as const).map((item) => {
                        const active = gender === item;
                        return (
                          <button key={item} type="button" onClick={() => setGender(item)} className={`font-clean flex-1 cursor-pointer rounded-2xl py-2.5 text-sm font-bold transition-all ${active ? 'bg-[#2B569A] text-white shadow-sm' : 'bg-[#F3F8FC] text-slate-600 hover:bg-sky-100/70'}`}>
                            {item}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <span className="font-clean mb-2.5 block text-xs font-semibold text-slate-600 sm:text-sm">Warna Bingkai Foto</span>
                    <div className="flex items-center gap-4 pt-1">
                      {FRAME_COLORS.map((color) => {
                        const isSelected = frameColor === color.hex;
                        return (
                          <button
                            key={color.id}
                            type="button"
                            onClick={() => setFrameColor(color.hex)}
                            aria-label={`Warna bingkai ${color.label}`}
                            style={{ backgroundColor: color.hex }}
                            className={`h-9 w-9 cursor-pointer rounded-full transition-transform duration-200 ${isSelected ? 'scale-110 ring-4 ring-slate-200' : 'opacity-80 hover:scale-105 hover:opacity-100'}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}

            {role === 'teacher' && (
              <>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="teacher-fullname" className="font-clean mb-2 block text-xs font-semibold text-slate-600 sm:text-sm">Nama Lengkap</label>
                    <input id="teacher-fullname" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="font-clean w-full rounded-2xl border border-slate-200 bg-[#F3F8FC]/60 px-4 py-3 text-sm text-[#0F294A] transition outline-none focus:border-[#00B5D8] focus:bg-white sm:text-base" />
                  </div>
                  <div>
                    <label htmlFor="teacher-nip" className="font-clean mb-2 block text-xs font-semibold text-slate-600 sm:text-sm">NIP</label>
                    <input id="teacher-nip" type="text" value={nip} onChange={(e) => setNip(e.target.value)} required className="font-clean w-full rounded-2xl border border-slate-200 bg-[#F3F8FC]/60 px-4 py-3 text-sm text-[#0F294A] transition outline-none focus:border-[#00B5D8] focus:bg-white sm:text-base" />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="teacher-subject" className="font-clean mb-2 block text-xs font-semibold text-slate-600 sm:text-sm">Mapel / Jabatan</label>
                    <input id="teacher-subject" type="text" value={subject} onChange={(e) => setSubject(e.target.value)} required className="font-clean w-full rounded-2xl border border-slate-200 bg-[#F3F8FC]/60 px-4 py-3 text-sm text-[#0F294A] transition outline-none focus:border-[#00B5D8] focus:bg-white sm:text-base" />
                  </div>
                  <div>
                    <label htmlFor="teacher-username" className="font-clean mb-2 block text-xs font-semibold text-slate-600 sm:text-sm">Username</label>
                    <input id="teacher-username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required className="font-clean w-full rounded-2xl border border-slate-200 bg-[#F3F8FC]/60 px-4 py-3 text-sm text-[#0F294A] transition outline-none focus:border-[#00B5D8] focus:bg-white sm:text-base" />
                  </div>
                </div>

                <div>
                  <label htmlFor="teacher-password" className="font-clean mb-2 block text-xs font-semibold text-slate-600 sm:text-sm">Password Baru</label>
                  <input id="teacher-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Kosongkan jika tidak ingin mengubah" className="font-clean w-full rounded-2xl border border-slate-200 bg-[#F3F8FC]/60 px-4 py-3 text-sm text-[#0F294A] placeholder-slate-400 transition outline-none focus:border-[#00B5D8] focus:bg-white sm:text-base" />
                </div>
              </>
            )}

            {saveSuccess && (
              <div className="font-clean rounded-2xl bg-[#DCFCE7] px-4 py-3 text-center text-sm font-semibold text-[#166534]">
                Perubahan profil berhasil disimpan!
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={isSaving}
                className="font-clean flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#2B569A] px-10 py-3 font-bold text-white shadow-md transition-colors hover:bg-[#00B5D8] disabled:opacity-70 sm:w-auto"
              >
                {isSaving ? (
                  <>
                    <svg className="h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Menyimpan...
                  </>
                ) : (
                  'Simpan Perubahan'
                )}
              </button>
            </div>
          </form>

          {role === 'student' && quizHistory.length > 0 && (
            <div className="mt-10 rounded-2xl bg-[#F3F8FC] p-6">
              <h3 className="font-playful mb-4 text-xl font-bold text-[#2B569A]">Riwayat Kuis</h3>
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#00B5D8] text-2xl font-bold text-white shadow-md">
                  {averageScore}
                </div>
                <div>
                  <p className="font-clean text-sm font-semibold text-slate-600">Rata-rata Skor</p>
                  <p className="font-clean text-xs text-slate-500">Dari {quizHistory.length} kali latihan</p>
                </div>
              </div>
              <div className="space-y-2">
                {quizHistory.slice(0, 3).map((q, idx) => (
                  <div key={q.id} className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm">
                    <span className="font-clean text-sm font-medium text-slate-700">Latihan #{quizHistory.length - idx}</span>
                    <span className="font-playful text-sm font-bold text-[#7BB642]">
                      {q.score} / {q.totalQuestions}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;