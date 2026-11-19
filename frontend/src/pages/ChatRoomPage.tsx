// src/pages/ChatRoomPage.tsx
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import api from '../utils/api';
import { pusherClient } from '../utils/pusherClient';

export interface ChatPeerInfo {
  id?: string | number;
  name?: string;
  subject?: string;
  studentClass?: string;
  isOnline?: boolean;
  colorTheme?: string;
  avatarUrl?: string;
  avatarSrc?: string;
}

interface ChatRoomPageProps {
  roomId: number;
  currentUser: any;
  peerData?: ChatPeerInfo | null;
  onBack: () => void;
}

interface ChatRoomMessage {
  id: string;
  senderId: number;
  text?: string;
  imageUrl?: string;
  time: string;
}

// === Tema Chat ===
const THEME_OPTIONS = [
  { id: 'default', label: 'Biru (Cyan)', swatch: '#00B5D8', bubble: 'bg-[#00B5D8] text-[#0F294A]' },
  { id: 'green', label: 'Hijau', swatch: '#7BB642', bubble: 'bg-[#7BB642] text-white' },
  { id: 'pink', label: 'Pink', swatch: '#F472B6', bubble: 'bg-[#F472B6] text-white' },
  { id: 'purple', label: 'Ungu', swatch: '#A855F7', bubble: 'bg-[#A855F7] text-white' },
  { id: 'orange', label: 'Oranye', swatch: '#FB923C', bubble: 'bg-[#FB923C] text-white' },
];

const THEME_BG: Record<string, string> = {
  default: 'bg-[#F3F8FC]',
  green: 'bg-[#F0FDF4]',
  pink: 'bg-[#FDF2F8]',
  purple: 'bg-[#FAF5FF]',
  orange: 'bg-[#FFF7ED]',
};

const CHILD_FRIENDLY_EMOJIS = [
  '😊', '😄', '🥰', '😢', '😡', '🤔', '👍', '👏', '❤️', '🌟',
  '🎉', '🚀', '🤗', '🙌', '😅', '😎', '🙏', '💪', '✨', '🎈',
];

// ✅ Helper: format waktu pesan
const formatMsgTime = (dateValue: string | number | Date) =>
  new Date(dateValue).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// ✅ Helper: normalisasi pesan dari backend/Pusher (DRY, hindari duplikasi mapping)
const mapToChatMessage = (msg: any): ChatRoomMessage => ({
  id: msg.id.toString(),
  senderId: msg.senderId,
  text: msg.text,
  imageUrl: msg.imageUrl,
  time: formatMsgTime(msg.createdAt),
});

