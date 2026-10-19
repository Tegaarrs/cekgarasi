import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { fadeUp, spring } from '@/lib/motion';
import { Spinner } from '@/components/motion/Spinner';
import { apiFetch, setToken, setUser } from '@/services/api';
import { getPendingFavorite, processPendingFavorite, sanitizeInternalPath } from '@/services/favoriteStore';
import { ArrowRight } from 'lucide-react';

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
      const msg = err instanceof Error ? err.message : 'Kredensial tidak valid.';
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
      {/* Background with luxury showroom image */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-25 filter blur-[2px]"
        style={{ backgroundImage: "url('/images/hero/hero-720.webp')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-slate-900/90" />

      <div className="relative z-10 w-full max-w-md">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          key={shakeCount}
          // Shake on login error: x: [0, -8, 8, -4, 4, 0] over 350ms, skipped under reduced motion
          custom={shakeCount}
          animate-shake={
            shakeCount > 0 && !shouldReduce
              ? { x: [0, -8, 8, -4, 4, 0], transition: { duration: 0.35 } }
              : undefined
          }
          className="rounded-2xl border border-white/10 bg-slate-900/85 p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-white"
        >
          <div className="text-center mb-6">
            <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-slate-900/90 p-1 shadow-xl ring-2 ring-amber-400/40">
              <img src="/images/logo.png" alt="CekGarasi Logo" className="h-full w-full object-contain rounded-full" />
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Masuk ke CekGarasi</h1>
            <p className="mt-1 text-sm text-slate-400">
              Akses rekomendasi mobil dan simpan mobil pilihan kamu
            </p>
          </div>

          {/* Favorit Redirect Notice */}
          {isFavoritRedirect && (
            <div className="mb-5 overflow-hidden rounded-xl border border-blue-500/30 bg-blue-500/15 p-3.5 text-xs text-blue-300 text-center font-medium">
              Masuk untuk melihat favorit kamu
            </div>
          )}

          {/* Error Banner with Slide Down */}
          {errorMessage && (
            <motion.div
              initial={shouldReduce ? { opacity: 0 } : { opacity: 0, y: -10, height: 0 }}
              animate={shouldReduce ? { opacity: 1 } : { opacity: 1, y: 0, height: 'auto' }}
              transition={spring.snappy}
              className="mb-5 overflow-hidden rounded-xl border border-rose-500/30 bg-rose-500/15 p-3.5 text-xs text-rose-300 flex items-start gap-2.5"
              role="alert"
            >
              <span className="font-bold">⚠️</span>
              <div className="flex-1">{errorMessage}</div>
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Kata Sandi</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-colors disabled:opacity-50"
            >
              {loading ? <Spinner size={18} /> : 'Masuk Sekarang'}
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
                className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                👤 Akun Pembeli
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('admin@cekgarasi.test')}
                className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                🛡️ Akun Admin
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-400">
            Belum punya akun?{' '}
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
