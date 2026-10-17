import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { SegmentBadge } from '@/components/motion/SegmentBadge';
import { Spinner } from '@/components/motion/Spinner';
import { apiFetch, setToken, setUser } from '@/services/api';
import { UserCheck, ShieldCheck, CheckCircle2 } from 'lucide-react';

export function DaftarPage() {
  const navigate = useNavigate();
  const shouldReduce = useReducedMotion();

  // Steps: 'b2a' (Account Form) -> 'b2b' (OTP Verification) -> 'b2c' (Preference & Segment Estimation)
  const [step, setStep] = useState<'b2a' | 'b2b' | 'b2c'>('b2a');

  // Form states
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [telepon, setTelepon] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // OTP states
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [activeOtpIndex, setActiveOtpIndex] = useState(0);
  const [otpError, setOtpError] = useState(false);
  const [otpShakeKey, setOtpShakeKey] = useState(0);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // B2c Preference states for segment estimation
  const [budgetJt, setBudgetJt] = useState(200); // 80 - 600 juta
  const [prioritas, setPrioritas] = useState<'hemat' | 'keluarga' | 'kemewahan'>('keluarga');

  // Compute estimated segment:
  // if budget >= 300 || kemewahan -> Segmen 0 (Premium)
  // if budget >= 160 || keluarga -> Segmen 1 (Keluarga Muda)
  // else -> Segmen 2 (Ekonomis)
  const estimatedSegment =
    budgetJt >= 300 || prioritas === 'kemewahan'
      ? 0
      : budgetJt >= 160 || prioritas === 'keluarga'
      ? 1
      : 2;

  // Password strength calculation (0 to 4)
  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 8) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[A-Z]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };
  const passwordStrength = getPasswordStrength(password);

  // Submit Step B2a
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ nama, email, password, no_telepon: telepon }),
      });
      setStep('b2b');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Pendaftaran gagal.');
    } finally {
      setLoading(false);
    }
  };

  // OTP box change handler with auto-focus to next box
  const handleOtpChange = (index: number, val: string) => {
    if (!/^[0-9]?$/.test(val)) return;
    const newOtp = [...otp];
    newOtp[index] = val;
    setOtp(newOtp);
    setOtpError(false);

    if (val && index < 5) {
      setActiveOtpIndex(index + 1);
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      setActiveOtpIndex(index - 1);
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Verify OTP (B2b -> B2c)
  const handleOtpVerify = async () => {
    const code = otp.join('');
    if (code.length < 6) {
      setOtpError(true);
      if (!shouldReduce) setOtpShakeKey((k) => k + 1);
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch<{ access_token: string; user: { id: number; nama: string; email: string; role: string } }>(
        '/auth/verify-otp',
        {
          method: 'POST',
          body: JSON.stringify({ email, kode_otp: code }),
        }
      );
      setToken(res.access_token);
      setUser(res.user);
      setStep('b2c');
    } catch {
      setOtpError(true);
      if (!shouldReduce) setOtpShakeKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-900">
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-25 filter blur-[2px]"
        style={{ backgroundImage: "url('/images/hero/hero-720.webp')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-slate-900/90" />

      <div className="relative z-10 w-full max-w-lg">
        <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-white">
          
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
            <img src="/images/logo.png" alt="CekGarasi Logo" className="h-12 w-12 object-contain rounded-full ring-2 ring-amber-400/40 shadow-md" />
            <div>
              <h1 className="font-display text-xl font-bold">Daftar Akun CekGarasi</h1>
              <p className="text-xs text-slate-400">Temukan mobil bekas pilihan dengan transparansi berbasis AI</p>
            </div>
          </div>

          {/* Step Progress Bar */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                step === 'b2a' ? 'bg-blue-600 text-white' : 'bg-emerald-500 text-white'
              }`}>
                {step !== 'b2a' ? '✓' : '1'}
              </span>
              <span className="text-xs font-medium text-slate-300">Data Diri</span>
            </div>
            <div className="h-0.5 w-8 bg-slate-700" />
            <div className="flex items-center gap-2">
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                step === 'b2b' ? 'bg-blue-600 text-white' : step === 'b2c' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500'
              }`}>
                {step === 'b2c' ? '✓' : '2'}
              </span>
              <span className="text-xs font-medium text-slate-300">Verifikasi OTP</span>
            </div>
            <div className="h-0.5 w-8 bg-slate-700" />
            <div className="flex items-center gap-2">
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                step === 'b2c' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'
              }`}>
                3
              </span>
              <span className="text-xs font-medium text-slate-300">Preferensi ML</span>
            </div>
          </div>

          {/* Animate horizontal transition between steps: x: 24->0 in 250ms with fade */}
          <AnimatePresence mode="wait">
            {step === 'b2a' && (
              <motion.div
                key="b2a"
                initial={shouldReduce ? { opacity: 0 } : { opacity: 0, x: 24 }}
                animate={shouldReduce ? { opacity: 1 } : { opacity: 1, x: 0 }}
                exit={shouldReduce ? { opacity: 0 } : { opacity: 0, x: -24 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                <div className="text-center mb-6">
                  <h1 className="font-display text-2xl font-bold">Daftar Akun Pembeli</h1>
                  <p className="mt-1 text-xs text-slate-400">
                    Dapatkan rekomendasi mobil terpersonalisasi dengan segmentasi K-Means
                  </p>
                </div>

                {errorMsg && (
                  <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/15 p-3 text-xs text-rose-300">
                    {errorMsg}
                  </div>
                )}

                <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Nama Lengkap</label>
                    <input
                      type="text"
                      required
                      value={nama}
                      onChange={(e) => setNama(e.target.value)}
                      placeholder="Budi Santoso"
                      className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="budi@example.com"
                      className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Nomor WhatsApp</label>
                    <input
                      type="tel"
                      required
                      value={telepon}
                      onChange={(e) => setTelepon(e.target.value)}
                      placeholder="08123456789"
                      className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Kata Sandi</label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                    
                    {/* Password Strength Meter filling in sequence */}
                    <div className="mt-2 flex gap-1.5">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className="h-1.5 flex-1 rounded-full bg-slate-700 overflow-hidden"
                        >
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: passwordStrength >= level ? '100%' : '0%',
                            }}
                            transition={{ duration: 0.2, delay: (level - 1) * 0.05 }}
                            className={`h-full ${
                              passwordStrength <= 1
                                ? 'bg-rose-500'
                                : passwordStrength <= 2
                                ? 'bg-amber-500'
                                : passwordStrength <= 3
                                ? 'bg-blue-500'
                                : 'bg-emerald-500'
                            }`}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="mt-1 flex justify-between text-[11px] text-slate-400">
                      <span>Kekuatan Sandi</span>
                      <span className="font-semibold text-slate-300">
                        {passwordStrength === 0
                          ? 'Belum diisi'
                          : passwordStrength <= 1
                          ? 'Lemah'
                          : passwordStrength <= 2
                          ? 'Cukup'
                          : passwordStrength <= 3
                          ? 'Kuat'
                          : 'Sangat Kuat'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-3 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 disabled:opacity-50"
                  >
                    {loading ? <Spinner size={18} /> : 'Lanjut ke Verifikasi OTP'}
                  </button>
                </form>

                <div className="mt-5 text-center text-xs text-slate-400">
                  Sudah punya akun?{' '}
                  <Link to="/welcome" className="text-blue-400 font-semibold hover:underline">
                    Masuk di sini
                  </Link>
                </div>
              </motion.div>
            )}

            {step === 'b2b' && (
              <motion.div
                key="b2b"
                initial={shouldReduce ? { opacity: 0 } : { opacity: 0, x: 24 }}
                animate={shouldReduce ? { opacity: 1 } : { opacity: 1, x: 0 }}
                exit={shouldReduce ? { opacity: 0 } : { opacity: 0, x: -24 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                <div className="text-center mb-6">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <h2 className="font-display text-xl font-bold">Verifikasi Kode OTP</h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Masukkan 6 digit kode yang dikirim ke <span className="text-white font-medium">{email}</span>
                  </p>
                  <p className="text-[11px] text-blue-400/90 mt-1">
                    (Mode Demo/Pengujian: gunakan kode <strong>123456</strong>)
                  </p>
                </div>

                {/* OTP Boxes Row with wrong-code shake */}
                <motion.div
                  key={otpShakeKey}
                  animate={
                    otpShakeKey > 0 && !shouldReduce
                      ? { x: [0, -8, 8, -4, 4, 0], transition: { duration: 0.35 } }
                      : undefined
                  }
                  className="flex justify-center gap-2 sm:gap-3 my-6"
                >
                  {otp.map((digit, idx) => (
                    <motion.input
                      key={idx}
                      ref={(el) => { otpInputRefs.current[idx] = el; }}
                      type="text"
                      maxLength={1}
                      value={digit}
                      animate={
                        activeOtpIndex === idx && !shouldReduce
                          ? { scale: 1.04 }
                          : { scale: 1 }
                      }
                      transition={{ duration: 0.15 }}
                      onFocus={() => setActiveOtpIndex(idx)}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className={`h-12 w-11 sm:h-14 sm:w-13 rounded-xl border text-center text-xl font-bold transition-colors focus:outline-none ${
                        otpError
                          ? 'border-rose-500 bg-rose-500/10 text-rose-300'
                          : digit
                          ? 'border-blue-500 bg-slate-800 text-white'
                          : 'border-slate-700 bg-slate-800/80 text-white focus:border-blue-500'
                      }`}
                    />
                  ))}
                </motion.div>

                {otpError && (
                  <div className="text-center text-xs text-rose-400 mb-4">
                    Kode OTP salah. Coba masukkan 123456 untuk simulasi demo.
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep('b2a')}
                    className="flex-1 rounded-xl border border-slate-700 bg-slate-800/60 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                  >
                    Kembali
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleOtpVerify}
                    className="flex-2 rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500"
                  >
                    {loading ? <Spinner size={18} /> : 'Verifikasi Akun'}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'b2c' && (
              <motion.div
                key="b2c"
                initial={shouldReduce ? { opacity: 0 } : { opacity: 0, x: 24 }}
                animate={shouldReduce ? { opacity: 1 } : { opacity: 1, x: 0 }}
                exit={shouldReduce ? { opacity: 0 } : { opacity: 0, x: -24 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                <div className="text-center mb-6">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                    <UserCheck className="h-6 w-6" />
                  </div>
                  <h2 className="font-display text-xl font-bold">Preferensi Pembelian Anda</h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Sesuaikan kriteria agar model K-Means merekomendasikan segmen yang pas
                  </p>
                </div>

                {/* Perkiraan Segmen Tag with SegmentBadge Crossfade */}
                <div className="rounded-xl border border-slate-800 bg-slate-850 p-4 mb-5 text-center">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Perkiraan Segmen Untukmu:
                  </div>
                  <div className="flex justify-center">
                    <SegmentBadge klaster={estimatedSegment} size="lg" />
                  </div>
                  <div className="text-xs text-slate-400 mt-2">
                    {estimatedSegment === 0 && 'Mobil premium dengan fitur lengkap dan kenyamanan tingkat tinggi.'}
                    {estimatedSegment === 1 && 'Pilihan MPV & SUV lapang, efisien, dan cocok untuk mobilitas keluarga.'}
                    {estimatedSegment === 2 && 'City car lincah, hemat bahan bakar, dan cicilan bulanan paling terjangkau.'}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-medium text-slate-300 mb-1.5">
                      <span>Rentang Anggaran Harga:</span>
                      <span className="font-bold text-blue-400">Rp {budgetJt} Juta</span>
                    </div>
                    <input
                      type="range"
                      min={80}
                      max={600}
                      step={10}
                      value={budgetJt}
                      onChange={(e) => setBudgetJt(Number(e.target.value))}
                      className="w-full accent-blue-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                      <span>Rp 80 Jt</span>
                      <span>Rp 300 Jt</span>
                      <span>Rp 600 Jt</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-2">Fokus Utama Penggunaan:</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'hemat', label: 'Hemat & Harian' },
                        { id: 'keluarga', label: 'Keluarga Lapang' },
                        { id: 'kemewahan', label: 'Fitur Mewah' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setPrioritas(item.id as 'hemat' | 'keluarga' | 'kemewahan')}
                          className={`rounded-xl border p-2.5 text-center text-xs font-medium transition-all ${
                            prioritas === item.id
                              ? 'border-blue-500 bg-blue-600/20 text-white font-semibold shadow-sm'
                              : 'border-slate-700 bg-slate-800/60 text-slate-400 hover:bg-slate-800'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate('/cari')}
                    className="w-full mt-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Selesai & Lihat Rekomendasi Mobil</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