export function ChatRoomPage({ roomId, currentUser, peerData, onBack }: ChatRoomPageProps) {
  const [chatInput, setChatInput] = useState<string>('');
  const [avatarError, setAvatarError] = useState<boolean>(false);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState<boolean>(false);
  const [isAttachmentOpen, setIsAttachmentOpen] = useState<boolean>(false);
  const [isEmojiOpen, setIsEmojiOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [chatTheme, setChatTheme] = useState<string>('default');
  const [messages, setMessages] = useState<ChatRoomMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  // ✅ State status online lawan bicara (real-time via Pusher)
  const [peerIsOnline, setPeerIsOnline] = useState<boolean>(peerData?.isOnline ?? false);

  const menuContainerRef = useRef<HTMLDivElement | null>(null);
  const emojiContainerRef = useRef<HTMLDivElement | null>(null);
  const attachmentContainerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const peerName = peerData?.name || 'Pendamping';
  const peerSubtitle = peerData?.subject || peerData?.studentClass || '';
  const peerAvatar = peerData?.avatarUrl || peerData?.avatarSrc;
  const peerColor = peerData?.colorTheme || '#00B5D8';
  const isTeacher = currentUser?.role === 'teacher';

  // Bubble warna berdasarkan tema (hanya untuk pesan sendiri)
  const currentTheme = THEME_OPTIONS.find((t) => t.id === chatTheme) ?? THEME_OPTIONS[0];
  const myBubbleClass = isTeacher ? 'bg-[#7BB642] text-white' : currentTheme.bubble;
  const bgClass = THEME_BG[chatTheme] ?? THEME_BG.default;

  // Ambil riwayat pesan
  useEffect(() => {
    if (!roomId) return;
    const fetchMessages = async () => {
      try {
        const response = await api.get(`/messages/${roomId}`);
        const fetchedMessages = (response.data.messages || []).map(mapToChatMessage);
        setMessages(fetchedMessages);
      } catch (error) {
        console.error('Gagal memuat pesan:', error);
      }
    };
    fetchMessages();
  }, [roomId]);

  // ✅ PUSHER: join room & dengarkan pesan baru
  useEffect(() => {
    if (!roomId) return;
    const channel = pusherClient.subscribe(`room-${roomId}`);

    const handleReceiveMessage = (newMessage: any) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMessage.id.toString())) return prev;
        return [...prev, mapToChatMessage(newMessage)];
      });
    };

    channel.bind('receive_message', handleReceiveMessage);
    return () => {
      channel.unbind('receive_message', handleReceiveMessage);
      pusherClient.unsubscribe(`room-${roomId}`);
    };
  }, [roomId]);

  // ✅ PUSHER: dengar status online lawan bicara secara real-time
  useEffect(() => {
    if (!peerData?.id) return;
    const peerId = Number(peerData.id);
    const channel = pusherClient.subscribe('user-status');

    const handleStatusChange = (data: { userId: number; isOnline: boolean }) => {
      if (data.userId === peerId) {
        setPeerIsOnline(data.isOnline);
      }
    };

    channel.bind('user_status_change', handleStatusChange);
    return () => {
      channel.unbind('user_status_change', handleStatusChange);
      pusherClient.unsubscribe('user-status');
    };
  }, [peerData?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Tandai semua pesan sebagai sudah dibaca saat chat room dibuka
  useEffect(() => {
    if (!roomId) return;
    const markMessagesAsRead = async () => {
      try {
        await api.patch(`/messages/${roomId}/read`);
      } catch (error) {
        console.error('Gagal menandai pesan sebagai dibaca:', error);
      }
    };
    markMessagesAsRead();
  }, [roomId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuContainerRef.current && !menuContainerRef.current.contains(target)) {
        setIsMenuOpen(false);
        setIsThemeMenuOpen(false);
      }
      if (emojiContainerRef.current && !emojiContainerRef.current.contains(target)) {
        setIsEmojiOpen(false);
      }
      if (attachmentContainerRef.current && !attachmentContainerRef.current.contains(target)) {
        setIsAttachmentOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return fullName.slice(0, 2).toUpperCase();
  };

  const highlightText = (text: string, query: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return text;
    const escapedQuery = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === trimmedQuery.toLowerCase() ? (
        <mark key={i} className="rounded bg-yellow-300 px-1">{part}</mark>
      ) : part
    );
  };

  const handleSendMessage = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    try {
      // POST saja. Broadcast real-time ditangani oleh backend.
      await api.post('/messages/text', { roomId, text: trimmed });
      setChatInput('');
      setIsEmojiOpen(false);
      setIsAttachmentOpen(false);
    } catch (error) {
      console.error('Gagal mengirim pesan:', error);
      alert('Gagal mengirim pesan.');
    } finally {
      setIsSending(false);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setChatInput((prev) => prev + emoji);
    setIsEmojiOpen(false);
  };

  const handleGalleryClick = () => {
    setIsAttachmentOpen(false);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isSending) return;

    setIsSending(true);
    const formData = new FormData();
    formData.append('image', file);
    formData.append('roomId', roomId.toString());

    try {
      // POST saja. Broadcast real-time ditangani oleh backend.
      await api.post('/messages/image', formData);
    } catch (error) {
      console.error('Gagal mengirim gambar:', error);
      alert('Gagal mengunggah gambar. Pastikan ukuran di bawah 5MB.');
    } finally {
      setIsSending(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClearChat = async () => {
    if (!window.confirm('Yakin ingin menghapus obrolan ini dari sisi Anda? Pesan akan tetap terlihat oleh lawan bicara.')) return;
    try {
      await api.post(`/chats/${roomId}/hide-all`);
      setMessages([]);
      setIsMenuOpen(false);
      setIsThemeMenuOpen(false);
    } catch (error) {
      console.error('Gagal membersihkan obrolan:', error);
      alert('Gagal membersihkan obrolan.');
    }
  };

  // Filter pesan berdasarkan pencarian
  const trimmedSearchQuery = searchQuery.trim();
  const filteredMessages = trimmedSearchQuery
    ? messages.filter((msg) => msg.text?.toLowerCase().includes(trimmedSearchQuery.toLowerCase()))
    : messages;

  return (
    <div className={`flex h-screen w-full flex-col transition-colors duration-300 ${bgClass}`}>
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

      {/* HEADER */}
      <header className="shrink-0 z-20 flex items-center justify-between bg-[#2B569A] px-4 py-3 text-white shadow-md sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Kembali"
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full transition hover:bg-white/15"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>

          <div className="flex items-center gap-3">
            {peerAvatar && !avatarError ? (
              <img
                src={peerAvatar}
                alt={peerName}
                onError={() => setAvatarError(true)}
                className="h-10 w-10 rounded-full border-2 border-white object-cover"
              />
            ) : (
              <div
                style={{ backgroundColor: peerColor }}
                className="font-playful flex h-10 w-10 items-center justify-center rounded-full border-2 border-white text-sm font-bold text-white"
              >
                {getInitials(peerName)}
              </div>
            )}

            <div>
              <h1 className="font-playful text-base leading-tight font-bold text-white sm:text-lg">
                {peerName}
              </h1>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${peerIsOnline ? 'bg-[#7BB642]' : 'bg-slate-400'}`} />
                <span className="font-clean text-xs text-white/90">
                  {peerIsOnline ? 'Online' : 'Offline'}
                  {peerSubtitle && ` • ${peerSubtitle}`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Menu titik tiga */}
        <div ref={menuContainerRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setIsMenuOpen((prev) => !prev);
              setIsThemeMenuOpen(false);
              setIsEmojiOpen(false);
              setIsAttachmentOpen(false);
            }}
            aria-label="Menu opsi"
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full transition hover:bg-white/15"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          </button>

          {isMenuOpen && (
            <div className="absolute top-14 right-0 z-50 w-48 rounded-2xl border border-slate-100 bg-white p-2 text-slate-700 shadow-xl">
              <button
                type="button"
                onClick={() => {
                  setIsSearchOpen(true);
                  setIsMenuOpen(false);
                }}
                className="font-clean flex w-full cursor-pointer items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-[#F3F8FC] hover:text-[#2B569A]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <span>Cari Obrolan</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsThemeMenuOpen(true);
                }}
                className="font-clean flex w-full cursor-pointer items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-[#F3F8FC] hover:text-[#2B569A]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                </svg>
                <span>Tema Obrolan</span>
              </button>

              <div className="my-1 border-t border-slate-100" />

              <button
                type="button"
                onClick={handleClearChat}
                className="font-clean flex w-full cursor-pointer items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold text-red-500 transition-colors hover:bg-red-50"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                <span>Bersihkan Obrolan</span>
              </button>
            </div>
          )}

          {/* Sub-Menu Tema */}
          {isThemeMenuOpen && (
            <div className="absolute top-14 right-0 z-50 w-64 rounded-2xl border border-slate-100 bg-white p-4 text-slate-700 shadow-xl">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-playful text-sm font-bold text-[#2B569A]">Pilih Tema Obrolan</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsThemeMenuOpen(false);
                    setIsMenuOpen(true);
                  }}
                  className="font-clean cursor-pointer text-xs font-semibold text-slate-400 transition hover:text-[#2B569A]"
                >
                  Kembali
                </button>
              </div>
              <div className="flex items-center justify-between gap-2 pt-1">
                {THEME_OPTIONS.map((option) => {
                  const isSelected = chatTheme === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      title={option.label}
                      aria-label={option.label}
                      onClick={() => {
                        setChatTheme(option.id);
                        setIsThemeMenuOpen(false);
                      }}
                      style={{ backgroundColor: option.swatch }}
                      className={`h-8 w-8 cursor-pointer rounded-full transition-transform duration-200 ${
                        isSelected ? 'scale-110 ring-4 ring-slate-200' : 'opacity-85 hover:scale-110 hover:opacity-100'
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* SEARCH BAR */}
      {isSearchOpen && (
        <div className="relative z-20 flex items-center gap-2 border-b border-slate-200 bg-white p-3">
          <div className="mx-auto flex w-full max-w-4xl items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari pesan..."
              autoFocus
              className="font-clean flex-1 rounded-full border border-slate-200 bg-[#F3F8FC] px-4 py-2 text-sm text-[#0F294A] placeholder-slate-400 focus:border-[#00B5D8] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                setIsSearchOpen(false);
                setSearchQuery('');
              }}
              aria-label="Tutup pencarian"
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-[#0F294A]"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* AREA PESAN */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-4xl space-y-4">
          {filteredMessages.length === 0 ? (
            <div className="flex py-16 items-center justify-center text-center">
              <p className="font-clean text-sm font-medium text-slate-500">
                {trimmedSearchQuery ? 'Pesan tidak ditemukan' : 'Belum ada pesan. Mulailah percakapan! 👋'}
              </p>
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const isMe = msg.senderId === currentUser?.id;
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl p-3 px-4 shadow-sm sm:max-w-[70%] ${
                      isMe
                        ? `${myBubbleClass} rounded-tr-none`
                        : 'rounded-tl-none border border-slate-100 bg-white text-slate-800'
                    }`}
                  >
                    {msg.imageUrl && (
                      <div className="mb-2 overflow-hidden rounded-lg">
                        <img src={msg.imageUrl} alt="Lampiran" className="h-auto w-48 rounded-lg object-cover shadow-sm" />
                      </div>
                    )}
                    {msg.text && (
                      <p className="font-clean text-sm leading-relaxed">
                        {trimmedSearchQuery ? highlightText(msg.text, searchQuery) : msg.text}
                      </p>
                    )}
                    <div className="mt-1 flex justify-end">
                      <span className={`font-clean text-[10px] ${isMe ? 'text-white/80' : 'text-[#2B569A]/70'}`}>
                        {msg.time}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* INPUT AREA */}
      <footer className="shrink-0 z-20 border-t border-slate-200 bg-white p-3 sm:p-4">
        <form onSubmit={handleSendMessage} className="mx-auto flex max-w-4xl items-center gap-2 sm:gap-3">
          <div className="relative flex flex-1 items-center gap-2 rounded-full border border-slate-300 bg-[#F3F8FC] px-4 py-2 focus-within:border-[#00B5D8] sm:gap-3">
            {/* Emoji */}
            <div ref={emojiContainerRef} className="relative flex items-center">
              <button
                type="button"
                onClick={() => { setIsEmojiOpen((prev) => !prev); setIsAttachmentOpen(false); }}
                aria-label="Pilih emoji"
                className="cursor-pointer text-[#2B569A] transition hover:scale-110"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                  <line x1="9" y1="9" x2="9.01" y2="9" />
                  <line x1="15" y1="9" x2="15.01" y2="9" />
                </svg>
              </button>
              {isEmojiOpen && (
                <div className="absolute bottom-12 left-0 z-50 grid w-64 grid-cols-5 gap-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-xl">
                  {CHILD_FRIENDLY_EMOJIS.map((emoji) => (
                    <button key={emoji} type="button" onClick={() => handleEmojiSelect(emoji)} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-xl transition-transform hover:scale-125 hover:bg-[#F3F8FC]">
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Tulis ceritamu dengan aman di sini..."
              className="font-clean flex-1 bg-transparent text-sm text-[#0F294A] placeholder-slate-400 focus:outline-none sm:text-base"
            />

            {/* Attachment */}
            <div ref={attachmentContainerRef} className="relative flex items-center">
              <button
                type="button"
                onClick={() => { setIsAttachmentOpen((prev) => !prev); setIsEmojiOpen(false); }}
                aria-label="Lampirkan foto"
                className="mr-1 cursor-pointer text-[#2B569A] transition hover:scale-110"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
              </button>
              {isAttachmentOpen && (
                <div className="absolute right-0 bottom-12 z-50 flex w-52 flex-col rounded-2xl border border-slate-100 bg-white p-2 shadow-xl">
                  <button type="button" onClick={handleGalleryClick} className="font-clean flex w-full cursor-pointer items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-[#F3F8FC] hover:text-[#2B569A]">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#7BB642]/15 text-[#7BB642]">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    </span>
                    <span>Pilih dari Galeri</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSending}
            aria-label="Kirim pesan"
            className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#7BB642] text-white shadow-md transition-transform hover:scale-105 disabled:opacity-50"
          >
            {isSending ? (
              <svg className="h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </form>
      </footer>
    </div>
  );
}

export default ChatRoomPage;