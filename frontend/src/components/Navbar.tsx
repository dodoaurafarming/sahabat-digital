// src/components/Navbar.tsx
import { useEffect, useRef, useState } from 'react';
import { loadAssetByKey } from '../utils/assetLoader';
import api from '../utils/api';
import { pusherClient } from '../utils/pusherClient'; // ✅ GANTI SOCKET DENGAN PUSHER

interface NavbarProps {
  isLoggedIn: boolean;
  userId?: number; // ✅ TAMBAHKAN INI agar bisa subscribe ke channel notifikasi user
  role?: 'student' | 'teacher' | 'admin';
  userName?: string;
  userAvatar?: string;
  onNavigateProfile: () => void;
  onNavigateCurhat?: () => void;
  onNavigateChat?: () => void;
  onNavigateMaterial?: () => void;
  onNavigateDaftar: () => void;
  onNavigateLogin: () => void;
  onLogout?: () => void;
}

interface NotificationItem {
  id: number;
  title: string;
  createdAt: string;
  type: 'chat' | 'material';
  isRead: boolean;
}

const pngModules = import.meta.glob('../assets/*.{png,jpg,jpeg,webp,svg}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const defaultLogoSrc = loadAssetByKey(
  pngModules,
  '../assets/logo-sahabat-digital.png',
);

