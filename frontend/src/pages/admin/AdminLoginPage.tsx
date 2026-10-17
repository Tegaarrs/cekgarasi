import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { fadeUp, spring } from '@/lib/motion';
import { Spinner } from '@/components/motion/Spinner';
import { apiFetch, setToken, setUser } from '@/services/api';
import { ArrowRight } from 'lucide-react';

export function AdminLoginPage() {
  const navigate = useNavigate();
  const shouldReduce = useReducedMotion();

  const [email, setEmail] = useState('admin@cekgarasi.test');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [shakeCount, setShakeCount] = useState(0);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const data = await apiFetch<{ access_token: string; user: { id: number; nama: string; email: string; role: string } }>(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email: email.trim(), password }),
        }
      );

      if (data.user.role !== 'admin') {
        throw new Error('Akses ditolak: Akun ini bukan administrator dealer.');
      }

      setToken(data.access_token);
      setUser(data.user);
      navigate('/admin/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Kredensial dealer tidak valid.';
      setErrorMessage(msg);
      if (!shouldReduce) {
        setShakeCount((prev) => prev + 1);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-950">
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-20 filter blur-[2px]"
        style={{ backgroundImage: "url('/images/hero/hero-720.webp')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />

      <div className="relative z-10 w-full max-w-md">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          key={shakeCount}
          animate-shake={
            shakeCount > 0 && !shouldReduce
              ? { x: [0, -8, 8, -4, 4, 0], transition: { duration: 0.35 } }
              : undefined
          }
          className="rounded-2xl border border-white/10 bg-slate-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-white"
        >
          <div className="text-center mb-6">
            <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-slate-900/90 p-1 shadow-xl ring-2 ring-amber-400/40">
              <img src="/images/logo.png" alt="CekGarasi Logo" className="h-full w-full object-contain rounded-full" />
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Portal Dealer & Admin</h1>
            <p className="mt-1 text-xs text-slate-400">
              Akses analitik K-Means, manajemen inventori, dan monitoring leads
            </p>
          </div>

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

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Administrator</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@cekgarasi.test"
                className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
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
                className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
              {loading ? <Spinner size={18} /> : 'Masuk Dashboard Dealer'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-800 text-center">
            <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white">
              <span>Kembali ke Beranda Pembeli</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
