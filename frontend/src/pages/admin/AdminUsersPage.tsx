import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  Users, UserPlus, Search, CheckCircle2, Clock, 
  Trash2, Edit, AlertTriangle, ShieldCheck, 
  TrendingUp, Compass, Wallet, MessageCircle, 
  RefreshCw, X, ChevronLeft, ChevronRight,
  Lock, KeyRound, Mail, Eye, EyeOff, FileText,
  MapPin, Briefcase, Calendar, CreditCard, ShieldAlert,
  Unlock, Copy
} from 'lucide-react';
import { apiFetch, getUser } from '@/services/api';

export interface BuyerItem {
  id: number;
  nama: string;
  email: string;
  no_hp: string;
  nik?: string;
  jenis_kelamin?: string;
  tanggal_lahir?: string;
  pekerjaan?: string;
  kota_domisili?: string;
  alamat_lengkap?: string;
  password_terdaftar?: string;
  password_hash?: string;
  cabang?: string;
  hp_terverifikasi: boolean;
  segmen_awal_id?: number | null;
  nama_segmen: string;
  warna_segmen: string;
  pref_harga_min?: number | null;
  pref_harga_max?: number | null;
  fokus_penggunaan: string;
  role: string;
  is_active: boolean;
  is_anomali: boolean;
  alasan_anomali: string;
  total_favorit?: number;
  total_test_drive?: number;
  created_at: string;
  updated_at?: string;
}

export interface BuyerAnalytics {
  total_pembeli: number;
  verified_count: number;
  pending_count: number;
  anomali_count: number;
  avg_min_jt: number;
  avg_max_jt: number;
  rentang_anggaran: {
    dibawah_150jt: { count: number; persen: number };
    antara_150_250jt: { count: number; persen: number };
    antara_250_400jt: { count: number; persen: number };
    diatas_400jt: { count: number; persen: number };
    belum_diatur: { count: number; persen: number };
  };
  fokus_penggunaan: {
    [key: string]: { count: number; persen: number };
  };
  segmen_kmeans: {
    [key: string]: { nama: string; count: number; warna: string };
  };
}

interface SimulasiEmailOtp {
  subjek: string;
  pengirim: string;
  penerima: string;
  kode_otp: string;
  alasan_tercatat: string;
  waktu_kirim: string;
}

interface AuditLogEntry {
  id: number;
  admin_nama: string;
  admin_email: string;
  alasan_akses: string;
  waktu_akses: string;
  status: string;
}

const VAULT_STORAGE_KEY = 'cekgarasi_admin_pii_vault_session';

function maskNik(nik?: string, reveal?: boolean): string {
  if (!nik || nik === '-') return 'Belum Diisi';
  if (reveal) return nik;
  if (nik.length <= 8) return nik.slice(0, 3) + '•••••';
  return `${nik.slice(0, 6)}••••••${nik.slice(-4)}`;
}

function calculateAge(dob?: string): string {
  if (!dob || dob === '-') return '';
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age > 0 && age < 110 ? `${age} thn` : '';
}

