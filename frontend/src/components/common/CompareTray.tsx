import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Scale, X, Trash2, ChevronUp, ChevronDown, Plus, ArrowRight } from 'lucide-react';
import {
  getCompareIds,
  removeCompare,
  clearCompare,
  subscribeCompare,
} from '@/services/compareStore';
import { notifyToast } from '@/services/favoriteStore';
import { getCarPhoto } from '@/utils/carPhoto';
import { fetchCompareCars } from '@/lib/normalizeBanding';

interface MiniCar {
  id: number;
  nama_mobil: string;
  harga_rp: number;
  foto?: string | null;
  transmisi?: string;
}

export function CompareTray() {
  const navigate = useNavigate();
  const location = useLocation();

  const [compareIds, setCompareIds] = useState<number[]>(getCompareIds());
  const [cars, setCars] = useState<MiniCar[]>([]);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  // Hide on admin routes, /bandingkan page, or /favorit page (where comparison is embedded directly)
  const shouldHide =
    location.pathname.startsWith('/admin') ||
    location.pathname === '/bandingkan' ||
    location.pathname === '/favorit' ||
    compareIds.length === 0 ||
    isDismissed;

  useEffect(() => {
    const unsub = subscribeCompare(() => {
      const newIds = getCompareIds();
      setCompareIds(newIds);
      // Auto un-dismiss if user adds a new car to compare
      if (newIds.length > 0) {
        setIsDismissed(false);
      }
    });
    return unsub;
  }, []);

  // Fetch cars info for the IDs in compare
  useEffect(() => {
    if (compareIds.length === 0) {
      setCars([]);
      return;
    }

    let isMounted = true;
    fetchCompareCars(compareIds)
      .then((data) => {
        if (isMounted) {
          setCars(data);
        }
      })
      .catch(() => {
        // Fallback: keep previous or empty
      });

    return () => {
      isMounted = false;
    };
  }, [compareIds]);

  if (shouldHide) {
    return null;
  }

  const handleBandingkan = () => {
    if (compareIds.length < 2) {
      notifyToast({
        show: true,
        message: 'Pilih minimal 2 mobil untuk melihat perbandingan penuh',
        type: 'info',
      });
      navigate('/cari');
      return;
    }
    navigate(`/bandingkan?ids=${compareIds.join(',')}`);
  };

  const handleGoToCatalog = () => {
    notifyToast({
      show: true,
      message: 'Pilih mobil pilihan Anda lalu klik ikon timbangan (Bandingkan)',
      type: 'info',
    });
    navigate('/cari');
  };

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.95 }}
        transition={{ duration: 0.25 }}
        className="fixed bottom-16 md:bottom-6 right-3 sm:right-6 z-40 max-w-[calc(100%-1.5rem)] sm:max-w-xl"
        role="region"
        aria-label="Daftar Mobil Bandingkan"
      >
        {isMinimized ? (
          /* Minimized Compact Capsule */
          <div className="rounded-full px-4 py-2 flex items-center gap-3 text-white shadow-lg border border-white/15 bg-[#0B0B0F]/95 backdrop-blur-md">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIsMinimized(false)}>
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#5B4EF0] text-white font-bold text-xs shadow-xs">
                <Scale className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs font-semibold whitespace-nowrap">
                Bandingkan ({compareIds.length}/4)
              </span>
            </div>

            <div className="flex items-center gap-1 border-l border-white/15 pl-2">
              <button
                type="button"
                onClick={() => setIsMinimized(false)}
                className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Buka panel perbandingan"
                aria-label="Buka panel perbandingan"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsDismissed(true)}
                className="p-1 rounded-full text-zinc-500 hover:text-red-400 hover:bg-white/10 transition-colors cursor-pointer"
                title="Sembunyikan tray"
                aria-label="Sembunyikan tray perbandingan"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Expanded Full Panel */
          <div className="rounded-[16px] p-4 sm:p-5 text-white shadow-xl border border-white/15 bg-[#0B0B0F]/95 backdrop-blur-md">
            {/* Header row */}
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#5B4EF0] text-white font-bold text-xs shadow-sm">
                  <Scale className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold">
                    Bandingkan Mobil ({compareIds.length}/4)
                  </h4>
                  <span className="text-[11px] text-zinc-400 block font-normal">
                    {compareIds.length < 2
                      ? 'Pilih 1 mobil lagi untuk mulai'
                      : `${compareIds.length} mobil siap dikomparasi`}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsMinimized(true)}
                  className="rounded-full p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Kecilkan ke mode kapsul"
                  aria-label="Kecilkan tray bandingkan"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => clearCompare()}
                  className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] text-zinc-400 hover:text-red-400 hover:bg-white/10 transition-colors cursor-pointer"
                  title="Kosongkan semua mobil"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline font-medium text-xs">Kosongkan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsDismissed(true)}
                  className="rounded-full p-1.5 text-zinc-500 hover:text-red-400 hover:bg-white/10 transition-colors cursor-pointer"
                  title="Tutup sementara"
                  aria-label="Tutup tray bandingkan"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Body items */}
            <div className="mt-3.5 flex items-center gap-2.5 overflow-x-auto pb-1 no-scrollbar">
              {cars.map((car) => (
                <div
                  key={car.id}
                  className="group relative flex w-36 sm:w-40 flex-shrink-0 items-center gap-2 rounded-[12px] bg-white/5 p-2 border border-white/10 shadow-xs hover:border-[#5B4EF0]/50 transition-all"
                >
                  <img
                    src={getCarPhoto(car.nama_mobil, car.foto || car.transmisi)}
                    alt={car.nama_mobil}
                    className="h-10 w-12 rounded-[8px] object-cover flex-shrink-0 border border-white/10"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-semibold text-white">
                      {car.nama_mobil}
                    </span>
                    <span className="block text-[10px] text-[#8277FF] font-bold">
                      Rp {Math.round(car.harga_rp / 1_000_000)} Jt
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCompare(car.id)}
                    className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-zinc-300 shadow-md hover:bg-red-600 hover:text-white transition-colors cursor-pointer border border-white/20"
                    title={`Hapus ${car.nama_mobil}`}
                    aria-label={`Hapus ${car.nama_mobil} dari perbandingan`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}

              {/* Clickable slot placeholders to add more units */}
              {Array.from({ length: 4 - cars.length }).map((_, idx) => (
                <button
                  key={`empty-${idx}`}
                  type="button"
                  onClick={handleGoToCatalog}
                  className="flex h-14 w-28 sm:w-32 flex-shrink-0 flex-col items-center justify-center rounded-[12px] border border-dashed border-white/20 hover:border-[#5B4EF0] hover:bg-white/5 text-zinc-400 hover:text-white transition-all cursor-pointer p-1"
                  title="Pilih mobil lain dari katalog"
                >
                  <Plus className="w-4 h-4 text-[#5B4EF0] mb-0.5" />
                  <span className="text-[10px] font-semibold">+ Tambah</span>
                </button>
              ))}
            </div>

            {/* Action Row */}
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-3">
              <span className="text-[11px] text-zinc-400 font-normal">
                {compareIds.length < 2
                  ? 'Perlu minimal 2 mobil untuk komparasi'
                  : `${compareIds.length} mobil terpilih`}
              </span>

              {compareIds.length < 2 ? (
                <button
                  type="button"
                  onClick={handleGoToCatalog}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[10px] bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium transition-all cursor-pointer border border-white/10"
                >
                  <Plus className="h-3.5 w-3.5 text-[#5B4EF0]" />
                  <span>Tambah Mobil</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleBandingkan}
                  className="cg-btn-primary flex items-center gap-1.5 rounded-[10px] px-4 py-2 text-xs font-semibold text-white shadow-sm cursor-pointer active:scale-95 transition-all"
                >
                  <Scale className="h-3.5 w-3.5" />
                  <span>Bandingkan Sekarang</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </motion.aside>
    </AnimatePresence>
  );
}
