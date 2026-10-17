import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { PageTransition } from './components/motion/PageTransition';

// Buyer Pages B1 - B7
import { MasukPage } from './pages/buyer/MasukPage';
import { DaftarPage } from './pages/buyer/DaftarPage';
import { BerandaPage } from './pages/buyer/BerandaPage';
import { CariPage } from './pages/buyer/CariPage';
import { DetailMobilPage } from './pages/buyer/DetailMobilPage';
import { BookingPage } from './pages/buyer/BookingPage';
import { BookingSuccessPage } from './pages/buyer/BookingSuccessPage';
import { PreferensiPage } from './pages/buyer/PreferensiPage';

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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {!isAdminRoute && <Navbar />}
      <main className="flex-1">
        <PageTransition>
          <Routes location={location}>
            {/* Buyer Screens B1 - B7 */}
            <Route path="/" element={<BerandaPage />} />
            <Route path="/welcome" element={<MasukPage />} />
            <Route path="/login" element={<MasukPage />} />
            <Route path="/daftar" element={<DaftarPage />} />
            <Route path="/preferensi" element={<PreferensiPage />} />
            <Route path="/preferensi-pembeli" element={<PreferensiPage />} />
            <Route path="/cari" element={<CariPage />} />
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
      {!isAdminRoute && <Footer />}
    </div>
  );
}
