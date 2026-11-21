import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  AlertCircle,
  Eye,
  EyeOff,
  Mail,
  User,
  Lock,
  CheckCircle2,
  MapPin,
  ArrowLeft,
  Phone,
  Check,
} from 'lucide-react';
import { Spinner } from '@/components/motion/Spinner';
import { apiFetch, setToken, setUser } from '@/services/api';
import {
  getPendingFavorite,
  processPendingFavorite,
  sanitizeInternalPath,
} from '@/services/favoriteStore';

export type AuthFlowView = 'signin' | 'signup' | 'recover' | 'reset_password';

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

function BrandCarHeader() {
  return (
    <Link
      to="/"
      className="inline-flex items-center justify-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-xl"
    >
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-blue-600/10 dark:bg-blue-500/20 border border-blue-500/30 p-1 flex items-center justify-center shadow-2xs">
          <img
            src="/images/logo.png"
            alt="CekGarasi"
            className="w-full h-full object-contain rounded-full"
          />
        </div>
        <span className="font-display text-2xl font-extrabold tracking-tight text-[#2563EB] dark:text-[#60A5FA]">
          CekGarasi
        </span>
      </div>
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
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Buyer Registration states (no OTP)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [noHp, setNoHp] = useState('');
  const [kotaDomisili, setKotaDomisili] = useState('Jakarta Selatan');
  const [alamatDomisili, setAlamatDomisili] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Recover & Reset Password states (direct reset without OTP)
  const [recoverInput, setRecoverInput] = useState('');
  const [recoveredEmail, setRecoveredEmail] = useState('');
  const [recoveredPhone, setRecoveredPhone] = useState('');
  const [recoveredName, setRecoveredName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  // Status alerts
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  useEffect(() => {
    if (initialView) {
      setView(initialView);
    } else if (location.pathname === '/daftar') {
      setView('signup');
    } else if (location.pathname === '/masuk' || location.pathname === '/login') {
      setView('signin');
    }
  }, [location.pathname, initialView]);

  const clearAlerts = () => {
    setErrorMessage('');
    setInfoMessage('');
  };

  const switchView = (target: AuthFlowView) => {
    clearAlerts();
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

  // ==============================================================
  // 1. SIGN IN HANDLER
  // ==============================================================
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAlerts();
    setLoading(true);

    try {
      const data = await apiFetch<{
        access_token: string;
        user: AuthUserResponse;
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: loginIdentifier.trim(),
          password,
          remember_me: rememberMe,
        }),
      });

      await completeLoginRedirect(data.access_token, data.user);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Email / nomor telepon atau kata sandi tidak cocok.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ==============================================================
  // 2. BUYER REGISTRATION SUBMIT (DIRECT SAVE TO DB, NO OTP)
  // ==============================================================
  const handleBuyerRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAlerts();

    if (!firstName.trim()) {
      setErrorMessage('Nama depan (First name) wajib diisi.');
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Masukkan alamat email yang valid.');
      return;
    }
    const cleanPhone = noHp.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 9) {
      setErrorMessage('Masukkan nomor telepon aktif yang valid (contoh: 081234567890).');
      return;
    }
    if (!kotaDomisili.trim()) {
      setErrorMessage('Kota domisili wajib diisi.');
      return;
    }
    if (regPassword.length < 6) {
      setErrorMessage('Password minimal harus 6 karakter.');
      return;
    }
    if (regPassword !== confirmPassword) {
      setErrorMessage('Password dan Confirm password tidak cocok.');
      return;
    }
    if (!agreeTerms) {
      setErrorMessage('Harap setujui Terms & Conditions terlebih dahulu.');
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
          no_hp: noHp.trim(),
          no_telepon: noHp.trim(),
          kota_domisili: kotaDomisili.trim(),
          alamat_lengkap: alamatDomisili.trim() || `Domisili ${kotaDomisili.trim()}`,
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

  // ==============================================================
  // 3. RECOVER PASSWORD: VERIFY REGISTERED BUYER ACCOUNT (NO OTP)
  // ==============================================================
  const handleRecoverLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAlerts();

    if (!recoverInput.trim()) {
      setErrorMessage('Masukkan email atau nomor telepon akun pembeli Anda yang terdaftar.');
      return;
    }

    setLoading(true);
    try {
      const isEmail = recoverInput.includes('@');
      const res = await apiFetch<{
        status: string;
        email: string;
        no_hp: string;
        nama: string;
        message: string;
      }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({
          email: isEmail ? recoverInput.trim() : undefined,
          no_hp: !isEmail ? recoverInput.trim() : undefined,
        }),
      });

      setRecoveredEmail(res.email || '');
      setRecoveredPhone(res.no_hp || '');
      setRecoveredName(res.nama || '');
      setNewPassword('');
      setConfirmNewPassword('');
      setInfoMessage(res.message);
      setView('reset_password');
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Akun pembeli tidak ditemukan.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ==============================================================
  // 4. SUBMIT NEW PASSWORD DIRECTLY TO DB (NO OTP)
  // ==============================================================
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAlerts();

    if (newPassword.length < 6) {
      setErrorMessage('Password baru minimal harus 6 karakter.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMessage('Konfirmasi password baru tidak cocok.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch<{
        status: string;
        message: string;
        access_token: string;
        user: AuthUserResponse;
      }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: recoveredEmail || (recoverInput.includes('@') ? recoverInput.trim() : undefined),
          no_hp: recoveredPhone || (!recoverInput.includes('@') ? recoverInput.trim() : undefined),
          new_password: newPassword,
          confirm_password: confirmNewPassword,
        }),
      });

      await completeLoginRedirect(res.access_token, res.user);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Gagal memperbarui kata sandi.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#EEF2FA] dark:bg-[#0D0D14] text-[#0F172A] dark:text-slate-100 flex items-center justify-center px-3 py-6 sm:px-6 lg:px-8 transition-colors duration-200">
      <motion.div
        initial={shouldReduce ? { opacity: 1 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[1060px] rounded-[28px] bg-white dark:bg-[#161722] border border-slate-200/90 dark:border-[#2A2A38] shadow-[0_24px_64px_rgba(37,99,235,0.09)] dark:shadow-[0_24px_64px_rgba(0,0,0,0.6)] p-4 sm:p-6 lg:p-7 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch transition-colors duration-200"
      >
        {/* ============================================================ */}
        {/* LEFT COLUMN: Clean Chery OMODA 5 Photo without text overlays */}
        {/* ============================================================ */}
        <aside className="lg:col-span-6 relative rounded-[22px] overflow-hidden min-h-[240px] sm:min-h-[340px] lg:min-h-[600px] bg-slate-100 dark:bg-slate-900 shadow-sm">
          <img
            src="/images/omoda5-login.jpg"
            alt="Chery OMODA 5"
            className="absolute inset-0 w-full h-full object-cover object-center select-none"
          />
        </aside>

        {/* ============================================================ */}
        {/* RIGHT COLUMN: Buyer Auth Workspace (No OTP)                  */}
        {/* ============================================================ */}
        <section className="lg:col-span-6 flex flex-col justify-center px-2 sm:px-6 lg:px-8 py-4">
          <div className="my-auto w-full max-w-[420px] mx-auto">
            {isFavoritRedirect && view === 'signin' && (
              <div className="mb-4 rounded-xl border border-blue-200 dark:border-blue-500/40 bg-blue-50/80 dark:bg-blue-950/40 px-3.5 py-2.5 text-xs font-medium text-blue-900 dark:text-blue-200">
                Silakan masuk sebagai pembeli terlebih dahulu untuk mengakses mobil favorit Anda.
              </div>
            )}

            {errorMessage && (
              <div
                role="alert"
                className="mb-4 rounded-xl border border-rose-300 dark:border-rose-500/50 bg-rose-50 dark:bg-rose-950/60 px-3.5 py-2.5 text-xs font-medium text-rose-900 dark:text-rose-100 flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {infoMessage && !errorMessage && (
              <div
                role="status"
                className="mb-4 rounded-xl border border-blue-200 dark:border-blue-500/40 bg-blue-50/90 dark:bg-blue-950/50 px-3.5 py-2.5 text-xs font-medium text-blue-900 dark:text-blue-100"
              >
                <div className="leading-relaxed">{infoMessage}</div>
              </div>
            )}

            <AnimatePresence mode="wait">
              {/* ======================================================== */}
              {/* VIEW 1: SIGN IN TO YOUR ACCOUNT                          */}
              {/* ======================================================== */}
              {view === 'signin' && (
                <motion.div
                  key="signin"
                  initial={shouldReduce ? { opacity: 1 } : { opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={shouldReduce ? { opacity: 1 } : { opacity: 0, x: -16 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="text-center mb-6">
                    <BrandCarHeader />
                    <h1 className="mt-4 font-display text-2xl sm:text-[26px] font-extrabold text-[#0F172A] dark:text-white tracking-tight">
                      Sign In to your account
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                      Masuk menggunakan akun pembeli yang telah terdaftar
                    </p>
                  </div>

                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div>
                      <label
                        htmlFor="signin-identifier"
                        className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5"
                      >
                        Email atau Nomor Telepon Terdaftar
                      </label>
                      <div className="relative">
                        <input
                          id="signin-identifier"
                          type="text"
                          required
                          autoComplete="username"
                          value={loginIdentifier}
                          onChange={(e) => {
                            setLoginIdentifier(e.target.value);
                            if (errorMessage) setErrorMessage('');
                          }}
                          placeholder="nama@email.com atau 0812xxxxxxxx"
                          className="w-full rounded-xl border border-slate-200 dark:border-[#2A2A38] bg-white dark:bg-[#14141E] pl-3.5 pr-10 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                        />
                        <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="signin-password"
                        className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5"
                      >
                        Your password
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
                          className="w-full rounded-xl border border-slate-200 dark:border-[#2A2A38] bg-white dark:bg-[#14141E] pl-3.5 pr-10 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((p) => !p)}
                          aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-0.5">
                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="h-4 w-4 rounded-full border-slate-300 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                        />
                        <span>Remember me</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => switchView('recover')}
                        className="text-xs font-bold text-[#2563EB] dark:text-[#60A5FA] hover:underline cursor-pointer"
                      >
                        Recover Password
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] py-3 px-4 text-sm font-bold text-white shadow-md shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Spinner size={16} />
                          <span>Signing In...</span>
                        </>
                      ) : (
                        'Sign In'
                      )}
                    </button>
                  </form>

                  <div className="mt-6 pt-5 border-t border-slate-100 dark:border-[#2A2A38] text-center">
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                      Belum terdaftar sebagai pembeli?{' '}
                      <button
                        type="button"
                        onClick={() => switchView('signup')}
                        className="font-bold text-[#2563EB] dark:text-[#60A5FA] hover:underline cursor-pointer"
                      >
                        Daftar Sebagai Pembeli
                      </button>
                    </p>
                  </div>
                </motion.div>
              )}

              {/* ======================================================== */}
              {/* VIEW 2: FORM PENDAFTARAN PEMBELI (TANPA KODE OTP)        */}
              {/* ======================================================== */}
              {view === 'signup' && (
                <motion.div
                  key="signup"
                  initial={shouldReduce ? { opacity: 1 } : { opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={shouldReduce ? { opacity: 1 } : { opacity: 0, x: -16 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="text-center mb-5">
                    <BrandCarHeader />
                    <h1 className="mt-3 font-display text-2xl sm:text-[26px] font-extrabold text-[#0F172A] dark:text-white tracking-tight">
                      Daftar Sebagai Pembeli
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                      Lengkapi formulir pendaftaran di bawah ini untuk langsung membuat akun pembeli CekGarasi
                    </p>
                  </div>

                  <form onSubmit={handleBuyerRegisterSubmit} className="space-y-3.5">
                    {/* First name & Last name */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Nama Depan
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="Nama depan"
                            className="w-full rounded-xl border border-slate-200 dark:border-[#2A2A38] bg-white dark:bg-[#14141E] pl-3.5 pr-9 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                          <User className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Nama Belakang
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="Nama belakang"
                            className="w-full rounded-xl border border-slate-200 dark:border-[#2A2A38] bg-white dark:bg-[#14141E] pl-3.5 pr-9 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                          <User className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    {/* Email & No. Telepon */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Email
                        </label>
                        <div className="relative">
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="nama@email.com"
                            className="w-full rounded-xl border border-slate-200 dark:border-[#2A2A38] bg-white dark:bg-[#14141E] pl-3.5 pr-9 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                          <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          No. Telepon / WhatsApp
                        </label>
                        <div className="relative">
                          <input
                            type="tel"
                            required
                            value={noHp}
                            onChange={(e) => setNoHp(e.target.value)}
                            placeholder="081234567890"
                            className="w-full rounded-xl border border-slate-200 dark:border-[#2A2A38] bg-white dark:bg-[#14141E] pl-3.5 pr-9 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                          <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    {/* Domisili Pendaftar */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Kota Domisili
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            list="cekgarasi-domisili-list"
                            required
                            value={kotaDomisili}
                            onChange={(e) => setKotaDomisili(e.target.value)}
                            placeholder="Jakarta Selatan"
                            className="w-full rounded-xl border border-slate-200 dark:border-[#2A2A38] bg-white dark:bg-[#14141E] pl-3.5 pr-9 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                          <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <datalist id="cekgarasi-domisili-list">
                            {INDONESIAN_CITIES.map((city) => (
                              <option key={city} value={city} />
                            ))}
                          </datalist>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Alamat Domisili
                        </label>
                        <input
                          type="text"
                          required
                          value={alamatDomisili}
                          onChange={(e) => setAlamatDomisili(e.target.value)}
                          placeholder="Jl. Sudirman No. 10..."
                          className="w-full rounded-xl border border-slate-200 dark:border-[#2A2A38] bg-white dark:bg-[#14141E] px-3.5 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                    </div>

                    {/* Password & Confirm password */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showRegPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Minimal 6 karakter"
                          className="w-full rounded-xl border border-slate-200 dark:border-[#2A2A38] bg-white dark:bg-[#14141E] pl-3.5 pr-9 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPassword((p) => !p)}
                          aria-label={showRegPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Konfirmasi Password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Ulangi password Anda"
                          className="w-full rounded-xl border border-slate-200 dark:border-[#2A2A38] bg-white dark:bg-[#14141E] pl-3.5 pr-9 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((p) => !p)}
                          aria-label={showConfirmPassword ? 'Sembunyikan konfirmasi password' : 'Tampilkan konfirmasi password'}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {regPassword && regPassword === confirmPassword ? (
                            <CheckCircle2 className="w-4 h-4 text-blue-600" />
                          ) : showConfirmPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={agreeTerms}
                        onChange={(e) => setAgreeTerms(e.target.checked)}
                        className="h-4 w-4 rounded-full border-slate-300 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                      />
                      <span>
                        Saya menyetujui <strong className="text-[#2563EB] dark:text-[#60A5FA]">Syarat &amp; Ketentuan</strong>
                      </span>
                    </label>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] py-3 px-4 text-sm font-bold text-white shadow-md shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-2"
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
                      className="font-bold text-[#2563EB] dark:text-[#60A5FA] hover:underline cursor-pointer"
                    >
                      Sign In
                    </button>
                  </p>
                </motion.div>
              )}

              {/* ======================================================== */}
              {/* VIEW 3: RECOVER PASSWORD (CEK AKUN TERDAFTAR, TANPA OTP) */}
              {/* ======================================================== */}
              {view === 'recover' && (
                <motion.div
                  key="recover"
                  initial={shouldReduce ? { opacity: 1 } : { opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={shouldReduce ? { opacity: 1 } : { opacity: 0, x: -16 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="text-center mb-6">
                    <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center">
                      <div className="w-14 h-14 rounded-full bg-blue-100/80 dark:bg-blue-900/50 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-[#2563EB] text-white flex items-center justify-center shadow-md shadow-blue-600/30">
                          <Lock className="w-5 h-5" />
                        </div>
                      </div>
                    </div>

                    <h1 className="font-display text-2xl sm:text-[26px] font-extrabold text-[#0F172A] dark:text-white tracking-tight leading-snug">
                      Recover Password
                    </h1>
                    <p className="mt-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                      Masukkan email atau nomor telepon yang terdaftar untuk langsung mengatur ulang kata sandi akun Anda
                    </p>
                  </div>

                  <form onSubmit={handleRecoverLookup} className="space-y-4">
                    <div>
                      <label
                        htmlFor="recover-input"
                        className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5"
                      >
                        Email atau Nomor Telepon Terdaftar
                      </label>
                      <div className="relative">
                        <input
                          id="recover-input"
                          type="text"
                          required
                          value={recoverInput}
                          onChange={(e) => {
                            setRecoverInput(e.target.value);
                            if (errorMessage) setErrorMessage('');
                          }}
                          placeholder="nama@email.com atau 081234567890"
                          className="w-full rounded-xl border border-slate-200 dark:border-[#2A2A38] bg-white dark:bg-[#14141E] pl-3.5 pr-10 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                        <Mail className="w-4 h-4 text-blue-600 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] py-3 px-4 text-sm font-bold text-white shadow-md shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Spinner size={16} />
                          <span>Memeriksa Akun...</span>
                        </>
                      ) : (
                        'Lanjutkan Reset Password'
                      )}
                    </button>
                  </form>

                  <div className="mt-5 text-center">
                    <button
                      type="button"
                      onClick={() => switchView('signin')}
                      className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-[#2563EB] cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Kembali ke Sign In</span>
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ======================================================== */}
              {/* VIEW 4: RESET PASSWORD BARU (LANGSUNG, TANPA KODE OTP)   */}
              {/* ======================================================== */}
              {view === 'reset_password' && (
                <motion.div
                  key="reset_password"
                  initial={shouldReduce ? { opacity: 1 } : { opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={shouldReduce ? { opacity: 1 } : { opacity: 0, x: -16 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="text-center mb-5">
                    <div className="mx-auto mb-3 w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-[#2563EB] text-white flex items-center justify-center shadow-md shadow-blue-600/30">
                        <Check className="w-5 h-5 stroke-[2.5]" />
                      </div>
                    </div>

                    <h1 className="font-display text-2xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
                      Buat Kata Sandi Baru
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                      Atur kata sandi baru untuk akun{' '}
                      <strong className="text-slate-800 dark:text-slate-100">
                        {recoveredName || recoveredEmail || recoverInput}
                      </strong>
                    </p>
                  </div>

                  <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                        Password Baru
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Minimal 6 karakter"
                          className="w-full rounded-xl border border-slate-200 dark:border-[#2A2A38] bg-white dark:bg-[#14141E] pl-3.5 pr-10 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword((p) => !p)}
                          aria-label={showNewPassword ? 'Sembunyikan password baru' : 'Tampilkan password baru'}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                        Konfirmasi Password Baru
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmNewPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          placeholder="Ulangi password baru"
                          className="w-full rounded-xl border border-slate-200 dark:border-[#2A2A38] bg-white dark:bg-[#14141E] pl-3.5 pr-10 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmNewPassword((p) => !p)}
                          aria-label={showConfirmNewPassword ? 'Sembunyikan konfirmasi password baru' : 'Tampilkan konfirmasi password baru'}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                        >
                          {newPassword && newPassword === confirmNewPassword ? (
                            <CheckCircle2 className="w-4 h-4 text-blue-600" />
                          ) : showConfirmNewPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] py-3 px-4 text-sm font-bold text-white shadow-md shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Spinner size={16} />
                          <span>Memperbarui Kata Sandi...</span>
                        </>
                      ) : (
                        'Simpan Password Baru & Masuk'
                      )}
                    </button>
                  </form>

                  <div className="mt-5 text-center">
                    <button
                      type="button"
                      onClick={() => switchView('signin')}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Kembali ke Sign In</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </motion.div>
    </div>
  );
}
