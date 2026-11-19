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
  RefreshCw,
  ExternalLink,
  Check,
  X,
  Settings,
} from 'lucide-react';
import { Spinner } from '@/components/motion/Spinner';
import { apiFetch, setToken, setUser } from '@/services/api';
import {
  getPendingFavorite,
  processPendingFavorite,
  sanitizeInternalPath,
} from '@/services/favoriteStore';

export type AuthFlowView = 'signin' | 'signup' | 'about' | 'recover' | 'thankyou';

interface EmailNotificationPayload {
  subjek: string;
  pengirim: string;
  penerima: string;
  pesan: string;
  waktu_kirim: string;
  smtp_terkirim: boolean;
  smtp_configured?: boolean;
  smtp_error?: string;
}

interface AuthUserResponse {
  id: number;
  nama: string;
  nama_depan?: string;
  nama_belakang?: string;
  email: string;
  role: string;
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

function GoogleIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"
      />
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"
      />
      <path
        fill="#FBBC05"
        d="M5.3 14.8c-.2-.8-.4-1.8-.4-2.8s.2-2 .4-2.8L1.6 6.4C.6 8.4 0 10.6 0 12s.6 3.6 1.6 5.6l3.7-2.8z"
      />
      <path
        fill="#34A853"
        d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5l-3.7 2.8C3.5 19.9 7.4 23 12 23z"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#1877F2" />
      <path
        fill="#FFFFFF"
        d="M15.12 15.2l.42-2.75h-2.64v-1.78c0-.75.37-1.48 1.55-1.48h1.2V6.85s-1.09-.19-2.13-.19c-2.17 0-3.59 1.32-3.59 3.7v2.09H7.5v2.75h2.43v6.65a9.6 9.6 0 002.97 0V15.2h2.22z"
      />
    </svg>
  );
}

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
  const [thankYouContext, setThankYouContext] = useState<'register' | 'recover'>('register');

  // Shared & Sign In states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Sign Up & Tell us about yourself states
  const [agreeSignupTerms, setAgreeSignupTerms] = useState(true);
  const [agreeProfileTerms, setAgreeProfileTerms] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [kotaDomisili, setKotaDomisili] = useState('Jakarta Selatan');
  const [alamatDomisili, setAlamatDomisili] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [kodeOtp, setKodeOtp] = useState('');
  const [authProvider, setAuthProvider] = useState<'email' | 'google' | 'facebook'>('email');

  // Recover & Reset Password states
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetSuccessDone, setResetSuccessDone] = useState(false);

  // Gmail SMTP Status & Configuration Modal states
  const [smtpConfigured, setSmtpConfigured] = useState<boolean>(false);
  const [smtpSenderEmail, setSmtpSenderEmail] = useState<string>('');
  const [smtpAppPassword, setSmtpAppPassword] = useState<string>('');
  const [showSmtpModal, setShowSmtpModal] = useState<boolean>(false);
  const [smtpSaving, setSmtpSaving] = useState<boolean>(false);

  // Social OAuth Modal states (Google & Facebook)
  const [socialModalProvider, setSocialModalProvider] = useState<'google' | 'facebook' | null>(null);
  const [socialEmailInput, setSocialEmailInput] = useState('');
  const [socialNameInput, setSocialNameInput] = useState('');

  // Status states
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [pendingRegisteredToken, setPendingRegisteredToken] = useState<string | null>(null);
  const [pendingRegisteredUser, setPendingRegisteredUser] = useState<AuthUserResponse | null>(null);

  useEffect(() => {
    if (initialView) {
      setView(initialView);
    } else if (location.pathname === '/daftar') {
      setView('signup');
    } else if (location.pathname === '/masuk' || location.pathname === '/login') {
      setView('signin');
    }
  }, [location.pathname, initialView]);

  // Check Gmail SMTP configuration status on mount
  useEffect(() => {
    apiFetch<{ configured: boolean; smtp_user: string }>('/auth/smtp-status')
      .then((res) => {
        setSmtpConfigured(Boolean(res.configured));
        if (res.smtp_user) setSmtpSenderEmail(res.smtp_user);
      })
      .catch(() => {});
  }, []);

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
  // 1. SIGN IN HANDLER (Screen 1)
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
          email: email.trim(),
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

  // ==============================================================
  // 2. SIGN UP STEP 1 -> SEND OTP TO GMAIL (Screen 2 -> Screen 3)
  // ==============================================================
  const handleSignUpStart = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAlerts();

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Masukkan alamat email yang valid terlebih dahulu.');
      return;
    }
    if (!agreeSignupTerms) {
      setErrorMessage('Harap setujui Terms & Privacy untuk melanjutkan pendaftaran.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch<{
        status: string;
        email: string;
        message: string;
        email_notification: EmailNotificationPayload;
      }>('/auth/request-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: cleanEmail,
          purpose: 'register',
          provider: 'email',
        }),
      });

      setAuthProvider('email');
      // Do NOT auto-fill kodeOtp on the website! User checks their Gmail inbox.
      setKodeOtp('');
      if (res.email_notification) {
        setSmtpConfigured(Boolean(res.email_notification.smtp_configured));
      }
      if (res.email_notification?.smtp_terkirim) {
        setInfoMessage(
          `Kode OTP 6 digit telah dikirim ke kotak masuk Gmail (${cleanEmail}). Silakan periksa Gmail Anda dan masukkan kodenya di bawah.`
        );
      } else {
        setInfoMessage(
          `Permintaan OTP untuk ${cleanEmail} tercatat. Hubungkan Gmail SMTP (App Password) agar kode OTP masuk langsung ke kotak masuk Gmail Anda.`
        );
      }
      setView('about');
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Gagal mengirim kode OTP ke email.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async (purpose: 'register' | 'reset_password') => {
    clearAlerts();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;

    setLoading(true);
    try {
      const res = await apiFetch<{
        status: string;
        message: string;
        email_notification: EmailNotificationPayload;
      }>('/auth/request-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: cleanEmail,
          purpose,
          provider: authProvider,
        }),
      });

      setKodeOtp('');
      if (res.email_notification) {
        setSmtpConfigured(Boolean(res.email_notification.smtp_configured));
      }
      if (res.email_notification?.smtp_terkirim) {
        setInfoMessage(`Kode OTP baru telah dikirim langsung ke Gmail ${cleanEmail}.`);
      } else {
        setInfoMessage(`OTP baru dibuat untuk ${cleanEmail}. Silakan aktifkan Gmail SMTP jika email belum masuk.`);
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Gagal mengirim ulang kode OTP.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ==============================================================
  // 3. TELL US ABOUT YOURSELF SUBMIT (Screen 3 -> DB -> Screen 5)
  // ==============================================================
  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAlerts();

    if (!firstName.trim()) {
      setErrorMessage('Nama depan (First name) wajib diisi.');
      return;
    }
    if (!kotaDomisili.trim()) {
      setErrorMessage('Domisili pendaftar wajib diisi.');
      return;
    }
    if (!kodeOtp.trim() || kodeOtp.trim().length < 4) {
      setErrorMessage('Masukkan kode OTP 6 digit yang dikirimkan ke email Anda.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password minimal harus 6 karakter.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Password dan Confirm password tidak cocok.');
      return;
    }
    if (!agreeProfileTerms) {
      setErrorMessage('Harap setujui Terms & Conditions terlebih dahulu.');
      return;
    }

    setLoading(true);
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const res = await apiFetch<{
        access_token: string;
        user: AuthUserResponse;
      }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          nama: fullName,
          nama_depan: firstName.trim(),
          nama_belakang: lastName.trim(),
          email: email.trim().toLowerCase(),
          password,
          confirm_password: confirmPassword,
          kode_otp: kodeOtp.trim(),
          kota_domisili: kotaDomisili.trim(),
          alamat_lengkap: alamatDomisili.trim() || `Domisili ${kotaDomisili.trim()}`,
          auth_provider: authProvider,
        }),
      });

      setToken(res.access_token);
      setUser(res.user);
      setPendingRegisteredToken(res.access_token);
      setPendingRegisteredUser(res.user);
      setThankYouContext('register');
      setView('thankyou');
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Gagal menyimpan pendaftaran ke database.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ==============================================================
  // 4. RECOVER PASSWORD HANDLER (Screen 4 -> Screen 5)
  // ==============================================================
  const handleRecoverPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAlerts();

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Masukkan alamat email terdaftar Anda.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch<{
        status: string;
        email: string;
        nama: string;
        message: string;
        email_notification: EmailNotificationPayload;
      }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: cleanEmail }),
      });

      setKodeOtp('');
      if (res.email_notification) {
        setSmtpConfigured(Boolean(res.email_notification.smtp_configured));
      }
      setResetSuccessDone(false);
      setNewPassword('');
      setConfirmNewPassword('');
      setThankYouContext('recover');
      if (res.email_notification?.smtp_terkirim) {
        setInfoMessage(`Kode OTP pemulihan kata sandi telah dikirim ke Gmail ${cleanEmail}.`);
      } else {
        setInfoMessage(res.message);
      }
      setView('thankyou');
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Gagal memproses permintaan pemulihan password.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ==============================================================
  // 5. RESET PASSWORD SUBMIT ON SCREEN 5 (Updates DB!)
  // ==============================================================
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAlerts();

    if (!kodeOtp.trim()) {
      setErrorMessage('Masukkan kode OTP 6 digit dari email Gmail Anda.');
      return;
    }
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
          email: email.trim().toLowerCase(),
          kode_otp: kodeOtp.trim(),
          new_password: newPassword,
          confirm_password: confirmNewPassword,
        }),
      });

      setToken(res.access_token);
      setUser(res.user);
      setPendingRegisteredToken(res.access_token);
      setPendingRegisteredUser(res.user);
      setPassword(newPassword);
      setResetSuccessDone(true);
      setInfoMessage(res.message);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Gagal mereset password.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ==============================================================
  // 6. SAVE GMAIL SMTP CONFIG & AUTO-RESEND OTP TO GMAIL
  // ==============================================================
  const handleSaveGmailSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAlerts();
    setSmtpSaving(true);
    try {
      const res = await apiFetch<{
        status: string;
        configured: boolean;
        smtp_user: string;
        message: string;
      }>('/auth/smtp-config', {
        method: 'POST',
        body: JSON.stringify({
          smtp_user: smtpSenderEmail.trim(),
          smtp_pass: smtpAppPassword.trim(),
          smtp_host: 'smtp.gmail.com',
          smtp_port: 587,
          test_recipient: email.trim() || smtpSenderEmail.trim(),
        }),
      });

      setSmtpConfigured(true);
      setShowSmtpModal(false);
      setInfoMessage(res.message);

      // If user already entered an email in Sign Up / Recover, immediately resend real OTP to their Gmail
      if (email.trim() && (view === 'about' || view === 'thankyou')) {
        await handleResendOtp(thankYouContext === 'recover' ? 'reset_password' : 'register');
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Gagal menyimpan pengaturan Gmail SMTP.'
      );
    } finally {
      setSmtpSaving(false);
    }
  };

  // ==============================================================
  // 7. GOOGLE & FACEBOOK OAUTH HANDLER
  // ==============================================================
  const openSocialModal = (provider: 'google' | 'facebook') => {
    clearAlerts();
    setSocialModalProvider(provider);
    setSocialEmailInput(email.trim() || '');
    setSocialNameInput('');
  };

  const handleSocialAuthSubmit = async (
    e: React.FormEvent,
    presetEmail?: string,
    presetName?: string
  ) => {
    e.preventDefault();
    if (!socialModalProvider) return;
    clearAlerts();

    const targetEmail = (presetEmail ?? socialEmailInput).trim().toLowerCase();
    const targetName = (presetName ?? socialNameInput).trim();

    if (!targetEmail || !targetEmail.includes('@')) {
      setErrorMessage(
        `Masukkan alamat email akun ${socialModalProvider === 'google' ? 'Google' : 'Facebook'} Anda.`
      );
      return;
    }

    const provider = socialModalProvider;
    setSocialModalProvider(null);
    setLoading(true);

    try {
      const parts = targetName.split(' ');
      const fName = parts[0] || targetEmail.split('@')[0].replace(/[._]/g, ' ');
      const lName = parts.slice(1).join(' ');

      const res = await apiFetch<{
        status: 'authenticated' | 'needs_onboarding';
        is_new_user: boolean;
        provider: 'google' | 'facebook';
        email?: string;
        nama_depan?: string;
        nama_belakang?: string;
        message: string;
        access_token?: string;
        user?: AuthUserResponse;
        email_notification?: EmailNotificationPayload;
      }>('/auth/social', {
        method: 'POST',
        body: JSON.stringify({
          provider,
          email: targetEmail,
          nama: targetName || undefined,
          nama_depan: fName,
          nama_belakang: lName,
          mode: view === 'signup' ? 'signup' : 'signin',
        }),
      });

      if (res.status === 'authenticated' && res.access_token && res.user) {
        await completeLoginRedirect(res.access_token, res.user);
        return;
      }

      setEmail(res.email || targetEmail);
      setFirstName(res.nama_depan || fName);
      setLastName(res.nama_belakang || lName);
      setAuthProvider(provider);
      setKodeOtp('');
      if (res.email_notification) {
        setSmtpConfigured(Boolean(res.email_notification.smtp_configured));
      }
      setInfoMessage(res.message);
      setView('about');
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : `Autentikasi ${provider === 'google' ? 'Google' : 'Facebook'} gagal.`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpenGmailInbox = () => {
    window.open('https://mail.google.com/mail/u/0/#inbox', '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#EEF2FA] dark:bg-[#0D0D14] text-[#0F172A] dark:text-slate-100 flex items-center justify-center px-3 py-6 sm:px-6 lg:px-8 transition-colors duration-200">
      {/* Main Unified Two-Column Card matching the 5 reference screens */}
      <motion.div
        initial={shouldReduce ? { opacity: 1 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[1060px] rounded-[28px] bg-white dark:bg-[#161722] border border-slate-200/90 dark:border-[#2A2A38] shadow-[0_24px_64px_rgba(37,99,235,0.09)] dark:shadow-[0_24px_64px_rgba(0,0,0,0.6)] p-4 sm:p-6 lg:p-7 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch transition-colors duration-200"
      >
        {/* ============================================================ */}
        {/* LEFT COLUMN: Clean Chery OMODA 5 Photo without text overlays */}
        {/* ============================================================ */}
        <aside className="lg:col-span-6 relative rounded-[22px] overflow-hidden min-h-[260px] sm:min-h-[340px] lg:min-h-[620px] bg-slate-100 dark:bg-slate-900 shadow-sm">
          <img
            src="/images/omoda5-login.jpg"
            alt="Chery OMODA 5"
            className="absolute inset-0 w-full h-full object-cover object-center select-none"
          />
        </aside>

        {/* ============================================================ */}
        {/* RIGHT COLUMN: Clean Blue Theme Authentication Workspace      */}
        {/* ============================================================ */}
        <section className="lg:col-span-6 flex flex-col justify-center px-2 sm:px-6 lg:px-8 py-4">
          <div className="my-auto w-full max-w-[410px] mx-auto">
            {isFavoritRedirect && view === 'signin' && (
              <div className="mb-4 rounded-xl border border-blue-200 dark:border-blue-500/40 bg-blue-50/80 dark:bg-blue-950/40 px-3.5 py-2.5 text-xs font-medium text-blue-900 dark:text-blue-200">
                Silakan masuk terlebih dahulu untuk mengakses mobil favorit Anda.
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
                className="mb-4 rounded-xl border border-blue-200 dark:border-blue-500/40 bg-blue-50/90 dark:bg-blue-950/50 px-3.5 py-2.5 text-xs font-medium text-blue-900 dark:text-blue-100 space-y-1.5"
              >
                <div className="leading-relaxed">{infoMessage}</div>
                {!smtpConfigured && (
                  <button
                    type="button"
                    onClick={() => setShowSmtpModal(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2563EB] dark:text-[#60A5FA] hover:underline cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Hubungkan Pengirim Gmail SMTP</span>
                  </button>
                )}
              </div>
            )}

            <AnimatePresence mode="wait">
              {/* ======================================================== */}
              {/* SCREEN 1: SIGN IN TO YOUR ACCOUNT (Image 1)              */}
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
                      Enter your details to proceed further
                    </p>
                  </div>

                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div>
                      <label
                        htmlFor="signin-email"
                        className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5"
                      >
                        Email
                      </label>
                      <div className="relative">
                        <input
                          id="signin-email"
                          type="email"
                          required
                          autoComplete="email"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (errorMessage) setErrorMessage('');
                          }}
                          placeholder="debra.holt@example.com"
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

                  {/* Divider Or */}
                  <div className="relative my-5 flex items-center justify-center">
                    <div className="border-t border-slate-200 dark:border-[#2A2A38] w-full" />
                    <span className="bg-white dark:bg-[#161722] px-3 text-xs font-semibold text-slate-400">
                      Or
                    </span>
                    <div className="border-t border-slate-200 dark:border-[#2A2A38] w-full" />
                  </div>

                  {/* Social Login Buttons (Google & Facebook) */}
                  <div className="space-y-2.5">
                    <button
                      type="button"
                      onClick={() => openSocialModal('google')}
                      className="w-full rounded-xl border border-slate-200 dark:border-[#2A2A38] bg-white dark:bg-[#14141E] hover:bg-slate-50 dark:hover:bg-white/5 py-2.5 px-4 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2.5 transition-colors cursor-pointer shadow-2xs"
                    >
                      <GoogleIcon />
                      <span>Sign In with Google</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openSocialModal('facebook')}
                      className="w-full rounded-xl border border-slate-200 dark:border-[#2A2A38] bg-white dark:bg-[#14141E] hover:bg-slate-50 dark:hover:bg-white/5 py-2.5 px-4 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2.5 transition-colors cursor-pointer shadow-2xs"
                    >
                      <FacebookIcon />
                      <span>Sign In with Facebook</span>
                    </button>
                  </div>

                  <p className="mt-5 text-center text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                    Belum punya akun?{' '}
                    <button
                      type="button"
                      onClick={() => switchView('signup')}
                      className="font-bold text-[#2563EB] dark:text-[#60A5FA] hover:underline cursor-pointer"
                    >
                      Sign Up
                    </button>
                  </p>
                </motion.div>
              )}

              {/* ======================================================== */}
              {/* SCREEN 2: SIGN UP TO GETTING STARTED (Image 2)           */}
              {/* ======================================================== */}
              {view === 'signup' && (
                <motion.div
                  key="signup"
                  initial={shouldReduce ? { opacity: 1 } : { opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={shouldReduce ? { opacity: 1 } : { opacity: 0, x: -16 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="text-center mb-6">
                    <BrandCarHeader />
                    <h1 className="mt-4 font-display text-2xl sm:text-[26px] font-extrabold text-[#0F172A] dark:text-white tracking-tight">
                      Sign Up to getting started
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                      Enter your details to proceed further
                    </p>
                  </div>

                  <form onSubmit={handleSignUpStart} className="space-y-4">
                    <div>
                      <label
                        htmlFor="signup-email"
                        className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5"
                      >
                        Email
                      </label>
                      <div className="relative">
                        <input
                          id="signup-email"
                          type="email"
                          required
                          autoComplete="email"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (errorMessage) setErrorMessage('');
                          }}
                          placeholder="debra.holt@example.com"
                          className="w-full rounded-xl border border-slate-200 dark:border-[#2A2A38] bg-white dark:bg-[#14141E] pl-3.5 pr-10 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                        />
                        <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={agreeSignupTerms}
                        onChange={(e) => setAgreeSignupTerms(e.target.checked)}
                        className="h-4 w-4 rounded-full border-slate-300 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                      />
                      <span>
                        I agree with <strong className="text-[#2563EB] dark:text-[#60A5FA]">Terms &amp; Privacy</strong>
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
                          <span>Mengirim OTP ke Gmail...</span>
                        </>
                      ) : (
                        'Sign Up'
                      )}
                    </button>
                  </form>

                  {/* Divider Or */}
                  <div className="relative my-5 flex items-center justify-center">
                    <div className="border-t border-slate-200 dark:border-[#2A2A38] w-full" />
                    <span className="bg-white dark:bg-[#161722] px-3 text-xs font-semibold text-slate-400">
                      Or
                    </span>
                    <div className="border-t border-slate-200 dark:border-[#2A2A38] w-full" />
                  </div>

                  {/* Social Sign Up Buttons */}
                  <div className="space-y-2.5">
                    <button
                      type="button"
                      onClick={() => openSocialModal('google')}
                      className="w-full rounded-xl border border-slate-200 dark:border-[#2A2A38] bg-white dark:bg-[#14141E] hover:bg-slate-50 dark:hover:bg-white/5 py-2.5 px-4 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2.5 transition-colors cursor-pointer shadow-2xs"
                    >
                      <GoogleIcon />
                      <span>Sign Up with Google</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openSocialModal('facebook')}
                      className="w-full rounded-xl border border-slate-200 dark:border-[#2A2A38] bg-white dark:bg-[#14141E] hover:bg-slate-50 dark:hover:bg-white/5 py-2.5 px-4 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2.5 transition-colors cursor-pointer shadow-2xs"
                    >
                      <FacebookIcon />
                      <span>Sign Up with Facebook</span>
                    </button>
                  </div>

                  <p className="mt-5 text-center text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                    Sudah punya akun?{' '}
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
              {/* SCREEN 3: TELL US ABOUT YOURSELF + DOMISILI (No Slip Gaji) */}
              {/* ======================================================== */}
              {view === 'about' && (
                <motion.div
                  key="about"
                  initial={shouldReduce ? { opacity: 1 } : { opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={shouldReduce ? { opacity: 1 } : { opacity: 0, x: -16 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="text-center mb-5">
                    <BrandCarHeader />
                    <h1 className="mt-3 font-display text-2xl sm:text-[26px] font-extrabold text-[#0F172A] dark:text-white tracking-tight">
                      Tell us about yourself
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                      Enter your details to proceed further
                    </p>
                  </div>

                  <form onSubmit={handleCompleteProfile} className="space-y-3.5">
                    {/* Email */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                          Email
                        </label>
                        {authProvider !== 'email' && (
                          <span className="text-[11px] font-bold uppercase text-blue-600 dark:text-blue-400">
                            Via {authProvider}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="debra.holt@example.com"
                          className="w-full rounded-xl border border-slate-200 dark:border-[#2A2A38] bg-slate-50/70 dark:bg-[#14141E] pl-3.5 pr-10 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                        <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    {/* Kode OTP Email Verification (Sent to Gmail) */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                          Kode OTP Gmail (6 Digit)
                        </label>
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={handleOpenGmailInbox}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2563EB] dark:text-[#60A5FA] hover:underline cursor-pointer"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Buka Gmail</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResendOtp('register')}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Kirim Ulang OTP</span>
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={kodeOtp}
                        onChange={(e) => setKodeOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="Masukkan 6 digit kode OTP dari Gmail Anda"
                        className="w-full rounded-xl border border-slate-200 dark:border-[#2A2A38] bg-white dark:bg-[#14141E] px-3.5 py-2 text-sm font-mono font-bold tracking-widest text-slate-900 dark:text-white placeholder:font-sans placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    {/* First name & Last name */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          First name
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="First name"
                            className="w-full rounded-xl border border-slate-200 dark:border-[#2A2A38] bg-white dark:bg-[#14141E] pl-3.5 pr-9 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                          <User className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Last name
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="Last name"
                            className="w-full rounded-xl border border-slate-200 dark:border-[#2A2A38] bg-white dark:bg-[#14141E] pl-3.5 pr-9 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                          <User className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                            placeholder="Contoh: Jakarta Selatan"
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
                          type={showPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          className="w-full rounded-xl border border-slate-200 dark:border-[#2A2A38] bg-white dark:bg-[#14141E] pl-3.5 pr-9 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((p) => !p)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Confirm password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Enter your password"
                          className="w-full rounded-xl border border-slate-200 dark:border-[#2A2A38] bg-white dark:bg-[#14141E] pl-3.5 pr-9 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((p) => !p)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {password && password === confirmPassword ? (
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
                        checked={agreeProfileTerms}
                        onChange={(e) => setAgreeProfileTerms(e.target.checked)}
                        className="h-4 w-4 rounded-full border-slate-300 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                      />
                      <span>
                        I agree with <strong className="text-[#2563EB] dark:text-[#60A5FA]">Terms &amp; Conditions</strong>
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
                          <span>Processing...</span>
                        </>
                      ) : (
                        'Continue'
                      )}
                    </button>
                  </form>
                </motion.div>
              )}

              {/* ======================================================== */}
              {/* SCREEN 4: LOST YOUR PASSWORD? RECOVER (Image 4)          */}
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
                      Lost your Password?
                      <span className="block">Enter your details to recover</span>
                    </h1>
                    <p className="mt-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                      Enter your details to proceed further
                    </p>
                  </div>

                  <form onSubmit={handleRecoverPassword} className="space-y-4">
                    <div>
                      <label
                        htmlFor="recover-email"
                        className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5"
                      >
                        Email
                      </label>
                      <div className="relative">
                        <input
                          id="recover-email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (errorMessage) setErrorMessage('');
                          }}
                          placeholder="tanya.hill@example.com"
                          className="w-full rounded-xl border border-slate-200 dark:border-[#2A2A38] bg-white dark:bg-[#14141E] pl-3.5 pr-10 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                        <CheckCircle2
                          className={`w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 ${
                            email.includes('@') ? 'text-[#2563EB]' : 'text-slate-300 dark:text-slate-600'
                          }`}
                        />
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
                          <span>Mengirim ke Gmail...</span>
                        </>
                      ) : (
                        'Recover'
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
                      <span>Back to Sign In</span>
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ======================================================== */}
              {/* SCREEN 5: THANK YOU! OPEN GMAIL & CONFIRM (Image 5)      */}
              {/* ======================================================== */}
              {view === 'thankyou' && (
                <motion.div
                  key="thankyou"
                  initial={shouldReduce ? { opacity: 1 } : { opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={shouldReduce ? { opacity: 1 } : { opacity: 0, x: -16 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="text-center mb-5">
                    <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center">
                      <div className="w-14 h-14 rounded-full bg-blue-100/80 dark:bg-blue-900/50 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-[#2563EB] text-white flex items-center justify-center shadow-md shadow-blue-600/30">
                          <Check className="w-5 h-5 stroke-[2.5]" />
                        </div>
                      </div>
                    </div>

                    <h1 className="font-display text-2xl sm:text-[26px] font-extrabold text-[#0F172A] dark:text-white tracking-tight">
                      Thank you!
                    </h1>
                    <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                      We sent an email to{' '}
                      <strong className="text-slate-800 dark:text-slate-100">
                        {email || 'catherine.tanya@gmail.com'}
                      </strong>
                      <span className="block mt-0.5">
                        Click confirmation link in the email to verify your account
                      </span>
                    </p>
                  </div>

                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={handleOpenGmailInbox}
                      className="w-full rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] py-3 px-4 text-sm font-bold text-white shadow-md shadow-blue-600/20 transition-all cursor-pointer inline-flex items-center justify-center gap-2"
                    >
                      <Mail className="w-4 h-4" />
                      <span>Open Email App &amp; Confirm</span>
                    </button>

                    {/* If Password Recovery: Form to enter OTP from Gmail & New Password */}
                    {thankYouContext === 'recover' && !resetSuccessDone && (
                      <form
                        onSubmit={handleResetPasswordSubmit}
                        className="mt-4 rounded-2xl border border-slate-200 dark:border-[#2A2A38] bg-slate-50/80 dark:bg-[#14141E] p-4 space-y-3 text-left"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                            Verifikasi OTP Gmail &amp; Password Baru
                          </span>
                          <button
                            type="button"
                            onClick={() => handleResendOtp('reset_password')}
                            className="text-[11px] font-semibold text-slate-500 hover:text-blue-600 cursor-pointer"
                          >
                            Kirim Ulang OTP
                          </button>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                            Kode OTP dari Gmail (6 Digit)
                          </label>
                          <input
                            type="text"
                            required
                            maxLength={6}
                            value={kodeOtp}
                            onChange={(e) => setKodeOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="Masukkan 6 digit kode OTP"
                            className="w-full rounded-lg border border-slate-300 dark:border-[#2A2A38] bg-white dark:bg-[#1A1A24] px-3 py-2 text-sm font-mono font-bold tracking-widest text-blue-800 dark:text-blue-300 placeholder:font-sans placeholder:tracking-normal placeholder:font-normal focus:border-blue-600 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
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
                              className="w-full rounded-lg border border-slate-300 dark:border-[#2A2A38] bg-white dark:bg-[#1A1A24] pl-3 pr-9 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword((p) => !p)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                            >
                              {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                            Konfirmasi Password Baru
                          </label>
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            required
                            minLength={6}
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            placeholder="Ulangi password baru"
                            className="w-full rounded-lg border border-slate-300 dark:border-[#2A2A38] bg-white dark:bg-[#1A1A24] px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2.5 px-4 text-xs sm:text-sm font-bold text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {loading ? 'Memperbarui Database...' : 'Reset Password Sekarang'}
                        </button>
                      </form>
                    )}

                    {(thankYouContext === 'register' || resetSuccessDone) && (
                      <div className="pt-2 space-y-2">
                        {pendingRegisteredToken && pendingRegisteredUser && (
                          <button
                            type="button"
                            onClick={() =>
                              completeLoginRedirect(pendingRegisteredToken, pendingRegisteredUser)
                            }
                            className="w-full rounded-xl border border-blue-600 bg-blue-50/80 dark:bg-blue-950/50 hover:bg-blue-100 py-2.5 px-4 text-xs sm:text-sm font-bold text-blue-700 dark:text-blue-300 transition-colors cursor-pointer"
                          >
                            Lanjutkan Masuk ke CekGarasi
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => switchView('signin')}
                          className="w-full text-center text-xs font-semibold text-slate-500 hover:text-blue-600 cursor-pointer py-1"
                        >
                          Back to Sign In
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </motion.div>

      {/* ============================================================ */}
      {/* MODAL 1: GOOGLE / FACEBOOK ACCOUNT CHOOSER & OAUTH           */}
      {/* ============================================================ */}
      {socialModalProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#1A1A24] border border-slate-200 dark:border-[#2A2A38] shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-[#2A2A38] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {socialModalProvider === 'google' ? <GoogleIcon /> : <FacebookIcon />}
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Continue with {socialModalProvider === 'google' ? 'Google' : 'Facebook'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Masukkan email akun {socialModalProvider === 'google' ? 'Google' : 'Facebook'} Anda
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSocialModalProvider(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5">
              <form onSubmit={(e) => handleSocialAuthSubmit(e)} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Email {socialModalProvider === 'google' ? 'Google' : 'Facebook'}
                  </label>
                  <input
                    type="email"
                    required
                    value={socialEmailInput}
                    onChange={(e) => setSocialEmailInput(e.target.value)}
                    placeholder={`nama@${socialModalProvider === 'google' ? 'gmail.com' : 'email.com'}`}
                    className="w-full rounded-xl border border-slate-200 dark:border-[#2A2A38] bg-white dark:bg-[#14141E] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    value={socialNameInput}
                    onChange={(e) => setSocialNameInput(e.target.value)}
                    placeholder="Nama pengguna"
                    className="w-full rounded-xl border border-slate-200 dark:border-[#2A2A38] bg-white dark:bg-[#14141E] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] py-2.5 px-4 text-sm font-bold text-white shadow-sm cursor-pointer"
                >
                  Lanjutkan dengan {socialModalProvider === 'google' ? 'Google' : 'Facebook'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: KONFIGURASI PENGIRIM GMAIL SMTP (APP PASSWORD)      */}
      {/* ============================================================ */}
      {showSmtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#1A1A24] border border-slate-200 dark:border-[#2A2A38] shadow-2xl overflow-hidden">
            <div className="bg-[#2563EB] px-5 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Mail className="w-5 h-5" />
                <div>
                  <h3 className="text-sm font-bold">Integrasi Pengirim Gmail SMTP</h3>
                  <p className="text-[11px] text-blue-100">
                    Kirim OTP langsung ke kotak masuk Gmail pengguna
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSmtpModal(false)}
                className="p-1 rounded-lg bg-white/15 hover:bg-white/25 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveGmailSmtp} className="p-5 space-y-3.5 text-xs sm:text-sm">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Masukkan akun Gmail pengirim beserta <strong>16-digit Google App Password</strong> (dari Google Account &rarr; Security &rarr; 2-Step Verification &rarr; App Passwords). Pengaturan ini disimpan ke database untuk mengirim kode OTP langsung ke Gmail penerima.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Alamat Gmail Pengirim (SMTP User)
                </label>
                <input
                  type="email"
                  required
                  value={smtpSenderEmail}
                  onChange={(e) => setSmtpSenderEmail(e.target.value)}
                  placeholder="contoh: akunanda@gmail.com"
                  className="w-full rounded-xl border border-slate-200 dark:border-[#2A2A38] bg-white dark:bg-[#14141E] px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Google App Password (16 Digit)
                </label>
                <input
                  type="password"
                  required
                  value={smtpAppPassword}
                  onChange={(e) => setSmtpAppPassword(e.target.value)}
                  placeholder="xxxx xxxx xxxx xxxx"
                  className="w-full rounded-xl border border-slate-200 dark:border-[#2A2A38] bg-white dark:bg-[#14141E] px-3.5 py-2 text-sm font-mono text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSmtpModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#2A2A38] text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={smtpSaving}
                  className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-xs font-bold text-white cursor-pointer disabled:opacity-50"
                >
                  {smtpSaving ? 'Menghubungkan ke Gmail...' : 'Simpan & Kirim OTP ke Gmail'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
