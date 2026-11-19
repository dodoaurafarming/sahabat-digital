// src/App.tsx
import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { FeaturesSection } from './components/FeaturesSection';
import { QuizCTASection } from './components/QuizCTASection';
import { StatsSection } from './components/StatsSection';
import { Footer } from './components/Footer';
import { AnimatedSection } from './components/AnimatedSection';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { CurhatStudentPage, type ChatTeacherInfo } from './pages/CurhatStudentPage';
import { MaterialDetailPage } from './pages/MaterialDetailPage';
import { QuizIntroPage } from './pages/QuizIntroPage';
import { QuizPage } from './pages/QuizPage';
import { RewardPage } from './pages/RewardPage';
import { ProfilePage } from './pages/ProfilePage';
import { TeacherInboxPage } from './pages/TeacherInboxPage';
import { AdminPendingPage } from './pages/AdminPendingPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { ChatRoomPage } from './pages/ChatRoomPage';

// ⚠️ PASTIKAN 4 FILE INI SUDAH DIBUAT DI src/pages/
import { FAQPage } from './pages/FAQPage';
import { ContactPage } from './pages/ContactPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';

import api from './utils/api';
// ❌ HAPUS: import { socket } from './utils/socket';

type AppPage =
  | 'home'
  | 'login'
  | 'register'
  | 'profile'
  | 'curhat'
  | 'material'
  | 'quiz-intro'
  | 'quiz'
  | 'reward'
  | 'teacher-inbox'
  | 'chat-room'
  | 'admin-pending'
  | 'admin-login'
  | 'faq'
  | 'contact'
  | 'privacy'
  | 'terms';

type UserRole = 'student' | 'teacher' | 'admin' | null;

