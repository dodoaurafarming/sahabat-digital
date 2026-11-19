// src/pages/TeacherInboxPage.tsx
import { useState, useEffect, useRef, type MouseEvent } from 'react';
import api from '../utils/api';
import { pusherClient } from '../utils/pusherClient';

export interface StudentInboxItem {
  id: string;
  roomId: number;
  name: string;
  studentClass: string;
  lastMessage: string;
  time: string;
  unreadCount: number;
  isImportant: boolean;
  isOnline: boolean;
  avatarColor: string;
  avatarUrl?: string;
}

interface TeacherInboxPageProps {
  onOpenChat: (roomId: number, studentData: StudentInboxItem) => void;
}

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export function TeacherInboxPage({ onOpenChat }: TeacherInboxPageProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'important'>('all');
  const [failedAvatars, setFailedAvatars] = useState<Record<string, boolean>>({});
  const [inbox, setInbox] = useState<StudentInboxItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hidingId, setHidingId] = useState<string | null>(null);
  const [activeRoomId, setActiveRoomId] = useState<number | null>(null);

  // ✅ joinedRoomsRef dihapus (tidak diperlukan di Pusher)
  const processedMessageIdsRef = useRef<Set<string>>(new Set());

  const mapRoomsToInbox = (rooms: any[]): StudentInboxItem[] => {
    return rooms.map((room: any) => {
      const lastMsg = room.messages?.[0];
      return {
        id: room.student.id.toString(),
        roomId: room.id,
        name: room.student.name,
        studentClass: room.student.kelas ? `Kelas ${room.student.kelas}` : 'Siswa',
        lastMessage: lastMsg ? (lastMsg.text || '[Gambar]') : 'Belum ada pesan',
        time: lastMsg ? formatTime(lastMsg.createdAt) : '-',
        unreadCount: room.unreadCount || 0,
        isImportant: room.isImportant,
        isOnline: room.student.isOnline,
        avatarColor: room.student.frameColor || '#00B5D8',
        avatarUrl: room.student.avatarUrl,
      };
    });
  };

  useEffect(() => {
    const fetchChats = async () => {
      try {
        setIsLoading(true);
        const response = await api.get('/chats');
        setInbox(mapRoomsToInbox(response.data.rooms || []));
      } catch (error) {
        console.error('Gagal memuat inbox:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchChats();
  }, []);

  // ✅ PUSHER: Subscribe ke room & dengarkan pesan real-time
  useEffect(() => {
    if (inbox.length === 0) return;

    const channels: any[] = [];

    inbox.forEach((item) => {
      const channel = pusherClient.subscribe(`room-${item.roomId}`);
      channels.push(channel);
    });

    const handleReceiveMessage = (newMessage: any) => {
      const messageRoomId = newMessage.chatRoomId || newMessage.roomId;
      if (!messageRoomId) return;

      // ⛔ GUARD: lewati jika messageId ini sudah pernah diproses (cegah +2)
      const msgId = String(newMessage.id);
      if (processedMessageIdsRef.current.has(msgId)) return;
      processedMessageIdsRef.current.add(msgId);

      setInbox((prev) => {
        const exists = prev.some((item) => item.roomId === messageRoomId);
        if (!exists) {
          api.get('/chats')
            .then((res) => setInbox(mapRoomsToInbox(res.data.rooms || [])))
            .catch(console.error);
          return prev;
        }

        const updated = prev.map((item) => {
          if (item.roomId === messageRoomId) {
            const shouldIncrement = activeRoomId !== messageRoomId;
            return {
              ...item,
              lastMessage: newMessage.text || '[Gambar]',
              time: new Date(newMessage.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              }),
              unreadCount: shouldIncrement ? item.unreadCount + 1 : item.unreadCount,
            };
          }
          return item;
        });

        const targetIndex = updated.findIndex((i) => i.roomId === messageRoomId);
        if (targetIndex > 0) {
          const [target] = updated.splice(targetIndex, 1);
          updated.unshift(target);
        }
        return updated;
      });
    };

    channels.forEach((ch) => {
      ch.bind('receive_message', handleReceiveMessage);
    });

    return () => {
      channels.forEach((ch) => {
        ch.unbind('receive_message', handleReceiveMessage);
        pusherClient.unsubscribe(ch.channel);
      });
      processedMessageIdsRef.current.clear();
    };
  }, [inbox.length, activeRoomId]);

  // ✅ BARU: PUSHER — Dengar perubahan status online siswa secara real-time
  useEffect(() => {
    const channel = pusherClient.subscribe('user-status');

    const handleStatusChange = (data: { userId: number; isOnline: boolean }) => {
      setInbox((prev) =>
        prev.map((item) =>
          item.id === String(data.userId) ? { ...item, isOnline: data.isOnline } : item
        )
      );
    };

    channel.bind('user_status_change', handleStatusChange);
    return () => {
      channel.unbind('user_status_change', handleStatusChange);
      pusherClient.unsubscribe('user-status');
    };
  }, []);

  // Reset unread saat kembali dari chat
  useEffect(() => {
    if (!activeRoomId) return;
    setInbox((prev) =>
      prev.map((item) => (item.roomId === activeRoomId ? { ...item, unreadCount: 0 } : item))
    );
    setActiveRoomId(null);
  }, [activeRoomId]);

  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(' ');
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : fullName.slice(0, 2).toUpperCase();
  };

  // Fungsi untuk menghapus/menyembunyikan seluruh obrolan dari inbox
  const handleHideChat = async (e: MouseEvent, student: StudentInboxItem) => {
    e.stopPropagation();
    if (!window.confirm(`Yakin ingin menghapus obrolan dengan ${student.name}? Obrolan ini akan hilang dari inbox Anda.`)) return;

    setHidingId(student.id);
    try {
      await api.post(`/chats/${student.roomId}/hide`);
      setInbox((prev) => prev.filter((item) => item.roomId !== student.roomId));
    } catch (error) {
      console.error('Gagal menghapus obrolan:', error);
      alert('Gagal menghapus obrolan.');
    } finally {
      setHidingId(null);
    }
  };

  const handleOpenChat = (roomId: number, studentData: StudentInboxItem) => {
    setActiveRoomId(roomId);
    onOpenChat(roomId, studentData);
  };

  const filteredInbox = inbox.filter((item) => {
    const matchesTab = activeTab === 'all' ? true : activeTab === 'unread' ? item.unreadCount > 0 : item.isImportant;
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = query === '' || item.name.toLowerCase().includes(query) || item.lastMessage.toLowerCase().includes(query) || item.studentClass.toLowerCase().includes(query);
    return matchesTab && matchesSearch;
  });

  const totalUnread = inbox.reduce((acc, curr) => acc + (curr.unreadCount > 0 ? 1 : 0), 0);

  return (
    <div className="min-h-screen w-full bg-[#F3F8FC] pb-16">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-baseline justify-between px-4 pt-6 pb-2 sm:px-6">
          <h1 className="font-playful text-2xl font-bold text-[#2B569A] sm:text-3xl">Pesan Masuk</h1>
          <span className="font-clean text-xs font-semibold text-slate-500 sm:text-sm">
            {totalUnread} percakapan belum dibaca
          </span>
        </div>

        <div className="px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3 rounded-full bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200/70 transition focus-within:ring-2 focus-within:ring-[#00B5D8]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-slate-400">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari siswa atau pesan..."
              className="font-clean w-full bg-transparent text-sm text-[#0F294A] placeholder-slate-400 outline-none sm:text-base"
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')} aria-label="Bersihkan pencarian" className="cursor-pointer text-slate-400 transition hover:text-slate-600">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 overflow-x-auto px-4 pb-4 sm:px-6">
          {[
            { id: 'all', label: 'Semua' },
            { id: 'unread', label: 'Belum Dibaca' },
            { id: 'important', label: 'Penting' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as 'all' | 'unread' | 'important')}
                className={`font-clean shrink-0 cursor-pointer rounded-full px-5 py-2 text-xs font-bold shadow-xs transition-all duration-200 sm:text-sm ${
                  isActive ? 'bg-[#2B569A] text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-sky-50 hover:text-[#2B569A]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="px-4 sm:px-6">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#2B569A] border-t-transparent"></div>
            </div>
          ) : filteredInbox.length === 0 ? (
            <div className="rounded-3xl bg-white p-12 text-center shadow-xs">
              <p className="font-playful text-lg font-bold text-[#2B569A]">Tidak ada pesan ditemukan</p>
              <p className="font-clean mt-1 text-sm text-slate-500">Coba gunakan kata kunci pencarian atau filter lainnya.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredInbox.map((student) => {
                const hasAvatarError = failedAvatars[student.id];
                const isUnread = student.unreadCount > 0;

                return (
                  <div
                    key={student.id}
                    onClick={() => handleOpenChat(student.roomId, student)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleOpenChat(student.roomId, student);
                      }
                    }}
                    className="group flex w-full cursor-pointer items-center gap-4 rounded-2xl bg-white p-4 text-left shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:bg-sky-50/50 hover:shadow-md"
                  >
                    <div className="relative shrink-0">
                      {student.avatarUrl && !hasAvatarError ? (
                        <img
                          src={student.avatarUrl}
                          alt={student.name}
                          onError={() => setFailedAvatars((prev) => ({ ...prev, [student.id]: true }))}
                          className="h-14 w-14 rounded-full object-cover"
                        />
                      ) : (
                        <div style={{ backgroundColor: student.avatarColor }} className="font-playful flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold text-white shadow-xs">
                          {getInitials(student.name)}
                        </div>
                      )}
                      {student.isOnline && (
                        <span title="Online" className="absolute right-0 bottom-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#7BB642]" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <h2 className="font-clean truncate text-base font-bold text-[#0F294A]">{student.name}</h2>
                          <span className="font-clean shrink-0 rounded-full bg-[#F3F8FC] px-2.5 py-0.5 text-[11px] font-semibold text-[#2B569A]">
                            {student.studentClass}
                          </span>
                          {student.isImportant && (
                            <span title="Penting" className="shrink-0 text-amber-400">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                              </svg>
                            </span>
                          )}
                        </div>
                        <span className={`font-clean shrink-0 text-xs ${isUnread ? 'font-bold text-[#7BB642]' : 'text-slate-400'}`}>
                          {student.time}
                        </span>
                      </div>

                      <div className="mt-1.5 flex items-center justify-between gap-3">
                        <div className="flex min-w-0 flex-1 items-center gap-1.5">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${isUnread ? 'text-[#00B5D8]' : 'text-slate-400'}`}>
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <p className={`font-clean truncate text-sm ${isUnread ? 'font-semibold text-[#0F294A]' : 'text-slate-500'}`}>
                            {student.lastMessage}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isUnread && (
                            <span className="font-clean shrink-0 rounded-full bg-[#7BB642] px-2 py-0.5 text-xs font-bold text-white shadow-xs">
                              {student.unreadCount}
                            </span>
                          )}

                          {/* TOMBOL HAPUS OBROLAN */}
                          <button
                            type="button"
                            onClick={(e) => handleHideChat(e, student)}
                            disabled={hidingId === student.id}
                            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-slate-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                            title="Hapus obrolan dari inbox"
                          >
                            {hidingId === student.id ? (
                              <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TeacherInboxPage;