import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { AlertCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Spinner } from '@/components/motion/Spinner';
import { apiFetch, setToken, setUser } from '@/services/api';
import {
  getPendingFavorite,
  processPendingFavorite,
  sanitizeInternalPath,
} from '@/services/favoriteStore';

export type AuthFlowView = 'signin' | 'signup';

interface AuthUserResponse {
  id: number;
  nama: string;
  nama_depan?: string;
  nama_belakang?: string;
  email: string;
  no_hp?: string;
  role: string;
  hp_terverifikasi?: number;
  kota_domisili?: string;
  auth_provider?: string;
}

const INDONESIAN_CITIES = [
  'Jakarta Selatan',
  'Jakarta Pusat',
  'Jakarta Barat',
  'Jakarta Timur',
  'Jakarta Utara',
  'Tangerang',
  'Tangerang Selatan',
  'Bekasi',
  'Depok',
  'Bogor',
  'Bandung',
  'Surabaya',
  'Semarang',
  'Yogyakarta',
  'Medan',
  'Makassar',
  'Denpasar',
  'Palembang',
  'Malang',
  'Balikpapan',
];

const INPUT_CLASS =
  'cg-auth-input w-full min-h-[44px] rounded-xl border border-[#C7D1DE] dark:border-[#2E2E40] bg-[#E6ECF3] dark:bg-[#16161F] px-3.5 py-2.5 text-sm text-[#161D2A] dark:text-[#E8E8F0] placeholder:text-[#55637A] dark:placeholder:text-[#9A9AB0] focus:bg-[#F1F4F8] dark:focus:bg-[#16161F] focus:border-[#2563EB] dark:focus:border-[#60A5FA] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30 dark:focus-visible:ring-[#60A5FA]/35 transition-colors';

function BrandCarHeader() {
  return (
    <Link
      to="/"
      className="inline-flex items-center justify-center gap-2.5 min-h-[44px] px-2 rounded-xl cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#161722]"
    >
      <div className="w-9 h-9 rounded-full bg-blue-600/10 dark:bg-blue-500/20 border border-blue-500/30 p-1 flex items-center justify-center shrink-0">
        <img
          src="/images/logo.png"
          alt="Logo CekGarasi"
          width={36}
          height={36}
          className="w-full h-full object-contain rounded-full"
        />
      </div>
      <span className="font-display text-2xl font-extrabold tracking-tight text-[#2563EB] dark:text-[#60A5FA]">
        CekGarasi
      </span>
    </Link>
  );
}

