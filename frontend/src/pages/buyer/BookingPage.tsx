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
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Kembali ke Rincian Mobil</span>
      </button>

      <div className="text-center max-w-xl mx-auto mb-8">
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900">
          Jadwalkan Test Drive Gratis
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Rasakan langsung performa mesin dan kenyamanan berkendara bersama konsultan profesional CekGarasi
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* Selected-Car Summary Card: slides in from the left (x: -24 -> 0) */}
        <motion.div
          initial={shouldReduce ? { opacity: 0 } : { opacity: 0, x: -24 }}
          animate={shouldReduce ? { opacity: 1 } : { opacity: 1, x: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="md:col-span-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4"
        >
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Mobil Pilihan Anda
          </div>

          {loadingCar ? (
            <div className="h-48 bg-slate-100 rounded-xl animate-pulse" />
          ) : car ? (
            <>
              <div className="h-40 w-full overflow-hidden rounded-xl bg-slate-100">
                <img
                  src={getCarPhoto(car.nama_mobil, car.transmisi)}
                  alt={car.nama_mobil}
                  className="h-full w-full object-cover"
                />
              </div>

              <div>
                <span className="text-[11px] font-semibold text-blue-600 uppercase">
                  {car.nama_segmen}
                </span>
                <h2 className="font-display text-lg font-bold text-slate-900 mt-0.5">
                  {car.nama_mobil}
                </h2>
                <div className="font-display text-lg font-extrabold text-slate-900 mt-1">
                  Rp {car.harga_rp.toLocaleString('id-ID')}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1.5">
                <div className="flex justify-between">
                  <span>Transmisi:</span>
                  <span className="font-medium text-slate-700">{car.transmisi}</span>
                </div>
                <div className="flex justify-between">
                  <span>Lokasi Asal Unit:</span>
                  <span className="font-medium text-slate-700">{car.lokasi}</span>
                </div>
              </div>

              <div className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span>Unit siap uji jalan dengan bahan bakar & asuransi ditanggung CekGarasi.</span>
              </div>
            </>
          ) : (
            <div className="text-xs text-slate-500">Data mobil tidak ditemukan.</div>
          )}
        </motion.div>

        {/* Booking Form: slides in from the right (x: 24 -> 0) */}
        <motion.div
          initial={shouldReduce ? { opacity: 0 } : { opacity: 0, x: 24 }}
          animate={shouldReduce ? { opacity: 1 } : { opacity: 1, x: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="md:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h3 className="font-display text-lg font-bold text-slate-900 mb-4">
            Konfirmasi Waktu & Lokasi Uji Jalan
          </h3>

          {errorMessage && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Nama pemesan"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor WhatsApp</label>
                <input
                  type="tel"
                  required
                  value={noTelepon}
                  onChange={(e) => setNoTelepon(e.target.value)}
                  placeholder="08123456789"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Pilihan Cabang Test Drive</label>
              <select
                value={cabang}
                onChange={(e) => setCabang(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
              >
                <option value="Jakarta Selatan">Jakarta Selatan (Cilandak Hub)</option>
                <option value="Jakarta Pusat">Jakarta Pusat (Sudirman Experience)</option>
                <option value="Tangerang Selatan">BSD City (Serpong Boulevard)</option>
                <option value="Bekasi">Bekasi Barat (Summarecon Station)</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Rencana Tanggal</label>
                <input
                  type="date"
                  required
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pukul Jam</label>
                <select
                  value={jam}
                  onChange={(e) => setJam(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
                >
                  <option value="09:00">09:00 WIB (Pagi)</option>
                  <option value="10:00">10:00 WIB</option>
                  <option value="11:00">11:00 WIB</option>
                  <option value="13:30">13:30 WIB (Siang)</option>
                  <option value="15:00">15:00 WIB (Sore)</option>
                  <option value="16:30">16:30 WIB</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan Tambahan (Opsional)</label>
              <textarea
                rows={2}
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Misal: Ingin cek kondisi transmisi dan bagasi lapang..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
              />
            </div>

            {/* Confirm button showing Spinner while submitting */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 disabled:opacity-50 transition-colors"
            >
              {submitting ? <Spinner size={18} /> : 'Konfirmasi Jadwal Test Drive'}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
