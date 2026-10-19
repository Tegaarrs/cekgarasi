import { useState, useEffect } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
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

// Admin Pages A1 - A5 & Database
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminLayout } from './components/layout/AdminLayout';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminSegmentasiPage } from './pages/admin/AdminSegmentasiPage';
import { AdminInventoriPage } from './pages/admin/AdminInventoriPage';
import { AdminLeadsPage } from './pages/admin/AdminLeadsPage';
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

    return () => {
      unsubToast();
      clearTimeout(hideTimer);
      window.removeEventListener('cekgarasi:show_login_prompt', handleShowLogin);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {!isAdminRoute && (
        <>
          <div className="hidden md:block">
            <Navbar />
          </div>
          {isMobileTopBarRoute && <MobileTopBar />}
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
            <Route path="/favorit" element={<PlaceholderPage title="Mobil Favorit Kamu" />} />
            <Route path="/akun" element={<PlaceholderPage title="Profil & Akun Kamu" />} />
            <Route path="/mobil/:id" element={<DetailMobilPage />} />
            <Route path="/booking" element={<BookingPage />} />
            <Route path="/booking-sukses" element={<BookingSuccessPage />} />

            {/* Admin Screens A1 - A5 & Database */}
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="segmentasi" element={<AdminSegmentasiPage />} />
              <Route path="inventori" element={<AdminInventoriPage />} />
              <Route path="leads" element={<AdminLeadsPage />} />
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
  );
}
