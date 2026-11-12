import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { fadeUp, spring } from '@/lib/motion';
import { Spinner } from '@/components/motion/Spinner';
import { apiFetch, setToken, setUser } from '@/services/api';
import { getPendingFavorite, processPendingFavorite, sanitizeInternalPath } from '@/services/favoriteStore';
import { ArrowRight, AlertCircle, User, ShieldCheck, Lock, Mail } from 'lucide-react';
import { Logo } from '@/components/common/Logo';

export function MasukPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const shouldReduce = useReducedMotion();

  const searchParams = new URLSearchParams(location.search);
  const nextParam = searchParams.get('next');
  const isFavoritRedirect = nextParam === '/favorit';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [shakeCount, setShakeCount] = useState(0);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const data = await apiFetch<{ access_token: string; user: { id: number; nama: string; email: string; role: string } }>(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        }
      );

      setToken(data.access_token);
      setUser(data.user);

      if (data.user.role === 'admin') {
        navigate('/admin/dashboard');
        return;
      }

      const pending = getPendingFavorite();
      if (pending) {
        await processPendingFavorite(navigate);
        return;
      }

      const safeNext = sanitizeInternalPath(nextParam, '/');
      navigate(safeNext);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Kredensial email atau kata sandi tidak sesuai.';
      setErrorMessage(msg);
      if (!shouldReduce) {
        setShakeCount((prev) => prev + 1);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (userEmail: string) => {
    setEmail(userEmail);
    if (userEmail.includes('admin')) {
      setPassword('adminsecretpassword123');
    } else {
      setPassword('buyersecretpassword123');
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-hidden bg-slate-900">
      {/* Background showroom image */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-20 filter blur-[3px]"
        style={{ backgroundImage: "url('/images/hero/hero-720.webp')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-slate-900/90" />

      <div className="relative z-10 w-full max-w-md">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          key={shakeCount}
          custom={shakeCount}
          animate-shake={
            shakeCount > 0 && !shouldReduce
              ? { x: [0, -8, 8, -4, 4, 0], transition: { duration: 0.35 } }
              : undefined
          }
          className="rounded-3xl ios-glass-card-dark p-6 sm:p-8 shadow-2xl text-white"
        >
          <div className="text-center mb-6">
            <div className="mx-auto mb-3 flex items-center justify-center">
              <Logo size="lg" showWordmark={false} />
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Masuk ke CekGarasi</h1>
            <p className="mt-1 text-xs text-slate-400">
              Akses rekomendasi mobil dan kelola mobil favorit Anda
            </p>
          </div>

          {/* Favorit Redirect Notice */}
          {isFavoritRedirect && (
            <div className="mb-5 overflow-hidden rounded-xl border border-blue-500/30 bg-blue-500/15 p-3 text-xs text-blue-300 text-center font-medium backdrop-blur-md">
              Silakan masuk untuk melihat daftar favorit Anda
            </div>
          )}

          {/* Error Banner with Lucide Icon */}
          {errorMessage && (
            <motion.div
              initial={shouldReduce ? { opacity: 0 } : { opacity: 0, y: -10, height: 0 }}
              animate={shouldReduce ? { opacity: 1 } : { opacity: 1, y: 0, height: 'auto' }}
              transition={spring.snappy}
              className="mb-5 overflow-hidden rounded-xl border border-rose-500/40 bg-rose-500/15 p-3.5 text-xs text-rose-300 flex items-start gap-2.5 backdrop-blur-md"
              role="alert"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">{errorMessage}</div>
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>Alamat Email</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="ios-glass-input-dark w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Kata Sandi</span>
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="ios-glass-input-dark w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="ios-glass-btn-primary w-full mt-2 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white shadow-lg disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Spinner size={18} /> : 'Masuk ke Akun'}
            </button>
          </form>

          {/* Quick Account Selector */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-center mb-3">
              Pilihan Masuk Cepat
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleDemoLogin('buyer@cekgarasi.test')}
                className="ios-glass-pill px-3 py-2 text-xs font-medium text-slate-200 border border-white/20 bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-blue-400" />
                <span>Akun Pembeli</span>
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('admin@cekgarasi.test')}
                className="ios-glass-pill px-3 py-2 text-xs font-medium text-slate-200 border border-white/20 bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Akun Admin</span>
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-400">
            Belum memiliki akun?{' '}
            <Link to="/daftar" className="text-blue-400 font-semibold hover:underline">
              Daftar sebagai Pembeli
            </Link>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800/60 text-center">
            <Link to="/cari" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white">
              <span>Jelajahi Katalog Tanpa Masuk</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