const getInitialPage = (): AppPage => {
  const path = window.location.pathname.replace(/^\//, '');
  const validPages: AppPage[] = [
    'home', 'login', 'register', 'profile', 'curhat', 'material',
    'quiz-intro', 'quiz', 'reward', 'teacher-inbox', 'chat-room',
    'admin-pending', 'admin-login', 'faq', 'contact', 'privacy', 'terms',
  ];
  return validPages.includes(path as AppPage) ? (path as AppPage) : 'home';
};

export function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<AppPage>(getInitialPage());
  const [score, setScore] = useState<number>(0);
  const [currentRoomId, setCurrentRoomId] = useState<number | null>(null);
  const [chatPeer, setChatPeer] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [showBlockedModal, setShowBlockedModal] = useState<boolean>(false);

  const activeRole = userRole || 'student';
  const activeDisplayName =
    currentUser?.name ||
    (activeRole === 'teacher' ? 'Bu Rina' : activeRole === 'admin' ? 'Administrator' : 'Raka');

  const homeForRole = (role: UserRole): AppPage =>
    role === 'teacher' ? 'teacher-inbox' : role === 'admin' ? 'admin-pending' : 'home';

  const navigateTo = (page: AppPage) => {
    const path = page === 'home' ? '/' : `/${page}`;
    window.history.pushState({ page }, '', path);
    setCurrentPage(page);
  };

  const replaceTo = (page: AppPage) => {
    const path = page === 'home' ? '/' : `/${page}`;
    window.history.replaceState({ page }, '', path);
    setCurrentPage(page);
  };

  // Wrapper aman untuk Footer
  const handleFooterNavigate = (page: string) => {
    if (['home', 'login', 'register', 'profile', 'curhat', 'material', 'quiz-intro', 'quiz', 'reward', 'teacher-inbox', 'chat-room', 'admin-pending', 'admin-login', 'faq', 'contact', 'privacy', 'terms'].includes(page)) {
      navigateTo(page as AppPage);
    }
  };

  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      const page = (e.state?.page as AppPage) || 'home';
      setCurrentPage(page);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const refreshProfile = async () => {
    try {
      const response = await api.get('/users/profile');
      const user = response.data.user;
      setCurrentUser(user);
      setIsLoggedIn(true);
      setUserRole(user.role);
      // ❌ HAPUS: socket.connect();
      // ❌ HAPUS: socket.emit('register_user', user.id);
      api.post('/auth/presence', { online: true }).catch(() => {});
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setIsLoggedIn(false);
      setUserRole(null);
      setCurrentUser(null);
      // ❌ HAPUS: socket.disconnect();
      replaceTo('home');
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      refreshProfile();
    } else {
      setIsInitializing(false);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn && userRole === 'teacher' && !['teacher-inbox', 'profile', 'chat-room'].includes(currentPage)) {
      replaceTo('teacher-inbox');
    }
  }, [isLoggedIn, userRole, currentPage]);

  useEffect(() => {
    if (isLoggedIn && userRole === 'admin' && !['admin-pending', 'profile'].includes(currentPage)) {
      replaceTo('admin-pending');
    }
  }, [isLoggedIn, userRole, currentPage]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    const markOffline = () => {
      const base = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      fetch(`${base}/auth/presence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ online: false }),
        keepalive: true, // ✅ bertahan sampai tab benar-benar tertutup
      }).catch(() => {});
    };

    window.addEventListener('beforeunload', markOffline);
    return () => window.removeEventListener('beforeunload', markOffline);
  }, [isLoggedIn]);

  const handleNavigateDaftar = () => navigateTo('register');
  const handleNavigateLogin = () => navigateTo('login');

  const handleLogout = () => {
    api.post('/auth/presence', { online: false }).catch(() => {});
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUserRole(null);
    setCurrentUser(null);
    setCurrentRoomId(null);
    setChatPeer(null);
    // ❌ HAPUS: socket.disconnect();
    replaceTo('home');
  };

  const handleStartCurhat = () => {
    if (userRole === 'teacher' && isLoggedIn) { navigateTo('teacher-inbox'); return; }
    if (userRole === 'admin' && isLoggedIn) { navigateTo('admin-pending'); return; }
    if (userRole === 'student' && currentUser?.kelas && currentUser.kelas < 4) {
      setShowBlockedModal(true);
      return;
    }
    navigateTo('curhat');
  };

  const handleOpenMaterial = () => navigateTo('material');
  const handleStartQuiz = () => navigateTo('quiz-intro');

  const handleOpenChat = (roomId: number, peerData: any) => {
    setCurrentRoomId(roomId);
    setChatPeer(peerData);
    navigateTo('chat-room');
  };

  const handleBackFromChat = () => {
    setCurrentRoomId(null);
    setChatPeer(null);
    navigateTo(userRole === 'teacher' ? 'teacher-inbox' : 'curhat');
  };

  const navbarProps = {
    isLoggedIn,
    userId: currentUser?.id, // ✅ TAMBAHKAN userId DI SINI agar Navbar bisa subscribe notifikasi
    role: userRole || 'student',
    userName: currentUser?.name || activeDisplayName,
    userAvatar: currentUser?.avatarUrl,
    onNavigateProfile: () => navigateTo('profile'),
    onNavigateChat: () => navigateTo(userRole === 'teacher' ? 'teacher-inbox' : userRole === 'admin' ? 'admin-pending' : 'curhat'),
    onNavigateMaterial: () => navigateTo('material'),
    onNavigateCurhat: () => navigateTo(userRole === 'teacher' ? 'teacher-inbox' : userRole === 'admin' ? 'admin-pending' : 'curhat'),
    onNavigateDaftar: handleNavigateDaftar,
    onNavigateLogin: handleNavigateLogin,
    onLogout: handleLogout,
  };

  const loginFallback = (target: AppPage) => (
    <LoginPage
      onBackHome={() => navigateTo('home')}
      onNavigateDaftar={handleNavigateDaftar}
      onLoginSuccess={(role) => {
        setUserRole(role);
        refreshProfile();
        replaceTo(target);
      }}
    />
  );

  const BlockedModal = () =>
    showBlockedModal ? (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0F294A]/60 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-[2rem] bg-white p-8 text-center shadow-2xl">
          <div className="text-6xl">🌟</div>
          <h3 className="font-playful mt-4 text-2xl font-bold text-[#2B569A]">Halo, Adik Hebat! 👋</h3>
          <p className="font-clean mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
            Fitur <span className="font-bold text-[#00B5D8]">Ruang Curhat</span> khusus untuk kakak-kakak{' '}
            <span className="font-bold">kelas 4, 5, dan 6</span> ya.
          </p>
          <p className="font-clean mt-2 text-sm leading-relaxed text-slate-500">
            Kalau kamu kelas 1–3, jangan sedih! Kamu tetap bisa belajar di{' '}
            <span className="font-bold text-[#7BB642]">Pusat Materi</span> dan{' '}
            <span className="font-bold text-[#7BB642]">Latihan Soal</span>. Untuk cerita, silakan ke Bapak/Ibu Guru di kelas atau Orang Tua di rumah ya. 🎒✨
          </p>
          <button
            type="button"
            onClick={() => setShowBlockedModal(false)}
            className="font-playful mt-6 w-full cursor-pointer rounded-full bg-[#00B5D8] px-6 py-3 text-base font-bold text-white shadow-md transition hover:bg-[#2B569A]"
          >
            Mengerti, Terima Kasih!
          </button>
        </div>
      </div>
    ) : null;

  if (isInitializing) {
    return <div className="flex min-h-screen w-full items-center justify-center bg-[#2B569A] text-white">Memuat...</div>;
  }

  if (currentPage === 'login') {
    return <LoginPage onBackHome={() => navigateTo('home')} onNavigateDaftar={handleNavigateDaftar} onLoginSuccess={(role) => { setUserRole(role); refreshProfile(); replaceTo(homeForRole(role)); }} />;
  }

  if (currentPage === 'register') {
    return <RegisterPage onBackHome={() => navigateTo('home')} onNavigateLogin={handleNavigateLogin} />;
  }

  // ✅ Render halaman statis publik (FAQ, Kontak, Privasi, Ketentuan)
  if (currentPage === 'faq' || currentPage === 'contact' || currentPage === 'privacy' || currentPage === 'terms') {
    return (
      <div className="flex min-h-screen w-full flex-col bg-[#2B569A]">
        <Navbar {...navbarProps} />
        <main className="flex-1 bg-white">
          {currentPage === 'faq' && <FAQPage onBackHome={() => navigateTo('home')} />}
          {currentPage === 'contact' && <ContactPage onBackHome={() => navigateTo('home')} />}
          {currentPage === 'privacy' && <PrivacyPage onBackHome={() => navigateTo('home')} />}
          {currentPage === 'terms' && <TermsPage onBackHome={() => navigateTo('home')} />}
        </main>
        <Footer onNavigate={handleFooterNavigate} />
      </div>
    );
  }

  if (currentPage === 'admin-login') {
    return <AdminLoginPage onBackHome={() => navigateTo('home')} onLoginSuccess={(role) => { setUserRole(role); refreshProfile(); replaceTo('admin-pending'); }} />;
  }

  if (currentPage === 'admin-pending') {
    if (!isLoggedIn || userRole !== 'admin') return loginFallback('admin-pending');
    return (
      <div className="flex min-h-screen w-full flex-col bg-[#2B569A]">
        <Navbar {...navbarProps} onNavigateChat={() => navigateTo('admin-pending')} onNavigateCurhat={() => navigateTo('admin-pending')} />
        <main className="flex-1 bg-[#F3F8FC]"><AdminPendingPage /></main>
      </div>
    );
  }

  if (currentPage === 'teacher-inbox') {
    if (!isLoggedIn || userRole !== 'teacher') return loginFallback('teacher-inbox');
    return (
      <div className="flex min-h-screen w-full flex-col bg-[#2B569A]">
        <Navbar {...navbarProps} onNavigateChat={() => navigateTo('teacher-inbox')} onNavigateCurhat={() => navigateTo('teacher-inbox')} />
        <main className="flex-1 bg-[#F3F8FC]"><TeacherInboxPage onOpenChat={handleOpenChat} /></main>
      </div>
    );
  }

  if (currentPage === 'chat-room' && currentRoomId && chatPeer) {
    if (!isLoggedIn || !currentUser) return loginFallback('chat-room');
    return <ChatRoomPage roomId={currentRoomId} currentUser={currentUser} peerData={chatPeer} onBack={handleBackFromChat} />;
  }

  if (currentPage === 'profile') {
    if (!isLoggedIn) return loginFallback('profile');
    return (
      <div className="flex min-h-screen w-full flex-col bg-[#2B569A]">
        <Navbar {...navbarProps} />
        <main className="flex-1 bg-white">
          <ProfilePage role={userRole === 'admin' ? 'teacher' : userRole || 'student'} onBackHome={() => navigateTo(homeForRole(userRole))} />
        </main>
        <Footer onNavigate={handleFooterNavigate} />
      </div>
    );
  }

  if (currentPage === 'quiz-intro') {
    if (!isLoggedIn) return loginFallback('quiz-intro');
    return <QuizIntroPage onStartQuiz={() => navigateTo('quiz')} onBackHome={() => navigateTo('home')} />;
  }

  if (currentPage === 'quiz') {
    if (!isLoggedIn) return loginFallback('quiz-intro');
    return <QuizPage onFinish={(finalScore) => { setScore(finalScore); navigateTo('reward'); }} onBackHome={() => navigateTo('home')} />;
  }

  if (currentPage === 'reward') {
    return <RewardPage score={score} totalQuestions={10} onRestart={() => navigateTo('quiz-intro')} onBackHome={() => navigateTo('home')} />;
  }

  if (currentPage === 'material') {
    if (!isLoggedIn) return loginFallback('material');
    return (
      <div className="flex min-h-screen w-full flex-col bg-[#2B569A]">
        <Navbar {...navbarProps} />
        <main className="flex-1 bg-white">
          <MaterialDetailPage onStartQuiz={handleStartQuiz} onBackHome={() => navigateTo(homeForRole(userRole))} />
        </main>
        <Footer onNavigate={handleFooterNavigate} />
      </div>
    );
  }

  if (currentPage === 'curhat') {
    if (!isLoggedIn) return loginFallback('curhat');
    return (
      <>
        <BlockedModal />
        <div className="flex min-h-screen w-full flex-col bg-[#2B569A]">
          <Navbar {...navbarProps} onNavigateChat={() => navigateTo('curhat')} onNavigateCurhat={() => navigateTo('curhat')} />
          <main className="flex-1 bg-white">
            <CurhatStudentPage currentUser={currentUser} onBackHome={() => navigateTo('home')} onOpenChat={(roomId: number, teacherData: ChatTeacherInfo) => handleOpenChat(roomId, teacherData)} />
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <BlockedModal />
      <div className="flex min-h-screen w-full flex-col bg-[#2B569A]">
        <Navbar {...navbarProps} />
        <main className="flex-1 bg-white">
          <HeroSection onStartCurhat={handleStartCurhat} />
          <AnimatedSection>
            <FeaturesSection currentUser={currentUser} onStartCurhat={handleStartCurhat} onOpenMaterial={handleOpenMaterial} onStartQuiz={handleStartQuiz} />
          </AnimatedSection>
          <AnimatedSection>
            <QuizCTASection onStartQuiz={handleStartQuiz} />
          </AnimatedSection>
          <AnimatedSection>
            <StatsSection />
          </AnimatedSection>
        </main>
        <Footer onNavigate={handleFooterNavigate} />
      </div>
    </>
  );
}

export default App;