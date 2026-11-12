import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { Spinner } from '@/components/motion/Spinner';
import { apiFetch, getUser } from '@/services/api';
import { getCarPhoto } from '@/utils/carPhoto';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

interface CarSummary {
  id: number;
  nama_mobil: string;
  harga_rp: number;
  lokasi: string;
  transmisi: string;
  nama_segmen: string;
}

export function BookingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const shouldReduce = useReducedMotion();

  const mobilId = searchParams.get('mobil_id') || '1';
  const [car, setCar] = useState<CarSummary | null>(null);
  const [loadingCar, setLoadingCar] = useState(true);

  const currentUser = getUser<{ nama?: string; no_telepon?: string }>();
  const [nama, setNama] = useState<string>(currentUser?.nama || '');
  const [noTelepon, setNoTelepon] = useState<string>(currentUser?.no_telepon || '');
  const [cabang, setCabang] = useState('Jakarta Selatan');
  const [tanggal, setTanggal] = useState('');
  const [jam, setJam] = useState('10:00');
  const [catatan, setCatatan] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setLoadingCar(true);
    apiFetch<CarSummary>(`/mobil/${mobilId}`)
      .then((data) => setCar(data))
      .catch(() => {})
      .finally(() => setLoadingCar(false));
  }, [mobilId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSubmitting(true);

    try {
      const res = await apiFetch<{ id: number; kode_booking: string }>('/test-drive', {
        method: 'POST',
        body: JSON.stringify({
          mobil_id: Number(mobilId),
          nama_pemesan: nama,
          no_telepon: noTelepon,
          cabang,
          tanggal_booking: tanggal,
          jam_booking: jam,
          catatan,
        }),
      });

      // Pass booking result to B7 Success page via state
      navigate('/booking-sukses', {
        state: {
          bookingId: res.id,
          kodeBooking: res.kode_booking || `TB-${Date.now().toString().slice(-6)}`,
          carName: car?.nama_mobil || 'Unit Mobil Pilihan',
          cabang,
          tanggal,
          jam,
          nama,
        },
      });
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal membuat reservasi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B132B] py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto transition-colors duration-200">
      
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-6 transition-colors cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Kembali ke Rincian Mobil</span>
      </button>

      <div className="text-center max-w-xl mx-auto mb-8">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold mb-3">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Layanan Eksklusif CekGarasi</span>
        </span>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Jadwalkan Test Drive Gratis
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          Rasakan langsung performa mesin dan kenyamanan berkendara bersama konsultan profesional CekGarasi di showroom mitra resmi.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* Selected-Car Summary Card */}
        <motion.div
          initial={shouldReduce ? { opacity: 0 } : { opacity: 0, x: -24 }}
          animate={shouldReduce ? { opacity: 1 } : { opacity: 1, x: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="md:col-span-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0E172A] p-5 shadow-soft dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] space-y-4"
        >
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Mobil Pilihan Anda
          </div>

          {loadingCar ? (
            <div className="h-48 bg-slate-100 dark:bg-slate-800/60 rounded-xl animate-pulse" />
          ) : car ? (
            <>
              <div className="relative h-44 w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900">
                <img
                  src={getCarPhoto(car.nama_mobil, car.transmisi)}
                  alt={car.nama_mobil}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent pointer-events-none" />
                <span className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold uppercase tracking-wider">
                  {car.nama_segmen}
                </span>
              </div>

              <div>
                <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  {car.nama_mobil}
                </h2>
                <div className="font-display text-xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
                  Rp {car.harga_rp.toLocaleString('id-ID')}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-2">
                <div className="flex justify-between">
                  <span>Transmisi:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{car.transmisi}</span>
                </div>
                <div className="flex justify-between">
                  <span>Lokasi Asal Unit:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{car.lokasi}</span>
                </div>
              </div>

              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <span>Unit siap uji jalan dengan bahan bakar & asuransi ditanggung CekGarasi.</span>
              </div>
            </>
          ) : (
            <div className="text-xs text-slate-500 dark:text-slate-400">Data mobil tidak ditemukan.</div>
          )}
        </motion.div>

        {/* Booking Form */}
        <motion.div
          initial={shouldReduce ? { opacity: 0 } : { opacity: 0, x: 24 }}
          animate={shouldReduce ? { opacity: 1 } : { opacity: 1, x: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="md:col-span-7 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0E172A] p-6 sm:p-7 shadow-soft dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
        >
          <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white mb-4">
            Konfirmasi Waktu & Lokasi Uji Jalan
          </h3>

          {errorMessage && (
            <div className="mb-4 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/50 p-3 text-xs text-rose-700 dark:text-rose-300">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Nama pemesan"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Nomor WhatsApp</label>
                <input
                  type="tel"
                  required
                  value={noTelepon}
                  onChange={(e) => setNoTelepon(e.target.value)}
                  placeholder="08123456789"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Pilihan Cabang Test Drive</label>
              <select
                value={cabang}
                onChange={(e) => setCabang(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all"
              >
                <option value="Jakarta Selatan" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Jakarta Selatan (Cilandak Hub)</option>
                <option value="Jakarta Pusat" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Jakarta Pusat (Sudirman Experience)</option>
                <option value="Tangerang Selatan" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">BSD City (Serpong Boulevard)</option>
                <option value="Bekasi" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Bekasi Barat (Summarecon Station)</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Rencana Tanggal</label>
                <input
                  type="date"
                  required
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Pukul Jam</label>
                <select
                  value={jam}
                  onChange={(e) => setJam(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all"
                >
                  <option value="09:00" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">09:00 WIB (Pagi)</option>
                  <option value="10:00" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">10:00 WIB</option>
                  <option value="11:00" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">11:00 WIB</option>
                  <option value="13:30" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">13:30 WIB (Siang)</option>
                  <option value="15:00" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">15:00 WIB (Sore)</option>
                  <option value="16:30" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">16:30 WIB</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Catatan Tambahan (Opsional)</label>
              <textarea
                rows={2}
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Misal: Ingin cek kondisi transmisi dan bagasi lapang..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all"
              />
            </div>

            {/* Confirm button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-3 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/25 disabled:opacity-50 transition-all cursor-pointer"
            >
              {submitting ? <Spinner size={18} /> : 'Konfirmasi Jadwal Test Drive'}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
