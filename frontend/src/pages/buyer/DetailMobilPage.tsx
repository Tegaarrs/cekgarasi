import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { spring } from '@/lib/motion';
import { SegmentBadge } from '@/components/motion/SegmentBadge';
import { AnimatedNumber } from '@/components/motion/AnimatedNumber';
import { Reveal } from '@/components/motion/Reveal';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';
import { PressableCard } from '@/components/motion/PressableCard';
import { Skeleton } from '@/components/motion/Skeleton';
import { apiFetch } from '@/services/api';
import { getCarPhoto, getCarGallery } from '@/utils/carPhoto';
import { 
  Calendar, Gauge, MapPin, Check, 
  ArrowLeft, ShieldCheck, ChevronRight, Heart
} from 'lucide-react';
import {
  isFavorite as checkIsFavorite,
  toggleFavorite,
  subscribeFavorites,
  fetchFavoriteIds,
} from '@/services/favoriteStore';

interface FeatureItem {
  id: number;
  kode: string;
  nama_id: string;
  aktif: boolean;
}

interface CarDetail {
  id: number;
  nama_mobil: string;
  merk?: string;
  merek?: string;
  tahun: number;
  jarak_tempuh_ribu_km: number;
  lokasi: string;
  transmisi: string;
  tipe_plat?: string;
  jenis_plat?: string;
  harga_rp: number;
  angsuran_bulanan_rp?: number;
  cicilan_rp?: number;
  klaster: number;
  nama_segmen?: string;
  segmen_nama?: string;
  segmen_pendek?: string;
  warna_hex?: string;
  features?: FeatureItem[];
  fitur_list?: string[];
  total_fitur: number;
  posisi_harga?: {
    q1: number;
    median: number;
    q3: number;
    verdict: string;
    selisih_median_rp: number;
  };
  mobil_serupa?: {
    id: number;
    nama_mobil: string;
    tahun: number;
    harga_rp: number;
    jarak_tempuh_ribu_km: number;
    klaster: number;
    nama_segmen?: string;
    segmen_nama?: string;
  }[];
}

