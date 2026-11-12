import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Check,
  X,
  CheckCircle2,
} from 'lucide-react';

interface FeatureItem {
  id: number;
  kode: string;
  nama_id: string;
  aktif: boolean;
}

interface CarFeaturesTabProps {
  features?: FeatureItem[];
  fiturList?: string[];
  totalFitur: number;
}

// Functional description for each of the 11 K-Means features
const FEATURE_DESCRIPTIONS: Record<string, { kategori: 'safety' | 'camera' | 'comfort' | 'exterior'; deskripsi: string; labelId: string }> = {
  kamera_belakang: {
    kategori: 'camera',
    deskripsi: 'Menampilkan visibilitas area belakang di layar head unit untuk parkir aman tanpa blind spot.',
    labelId: 'Kamera Belakang'
  },
  sunroof: {
    kategori: 'comfort',
    deskripsi: 'Atap kaca panoramik elektrik untuk pencahayaan alami kabin dan gaya premium.',
    labelId: 'Sunroof Elektrik'
  },
  spion_lipat_otomatis: {
    kategori: 'exterior',
    deskripsi: 'Spion melipat otomatis saat mobil dikunci (auto-retractable power mirrors).',
    labelId: 'Spion Lipat Otomatis'
  },
  rem_parkir_elektrik: {
    kategori: 'safety',
    deskripsi: 'Rem tangan tombol elektrik (EPB) praktis tanpa tuas manual berat, sering dilengkapi Auto Brake Hold.',
    labelId: 'Rem Parkir Elektrik (EPB)'
  },
  navigasi_peta: {
    kategori: 'comfort',
    deskripsi: 'Navigasi GPS interaktif terintegrasi pada layar head unit hiburan.',
    labelId: 'Navigasi Peta Digital'
  },
  kontrol_stabilitas: {
    kategori: 'safety',
    deskripsi: 'Sistem komputerisasi (ESC / VSC) mencegah mobil tergelincir atau oversteer saat tikungan licin.',
    labelId: 'Kontrol Stabilitas (VSC/ESC)'
  },
  keyless_push_start: {
    kategori: 'comfort',
    deskripsi: 'Akses masuk pintar dengan sensor sentuh dan menyalakan mesin cukup melalui tombol Engine Start/Stop.',
    labelId: 'Keyless Push Start'
  },
  mode_sport: {
    kategori: 'comfort',
    deskripsi: 'Pengaturan ECU untuk akselerasi lebih responsif dan putaran RPM mesin lebih agresif.',
    labelId: 'Mode Sport / Eco Drive'
  },
  kamera_360: {
    kategori: 'camera',
    deskripsi: 'Kamera keliling 4 sudut (Bird-Eye View 360°) untuk manuver mudah di jalan sempit atau parkir rapat.',
    labelId: 'Kamera 360 Derajat'
  },
  pintu_geser_elektrik: {
    kategori: 'comfort',
    deskripsi: 'Pintu geser baris kedua otomatis yang dapat dibuka via remote atau tombol kokpit.',
    labelId: 'Pintu Geser Elektrik (Power Sliding)'
  },
  cruise_control: {
    kategori: 'safety',
    deskripsi: 'Menjaga kecepatan jelajah mobil konstan secara otomatis di jalan bebas hambatan tanpa menginjak gas.',
    labelId: 'Cruise Control Otomatis'
  }
};

