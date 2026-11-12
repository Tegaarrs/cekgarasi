import { useLocation, Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { AnimatedCheck } from '@/components/motion/AnimatedCheck';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';
import { ArrowRight, Home } from 'lucide-react';

interface BookingState {
  bookingId?: number;
  kodeBooking?: string;
  carName?: string;
  cabang?: string;
  tanggal?: string;
  jam?: string;
  nama?: string;
}

export function BookingSuccessPage() {
  const location = useLocation();
  const shouldReduce = useReducedMotion();

  const state = (location.state as BookingState) || {
    kodeBooking: 'TB-928174',
    carName: 'Honda Brio Satya E 1.2 2019',
    cabang: 'Jakarta Selatan',
    tanggal: 'Besok',
    jam: '10:00 WIB',
    nama: 'Budi Santoso',
  };

  const summaryRows = [
    { label: 'Kode Reservasi', val: state.kodeBooking || 'TB-928174', highlight: true },
    { label: 'Kendaraan Uji Jalan', val: state.carName || 'Unit Pilihan' },
    { label: 'Nama Pemesan', val: state.nama || 'Pelanggan CekGarasi' },
    { label: 'Cabang Pelayanan', val: state.cabang || 'Jakarta Selatan' },
    { label: 'Jadwal Pertemuan', val: `${state.tanggal || 'Sesuai Pilihan'} pukul ${state.jam || '10:00 WIB'}` },
    { label: 'Biaya Uji Jalan', val: 'GRATIS (Rp 0)' },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-50 dark:bg-[#0B132B] transition-colors duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0E172A] p-6 sm:p-8 shadow-soft-lg dark:shadow-[0_16px_40px_rgba(0,0,0,0.6)] text-center">
        
        {/* Animated Check */}
        <div className="flex justify-center mb-4">
          <AnimatedCheck size={64} color="#10B981" strokeWidth={3.5} />
        </div>

        <motion.div
          initial={shouldReduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.35 }}
        >
          <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white">
            Jadwal Test Drive Terkonfirmasi!
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Konsultan profesional kami akan menghubungi Anda via WhatsApp 1 jam sebelum jadwal untuk persiapan unit.
          </p>
        </motion.div>

        {/* Booking summary rows */}
        <Stagger className="mt-6 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4 text-xs space-y-2.5">
          {summaryRows.map((row, idx) => (
            <StaggerItem key={row.label} index={idx} className="flex justify-between items-center py-1.5 border-b border-slate-200/60 dark:border-slate-800 last:border-0">
              <span className="text-slate-500 dark:text-slate-400 font-medium">{row.label}</span>
              <span className={`font-bold ${row.highlight ? 'text-blue-600 dark:text-blue-400 font-mono text-sm' : 'text-slate-900 dark:text-slate-100'}`}>
                {row.val}
              </span>
            </StaggerItem>
          ))}
        </Stagger>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Link
            to="/cari"
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <ArrowRight className="h-4 w-4" />
            <span>Lihat Mobil Lainnya</span>
          </Link>
          <Link
            to="/"
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-600/20 transition-all"
          >
            <Home className="h-4 w-4" />
            <span>Kembali ke Beranda</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
