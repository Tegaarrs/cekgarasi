import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Scale, X, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import {
  getCompareIds,
  removeCompare,
  clearCompare,
  subscribeCompare,
} from '@/services/compareStore';
import { apiFetch } from '@/services/api';
import { getCarPhoto } from '@/utils/carPhoto';

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

  // Hide on admin routes or if already on /bandingkan page
  const shouldHide =
    location.pathname.startsWith('/admin') ||
    location.pathname === '/bandingkan' ||
    compareIds.length === 0;

  useEffect(() => {
    const unsub = subscribeCompare(() => {
      setCompareIds(getCompareIds());
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
    apiFetch<MiniCar[]>(`/bandingkan?ids=${compareIds.join(',')}`)
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
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
    navigate(`/bandingkan?ids=${compareIds.join(',')}`);
  };

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ opacity: 0, y: 50, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.96 }}
        transition={{ duration: 0.25 }}
        className="fixed bottom-16 md:bottom-6 right-3 sm:right-6 z-40 w-[calc(100%-1.5rem)] sm:w-auto sm:max-w-xl"
        role="region"
        aria-label="Daftar Mobil Bandingkan"
      >
        <div className="rounded-2xl border border-slate-900/10 bg-slate-900/95 backdrop-blur-md p-3.5 sm:p-4 text-white shadow-2xl">
          {/* Header row */}
          <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-xs">
                <Scale className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold">
                Bandingkan Mobil ({compareIds.length}/4)
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                title={isMinimized ? 'Perluas' : 'Kecilkan'}
                aria-label={isMinimized ? 'Perluas tray bandingkan' : 'Kecilkan tray bandingkan'}
              >
                {isMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={() => clearCompare()}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-slate-400 hover:bg-slate-800 hover:text-rose-400 transition-colors cursor-pointer"
                title="Kosongkan perbandingan"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Kosongkan</span>
              </button>
            </div>
          </div>

          {/* Body items (collapsible) */}
          {!isMinimized && (
            <div className="mt-3 flex items-center gap-2.5 overflow-x-auto pb-1">
              {cars.map((car) => (
                <div
                  key={car.id}
                  className="group relative flex w-36 flex-shrink-0 items-center gap-2 rounded-xl bg-slate-800/90 p-1.5 border border-slate-700/60"
                >
                  <img
                    src={getCarPhoto(car.nama_mobil, car.foto || car.transmisi)}
                    alt={car.nama_mobil}
                    className="h-10 w-12 rounded-lg object-cover flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-bold text-slate-200">
                      {car.nama_mobil}
                    </span>
                    <span className="block text-[10px] text-blue-400 font-semibold">
                      Rp {Math.round(car.harga_rp / 1_000_000)} Jt
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCompare(car.id)}
                    className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-slate-300 shadow-md hover:bg-rose-600 hover:text-white transition-colors cursor-pointer"
                    title={`Hapus ${car.nama_mobil}`}
                    aria-label={`Hapus ${car.nama_mobil} dari perbandingan`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}

              {/* Slot placeholder for remaining up to 4 */}
              {Array.from({ length: 4 - cars.length }).map((_, idx) => (
                <div
                  key={`empty-${idx}`}
                  className="hidden sm:flex h-13 w-28 flex-shrink-0 items-center justify-center rounded-xl border border-dashed border-slate-700 text-[10px] text-slate-500 text-center px-2"
                >
                  + Tambah
                </div>
              ))}
            </div>
          )}

          {/* Action Row */}
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-[11px] text-slate-400">
              {compareIds.length < 2
                ? 'Pilih minimal 2 mobil untuk perbandingan penuh'
                : `${compareIds.length} mobil siap dibandingkan`}
            </span>
            <button
              type="button"
              onClick={handleBandingkan}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 shadow-sm transition-all cursor-pointer"
            >
              <Scale className="h-3.5 w-3.5" />
              <span>Bandingkan Sekarang</span>
            </button>
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