export function MasukPage({ initialView }: { initialView?: AuthFlowView }) {
  const navigate = useNavigate();
  const location = useLocation();
  const shouldReduce = useReducedMotion();

  const searchParams = new URLSearchParams(location.search);
  const nextParam = searchParams.get('next');
  const isFavoritRedirect = nextParam === '/favorit';

  const defaultView: AuthFlowView =
    initialView || (location.pathname === '/daftar' ? 'signup' : 'signin');

  const [view, setView] = useState<AuthFlowView>(defaultView);

  // Sign In states
  const [loginEmail, setLoginEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Buyer Registration states (direct email + profile registration)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [kotaDomisili, setKotaDomisili] = useState('Jakarta Selatan');
  const [alamatDomisili, setAlamatDomisili] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Status alerts
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (initialView) {
      setView(initialView);
    } else if (location.pathname === '/daftar') {
      setView('signup');
    } else if (location.pathname === '/masuk' || location.pathname === '/login') {
      setView('signin');
    }
  }, [location.pathname, initialView]);

  const switchView = (target: AuthFlowView) => {
    setErrorMessage('');
    setView(target);
  };

  const completeLoginRedirect = async (token: string, user: AuthUserResponse) => {
    setToken(token);
    setUser(user);

    if (user.role === 'admin') {
      navigate('/admin/bi', { replace: true });
      return;
    }

    const pending = getPendingFavorite();
    if (pending) {
      await processPendingFavorite(navigate);
      return;
    }

    const safeNext = sanitizeInternalPath(nextParam, '/');
    navigate(safeNext);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const data = await apiFetch<{
        access_token: string;
        user: AuthUserResponse;
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: loginEmail.trim().toLowerCase(),
          password,
          remember_me: rememberMe,
        }),
      });

      await completeLoginRedirect(data.access_token, data.user);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Email atau kata sandi tidak cocok.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBuyerRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!firstName.trim()) {
      setErrorMessage('Nama depan wajib diisi.');
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Masukkan alamat email yang valid.');
      return;
    }
    if (!kotaDomisili.trim()) {
      setErrorMessage('Kota domisili wajib diisi.');
      return;
    }
    if (!alamatDomisili.trim()) {
      setErrorMessage('Alamat domisili wajib diisi.');
      return;
    }
    if (regPassword.length < 6) {
      setErrorMessage('Password minimal harus 6 karakter.');
      return;
    }
    if (regPassword !== confirmPassword) {
      setErrorMessage('Password dan Konfirmasi Password tidak cocok.');
      return;
    }
    if (!agreeTerms) {
      setErrorMessage('Harap setujui Syarat & Ketentuan terlebih dahulu.');
      return;
    }

    setLoading(true);
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const res = await apiFetch<{
        access_token: string;
        user: AuthUserResponse;
        message: string;
      }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          nama: fullName,
          nama_depan: firstName.trim(),
          nama_belakang: lastName.trim(),
          email: cleanEmail,
          kota_domisili: kotaDomisili.trim(),
          alamat_lengkap: alamatDomisili.trim(),
          password: regPassword,
          confirm_password: confirmPassword,
          auth_provider: 'email',
        }),
      });

      await completeLoginRedirect(res.access_token, res.user);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Gagal memproses pendaftaran pembeli.'
      );
    } finally {
      setLoading(false);
    }
  };

  const passwordMatches =
    regPassword.length >= 6 && confirmPassword.length > 0 && regPassword === confirmPassword;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#E4E9F0] dark:bg-[#0D0D14] text-[#161D2A] dark:text-[#E8E8F0] flex items-center justify-center px-3 py-6 sm:px-6 lg:px-8 transition-colors duration-200 overflow-x-hidden">
      <motion.div
        initial={shouldReduce ? { opacity: 1 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[1060px] rounded-[24px] bg-[#F1F4F8] dark:bg-[#161722] border border-[#C7D1DE] dark:border-[#2A2A38] shadow-[0_18px_48px_rgba(15,23,42,0.08)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.55)] p-4 sm:p-6 lg:p-7 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch transition-colors duration-200"
      >
        {/* Left column: Chery OMODA 5 showcase photo */}
        <aside className="lg:col-span-6 relative rounded-[18px] overflow-hidden aspect-[4/3] sm:aspect-[16/10] lg:aspect-auto lg:min-h-[580px] bg-slate-100 dark:bg-[#11121A]">
          <img
            src="/images/omoda5-login.jpg"
            alt="Chery OMODA 5 di showroom CekGarasi"
            width={736}
            height={981}
            fetchPriority="high"
            className="absolute inset-0 w-full h-full object-cover object-center select-none"
          />
        </aside>

        {/* Right column: Buyer Sign In & Registration Workspace */}
        <section className="lg:col-span-6 flex flex-col justify-center px-1 sm:px-5 lg:px-7 py-2 sm:py-4">
          <div className="my-auto w-full max-w-[420px] mx-auto">
            {isFavoritRedirect && view === 'signin' && (
              <div className="mb-4 rounded-xl border border-blue-200 dark:border-blue-500/40 bg-blue-50/90 dark:bg-blue-950/40 px-3.5 py-2.5 text-xs font-medium text-blue-900 dark:text-blue-200">
                Silakan masuk sebagai pembeli terlebih dahulu untuk mengakses mobil favorit Anda.
              </div>
            )}

            {errorMessage && (
              <div
                role="alert"
                className="mb-4 rounded-xl border border-rose-300 dark:border-rose-500/50 bg-rose-50 dark:bg-rose-950/60 px-3.5 py-2.5 text-xs font-medium text-rose-900 dark:text-rose-100 flex items-start gap-2"
              >
                <AlertCircle
                  aria-hidden="true"
                  className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5"
                />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            <AnimatePresence mode="wait">
              {view === 'signin' && (
                <motion.div
                  key="signin"
                  initial={shouldReduce ? { opacity: 1 } : { opacity: 0, x: 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={shouldReduce ? { opacity: 1 } : { opacity: 0, x: -14 }}
                  transition={{ duration: 0.18 }}
                >
                  <div className="text-center mb-6">
                    <BrandCarHeader />
                    <h1 className="mt-3 font-display text-2xl sm:text-[26px] font-extrabold text-[#0F172A] dark:text-white tracking-tight">
                      Sign In to your account
                    </h1>
                    <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                      Masuk menggunakan akun pembeli yang telah terdaftar
                    </p>
                  </div>

                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div>
                      <label
                        htmlFor="signin-email"
                        className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
                      >
                        Email
                      </label>
                      <input
                        id="signin-email"
                        type="email"
                        required
                        autoComplete="email"
                        value={loginEmail}
                        onChange={(e) => {
                          setLoginEmail(e.target.value);
                          if (errorMessage) setErrorMessage('');
                        }}
                        placeholder="nama@email.com"
                        className={INPUT_CLASS}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="signin-password"
                        className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
                      >
                        Password
                      </label>
                      <div className="relative">
                        <input
                          id="signin-password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          autoComplete="current-password"
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            if (errorMessage) setErrorMessage('');
                          }}
                          placeholder="Masukkan kata sandi"
                          className={`${INPUT_CLASS} pr-12`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                          className="absolute right-0.5 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                        >
                          {showPassword ? (
                            <EyeOff aria-hidden="true" className="w-4 h-4" />
                          ) : (
                            <Eye aria-hidden="true" className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <label
                        htmlFor="signin-remember"
                        className="inline-flex items-center gap-2.5 min-h-[44px] text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer select-none"
                      >
                        <input
                          id="signin-remember"
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-[#2563EB] focus:ring-[#2563EB] accent-[#2563EB] cursor-pointer"
                        />
                        <span>Remember me</span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full min-h-[46px] rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] py-3 px-4 text-sm font-bold text-white shadow-sm transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#161722]"
                    >
                      {loading ? (
                        <>
                          <Spinner size={16} />
                          <span>Memproses Masuk...</span>
                        </>
                      ) : (
                        'Sign In'
                      )}
                    </button>
                  </form>

                  <div className="mt-6 pt-5 border-t border-[#C7D1DE]/80 dark:border-[#2A2A38] text-center space-y-2.5">
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                      Belum terdaftar sebagai pembeli?{' '}
                      <button
                        type="button"
                        onClick={() => switchView('signup')}
                        className="inline-flex items-center min-h-[44px] px-1 font-bold text-[#2563EB] dark:text-[#60A5FA] hover:underline cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                      >
                        Daftar Sebagai Pembeli
                      </button>
                    </p>

                    <div className="flex justify-center">
                      <Link
                        to="/admin/login"
                        className="inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-[36px] px-3.5 py-1.5 rounded-lg border border-[#C7D1DE] dark:border-[#2E2E40] bg-[#DCE3EC]/80 dark:bg-[#1B1D2B] hover:bg-[#CFD8E4] dark:hover:bg-[#25283B] text-xs font-semibold text-[#1E293B] dark:text-slate-200 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                      >
                        <ShieldCheck aria-hidden="true" className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#60A5FA]" />
                        <span>Login Sebagai Administrator</span>
                      </Link>
                    </div>
                  </div>
                </motion.div>
              )}

              {view === 'signup' && (
                <motion.div
                  key="signup"
                  initial={shouldReduce ? { opacity: 1 } : { opacity: 0, x: 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={shouldReduce ? { opacity: 1 } : { opacity: 0, x: -14 }}
                  transition={{ duration: 0.18 }}
                >
                  <div className="text-center mb-5">
                    <BrandCarHeader />
                    <h1 className="mt-3 font-display text-2xl sm:text-[26px] font-extrabold text-[#0F172A] dark:text-white tracking-tight">
                      Daftar Sebagai Pembeli
                    </h1>
                    <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                      Lengkapi formulir pendaftaran untuk langsung membuat akun pembeli CekGarasi
                    </p>
                  </div>

                  <form onSubmit={handleBuyerRegisterSubmit} className="space-y-3.5">
                    {/* Nama Depan & Nama Belakang */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="signup-first-name"
                          className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1"
                        >
                          Nama Depan
                        </label>
                        <input
                          id="signup-first-name"
                          type="text"
                          required
                          autoComplete="given-name"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="Nama depan"
                          className={INPUT_CLASS}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="signup-last-name"
                          className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1"
                        >
                          Nama Belakang
                        </label>
                        <input
                          id="signup-last-name"
                          type="text"
                          autoComplete="family-name"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Nama belakang"
                          className={INPUT_CLASS}
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label
                        htmlFor="signup-email"
                        className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1"
                      >
                        Email
                      </label>
                      <input
                        id="signup-email"
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nama@email.com"
                        className={INPUT_CLASS}
                      />
                    </div>

                    {/* Domisili Pendaftar */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="signup-city"
                          className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1"
                        >
                          Kota Domisili
                        </label>
                        <input
                          id="signup-city"
                          type="text"
                          list="cekgarasi-domisili-list"
                          required
                          value={kotaDomisili}
                          onChange={(e) => setKotaDomisili(e.target.value)}
                          placeholder="Jakarta Selatan"
                          className={INPUT_CLASS}
                        />
                        <datalist id="cekgarasi-domisili-list">
                          {INDONESIAN_CITIES.map((city) => (
                            <option key={city} value={city} />
                          ))}
                        </datalist>
                      </div>

                      <div>
                        <label
                          htmlFor="signup-address"
                          className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1"
                        >
                          Alamat Domisili
                        </label>
                        <input
                          id="signup-address"
                          type="text"
                          required
                          autoComplete="street-address"
                          value={alamatDomisili}
                          onChange={(e) => setAlamatDomisili(e.target.value)}
                          placeholder="Jl. Sudirman No. 10..."
                          className={INPUT_CLASS}
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div>
                      <label
                        htmlFor="signup-password"
                        className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1"
                      >
                        Password
                      </label>
                      <div className="relative">
                        <input
                          id="signup-password"
                          type={showRegPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          autoComplete="new-password"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Minimal 6 karakter"
                          className={`${INPUT_CLASS} pr-12`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPassword((prev) => !prev)}
                          aria-label={showRegPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                          className="absolute right-0.5 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                        >
                          {showRegPassword ? (
                            <EyeOff aria-hidden="true" className="w-4 h-4" />
                          ) : (
                            <Eye aria-hidden="true" className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Konfirmasi Password */}
                    <div>
                      <label
                        htmlFor="signup-confirm-password"
                        className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1"
                      >
                        Konfirmasi Password
                      </label>
                      <div className="relative">
                        <input
                          id="signup-confirm-password"
                          type={showConfirmPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          autoComplete="new-password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Ulangi password Anda"
                          className={`${INPUT_CLASS} pr-12`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          aria-label={
                            showConfirmPassword
                              ? 'Sembunyikan konfirmasi password'
                              : 'Tampilkan konfirmasi password'
                          }
                          className="absolute right-0.5 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                        >
                          {showConfirmPassword ? (
                            <EyeOff aria-hidden="true" className="w-4 h-4" />
                          ) : (
                            <Eye aria-hidden="true" className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      {confirmPassword.length > 0 && (
                        <p
                          className={`mt-1 text-xs font-medium ${
                            passwordMatches
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-rose-700 dark:text-rose-400'
                          }`}
                        >
                          {passwordMatches
                            ? 'Konfirmasi password cocok.'
                            : 'Konfirmasi password belum cocok.'}
                        </p>
                      )}
                    </div>

                    <label
                      htmlFor="signup-terms"
                      className="inline-flex items-center gap-2.5 min-h-[44px] text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer select-none"
                    >
                      <input
                        id="signup-terms"
                        type="checkbox"
                        checked={agreeTerms}
                        onChange={(e) => setAgreeTerms(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-[#2563EB] focus:ring-[#2563EB] accent-[#2563EB] cursor-pointer"
                      />
                      <span>
                        Saya menyetujui{' '}
                        <strong className="font-bold text-[#2563EB] dark:text-[#60A5FA]">
                          Syarat &amp; Ketentuan
                        </strong>
                      </span>
                    </label>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full min-h-[46px] rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] py-3 px-4 text-sm font-bold text-white shadow-sm transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#161722]"
                    >
                      {loading ? (
                        <>
                          <Spinner size={16} />
                          <span>Mendaftarkan Akun Pembeli...</span>
                        </>
                      ) : (
                        'Daftar Sebagai Pembeli'
                      )}
                    </button>
                  </form>

                  <p className="mt-4 text-center text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                    Sudah terdaftar sebagai pembeli?{' '}
                    <button
                      type="button"
                      onClick={() => switchView('signin')}
                      className="inline-flex items-center min-h-[44px] px-1 font-bold text-[#2563EB] dark:text-[#60A5FA] hover:underline cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                    >
                      Sign In
                    </button>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </motion.div>
    </div>
  );
}
