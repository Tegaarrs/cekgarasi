import { useState, useEffect } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { MobileTopBar } from './components/layout/MobileTopBar';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { PageTransition } from './components/motion/PageTransition';
import { Toast } from './components/motion/Toast';
import { LoginPrompt } from './components/common/LoginPrompt';
import { subscribeToast, ToastState } from './services/favoriteStore';

// Buyer Pages B1 - B7 & Mobile Additions
import { MasukPage } from './pages/buyer/MasukPage';
import { DaftarPage } from './pages/buyer/DaftarPage';
import { BerandaPage } from './pages/buyer/BerandaPage';
import { CariPage } from './pages/buyer/CariPage';
import { DetailMobilPage } from './pages/buyer/DetailMobilPage';
import { BookingPage } from './pages/buyer/BookingPage';
import { BookingSuccessPage } from './pages/buyer/BookingSuccessPage';
import { PreferensiPage } from './pages/buyer/PreferensiPage';
import { SegmenPage } from './pages/buyer/SegmenPage';
import { PlaceholderPage } from './pages/buyer/PlaceholderPage';
import { FavoritPage } from './pages/buyer/FavoritPage';
import { BandingkanPage } from './pages/buyer/BandingkanPage';
import { MetodologiPage } from './pages/buyer/MetodologiPage';
import { CompareTray } from './components/common/CompareTray';

// Admin Pages A1 - A5 & Database
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminLayout } from './components/layout/AdminLayout';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminBIPage } from './pages/admin/AdminBIPage';
import { AdminSegmentasiPage } from './pages/admin/AdminSegmentasiPage';
import { AdminInventoriPage } from './pages/admin/AdminInventoriPage';
import { AdminLeadsPage } from './pages/admin/AdminLeadsPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { DatabaseExplorerPage } from './pages/admin/DatabaseExplorerPage';

export default function App() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin') && location.pathname !== '/admin/login';
  const isMobileTopBarRoute = ['/', '/cari', '/segmen', '/favorit', '/akun'].includes(location.pathname);

  const [toastState, setToastState] = useState<ToastState>({
    show: false,
    message: '',
    type: 'info',
  });

  const [loginPromptState, setLoginPromptState] = useState<{
    isOpen: boolean;
    title?: string;
    description?: string;
  }>({
    isOpen: false,
  });

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout>;
    const unsubToast = subscribeToast((toast) => {
      setToastState(toast);
      if (toast.show) {
        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => {
          setToastState((prev) => ({ ...prev, show: false }));
        }, 5000);
      }
    });

    const handleShowLogin = (e: Event) => {
      const customEvent = e as CustomEvent<{ title?: string; description?: string }>;
      setLoginPromptState({
        isOpen: true,
        title: customEvent.detail?.title,
        description: customEvent.detail?.description,
      });
    };

    window.addEventListener('cekgarasi:show_login_prompt', handleShowLogin);

    // Global Material Design Coordinate-Based Ripple Effect on clicks
    const handlePointerDown = (e: PointerEvent) => {
      const target = (e.target as HTMLElement)?.closest(
        'button, .cg-btn, a, .cg-card, [role="button"], input[type="submit"]'
      ) as HTMLElement | null;
      if (!target) return;

      const rect = target.getBoundingClientRect();
      const diameter = Math.max(rect.width, rect.height) * 1.5;
      const radius = diameter / 2;

      const ripple = document.createElement('span');
      ripple.className = 'cg-ripple-element';
      ripple.style.width = `${diameter}px`;
      ripple.style.height = `${diameter}px`;
      ripple.style.left = `${e.clientX - rect.left - radius}px`;
      ripple.style.top = `${e.clientY - rect.top - radius}px`;

      const computedPos = window.getComputedStyle(target).position;
      if (computedPos === 'static') {
        target.style.position = 'relative';
      }
      target.style.overflow = 'hidden';

      target.appendChild(ripple);
      setTimeout(() => {
        ripple.remove();
      }, 550);
    };

    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      unsubToast();
      clearTimeout(hideTimer);
      window.removeEventListener('cekgarasi:show_login_prompt', handleShowLogin);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-[#F6F6FB] dark:bg-[#0D0D14] text-[#14141F] dark:text-[#E8E8F0] flex flex-col font-sans transition-colors duration-200">
        {/* Editorial Top Navigation Progress Bar for Page Transitions */}
        <motion.div
          key={location.pathname}
          initial={{ scaleX: 0, opacity: 1, transformOrigin: '0% 50%' }}
          animate={{ scaleX: [0, 0.75, 1], opacity: [1, 1, 0] }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400 z-[99999] pointer-events-none shadow-[0_0_12px_rgba(37,99,235,0.8)]"
        />
        {!isAdminRoute && (
          <>
            <div className="hidden md:block sticky top-0 z-[1000] w-full">
              <Navbar />
            </div>
            {isMobileTopBarRoute && (
              <div className="md:hidden sticky top-0 z-[1000] w-full">
                <MobileTopBar />
              </div>
            )}
          </>
        )}
        <main className="flex-1 pb-20 md:pb-0">
          <PageTransition>
            <Routes location={location}>
              {/* Buyer Screens B1 - B7 */}
              <Route path="/" element={<BerandaPage />} />
              <Route path="/welcome" element={<MasukPage />} />
              <Route path="/login" element={<MasukPage />} />
              <Route path="/masuk" element={<MasukPage />} />
              <Route path="/daftar" element={<DaftarPage />} />
              <Route path="/preferensi" element={<PreferensiPage />} />
              <Route path="/preferensi-pembeli" element={<PreferensiPage />} />
              <Route path="/cari" element={<CariPage />} />
              <Route path="/segmen" element={<SegmenPage />} />
              <Route path="/favorit" element={<FavoritPage />} />
              <Route path="/bandingkan" element={<BandingkanPage />} />
              <Route path="/metodologi" element={<MetodologiPage />} />
              <Route path="/akun" element={<PlaceholderPage title="Profil & Akun Anda" />} />
              <Route path="/mobil/:id" element={<DetailMobilPage />} />
              <Route path="/booking" element={<BookingPage />} />
              <Route path="/booking-sukses" element={<BookingSuccessPage />} />

              {/* Admin Screens A1 - A5 & Database */}
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboardPage />} />
                <Route path="bi" element={<AdminBIPage />} />
                <Route path="dashboard" element={<AdminDashboardPage />} />
                <Route path="segmentasi" element={<AdminSegmentasiPage />} />
                <Route path="inventori" element={<AdminInventoriPage />} />
                <Route path="leads" element={<AdminLeadsPage />} />
                <Route path="pengguna" element={<AdminUsersPage />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="database" element={<DatabaseExplorerPage />} />
              </Route>

              {/* Database Explorer Redirect for backwards compatibility */}
              <Route path="/database" element={<Navigate to="/admin/database" replace />} />
            </Routes>
          </PageTransition>
        </main>
        {!isAdminRoute && (
          <>
            <div className="hidden md:block">
              <Footer />
            </div>
            <MobileBottomNav />
            <CompareTray />
          </>
        )}

        <Toast
          show={toastState.show}
          message={toastState.message}
          type={toastState.type}
          action={toastState.action}
          onClose={() => setToastState((prev) => ({ ...prev, show: false }))}
        />

        <LoginPrompt
          isOpen={loginPromptState.isOpen}
          onClose={() => setLoginPromptState((prev) => ({ ...prev, isOpen: false }))}
          title={loginPromptState.title}
          description={loginPromptState.description}
        />
      </div>
    </ThemeProvider>
  );
}