export function CarFeaturesTab({ features = [], fiturList = [] }: CarFeaturesTabProps) {
  const [filterMode, setFilterMode] = useState<'all' | 'active' | 'inactive'>('all');

  // Normalize features
  const normalizedFeatures = useMemo(() => {
    if (features && features.length > 0) {
      return features.map((f) => {
        const meta = FEATURE_DESCRIPTIONS[f.kode] || {
          kategori: 'comfort',
          deskripsi: 'Kelengkapan fitur kenyamanan dan keselamatan teruji pabrikan.',
          labelId: f.nama_id
        };
        return {
          id: f.id,
          kode: f.kode,
          nama: f.nama_id,
          aktif: f.aktif,
          deskripsi: meta.deskripsi,
          kategori: meta.kategori
        };
      });
    }

    // Fallback if only list of string provided
    const defaultCodes = Object.keys(FEATURE_DESCRIPTIONS);
    return defaultCodes.map((code, idx) => {
      const meta = FEATURE_DESCRIPTIONS[code];
      const isAktif = fiturList.some((fl) => fl.toLowerCase().includes(meta.labelId.toLowerCase()) || fl.toLowerCase().includes(code));
      return {
        id: idx + 1,
        kode: code,
        nama: meta.labelId,
        aktif: isAktif,
        deskripsi: meta.deskripsi,
        kategori: meta.kategori
      };
    });
  }, [features, fiturList]);

  const activeCount = normalizedFeatures.filter((f) => f.aktif).length;
  const percentage = Math.round((activeCount / (normalizedFeatures.length || 11)) * 100);

  const filteredFeatures = useMemo(() => {
    if (filterMode === 'active') return normalizedFeatures.filter((f) => f.aktif);
    if (filterMode === 'inactive') return normalizedFeatures.filter((f) => !f.aktif);
    return normalizedFeatures;
  }, [normalizedFeatures, filterMode]);

  // Assessment Level
  const levelBadge = activeCount >= 8
    ? { label: 'Tipe Flagship / Tertinggi (Fitur Sangat Komplit)', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' }
    : activeCount >= 4
    ? { label: 'Tipe Menengah (Fitur Esensial Lengkap)', color: 'bg-blue-100 text-blue-800 border-blue-300' }
    : { label: 'Tipe Standar Pabrikan (Efisien & Fungsional)', color: 'bg-slate-100 text-slate-700 border-slate-300' };

  return (
    <div className="space-y-6">
      
      {/* 1. Equipment Score Card */}
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-blue-50/40 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Tingkat Kelengkapan 11 Fitur K-Means
              </span>
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${levelBadge.color}`}>
                {levelBadge.label}
              </span>
            </div>
            <h3 className="font-display text-lg font-extrabold text-slate-900 mt-1">
              {activeCount} dari {normalizedFeatures.length} Fitur Terpasang Aktif
            </h3>
          </div>

          <div className="text-right sm:text-right">
            <span className="text-2xl font-black text-blue-600">{percentage}%</span>
            <span className="block text-[10px] text-slate-400 font-medium">Skor Kelengkapan Varian</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative mt-4 h-2.5 w-full overflow-hidden rounded-full bg-slate-200/80">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className={`h-full rounded-full ${
              activeCount >= 6 ? 'bg-gradient-to-r from-blue-500 to-emerald-500' : 'bg-blue-600'
            }`}
          />
        </div>
      </div>

      {/* 2. Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setFilterMode('all')}
          className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
            filterMode === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Semua Fitur ({normalizedFeatures.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterMode('active')}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
            filterMode === 'active'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Tersedia di Unit Ini ({activeCount})</span>
        </button>
        <button
          type="button"
          onClick={() => setFilterMode('inactive')}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
            filterMode === 'inactive'
              ? 'bg-slate-700 text-white shadow-xs'
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
        >
          <span>Belum Ada di Varian Ini ({normalizedFeatures.length - activeCount})</span>
        </button>
      </div>

      {/* 3. Features Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredFeatures.map((feat) => {
          return (
            <div
              key={feat.id}
              className={`rounded-2xl p-4 transition-all border flex flex-col justify-between ${
                feat.aktif
                  ? 'border-emerald-300 bg-emerald-50/60 shadow-xs ring-1 ring-emerald-200/50'
                  : 'border-slate-200/70 bg-slate-50/60 opacity-80'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                      feat.aktif ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    {feat.aktif ? <Check className="w-4 h-4 stroke-[3]" /> : <X className="w-4 h-4" />}
                  </div>

                  {feat.aktif ? (
                    <span className="rounded-full bg-emerald-200/80 px-2.5 py-0.5 text-[10px] font-bold text-emerald-900 border border-emerald-300">
                      Tersedia
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                      Tidak Ada
                    </span>
                  )}
                </div>

                <h4
                  className={`font-bold text-sm ${
                    feat.aktif ? 'text-slate-900 font-extrabold' : 'text-slate-500'
                  }`}
                >
                  {feat.nama}
                </h4>

                <p className="mt-1.5 text-[11px] text-slate-500 leading-relaxed">
                  {feat.deskripsi}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-200/50 flex items-center justify-between text-[10px]">
                {feat.aktif ? (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Berfungsi Normal Teruji</span>
                  </span>
                ) : (
                  <span className="text-slate-400 font-normal">
                    Standar varian trim dasar
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