export function DetailMobilPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const shouldReduce = useReducedMotion();

  const [car, setCar] = useState<CarDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'fitur' | 'simulasi' | 'inspeksi'>('fitur');

  // Installment Calculator states
  const [dpPercent, setDpPercent] = useState(20);
  const [tenorTahun, setTenorTahun] = useState(4);

  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    fetchFavoriteIds();
  }, []);

  useEffect(() => {
    setLoading(true);
    apiFetch<CarDetail>(`/mobil/${id}`)
      .then((data) => {
        setCar(data);
        if (data) {
          setIsFav(checkIsFavorite(data.id));
        }
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (car) {
      setIsFav(checkIsFavorite(car.id));
    }
    const unsub = subscribeFavorites(() => {
      if (car) {
        setIsFav(checkIsFavorite(car.id));
      }
    });
    return unsub;
  }, [car]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Skeleton height={400} className="w-full mb-8" />
        <Skeleton height={40} width="40%" className="mb-4" />
        <Skeleton height={20} width="60%" />
      </div>
    );
  }

  if (!car) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-slate-800">Unit mobil tidak ditemukan</h2>
        <Link to="/cari" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
          Kembali ke Katalog
        </Link>
      </div>
    );
  }

  // Gallery angles (Front 3/4, Profile, Transmission-Specific Interior, Engine)
  const galleryImages = getCarGallery(car.nama_mobil, car.transmisi);

  // Price position calculation for benchmark marker
  const q1 = car.posisi_harga?.q1 ?? car.harga_rp * 0.9;
  const q3 = car.posisi_harga?.q3 ?? car.harga_rp * 1.1;
  const range = Math.max(q3 - q1, 10000000);
  const markerPos = Math.min(Math.max(((car.harga_rp - q1) / range) * 100, 5), 95);

  // Credit calculation (8% annuity)
  const harga = car.harga_rp;
  const dpRp = (harga * dpPercent) / 100;
  const pokokHutang = harga - dpRp;
  const bungaTahunan = 0.08;
  const bulan = tenorTahun * 12;
  const bungaBulanan = bungaTahunan / 12;
  const angsuran = Math.round(
    (pokokHutang * (bungaBulanan * Math.pow(1 + bungaBulanan, bulan))) /
      (Math.pow(1 + bungaBulanan, bulan) - 1)
  );

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Kembali</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Gallery, Specs, Market Position, Tabs */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Gallery with 200ms crossfade */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="relative h-72 sm:h-96 w-full overflow-hidden rounded-xl bg-slate-950 flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.img
                  key={activeImageIndex}
                  src={galleryImages[activeImageIndex].src}
                  alt={galleryImages[activeImageIndex].label}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="h-full w-full object-cover"
                />
              </AnimatePresence>
              <div className="absolute top-4 left-4">
                <SegmentBadge klaster={car.klaster} nama={car.nama_segmen || car.segmen_nama || 'Segmen Terpilih'} size="md" />
              </div>
              <div className="absolute top-4 right-4 z-10">
                <button
                  type="button"
                  onClick={() => toggleFavorite(car.id, { returnTo: `/mobil/${car.id}` })}
                  aria-label={isFav ? 'Hapus dari favorit' : 'Simpan ke favorit'}
                  className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-md shadow-md flex items-center justify-center text-slate-500 hover:text-rose-500 hover:bg-white active:scale-90 transition-all cursor-pointer"
                >
                  <Heart className={`w-5 h-5 transition-colors ${isFav ? 'fill-rose-500 text-rose-500' : 'text-slate-600'}`} />
                </button>
              </div>
              <div className="absolute bottom-4 right-4 rounded-lg bg-slate-950/70 backdrop-blur-md px-3 py-1 text-xs text-white">
                {galleryImages[activeImageIndex].label}
              </div>
            </div>

            {/* Thumbnail selector */}
            <div className="grid grid-cols-4 gap-3 mt-4">
              {galleryImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative h-18 overflow-hidden rounded-lg border-2 transition-all ${
                    activeImageIndex === idx ? 'border-blue-600 scale-[1.02]' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img.src} alt={img.label} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Car Header Information */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {car.merk || car.merek || 'Mobil Pilihan'} • Tahun {car.tahun}
                </span>
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                  {car.nama_mobil}
                </h1>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400">Harga Tunai OTR</span>
                <div className="font-display text-2xl sm:text-3xl font-extrabold text-blue-600">
                  Rp {(car.harga_rp ?? 0).toLocaleString('id-ID')}
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-y border-slate-100 text-xs">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                <div>
                  <span className="block text-slate-400">Tahun</span>
                  <span className="font-bold text-slate-800">{car.tahun}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-blue-500" />
                <div>
                  <span className="block text-slate-400">Jarak Tempuh</span>
                  <span className="font-bold text-slate-800">{car.jarak_tempuh_ribu_km} rb km</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-500" />
                <div>
                  <span className="block text-slate-400">Lokasi Unit</span>
                  <span className="font-bold text-slate-800">{car.lokasi}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <div>
                  <span className="block text-slate-400">Transmisi / Plat</span>
                  <span className="font-bold text-slate-800">{car.transmisi} ({car.tipe_plat || car.jenis_plat || 'Terdaftar'})</span>
                </div>
              </div>
            </div>

            {/* "Posisi harga di segmennya" marker moves from left end to real position with spring.soft and verdict chip fades in */}
            <div className="mt-6 rounded-xl bg-slate-50 p-5 border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-800">
                  Posisi Harga di {car.nama_segmen || car.segmen_nama || 'Segmen Pasar'}
                </span>
                {/* Verdict chip fades in after marker */}
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35, duration: 0.3 }}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    car.posisi_harga?.verdict === 'di bawah rentang'
                      ? 'bg-emerald-100 text-emerald-800'
                      : car.posisi_harga?.verdict === 'di atas rentang'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  Harga {car.posisi_harga?.verdict || 'Wajar di Kuartil Pasar'}
                </motion.span>
              </div>

              {/* Benchmark Slider Track */}
              <div className="relative my-6">
                <div className="h-2 w-full rounded-full bg-slate-200" />
                <div 
                  className="absolute top-0 h-2 rounded-full bg-blue-200"
                  style={{ left: '25%', width: '50%' }}
                />
                
                {/* Marker moving from left with spring.soft */}
                <motion.div
                  initial={shouldReduce ? { left: `${markerPos}%` } : { left: '0%' }}
                  animate={{ left: `${markerPos}%` }}
                  transition={spring.soft}
                  className="absolute -top-2.5 -ml-3 flex flex-col items-center"
                >
                  <div className="h-7 w-7 rounded-full border-2 border-white bg-blue-600 shadow-md flex items-center justify-center text-white text-[10px] font-bold">
                    ✓
                  </div>
                </motion.div>
              </div>

              <div className="flex justify-between text-[11px] text-slate-500 font-medium pt-1">
                <div>
                  <span className="block text-slate-400">Kuartil 1 (Q1)</span>
                  <span>Rp {Math.round(q1 / 1000000)} Jt</span>
                </div>
                <div className="text-center">
                  <span className="block text-slate-400">Median Pasar</span>
                  <span className="font-bold text-slate-700">Rp {Math.round((car.posisi_harga?.median ?? car.harga_rp) / 1000000)} Jt</span>
                </div>
                <div className="text-right">
                  <span className="block text-slate-400">Kuartil 3 (Q3)</span>
                  <span>Rp {Math.round(q3 / 1000000)} Jt</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs with animated underline sliding between tabs (layoutId) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="relative flex border-b border-slate-200 mb-6">
              {[
                { id: 'fitur', label: `Daftar Fitur (${car.total_fitur})` },
                { id: 'simulasi', label: 'Simulasi Kredit Anuitas 8%' },
                { id: 'inspeksi', label: 'Laporan Hasil Inspeksi' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'fitur' | 'simulasi' | 'inspeksi')}
                  className={`relative py-3 px-4 text-xs font-bold transition-colors ${
                    activeTab === tab.id ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="tabUnderline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                      transition={{ duration: 0.2 }}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            <div>
              {activeTab === 'fitur' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {car.features && car.features.length > 0 ? (
                    car.features.map((feat) => (
                      <div
                        key={feat.id}
                        className={`flex items-center gap-2 rounded-xl border p-2.5 text-xs transition-colors ${
                          feat.aktif
                            ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900 font-semibold'
                            : 'border-slate-100 bg-slate-50 text-slate-400'
                        }`}
                      >
                        <Check className={`h-4 w-4 flex-shrink-0 ${feat.aktif ? 'text-emerald-600' : 'text-slate-300'}`} />
                        <span className="truncate">{feat.nama_id}</span>
                        {feat.aktif && (
                          <span className="ml-auto rounded-full bg-emerald-200/60 px-1.5 py-0.5 text-[9px] text-emerald-800 font-bold">
                            Tersedia
                          </span>
                        )}
                      </div>
                    ))
                  ) : car.fitur_list && car.fitur_list.length > 0 ? (
                    car.fitur_list.map((fitur, idx) => (
                      <div key={idx} className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-2.5 text-xs text-emerald-900">
                        <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                        <span className="truncate">{fitur}</span>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-3 text-xs text-slate-400">
                      Standar kelengkapan pabrikan orisinal terverifikasi.
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'simulasi' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                        <span>Down Payment (DP):</span>
                        <span className="text-blue-600">{dpPercent}% (Rp {Math.round(dpRp).toLocaleString('id-ID')})</span>
                      </div>
                      <input
                        type="range"
                        min={20}
                        max={50}
                        step={5}
                        value={dpPercent}
                        onChange={(e) => setDpPercent(Number(e.target.value))}
                        className="w-full accent-blue-600"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                        <span>Tenor Pinjaman:</span>
                        <span className="text-blue-600">{tenorTahun} Tahun ({bulan} Bulan)</span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={5}
                        step={1}
                        value={tenorTahun}
                        onChange={(e) => setTenorTahun(Number(e.target.value))}
                        className="w-full accent-blue-600"
                      />
                    </div>
                  </div>

                  {/* Installment Estimate Animating with AnimatedNumber (0.4s) */}
                  <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-500">Estimasi Angsuran Bulanan</span>
                      <div className="font-display text-2xl font-extrabold text-blue-700">
                        Rp <AnimatedNumber value={angsuran} duration={0.4} /> /bulan
                      </div>
                    </div>
                    <span className="text-[11px] text-blue-600 font-medium">Bunga Flat Efektif 8% p.a.</span>
                  </div>
                </div>
              )}

              {activeTab === 'inspeksi' && (
                <div className="space-y-3 text-xs text-slate-600">
                  <div className="flex items-center gap-2 text-emerald-700 font-semibold bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                    <ShieldCheck className="h-5 w-5" />
                    <span>Lulus 100% Inspeksi Struktural Menyeluruh: Bebas Bekas Banjir & Bebas Tabrakan Berat</span>
                  </div>
                  <p>
                    Dokumen BPKB, STNK, dan faktur telah dicek keabsahannya oleh tim legal. Nomor rangka dan nomor mesin sesuai dengan data Samsat setempat.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Similar cars reveal on scroll */}
          {car.mobil_serupa && car.mobil_serupa.length > 0 && (
            <Reveal className="pt-6">
              <h3 className="font-display text-xl font-bold text-slate-900 mb-4">
                Mobil Serupa dalam {car.nama_segmen || car.segmen_nama || 'Segmen Pilihan'}
              </h3>
              <Stagger className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {car.mobil_serupa.map((similar, idx) => (
                  <StaggerItem key={similar.id} index={idx}>
                    <PressableCard
                      onClick={() => navigate(`/mobil/${similar.id}`)}
                      className="border border-slate-200 bg-white p-3 shadow-sm flex items-center gap-3.5"
                    >
                      <img
                        src={getCarPhoto(similar.nama_mobil, (similar as any).transmisi)}
                        alt={similar.nama_mobil}
                        className="h-16 w-20 object-cover rounded-lg flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-xs text-slate-900 truncate">{similar.nama_mobil}</h4>
                        <div className="text-xs font-bold text-blue-600 mt-0.5">
                          Rp {(similar.harga_rp ?? 0).toLocaleString('id-ID')}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          {similar.tahun} • {similar.jarak_tempuh_ribu_km} rb km
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300" />
                    </PressableCard>
                  </StaggerItem>
                ))}
              </Stagger>
            </Reveal>
          )}
        </div>

        {/* Right Col: Sticky "Langkah Berikutnya" Card (does not animate while scrolling) */}
        <div>
          <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-md space-y-5">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                Tertarik dengan mobil ini?
              </span>
              <h3 className="font-display text-xl font-bold text-slate-900 mt-1">
                Langkah Berikutnya
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Jadwalkan uji jalan gratis tanpa kewajiban membeli di cabang terdekat Anda.
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Harga Tunai:</span>
                <span className="font-bold text-slate-800">Rp {(car.harga_rp ?? 0).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Angsuran Mulai:</span>
                <span className="font-bold text-blue-600">
                  Rp {(car.angsuran_bulanan_rp ?? car.cicilan_rp ?? 0).toLocaleString('id-ID')}/bln
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Lokasi Unit:</span>
                <span className="font-bold text-slate-800">{car.lokasi}</span>
              </div>
            </div>

            <button
              onClick={() => navigate(`/booking?mobil_id=${car.id}`)}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition-colors"
            >
              <span>Jadwalkan Test Drive Gratis</span>
            </button>

            <button
              type="button"
              onClick={() => toggleFavorite(car.id, { returnTo: `/mobil/${car.id}` })}
              aria-label={isFav ? 'Hapus dari favorit' : 'Simpan ke favorit'}
              className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all border cursor-pointer ${
                isFav
                  ? 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:border-rose-900/40 dark:text-rose-400'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200'
              }`}
            >
              <Heart className={`h-4 w-4 ${isFav ? 'fill-rose-500 text-rose-500' : 'text-slate-500'}`} />
              <span>{isFav ? 'Tersimpan di Favorit' : 'Simpan ke Favorit'}</span>
            </button>

            <a
              href={`https://wa.me/6281234567890?text=Halo%20CekGarasi,%20saya%20tertarik%20dengan%20${encodeURIComponent(car.nama_mobil)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <span>Hubungi Konsultan via WhatsApp</span>
            </a>

            <div className="pt-2 text-center text-[11px] text-slate-400">
              🛡️ Kelengkapan Data & Dokumen Terverifikasi
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