const defaultStudentAvatarSrc = pngModules['../assets/avatar-student.png'] ?? '';
const defaultTeacherAvatarSrc = pngModules['../assets/avatar-teacher.png'] ?? '';

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Baru saja';
  if (diffMins < 60) return `${diffMins} menit lalu`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} jam lalu`;
  return date.toLocaleDateString('id-ID');
};

export function Navbar({
  isLoggedIn,
  userId, // ✅ TERIMA PROP BARU
  role = 'student',
  userName,
  userAvatar,
  onNavigateProfile,
  onNavigateCurhat,
  onNavigateChat,
  onNavigateMaterial,
  onNavigateDaftar,
  onNavigateLogin,
  onLogout,
}: NavbarProps) {
  const [logoSrc, setLogoSrc] = useState<string>(defaultLogoSrc);
  const [avatarError, setAvatarError] = useState<boolean>(false);
  const [isNotifOpen, setIsNotifOpen] = useState<boolean>(false);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const dropdownAreaRef = useRef<HTMLDivElement | null>(null);

  // ✅ Logika tampilan disesuaikan untuk admin
  const displayName = userName ?? (role === 'teacher' ? 'Bu Rina' : role === 'admin' ? 'Administrator' : 'Raka');
  const roleSubtitle = role === 'teacher' ? 'Guru Pendamping' : role === 'admin' ? 'Administrator' : 'Siswa';
  
  const resolvedAvatar = userAvatar || (role === 'teacher' ? defaultTeacherAvatarSrc : defaultStudentAvatarSrc);
  const userInitial = displayName.trim().charAt(0).toUpperCase() || 'S';
  const avatarBorderClass = role === 'teacher' ? 'border-[#7BB642]' : 'border-white';

  // Fetch notifikasi awal saat login
  useEffect(() => {
    if (isLoggedIn) {
      const fetchNotifications = async () => {
        try {
          const response = await api.get('/notifications');
          const data = response.data.notifications || [];
          setNotifications(data);
          const count = data.filter((n: NotificationItem) => !n.isRead).length;
          setUnreadCount(count);
        } catch (error) {
          console.error('Gagal memuat notifikasi:', error);
        }
      };
      fetchNotifications();
    }
  }, [isLoggedIn]);

  // ✅ PUSHER: Dengarkan notifikasi real-time untuk user yang sedang login
  useEffect(() => {
    if (!isLoggedIn || !userId) return;

    // Subscribe ke channel personal user
    const channel = pusherClient.subscribe(`user-${userId}`);

    const handleNewNotification = (notif: NotificationItem) => {
      setNotifications((prev) => [notif, ...prev]);
      setUnreadCount((prev) => prev + 1);
    };

    channel.bind('receive_notification', handleNewNotification);

    // Cleanup: Unbind dan unsubscribe saat komponen unmount atau user logout
    return () => {
      channel.unbind('receive_notification', handleNewNotification);
      pusherClient.unsubscribe(`user-${userId}`);
    };
  }, [isLoggedIn, userId]);

  // Klik di luar dropdown untuk menutup
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownAreaRef.current && !dropdownAreaRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleToggleNotif = () => {
    setIsNotifOpen((prev) => !prev);
    setIsProfileOpen(false);
  };

  const handleToggleProfile = () => {
    setIsProfileOpen((prev) => !prev);
    setIsNotifOpen(false);
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Gagal menandai semua notifikasi:', error);
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    try {
      await api.patch(`/notifications/${notif.id}/read`);
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notif.id ? { ...item, isRead: true } : item,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Gagal menandai notifikasi sebagai dibaca:', error);
    }
    
    setIsNotifOpen(false);

    if (notif.type === 'chat') {
      if (onNavigateChat) onNavigateChat();
      else if (onNavigateCurhat) onNavigateCurhat();
    } else if (notif.type === 'material') {
      if (onNavigateMaterial) onNavigateMaterial();
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#2B569A] text-white shadow-sm">
      {(isNotifOpen || isProfileOpen) && (
        <div
          aria-hidden="true"
          onClick={() => {
            setIsNotifOpen(false);
            setIsProfileOpen(false);
          }}
          className="fixed inset-0 z-40 bg-transparent"
        />
      )}

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:h-20 sm:px-6 lg:px-8">
        <a href="#top" className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          {logoSrc ? (
            <img
              src={logoSrc}
              alt="Logo Sahabat Digital"
              onError={() => setLogoSrc('')}
              className="h-9 w-9 shrink-0 rounded-lg object-contain sm:h-11 sm:w-11"
            />
          ) : (
            <div className="font-playful flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#00B5D8] text-sm font-bold text-[#0F294A] sm:h-11 sm:w-11">
              SD
            </div>
          )}
          <span className="font-playful truncate text-lg font-bold tracking-wide text-white sm:text-2xl">
            Sahabat Digital
          </span>
        </a>

        {!isLoggedIn ? (
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onNavigateDaftar}
              className="font-clean cursor-pointer rounded-full border-2 border-white bg-transparent px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-white/15 sm:px-5 sm:py-2 sm:text-sm"
            >
              Daftar
            </button>
            <button
              type="button"
              onClick={onNavigateLogin}
              className="font-clean cursor-pointer rounded-full bg-[#00B5D8] px-4 py-2 text-xs font-bold text-[#0F294A] shadow-sm transition hover:bg-[#19C8EB] sm:px-5 sm:py-2.5 sm:text-sm"
            >
              Login
            </button>
          </div>
        ) : (
          <div ref={dropdownAreaRef} className="relative z-50 flex shrink-0 items-center gap-3 sm:gap-4">
            <div className="relative">
              <button
                type="button"
                onClick={handleToggleNotif}
                aria-label="Notifikasi"
                className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>

                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#00B5D8] text-[10px] font-bold text-white ring-2 ring-[#2B569A]">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-slate-100 bg-white p-4 text-slate-800 shadow-xl transition-all duration-200">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-playful text-base font-bold text-[#2B569A]">Notifikasi</h3>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="font-clean cursor-pointer text-xs font-semibold text-[#00B5D8] transition hover:text-[#2B569A]"
                      >
                        Tandai dibaca
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 space-y-1.5 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="font-clean py-4 text-center text-sm text-slate-400">Tidak ada notifikasi</p>
                    ) : (
                      notifications.map((notif) => (
                        <button
                          key={notif.id}
                          type="button"
                          onClick={() => handleNotificationClick(notif)}
                          className="flex w-full cursor-pointer items-start justify-between gap-3 rounded-xl p-3 text-left transition-colors hover:bg-slate-50"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              {!notif.isRead && (
                                <span className="h-2 w-2 shrink-0 rounded-full bg-[#00B5D8]" />
                              )}
                              <p className={`font-clean text-sm ${!notif.isRead ? 'font-semibold text-[#0F294A]' : 'text-slate-600'}`}>
                                {notif.title}
                              </p>
                            </div>
                            <span className="font-clean mt-1 block text-xs text-slate-400">
                              {formatTime(notif.createdAt)}
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={handleToggleProfile}
                className="flex cursor-pointer items-center gap-2.5 rounded-full py-1 transition hover:opacity-90"
              >
                <span className="font-playful order-1 text-sm font-bold text-white sm:order-2 sm:text-base">
                  Halo, {displayName}!
                </span>
                {resolvedAvatar && !avatarError ? (
                  <img
                    src={resolvedAvatar}
                    alt={`Profil ${displayName}`}
                    onError={() => setAvatarError(true)}
                    className={`order-2 h-9 w-9 rounded-full border-2 object-cover sm:order-1 sm:h-11 sm:w-11 ${avatarBorderClass}`}
                  />
                ) : (
                  <div
                    className={`font-playful order-2 flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold sm:order-1 sm:h-11 sm:w-11 sm:text-base ${avatarBorderClass} ${
                      role === 'teacher' ? 'bg-[#7BB642] text-white' : 'bg-[#00B5D8] text-[#0F294A]'
                    }`}
                  >
                    {userInitial}
                  </div>
                )}
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 z-50 mt-2 w-56 rounded-2xl border border-slate-100 bg-white p-2 text-slate-800 shadow-xl transition-all duration-200">
                  <div className="px-3.5 py-2.5">
                    <p className="font-playful text-base font-bold text-[#2B569A]">{displayName}</p>
                    <p className="font-clean text-xs font-medium text-slate-400">{roleSubtitle}</p>
                  </div>

                  <div className="my-1 border-t border-slate-100" />

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      onNavigateProfile();
                    }}
                    className="font-clean flex w-full cursor-pointer items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-[#F3F8FC] hover:text-[#2B569A]"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <span>Edit Profil</span>
                  </button>

                  <div className="my-1 border-t border-slate-100" />

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      if (onLogout) onLogout();
                    }}
                    className="font-clean flex w-full cursor-pointer items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold text-red-500 transition-colors hover:bg-red-50"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    <span>Keluar</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

export default Navbar;