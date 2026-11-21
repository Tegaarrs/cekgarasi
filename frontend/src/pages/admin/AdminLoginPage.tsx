import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { Spinner } from '@/components/motion/Spinner';
import { apiFetch, setToken, setUser } from '@/services/api';
import { resetFavoriteCache } from '@/services/favoriteStore';
import {
  AlertCircle,
  ShieldCheck,
  BarChart3,
  Database,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowLeft,
  PieChart,
  Users,
} from 'lucide-react';

export function AdminLoginPage() {
  const navigate = useNavigate();
  const shouldReduce = useReducedMotion();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const data = await apiFetch<{
        access_token: string;
        user: { id: number; nama: string; email: string; role: string };
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (data.user.role !== 'admin') {
        throw new Error(
          'Akses ditolak: Akun ini adalah akun Pembeli. Silakan gunakan akun Administrator Dealer.'
        );
      }

      setToken(data.access_token);
      setUser(data.user);
      resetFavoriteCache();
      navigate('/admin/bi', { replace: true });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Kredensial administrator tidak valid.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemoAdmin = () => {
    setErrorMessage('');
    setEmail('admin@cekgarasi.test');
    setPassword('adminsecretpassword123');
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-white flex flex-col justify-between relative overflow-hidden">
      {/* Subtle Ambient Executive Grid & Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.18),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(91,78,240,0.16),transparent_45%)]"
      />

      {/* Top Executive Bar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0B0F1C]/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <img
            src="/images/logo.png"
            alt="Logo CekGarasi"
            className="h-10 w-10 rounded-full object-contain ring-1 ring-white/20 bg-slate-900"
          />
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-blue-400 block">
              EXECUTIVE CONTROL ROOM
            </span>
            <span className="font-display text-lg font-extrabold text-white">
              CekGarasi Portal Administrator
            </span>
          </div>
        </div>

        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-4 py-2 text-xs sm:text-sm font-semibold text-slate-200 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Beranda Pembeli</span>
        </Link>
      </header>

      {/* Main Two-Column Executive Admin Login */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10">
        <motion.div
          initial={shouldReduce ? { opacity: 1 } : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          className="w-full max-w-[980px] rounded-3xl border border-white/15 bg-[#0F1629]/95 shadow-[0_28px_80px_rgba(0,0,0,0.65)] overflow-hidden grid grid-cols-1 lg:grid-cols-12"
        >
          {/* Left Column: Admin BI K-Means System Overview */}
          <aside className="lg:col-span-6 bg-gradient-to-br from-[#102048] via-[#0D1836] to-[#090E20] p-7 sm:p-9 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/20 border border-blue-400/30 px-3.5 py-1.5 text-xs font-bold text-blue-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Akses Khusus Dealer &amp; Administrator</span>
              </div>

              <h1 className="mt-5 font-display text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                Portal Analitik BI K-Means &amp; Manajemen Showroom
              </h1>
              <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                Halaman autentikasi khusus administrator untuk mengelola segmentasi stok K-Means (K=3), evaluasi klaster, manajemen pengguna, dan eksplorasi database secara langsung.
              </p>
            </div>

            <div className="my-6 space-y-3">
              {[
                {
                  icon: BarChart3,
                  title: 'Dashboard BI K-Means',
                  desc: 'Monitoring real-time KPI, sebaran harga vs tahun, dan analisis stok per segmen.',
                },
                {
                  icon: PieChart,
                  title: 'Evaluasi & Validasi Klaster',
                  desc: 'Pengujian Elbow Method, Silhouette Score, dan komparasi skenario model.',
                },
                {
                  icon: Users,
                  title: 'Manajemen Pengguna & Database',
                  desc: 'Audit identitas pendaftar, status verifikasi OTP email, dan SQL console.',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex items-start gap-3.5 rounded-2xl bg-white/[0.04] border border-white/10 p-3.5"
                >
                  <div className="p-2 rounded-xl bg-blue-600/25 border border-blue-400/30 text-blue-300 shrink-0">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">{item.title}</div>
                    <div className="text-xs text-slate-300 mt-0.5 leading-relaxed">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-white/10">
              <span className="inline-flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span>Database Terhubung</span>
              </span>
              <span>CekGarasi Control Room v2.0</span>
            </div>
          </aside>

          {/* Right Column: Dedicated Admin Credentials Form */}
          <section className="lg:col-span-6 p-7 sm:p-10 flex flex-col justify-center bg-[#0D1322]">
            <div className="mb-6">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                Autentikasi Administrator
              </span>
              <h2 className="mt-1 font-display text-2xl font-extrabold text-white">
                Masuk ke Portal Admin
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Masukkan kredensial resmi administrator CekGarasi untuk membuka Dashboard BI K-Means.
              </p>
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="mb-5 rounded-xl border border-rose-500/40 bg-rose-500/15 p-3.5 text-xs sm:text-sm text-rose-200 flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label
                  htmlFor="admin-login-email"
                  className="block text-xs sm:text-sm font-semibold text-slate-300 mb-1.5"
                >
                  Email Administrator
                </label>
                <div className="relative">
                  <input
                    id="admin-login-email"
                    type="email"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    placeholder="admin@cekgarasi.test"
                    className="w-full rounded-xl border border-slate-700 bg-[#131C31] pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label
                  htmlFor="admin-login-password"
                  className="block text-xs sm:text-sm font-semibold text-slate-300 mb-1.5"
                >
                  Kata Sandi Administrator
                </label>
                <div className="relative">
                  <input
                    id="admin-login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    placeholder="Masukkan kata sandi admin"
                    className="w-full rounded-xl border border-slate-700 bg-[#131C31] pl-10 pr-10 py-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                    aria-label={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] py-3.5 px-4 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition-all cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Spinner size={18} />
                    <span>Memverifikasi Akses Admin...</span>
                  </>
                ) : (
                  <>
                    <BarChart3 className="w-4 h-4" />
                    <span>Masuk ke Dashboard BI K-Means</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Fill Admin Demo & Link to Buyer Login */}
            <div className="mt-6 pt-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <button
                type="button"
                onClick={handleFillDemoAdmin}
                className="w-full sm:w-auto rounded-lg border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 px-3.5 py-2 font-semibold text-blue-300 cursor-pointer transition-colors"
              >
                Isi Kredensial Admin Default
              </button>

              <Link
                to="/masuk"
                className="text-slate-400 hover:text-white font-medium underline-offset-4 hover:underline"
              >
                Halaman Login Pembeli &rarr;
              </Link>
            </div>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