export function AdminUsersPage() {
  const currentAdmin = getUser() as { email?: string; nama?: string } | null;

  // ==============================================================
  // SECURITY VAULT GATE STATES (2FA EMAIL + PASSWORD + AUDIT LOG)
  // ==============================================================
  const [vaultUnlocked, setVaultUnlocked] = useState<boolean>(false);
  const [vaultRemainingSec, setVaultRemainingSec] = useState<number>(0);
  const [vaultStep, setVaultStep] = useState<'credentials' | 'otp'>('credentials');
  const [adminEmailInput, setAdminEmailInput] = useState<string>(currentAdmin?.email || 'admin@cekgarasi.test');
  const [adminPasswordInput, setAdminPasswordInput] = useState<string>('');
  const [alasanAksesInput, setAlasanAksesInput] = useState<string>('Verifikasi Identitas Lengkap & Kelayakan Calon Pembeli');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [simulasiEmail, setSimulasiEmail] = useState<SimulasiEmailOtp | null>(null);
  const [vaultLoading, setVaultLoading] = useState<boolean>(false);
  const [vaultError, setVaultError] = useState<string>('');
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [revealSensitivePii, setRevealSensitivePii] = useState<boolean>(true);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<number, boolean>>({});

  // Check existing vault session on mount
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(VAULT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.expiresAt && parsed.expiresAt > Date.now()) {
          setVaultUnlocked(true);
          setVaultRemainingSec(Math.floor((parsed.expiresAt - Date.now()) / 1000));
          if (parsed.auditLogs) setAuditLogs(parsed.auditLogs);
        } else {
          sessionStorage.removeItem(VAULT_STORAGE_KEY);
        }
      }
    } catch {
      sessionStorage.removeItem(VAULT_STORAGE_KEY);
    }
  }, []);

  // Countdown timer for unlocked vault session
  useEffect(() => {
    if (!vaultUnlocked) return;
    const interval = setInterval(() => {
      setVaultRemainingSec((prev) => {
        if (prev <= 1) {
          sessionStorage.removeItem(VAULT_STORAGE_KEY);
          setVaultUnlocked(false);
          setVaultStep('credentials');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [vaultUnlocked]);

  const handleLockVault = () => {
    sessionStorage.removeItem(VAULT_STORAGE_KEY);
    setVaultUnlocked(false);
    setVaultStep('credentials');
    setAdminPasswordInput('');
    setOtpDigits(['', '', '', '', '', '']);
    setSimulasiEmail(null);
    setVaultError('');
  };

  // Step 1: Request Email OTP after verifying Admin Email + Password + Audit Reason
  const handleRequestVaultOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setVaultError('');
    setVaultLoading(true);
    try {
      const res = await apiFetch<{
        status: string;
        message: string;
        email_tujuan: string;
        expires_in_seconds: number;
        simulasi_email: SimulasiEmailOtp;
      }>('/admin/pembeli/keamanan/minta-otp', {
        method: 'POST',
        body: JSON.stringify({
          email_admin: adminEmailInput,
          password_admin: adminPasswordInput,
          alasan_akses: alasanAksesInput,
        }),
      });
      if (res && res.simulasi_email) {
        setSimulasiEmail(res.simulasi_email);
      }
      setOtpDigits(['', '', '', '', '', '']);
      setVaultStep('otp');
    } catch (err: unknown) {
      setVaultError(err instanceof Error ? err.message : 'Verifikasi kredensial administrator gagal.');
    } finally {
      setVaultLoading(false);
    }
  };

  // Step 2: Verify 6-digit Email OTP
  const handleVerifyVaultOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otpDigits.join('');
    if (code.length < 6) {
      setVaultError('Masukkan 6 digit kode OTP yang dikirim ke email Administrator.');
      return;
    }
    setVaultError('');
    setVaultLoading(true);
    try {
      const res = await apiFetch<{
        status: string;
        message: string;
        vault_token: string;
        expires_in_seconds: number;
        audit_log: AuditLogEntry;
        riwayat_audit: AuditLogEntry[];
      }>('/admin/pembeli/keamanan/verifikasi-otp', {
        method: 'POST',
        body: JSON.stringify({
          kode_otp: code,
          alasan_akses: alasanAksesInput,
        }),
      });

      const expiresAt = Date.now() + (res.expires_in_seconds || 900) * 1000;
      const logs = res.riwayat_audit || (res.audit_log ? [res.audit_log] : []);
      setAuditLogs(logs);
      sessionStorage.setItem(
        VAULT_STORAGE_KEY,
        JSON.stringify({
          vaultToken: res.vault_token,
          expiresAt,
          auditLogs: logs,
        })
      );
      setVaultRemainingSec(res.expires_in_seconds || 900);
      setVaultUnlocked(true);
    } catch (err: unknown) {
      setVaultError(err instanceof Error ? err.message : 'Kode OTP tidak valid.');
    } finally {
      setVaultLoading(false);
    }
  };

  const handleOtpDigitChange = (index: number, val: string) => {
    if (!/^[0-9]?$/.test(val)) return;
    const next = [...otpDigits];
    next[index] = val;
    setOtpDigits(next);
    setVaultError('');
    if (val && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleAutoFillEmailOtp = () => {
    if (!simulasiEmail?.kode_otp) return;
    const chars = simulasiEmail.kode_otp.split('').slice(0, 6);
    setOtpDigits(chars);
    setVaultError('');
  };

  // ==============================================================
  // BUYERS DATA & CRUD STATES
  // ==============================================================
  const [buyers, setBuyers] = useState<BuyerItem[]>([]);
  const [analytics, setAnalytics] = useState<BuyerAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'pending' | 'anomali'>('all');
  const [fokusFilter, setFokusFilter] = useState<string>('all');
  const [segmenFilter, setSegmenFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedBuyer, setSelectedBuyer] = useState<BuyerItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states (including complete identity fields)
  const [formData, setFormData] = useState({
    nama: '',
    email: '',
    no_hp: '',
    nik: '',
    jenis_kelamin: 'Laki-laki',
    tanggal_lahir: '1995-05-15',
    pekerjaan: '',
    kota_domisili: 'Jakarta Selatan',
    alamat_lengkap: '',
    password: '',
    hp_terverifikasi: 1,
    fokus_penggunaan: 'Keluarga Lapang',
    segmen_awal_id: 1,
    pref_harga_min: 150000000,
    pref_harga_max: 250000000,
  });

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const listRes = await apiFetch<{ items: BuyerItem[] }>('/admin/pembeli?limit=100');
      if (listRes && Array.isArray(listRes.items)) {
        setBuyers(listRes.items);
      }
    } catch (err) {
      console.error('Gagal mengambil daftar pembeli:', err);
    }

    try {
      const analRes = await apiFetch<BuyerAnalytics>('/admin/pembeli/analisis');
      if (analRes) {
        setAnalytics(analRes);
      }
    } catch (err) {
      console.error('Gagal mengambil analitik pembeli:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (vaultUnlocked) {
      fetchData();
    }
  }, [vaultUnlocked]);

  // Filtered buyers
  const filteredBuyers = useMemo(() => {
    return buyers.filter((b) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        b.nama.toLowerCase().includes(q) ||
        b.email.toLowerCase().includes(q) ||
        b.no_hp.toLowerCase().includes(q) ||
        (b.nik || '').toLowerCase().includes(q) ||
        (b.kota_domisili || '').toLowerCase().includes(q) ||
        (b.alamat_lengkap || '').toLowerCase().includes(q) ||
        (b.pekerjaan || '').toLowerCase().includes(q);

      let matchStatus = true;
      if (statusFilter === 'verified') matchStatus = b.hp_terverifikasi;
      if (statusFilter === 'pending') matchStatus = !b.hp_terverifikasi;
      if (statusFilter === 'anomali') matchStatus = b.is_anomali;

      let matchFokus = true;
      if (fokusFilter !== 'all') {
        matchFokus = b.fokus_penggunaan.toLowerCase().includes(fokusFilter.toLowerCase());
      }

      let matchSegmen = true;
      if (segmenFilter !== 'all') {
        matchSegmen = b.segmen_awal_id === Number(segmenFilter);
      }

      return matchSearch && matchStatus && matchFokus && matchSegmen;
    });
  }, [buyers, search, statusFilter, fokusFilter, segmenFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredBuyers.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedBuyers = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredBuyers.slice(start, start + pageSize);
  }, [filteredBuyers, safePage, pageSize]);

  // Handle Create User
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama || !formData.email) {
      showToast('error', 'Nama dan Email wajib diisi.');
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch('/admin/pembeli', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      showToast('success', `Identitas lengkap pendaftar '${formData.nama}' berhasil ditambahkan.`);
      setIsCreateOpen(false);
      resetForm();
      fetchData();
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Gagal menambahkan pengguna.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle View Complete Identity Card
  const openDetailModal = (buyer: BuyerItem) => {
    setSelectedBuyer(buyer);
    setIsDetailOpen(true);
  };

  // Handle Edit User
  const openEditModal = (buyer: BuyerItem) => {
    setSelectedBuyer(buyer);
    setFormData({
      nama: buyer.nama,
      email: buyer.email,
      no_hp: buyer.no_hp === '-' ? '' : buyer.no_hp,
      nik: buyer.nik === '-' ? '' : buyer.nik || '',
      jenis_kelamin: buyer.jenis_kelamin && buyer.jenis_kelamin !== '-' ? buyer.jenis_kelamin : 'Laki-laki',
      tanggal_lahir: buyer.tanggal_lahir && buyer.tanggal_lahir !== '-' ? buyer.tanggal_lahir : '1995-05-15',
      pekerjaan: buyer.pekerjaan === '-' ? '' : buyer.pekerjaan || '',
      kota_domisili: buyer.kota_domisili === '-' ? '' : buyer.kota_domisili || '',
      alamat_lengkap: buyer.alamat_lengkap === '-' ? '' : buyer.alamat_lengkap || '',
      password: buyer.password_terdaftar || 'password123',
      hp_terverifikasi: buyer.hp_terverifikasi ? 1 : 0,
      fokus_penggunaan: buyer.fokus_penggunaan || 'Keluarga Lapang',
      segmen_awal_id: buyer.segmen_awal_id ?? 1,
      pref_harga_min: buyer.pref_harga_min || 150000000,
      pref_harga_max: buyer.pref_harga_max || 250000000,
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBuyer) return;
    setSubmitting(true);
    try {
      await apiFetch(`/admin/pembeli/${selectedBuyer.id}`, {
        method: 'PUT',
        body: JSON.stringify(formData),
      });
      showToast('success', `Identitas lengkap '${formData.nama}' berhasil diperbarui.`);
      setIsEditOpen(false);
      fetchData();
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Gagal memperbarui pengguna.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete User
  const openDeleteModal = (buyer: BuyerItem) => {
    setSelectedBuyer(buyer);
    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedBuyer) return;
    setSubmitting(true);
    try {
      await apiFetch(`/admin/pembeli/${selectedBuyer.id}`, {
        method: 'DELETE',
      });
      showToast('success', `Akun '${selectedBuyer.nama}' berhasil dihapus dari database.`);
      setIsDeleteOpen(false);
      fetchData();
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Gagal menghapus pengguna.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nama: '',
      email: '',
      no_hp: '',
      nik: '',
      jenis_kelamin: 'Laki-laki',
      tanggal_lahir: '1995-05-15',
      pekerjaan: '',
      kota_domisili: 'Jakarta Selatan',
      alamat_lengkap: '',
      password: '',
      hp_terverifikasi: 1,
      fokus_penggunaan: 'Keluarga Lapang',
      segmen_awal_id: 1,
      pref_harga_min: 150000000,
      pref_harga_max: 250000000,
    });
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // ==============================================================
  // RENDER SECURITY GATE WHEN VAULT IS LOCKED
  // ==============================================================
  if (!vaultUnlocked) {
    return (
      <div className="p-4 sm:p-6 lg:p-10 max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden">
          {/* Top Security Banner */}
          <div className="bg-gradient-to-r from-[#001540] via-indigo-950 to-slate-900 p-6 sm:p-8 text-white relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-56 h-56 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shrink-0 shadow-lg">
                  <Lock className="w-7 h-7" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[11px] font-extrabold uppercase tracking-wider mb-2">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Proteksi Data Pribadi (UU PDP &amp; Keamanan Berlapis)</span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    Gerbang Verifikasi Keamanan Manajemen Pengguna
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                    Halaman ini memuat <strong>Identitas Lengkap Pendaftar (NIK KTP, Tanggal Lahir, Alamat Domisili, Pekerjaan, Email &amp; Nomor WhatsApp)</strong>. Akses diwajibkan melalui verifikasi kredensial berlapis dan kode OTP email Administrator.
                  </p>
                </div>
              </div>
            </div>

            {/* Step Indicator */}
            <div className="relative z-10 mt-6 pt-5 border-t border-white/10 grid grid-cols-2 gap-3">
              <div className={`flex items-center gap-3 p-3 rounded-xl border ${
                vaultStep === 'credentials'
                  ? 'bg-white/15 border-indigo-400 text-white'
                  : 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
              }`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                  vaultStep === 'credentials' ? 'bg-indigo-500 text-white' : 'bg-emerald-500 text-white'
                }`}>
                  {vaultStep === 'credentials' ? '1' : '✓'}
                </div>
                <div>
                  <div className="text-xs font-extrabold">Tahap 1: Otorisasi Email &amp; Sandi Admin</div>
                  <div className="text-[11px] opacity-80">Konfirmasi identitas admin &amp; tujuan audit akses</div>
                </div>
              </div>

              <div className={`flex items-center gap-3 p-3 rounded-xl border ${
                vaultStep === 'otp'
                  ? 'bg-white/15 border-indigo-400 text-white'
                  : 'bg-white/5 border-white/10 text-slate-400'
              }`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                  vaultStep === 'otp' ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-400'
                }`}>
                  2
                </div>
                <div>
                  <div className="text-xs font-extrabold">Tahap 2: Verifikasi OTP Email (2FA)</div>
                  <div className="text-[11px] opacity-80">Kode keamanan 6 digit sekali pakai (berlaku 5 menit)</div>
                </div>
              </div>
            </div>
          </div>

          {/* Gate Body */}
          <div className="p-6 sm:p-8">
            {vaultError && (
              <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{vaultError}</span>
              </div>
            )}

            {vaultStep === 'credentials' ? (
              <form onSubmit={handleRequestVaultOtp} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-2">
                      Email Administrator Terdaftar *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        required
                        value={adminEmailInput}
                        onChange={(e) => setAdminEmailInput(e.target.value)}
                        placeholder="admin@cekgarasi.test"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:border-indigo-600 focus:outline-none"
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Email harus cocok dengan sesi admin aktif ({currentAdmin?.email || 'admin@cekgarasi.test'})
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-2">
                      Kata Sandi Otorisasi Admin *
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="password"
                        required
                        value={adminPasswordInput}
                        onChange={(e) => setAdminPasswordInput(e.target.value)}
                        placeholder="Masukkan kata sandi admin..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:border-indigo-600 focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[11px] text-slate-400">
                        Maksimal 5x percobaan sebelum penguncian otomatis
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setAdminEmailInput(currentAdmin?.email || 'admin@cekgarasi.test');
                          setAdminPasswordInput('password123');
                        }}
                        className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
                      >
                        Isi Kredensial Demo Admin
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-2">
                    Tujuan / Alasan Audit Akses Data Identitas (Wajib Tercatat di Log Keamanan) *
                  </label>
                  <select
                    value={alasanAksesInput}
                    onChange={(e) => setAlasanAksesInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:border-indigo-600 focus:outline-none"
                  >
                    <option value="Verifikasi Identitas Lengkap & Kelayakan Calon Pembeli">
                      Verifikasi Identitas Lengkap (KTP/Domisili) &amp; Kelayakan Calon Pembeli
                    </option>
                    <option value="Konfirmasi Jadwal Test Drive & Tindak Lanjut Konsultasi">
                      Konfirmasi Jadwal Test Drive &amp; Tindak Lanjut Konsultasi Pembeli
                    </option>
                    <option value="Audit Keamanan Database & Pembersihan Akun Anomali/Spam">
                      Audit Keamanan Database &amp; Pembersihan Akun Anomali/Spam
                    </option>
                    <option value="Pembaruan Data Profil & Preferensi Anggaran Pelanggan">
                      Pembaruan Data Profil &amp; Preferensi Anggaran Pelanggan
                    </option>
                  </select>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3 text-xs text-slate-600">
                    <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-900 block">Komitmen Kerahasiaan Data Pendaftar CekGarasi</strong>
                      Setiap pembukaan kunci identitas lengkap dicatat bersama waktu akses, email administrator, dan alasan verifikasi. Sesi akan terkunci kembali secara otomatis setelah 15 menit.
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={vaultLoading}
                    className="btn-liquid-primary liquid-shine px-6 py-3 rounded-xl text-xs font-extrabold text-white shrink-0 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Mail className="w-4 h-4" />
                    <span>{vaultLoading ? 'Mengirim Kode OTP...' : 'Kirim Kode Verifikasi ke Email'}</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                {/* Simulated Security Email Dispatch Notification Box */}
                {simulasiEmail && (
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-blue-50/60 to-white border border-indigo-200 shadow-xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-indigo-200/60">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-indigo-600 text-white">
                          <Mail className="w-4 h-4" />
                        </span>
                        <div>
                          <div className="text-xs font-black text-[#001540]">
                            Notifikasi Email Keamanan Terkirim ({simulasiEmail.penerima})
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Dari: <span className="font-mono">{simulasiEmail.pengirim}</span> • {simulasiEmail.waktu_kirim}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleAutoFillEmailOtp}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-all self-start sm:self-auto"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Gunakan Kode OTP Email: {simulasiEmail.kode_otp}</span>
                      </button>
                    </div>

                    <div className="text-xs text-slate-700 space-y-1">
                      <div>
                        <strong>Subjek:</strong> {simulasiEmail.subjek}
                      </div>
                      <div>
                        <strong>Alasan Audit Tercatat:</strong> {simulasiEmail.alasan_tercatat}
                      </div>
                      <div className="pt-1 flex items-center gap-2">
                        <span>Kode Verifikasi Sekali Pakai (OTP):</span>
                        <span className="px-3 py-1 rounded-lg bg-white border border-indigo-300 font-mono text-base font-black tracking-widest text-indigo-700">
                          {simulasiEmail.kode_otp}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleVerifyVaultOtp} className="space-y-5">
                  <div className="text-center max-w-md mx-auto space-y-3">
                    <h3 className="text-base font-black text-[#001540]">
                      Masukkan 6 Digit Kode Verifikasi Email
                    </h3>
                    <p className="text-xs text-slate-500">
                      Masukkan kode 6 digit yang telah dikirimkan ke email Administrator <strong>{adminEmailInput}</strong> untuk membuka enkripsi identitas lengkap pendaftar.
                    </p>

                    <div className="flex justify-center gap-2.5 py-2">
                      {otpDigits.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={(el) => { otpRefs.current[idx] = el; }}
                          type="text"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                          className="w-12 h-14 rounded-xl border-2 border-slate-300 focus:border-indigo-600 text-center text-xl font-black text-[#001540] bg-slate-50 focus:bg-white focus:outline-none transition-all"
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setVaultStep('credentials');
                        setVaultError('');
                      }}
                      className="btn-liquid-secondary px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
                    >
                      ← Kembali ke Tahap 1
                    </button>

                    <button
                      type="submit"
                      disabled={vaultLoading}
                      className="btn-liquid-primary liquid-shine px-6 py-3 rounded-xl text-xs font-extrabold text-white flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Unlock className="w-4 h-4" />
                      <span>{vaultLoading ? 'Memverifikasi OTP...' : 'Verifikasi & Buka Identitas Lengkap'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==============================================================
  // RENDER UNLOCKED USER MANAGEMENT WITH COMPLETE BUYER IDENTITY
  // ==============================================================
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">

      {/* Toast Notification */}
      {toastMsg && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-xs font-bold text-white transition-all transform animate-bounce ${
          toastMsg.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
        }`}>
          {toastMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Active Security Session Strip */}
      <div className="bg-gradient-to-r from-emerald-950 via-[#001540] to-indigo-950 text-white px-5 py-3.5 rounded-2xl shadow-md border border-emerald-500/30 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-extrabold">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Akses Identitas Terverifikasi (2FA Email Aktif)</span>
          </span>
          <span className="text-xs text-slate-300">
            Admin: <strong className="text-white">{currentAdmin?.email || adminEmailInput}</strong>
          </span>
          {auditLogs[0] && (
            <span className="text-xs text-slate-300 hidden sm:inline">
              • Audit: <strong className="text-amber-300">{auditLogs[0].alasan_akses}</strong>
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="px-3 py-1 rounded-xl bg-white/10 border border-white/15 text-xs font-mono font-bold text-amber-300 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Auto-Lock: {formatTimer(vaultRemainingSec)}</span>
          </div>

          <button
            type="button"
            onClick={() => setRevealSensitivePii(!revealSensitivePii)}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            {revealSensitivePii ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{revealSensitivePii ? 'Sensor NIK & Alamat' : 'Tampilkan NIK & Alamat Utuh'}</span>
          </button>

          <button
            type="button"
            onClick={handleLockVault}
            className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-extrabold text-white flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Kunci Kembali Akses</span>
          </button>
        </div>
      </div>

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
            <Users className="h-4 w-4" />
            <span>Manajemen Pengguna &amp; Identitas Lengkap Pendaftar</span>
          </div>
          <h1 className="text-2xl font-black text-[#001540] tracking-tight">
            Database Identitas Lengkap Calon Pembeli CekGarasi
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Menampilkan identitas lengkap pendaftar (Nama KTP, NIK 16 Digit, Jenis Kelamin, Tanggal Lahir, Pekerjaan, Kota &amp; Alamat Domisili, Kontak WhatsApp, serta Preferensi Mobil).
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
          <motion.button
            type="button"
            onClick={fetchData}
            disabled={loading}
            whileHover={{ y: -1.5, scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="btn-liquid-secondary liquid-shine flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            <span>Segarkan</span>
          </motion.button>
          <motion.button
            type="button"
            onClick={() => { resetForm(); setIsCreateOpen(true); }}
            whileHover={{ y: -2, scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="btn-liquid-primary liquid-shine flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            <span>+ Tambah Pembeli Baru</span>
          </motion.button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 1. ANALISIS PREFERENSI ANGGARAN & FOKUS PENGGUNAAN            */}
      {/* ============================================================ */}
      {analytics && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-600" />
              <span>Analisis Preferensi Pembeli &amp; Segmentasi Pasar</span>
            </h2>
            {analytics.anomali_count > 0 && (
              <motion.button
                type="button"
                onClick={() => setStatusFilter(statusFilter === 'anomali' ? 'all' : 'anomali')}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                className={`btn-liquid-tab liquid-shine inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                  statusFilter === 'anomali'
                    ? 'btn-liquid-danger text-white border-rose-300'
                    : 'bg-amber-50/90 text-amber-900 border-amber-300 hover:bg-amber-100/90 backdrop-blur-md shadow-xs'
                }`}
              >
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                <span>{analytics.anomali_count} Akun Anomali Terdeteksi (Klik untuk Filter)</span>
              </motion.button>
            )}
          </div>

          {/* KPI Cards Row */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">Total Pembeli Terdaftar</span>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-[#001540] mt-2">
                {analytics.total_pembeli} Akun
              </div>
              <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <span>Data identitas lengkap tersimpan</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">Terverifikasi OTP</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-600 mt-2">
                {analytics.verified_count} <span className="text-xs font-semibold text-slate-400">({Math.round((analytics.verified_count / Math.max(1, analytics.total_pembeli)) * 100)}%)</span>
              </div>
              <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span>Kontak &amp; identitas siap follow-up</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">Menunggu Verifikasi</span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-amber-600 mt-2">
                {analytics.pending_count} Akun
              </div>
              <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Belum menyelesaikan verifikasi OTP</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">Rata-Rata Anggaran Beli</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  <Wallet className="h-4 w-4" />
                </div>
              </div>
              <div className="text-xl font-black text-blue-600 mt-2">
                Rp {analytics.avg_min_jt} – {analytics.avg_max_jt} Jt
              </div>
              <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Median daya beli calon pembeli</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ============================================================ */}
      {/* 2. TABEL IDENTITAS LENGKAP PENDAFTAR (CRUD)                   */}
      {/* ============================================================ */}
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        {/* Table Filters Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col lg:flex-row items-center justify-between gap-3">
          
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">
            <motion.button
              type="button"
              onClick={() => setStatusFilter('all')}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              className={`btn-liquid-tab liquid-shine px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'btn-liquid-primary'
                  : 'bg-slate-100/90 text-slate-700 hover:bg-slate-200/90 border border-slate-200/80 shadow-2xs'
              }`}
            >
              Semua ({buyers.length})
            </motion.button>
            <motion.button
              type="button"
              onClick={() => setStatusFilter('verified')}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              className={`btn-liquid-tab liquid-shine px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'verified'
                  ? 'btn-liquid-success text-white'
                  : 'bg-emerald-50/80 text-emerald-800 hover:bg-emerald-100/90 border border-emerald-200/80 shadow-2xs'
              }`}
            >
              Terverifikasi OTP ({buyers.filter((b) => b.hp_terverifikasi).length})
            </motion.button>
            <motion.button
              type="button"
              onClick={() => setStatusFilter('pending')}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              className={`btn-liquid-tab liquid-shine px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'pending'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/25 border border-amber-300'
                  : 'bg-amber-50/80 text-amber-800 hover:bg-amber-100/90 border border-amber-200/80 shadow-2xs'
              }`}
            >
              Menunggu OTP ({buyers.filter((b) => !b.hp_terverifikasi).length})
            </motion.button>
            <motion.button
              type="button"
              onClick={() => setStatusFilter('anomali')}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              className={`btn-liquid-tab liquid-shine px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'anomali'
                  ? 'btn-liquid-danger text-white'
                  : 'bg-rose-50/80 text-rose-800 hover:bg-rose-100/90 border border-rose-200/80 shadow-2xs'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Akun Anomali ({buyers.filter((b) => b.is_anomali).length})</span>
            </motion.button>
          </div>

          {/* Secondary Dropdown Filters & Search */}
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full lg:w-auto">
            
            {/* Filter Fokus */}
            <select
              value={fokusFilter}
              onChange={(e) => { setFokusFilter(e.target.value); setPage(1); }}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 focus:bg-white focus:outline-none"
            >
              <option value="all">Semua Fokus Penggunaan</option>
              <option value="Hemat">Hemat &amp; Harian</option>
              <option value="Keluarga">Keluarga Lapang</option>
              <option value="Mewah">Fitur Mewah</option>
            </select>

            {/* Filter Segmen */}
            <select
              value={segmenFilter}
              onChange={(e) => { setSegmenFilter(e.target.value); setPage(1); }}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 focus:bg-white focus:outline-none"
            >
              <option value="all">Semua Segmen ML</option>
              <option value="0">Premium (Klaster 0)</option>
              <option value="1">Keluarga Muda (Klaster 1)</option>
              <option value="2">Ekonomis (Klaster 2)</option>
            </select>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Cari nama, NIK, kota, email, HP..."
                className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                <th className="py-3.5 px-4">Identitas Lengkap (Nama, NIK, Profil)</th>
                <th className="py-3.5 px-4">Domisili, Alamat &amp; Pekerjaan</th>
                <th className="py-3.5 px-4">Kontak &amp; WhatsApp</th>
                <th className="py-3.5 px-4">Status OTP &amp; Aktivitas</th>
                <th className="py-3.5 px-4">Fokus &amp; Segmen</th>
                <th className="py-3.5 px-4">Rentang Anggaran</th>
                <th className="py-3.5 px-4">Terdaftar</th>
                <th className="py-3.5 px-4 text-right">Detail &amp; CRUD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
              {paginatedBuyers.length > 0 ? (
                paginatedBuyers.map((b) => {
                  const initials = b.nama
                    .split(' ')
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase() || 'P';

                  const cleanPhone = (b.no_hp || '').replace(/\D/g, '');
                  const waPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
                  const ageStr = calculateAge(b.tanggal_lahir);

                  return (
                    <tr 
                      key={b.id} 
                      className={`hover:bg-slate-50/80 transition-colors ${
                        b.is_anomali ? 'bg-rose-50/30' : ''
                      }`}
                    >
                      {/* Kolom 1: Identitas Lengkap */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-3">
                          <div className={`w-9 h-9 rounded-full text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs mt-0.5 ${
                            b.is_anomali 
                              ? 'bg-rose-600 ring-2 ring-rose-300' 
                              : 'bg-gradient-to-br from-indigo-600 to-blue-700'
                          }`}>
                            {initials}
                          </div>
                          <div className="flex flex-col space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openDetailModal(b)}
                                className="font-extrabold text-[#001540] hover:text-indigo-600 hover:underline text-left cursor-pointer"
                              >
                                {b.nama}
                              </button>
                              {b.is_anomali && (
                                <span 
                                  title={b.alasan_anomali}
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 text-[9px] font-extrabold cursor-help"
                                >
                                  <AlertTriangle className="h-2.5 w-2.5 text-rose-600" />
                                  <span>Anomali</span>
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500">{b.email}</span>
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[10px] font-bold text-slate-700">
                                <CreditCard className="w-3 h-3 text-indigo-600" />
                                <span>NIK: {maskNik(b.nik, revealSensitivePii)}</span>
                              </span>
                              {b.jenis_kelamin && b.jenis_kelamin !== '-' && (
                                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold text-[10px]">
                                  {b.jenis_kelamin}{ageStr ? ` • ${ageStr}` : ''}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-50 border border-amber-200/80 font-mono text-[10px] font-bold text-amber-900">
                                <KeyRound className="w-3 h-3 text-amber-600" />
                                <span>
                                  Sandi: {(revealSensitivePii || revealedPasswords[b.id]) ? (b.password_terdaftar || 'password123') : '••••••••'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setRevealedPasswords((prev) => ({ ...prev, [b.id]: !prev[b.id] }))}
                                  title="Tampilkan / Sembunyikan Kata Sandi"
                                  className="text-amber-700 hover:text-amber-950 cursor-pointer ml-0.5"
                                >
                                  {(revealSensitivePii || revealedPasswords[b.id]) ? (
                                    <EyeOff className="w-2.5 h-2.5" />
                                  ) : (
                                    <Eye className="w-2.5 h-2.5" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(b.password_terdaftar || 'password123');
                                    showToast('success', `Password akun '${b.nama}' disalin!`);
                                  }}
                                  title="Salin Kata Sandi"
                                  className="text-amber-700 hover:text-amber-950 cursor-pointer"
                                >
                                  <Copy className="w-2.5 h-2.5" />
                                </button>
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Kolom 2: Domisili, Alamat & Pekerjaan */}
                      <td className="py-3.5 px-4 max-w-[230px]">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-slate-800">
                            <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span>{b.kota_domisili && b.kota_domisili !== '-' ? b.kota_domisili : 'Belum Diatur'}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 leading-snug line-clamp-2" title={b.alamat_lengkap}>
                            {revealSensitivePii
                              ? (b.alamat_lengkap && b.alamat_lengkap !== '-' ? b.alamat_lengkap : 'Alamat lengkap belum diisi')
                              : 'Jl. ••••••••••••• (Disensor)'}
                          </div>
                          {b.pekerjaan && b.pekerjaan !== '-' && (
                            <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/70">
                              <Briefcase className="w-3 h-3" />
                              <span>{b.pekerjaan}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Kolom 3: Kontak & WhatsApp */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-slate-700 text-xs">
                              {b.no_hp || '-'}
                            </span>
                            {b.no_hp && b.no_hp !== '-' && (
                              <a
                                href={`https://wa.me/${waPhone}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-[10px] font-bold transition-colors"
                              >
                                <MessageCircle className="h-3 w-3 text-emerald-600" />
                                <span>WA</span>
                              </a>
                            )}
                          </div>
                          {b.tanggal_lahir && b.tanggal_lahir !== '-' && (
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>Lahir: {b.tanggal_lahir}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Kolom 4: Status OTP & Aktivitas */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1.5">
                          {b.hp_terverifikasi ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              <span>Terverifikasi</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold">
                              <Clock className="h-3 w-3 text-amber-600" />
                              <span>Menunggu</span>
                            </span>
                          )}
                          <div className="text-[10px] text-slate-500 font-medium">
                            {b.total_favorit || 0} Favorit • {b.total_test_drive || 0} Test Drive
                          </div>
                        </div>
                      </td>

                      {/* Kolom 5: Fokus & Segmen */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col items-start gap-1.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                            b.fokus_penggunaan.includes('Hemat')
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : b.fokus_penggunaan.includes('Keluarga')
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : b.fokus_penggunaan.includes('Mewah')
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            <Compass className="h-3 w-3" />
                            <span>{b.fokus_penggunaan}</span>
                          </span>

                          {b.segmen_awal_id !== null && b.segmen_awal_id !== undefined ? (
                            <span
                              className="px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1.5"
                              style={{
                                backgroundColor: `${b.warna_segmen || '#2563EB'}15`,
                                color: b.warna_segmen || '#2563EB',
                              }}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: b.warna_segmen || '#2563EB' }}
                              />
                              {b.nama_segmen}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Belum Ditentukan</span>
                          )}
                        </div>
                      </td>

                      {/* Kolom 6: Rentang Anggaran */}
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {b.pref_harga_min && b.pref_harga_max ? (
                          <span>
                            Rp {Math.round(b.pref_harga_min / 1000000)} – {Math.round(b.pref_harga_max / 1000000)} Jt
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Rp 150 – 250 Jt (Default)</span>
                        )}
                      </td>

                      {/* Kolom 7: Terdaftar */}
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {b.created_at ? b.created_at.slice(0, 10) : 'Baru Saja'}
                      </td>

                      {/* Kolom 8: Tindakan Detail & CRUD */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <motion.button
                            type="button"
                            onClick={() => openDetailModal(b)}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.92 }}
                            title="Lihat Kartu Identitas Lengkap Pendaftar"
                            className="px-2.5 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/80 text-[10px] font-extrabold flex items-center gap-1 cursor-pointer shadow-2xs"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <span>Identitas</span>
                          </motion.button>
                          <motion.button
                            type="button"
                            onClick={() => openEditModal(b)}
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.92 }}
                            title="Edit Identitas Pengguna"
                            className="btn-liquid-action p-2 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-200/60 cursor-pointer shadow-2xs"
                          >
                            <Edit className="h-4 w-4" />
                          </motion.button>
                          <motion.button
                            type="button"
                            onClick={() => openDeleteModal(b)}
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.92 }}
                            title={b.is_anomali ? "Hapus Akun Anomali Ini" : "Hapus Pengguna"}
                            className={`btn-liquid-action p-2 rounded-xl cursor-pointer ${
                              b.is_anomali 
                                ? 'btn-liquid-danger text-rose-700 font-bold border border-rose-300' 
                                : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200/60 shadow-2xs'
                            }`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </motion.button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    Tidak ada data pengguna yang sesuai dengan filter atau kata kunci pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-3 bg-slate-50/90 backdrop-blur-md border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 text-xs">
          <div>
            Menampilkan <strong>{filteredBuyers.length > 0 ? (safePage - 1) * pageSize + 1 : 0} – {Math.min(safePage * pageSize, filteredBuyers.length)}</strong> dari <strong>{filteredBuyers.length} pendaftar</strong>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <motion.button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              whileHover={safePage === 1 ? {} : { scale: 1.04 }}
              whileTap={safePage === 1 ? {} : { scale: 0.96 }}
              className="btn-liquid-secondary liquid-shine flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-xs font-bold"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Sebelumnya</span>
            </motion.button>

            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
              <motion.button
                key={pageNum}
                type="button"
                onClick={() => setPage(pageNum)}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  safePage === pageNum
                    ? 'btn-liquid-primary'
                    : 'btn-liquid-secondary'
                }`}
              >
                {pageNum}
              </motion.button>
            ))}

            <motion.button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages || filteredBuyers.length === 0}
              whileHover={safePage === totalPages || filteredBuyers.length === 0 ? {} : { scale: 1.04 }}
              whileTap={safePage === totalPages || filteredBuyers.length === 0 ? {} : { scale: 0.96 }}
              className="btn-liquid-secondary liquid-shine flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-xs font-bold"
            >
              <span>Berikutnya</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </motion.button>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* MODAL DETAIL KARTU IDENTITAS LENGKAP PENDAFTAR                */}
      {/* ============================================================ */}
      {isDetailOpen && selectedBuyer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-[#001540] via-indigo-950 to-slate-900 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center font-black text-lg text-white">
                  {selectedBuyer.nama.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-400/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-extrabold uppercase">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Kartu Identitas Resmi Pendaftar CekGarasi</span>
                  </div>
                  <h3 className="text-lg font-black mt-1">{selectedBuyer.nama}</h3>
                  <p className="text-xs text-slate-300">{selectedBuyer.email} • ID Pendaftar #{selectedBuyer.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Nomor Induk Kependudukan (NIK KTP)</span>
                  <span className="font-mono text-sm font-black text-[#001540] mt-0.5 block">
                    {selectedBuyer.nik && selectedBuyer.nik !== '-' ? selectedBuyer.nik : 'Belum Diisi'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Jenis Kelamin &amp; Tanggal Lahir</span>
                  <span className="text-sm font-bold text-slate-800 mt-0.5 block">
                    {selectedBuyer.jenis_kelamin || '-'} • {selectedBuyer.tanggal_lahir || '-'} {calculateAge(selectedBuyer.tanggal_lahir) ? `(${calculateAge(selectedBuyer.tanggal_lahir)})` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Pekerjaan / Profesi</span>
                  <span className="text-sm font-bold text-slate-800 mt-0.5 block">
                    {selectedBuyer.pekerjaan && selectedBuyer.pekerjaan !== '-' ? selectedBuyer.pekerjaan : 'Belum Diisi'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Nomor Telepon / WhatsApp</span>
                  <span className="font-mono text-sm font-bold text-emerald-700 mt-0.5 block">
                    {selectedBuyer.no_hp || '-'} ({selectedBuyer.hp_terverifikasi ? 'OTP Terverifikasi' : 'Menunggu OTP'})
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Kota &amp; Alamat Lengkap Domisili (Sesuai KTP)</span>
                  <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                    {selectedBuyer.kota_domisili || '-'} — {selectedBuyer.alamat_lengkap || 'Alamat belum dilengkapi'}
                  </span>
                </div>
                <div className="sm:col-span-2 pt-2 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-200/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1">
                        <KeyRound className="w-3 h-3" />
                        <span>Kata Sandi Terdaftar (Password Akun)</span>
                      </span>
                      <span className="font-mono text-sm font-black text-amber-950 mt-0.5 block">
                        {selectedBuyer.password_terdaftar || 'password123'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedBuyer.password_terdaftar || 'password123');
                        showToast('success', 'Password terdaftar berhasil disalin!');
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Salin</span>
                    </button>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-slate-600" />
                      <span>Hash Enkripsi (Bcrypt)</span>
                    </span>
                    <span className="font-mono text-[10px] text-slate-600 mt-1 block truncate" title={selectedBuyer.password_hash}>
                      {selectedBuyer.password_hash || '-'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Preferensi Segmen</span>
                  <span className="text-sm font-black text-indigo-700 mt-1 block">{selectedBuyer.nama_segmen}</span>
                  <span className="text-[11px] text-slate-500">Fokus: {selectedBuyer.fokus_penggunaan}</span>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Rentang Anggaran</span>
                  <span className="text-sm font-black text-slate-900 mt-1 block">
                    {selectedBuyer.pref_harga_min && selectedBuyer.pref_harga_max
                      ? `Rp ${Math.round(selectedBuyer.pref_harga_min / 1e6)} – ${Math.round(selectedBuyer.pref_harga_max / 1e6)} Jt`
                      : 'Rp 150 – 250 Jt'}
                  </span>
                  <span className="text-[11px] text-slate-500">Estimasi daya beli</span>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Riwayat Aktivitas</span>
                  <span className="text-sm font-black text-emerald-700 mt-1 block">
                    {selectedBuyer.total_favorit || 0} Favorit • {selectedBuyer.total_test_drive || 0} Test Drive
                  </span>
                  <span className="text-[11px] text-slate-500">Terdaftar: {selectedBuyer.created_at?.slice(0, 10)}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsDetailOpen(false);
                    openEditModal(selectedBuyer);
                  }}
                  className="btn-liquid-secondary px-4 py-2 rounded-xl font-bold text-indigo-700 cursor-pointer flex items-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit Identitas Ini</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsDetailOpen(false)}
                  className="btn-liquid-primary px-5 py-2 rounded-xl font-bold text-white cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. MODAL: TAMBAH PENGGUNA BARU (CREATE)                      */}
      {/* ============================================================ */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-8">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                  <UserPlus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#001540]">Tambah Identitas Calon Pembeli Baru</h3>
                  <p className="text-[11px] text-slate-400">Masukkan data identitas lengkap KTP dan preferensi beli</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-3.5 text-xs max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nama Lengkap (Sesuai KTP) *</label>
                  <input
                    type="text"
                    required
                    value={formData.nama}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                    placeholder="Contoh: Rian Pratama"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">NIK KTP (16 Digit)</label>
                  <input
                    type="text"
                    maxLength={16}
                    value={formData.nik}
                    onChange={(e) => setFormData({ ...formData, nik: e.target.value.replace(/\D/g, '').slice(0, 16) })}
                    placeholder="317401xxxxxxxxxx"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jenis Kelamin</label>
                  <select
                    value={formData.jenis_kelamin}
                    onChange={(e) => setFormData({ ...formData, jenis_kelamin: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none font-semibold"
                  >
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal Lahir</label>
                  <input
                    type="date"
                    value={formData.tanggal_lahir}
                    onChange={(e) => setFormData({ ...formData, tanggal_lahir: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Pekerjaan / Profesi</label>
                  <input
                    type="text"
                    value={formData.pekerjaan}
                    onChange={(e) => setFormData({ ...formData, pekerjaan: e.target.value })}
                    placeholder="Karyawan Swasta"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="nama@email.com"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">No. WhatsApp / HP</label>
                  <input
                    type="text"
                    value={formData.no_hp}
                    onChange={(e) => setFormData({ ...formData, no_hp: e.target.value })}
                    placeholder="0812xxxxxxxx"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kota Domisili</label>
                  <input
                    type="text"
                    value={formData.kota_domisili}
                    onChange={(e) => setFormData({ ...formData, kota_domisili: e.target.value })}
                    placeholder="Jakarta Selatan"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Alamat Lengkap (Sesuai KTP/Domisili)</label>
                  <input
                    type="text"
                    value={formData.alamat_lengkap}
                    onChange={(e) => setFormData({ ...formData, alamat_lengkap: e.target.value })}
                    placeholder="Jl. Kemang Raya No. 42, RT 04/RW 02..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kata Sandi (Default)</label>
                  <input
                    type="text"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="password123"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status Verifikasi OTP</label>
                  <select
                    value={formData.hp_terverifikasi}
                    onChange={(e) => setFormData({ ...formData, hp_terverifikasi: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none font-semibold"
                  >
                    <option value={1}>Terverifikasi (OTP Valid)</option>
                    <option value={0}>Menunggu Verifikasi (Pending)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fokus Utama Penggunaan</label>
                  <select
                    value={formData.fokus_penggunaan}
                    onChange={(e) => setFormData({ ...formData, fokus_penggunaan: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none font-semibold"
                  >
                    <option value="Hemat & Harian">Hemat &amp; Harian (Irit &amp; Lincah)</option>
                    <option value="Keluarga Lapang">Keluarga Lapang (Kenyamanan MPV)</option>
                    <option value="Fitur Mewah">Fitur Mewah (Prestise &amp; Premium)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Preferensi Segmen ML</label>
                  <select
                    value={formData.segmen_awal_id}
                    onChange={(e) => setFormData({ ...formData, segmen_awal_id: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none font-semibold"
                  >
                    <option value={0}>Klaster 0: Premium</option>
                    <option value={1}>Klaster 1: Keluarga Muda</option>
                    <option value={2}>Klaster 2: Ekonomis</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="btn-liquid-secondary px-4 py-2 rounded-xl text-slate-700 font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-liquid-primary px-5 py-2 text-white rounded-xl font-bold disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Identitas Pembeli'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. MODAL: EDIT PENGGUNA (UPDATE)                              */}
      {/* ============================================================ */}
      {isEditOpen && selectedBuyer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-8">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <Edit className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#001540]">Ubah Identitas Lengkap Calon Pembeli</h3>
                  <p className="text-[11px] text-slate-400">ID #{selectedBuyer.id} — {selectedBuyer.nama}</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-3.5 text-xs max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nama Lengkap (Sesuai KTP) *</label>
                  <input
                    type="text"
                    required
                    value={formData.nama}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">NIK KTP (16 Digit)</label>
                  <input
                    type="text"
                    maxLength={16}
                    value={formData.nik}
                    onChange={(e) => setFormData({ ...formData, nik: e.target.value.replace(/\D/g, '').slice(0, 16) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jenis Kelamin</label>
                  <select
                    value={formData.jenis_kelamin}
                    onChange={(e) => setFormData({ ...formData, jenis_kelamin: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none font-semibold"
                  >
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal Lahir</label>
                  <input
                    type="date"
                    value={formData.tanggal_lahir}
                    onChange={(e) => setFormData({ ...formData, tanggal_lahir: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Pekerjaan / Profesi</label>
                  <input
                    type="text"
                    value={formData.pekerjaan}
                    onChange={(e) => setFormData({ ...formData, pekerjaan: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">No. WhatsApp / HP</label>
                  <input
                    type="text"
                    value={formData.no_hp}
                    onChange={(e) => setFormData({ ...formData, no_hp: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kota Domisili</label>
                  <input
                    type="text"
                    value={formData.kota_domisili}
                    onChange={(e) => setFormData({ ...formData, kota_domisili: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Alamat Lengkap (Sesuai KTP/Domisili)</label>
                  <input
                    type="text"
                    value={formData.alamat_lengkap}
                    onChange={(e) => setFormData({ ...formData, alamat_lengkap: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kata Sandi Terdaftar (Password Akun)</label>
                  <input
                    type="text"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Masukkan password akun..."
                    className="w-full px-3 py-2 border border-amber-300 bg-amber-50/40 rounded-xl focus:border-indigo-500 focus:outline-none font-mono font-bold text-amber-950"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status Verifikasi OTP</label>
                  <select
                    value={formData.hp_terverifikasi}
                    onChange={(e) => setFormData({ ...formData, hp_terverifikasi: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none font-semibold"
                  >
                    <option value={1}>Terverifikasi (OTP Valid)</option>
                    <option value={0}>Menunggu Verifikasi (Pending)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fokus Utama Penggunaan</label>
                  <select
                    value={formData.fokus_penggunaan}
                    onChange={(e) => setFormData({ ...formData, fokus_penggunaan: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none font-semibold"
                  >
                    <option value="Hemat & Harian">Hemat &amp; Harian</option>
                    <option value="Keluarga Lapang">Keluarga Lapang</option>
                    <option value="Fitur Mewah">Fitur Mewah</option>
                    <option value="Belum Memilih">Belum Memilih</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Anggaran Min (Rp)</label>
                  <input
                    type="number"
                    step={10000000}
                    value={formData.pref_harga_min}
                    onChange={(e) => setFormData({ ...formData, pref_harga_min: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Anggaran Max (Rp)</label>
                  <input
                    type="number"
                    step={10000000}
                    value={formData.pref_harga_max}
                    onChange={(e) => setFormData({ ...formData, pref_harga_max: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="btn-liquid-secondary px-4 py-2 rounded-xl text-slate-700 font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-liquid-primary px-5 py-2 text-white rounded-xl font-bold disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Memperbarui...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. MODAL: KONFIRMASI HAPUS PENGGUNA (DELETE)                  */}
      {/* ============================================================ */}
      {isDeleteOpen && selectedBuyer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
              <Trash2 className="h-6 w-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-[#001540]">
                {selectedBuyer.is_anomali ? 'Hapus Akun Anomali / Spam?' : 'Hapus Akun Pengguna?'}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Anda akan menghapus data akun <strong className="text-slate-800 font-bold">{selectedBuyer.nama}</strong> ({selectedBuyer.email}) secara permanen dari database CekGarasi.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteOpen(false)}
                className="btn-liquid-secondary flex-1 py-2.5 rounded-xl text-slate-700 text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDeleteConfirm}
                className="btn-liquid-danger flex-1 py-2.5 text-white rounded-xl text-xs font-bold disabled:opacity-50 cursor-pointer"
              >
                {submitting ? 'Menghapus...' : 'Ya, Hapus Akun'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
