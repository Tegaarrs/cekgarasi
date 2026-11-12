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
import { CarSpecsSection } from '@/components/car/CarSpecsSection';
import { SegmenInsightCard } from '@/components/bi/SegmenInsightCard';
import { CarFeaturesTab } from '@/components/car/CarFeaturesTab';
import { generateCarSpecifications } from '@/utils/carSpecs';
import { 
  Calendar, Gauge, ArrowLeft, ShieldCheck, ChevronRight, Heart,
  Zap, Settings, Users, CheckCircle2, Scale, Check
} from 'lucide-react';
import {
  isFavorite as checkIsFavorite,
  toggleFavorite,
  subscribeFavorites,
  fetchFavoriteIds,
} from '@/services/favoriteStore';
import {
  isCompared,
  toggleCompare,
  subscribeCompare,
} from '@/services/compareStore';

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
  model_mobil?: string;
  tipe_bodi?: string;
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
  foto_url?: string;
  foto_gallery?: string[];
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
  const [activeTab, setActiveTab] = useState<'spesifikasi' | 'fitur' | 'simulasi' | 'inspeksi'>('spesifikasi');

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

  const [compared, setCompared] = useState(false);

  useEffect(() => {
    if (car) {
      setCompared(isCompared(car.id));
    }
    const unsub = subscribeCompare(() => {
      if (car) {
        setCompared(isCompared(car.id));
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
  const galleryImages = getCarGallery(car.nama_mobil, car.transmisi, car.foto_gallery, car.foto_url);

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
    <div className="min-h-screen bg-transparent py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Back button */}
      <button
        onClick={() => {
          if ('startViewTransition' in document) {
            (document as any).startViewTransition(() => {
              navigate(-1);
            });
          } else {
            navigate(-1);
          }
        }}
        className="ios-glass-pill inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 mb-6 transition-all cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Kembali ke Hasil Pencarian</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Gallery, Specs, Market Position, Tabs */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Gallery with 200ms crossfade */}
          <div className="ios-glass-card rounded-2xl p-4 shadow-sm">
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
                  style={{
                    viewTransitionName: activeImageIndex === 0 ? `car-hero-${car.id}` : undefined,
                  }}
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
                  className="ios-glass-fav-btn w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:text-rose-500 active:scale-90 transition-all cursor-pointer"
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

          {/* Car Header Information - Editorial Specification Sheet */}
          <div className="bg-white dark:bg-[#111115] rounded-2xl border border-zinc-200/90 dark:border-white/10 p-6 sm:p-7 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                  {car.merk || car.merek || 'Mobil Pilihan'} • Tahun {car.tahun}
                </span>
                <h1 className="font-heading text-3xl sm:text-4xl font-black uppercase tracking-tight text-zinc-900 dark:text-white mt-1">
                  {car.nama_mobil}
                </h1>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block">Harga Tunai OTR</span>
                <div className="text-3xl sm:text-4xl font-extrabold text-[#5B4EF0] dark:text-[#8277FF]">
                  Rp {(car.harga_rp ?? 0).toLocaleString('id-ID')}
                </div>
              </div>
            </div>

            {/* Quick Specs Highlight Strip */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 py-4 border-y border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500 flex-shrink-0" />
                <div className="min-w-0">
                  <span className="block text-[10px] text-slate-400 font-medium">Tahun Rakitan</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{car.tahun}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-blue-500 flex-shrink-0" />
                <div className="min-w-0">
                  <span className="block text-[10px] text-slate-400 font-medium">Jarak Tempuh</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{car.jarak_tempuh_ribu_km} rb km</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500 flex-shrink-0" />
                <div className="min-w-0">
                  <span className="block text-[10px] text-slate-400 font-medium">Dapur Pacu</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                    {generateCarSpecifications(car).ringkasan.kapasitas_mesin}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                <div className="min-w-0">
                  <span className="block text-[10px] text-slate-400 font-medium">Transmisi</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">{car.transmisi}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <div className="min-w-0">
                  <span className="block text-[10px] text-slate-400 font-medium">Kapasitas</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                    {generateCarSpecifications(car).ringkasan.kapasitas_penumpang}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-500 flex-shrink-0" />
                <div className="min-w-0">
                  <span className="block text-[10px] text-slate-400 font-medium">Plat / Lokasi</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                    Plat {car.tipe_plat || car.jenis_plat || 'Ganjil'} • {car.lokasi}
                  </span>
                </div>
              </div>
            </div>

            {/* Posisi harga di segmennya benchmark */}
            <div className="mt-6 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-5 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Posisi Harga di {car.nama_segmen || car.segmen_nama || 'Segmen Pasar'}
                </span>
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35, duration: 0.3 }}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    car.posisi_harga?.verdict === 'di bawah rentang'
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                      : car.posisi_harga?.verdict === 'di atas rentang'
                      ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                      : 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
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
                  <div className="h-7 w-7 rounded-full border-2 border-white bg-blue-600 shadow-md flex items-center justify-center text-white">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
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
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111D3D] p-5 sm:p-6 shadow-sm">
            <div className="relative flex border-b border-slate-200 dark:border-slate-800 mb-6 overflow-x-auto scrollbar-none gap-1 sm:gap-2">
              {[
                { id: 'spesifikasi', label: 'Spesifikasi Lengkap' },
                { id: 'fitur', label: `Kelengkapan Fitur (${car.total_fitur}/11)` },
                { id: 'simulasi', label: 'Simulasi Kredit Anuitas 8%' },
                { id: 'inspeksi', label: 'Laporan Hasil Inspeksi 160 Titik' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'spesifikasi' | 'fitur' | 'simulasi' | 'inspeksi')}
                  className={`relative py-3 px-3 sm:px-4 text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                    activeTab === tab.id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="tabUnderline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"
                      transition={{ duration: 0.2 }}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            <div>
              {activeTab === 'spesifikasi' && (
                <CarSpecsSection car={car} />
              )}

              {activeTab === 'fitur' && (
                <CarFeaturesTab
                  features={car.features}
                  fiturList={car.fitur_list}
                  totalFitur={car.total_fitur}
                />
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
                <div className="space-y-5 text-xs text-slate-700">
                  <div className="flex items-center gap-3 text-emerald-800 font-semibold bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                    <ShieldCheck className="h-6 w-6 text-emerald-600 flex-shrink-0" />
                    <div>
                      <h4 className="font-bold text-sm text-emerald-950">Lulus 100% Inspeksi Struktural 160 Titik</h4>
                      <p className="text-[11px] text-emerald-800 mt-0.5">
                        Jaminan resmi unit bebas dari riwayat tabrakan berat, bebas bekas banjir, dan odometer asli non-reset.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                      <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Kondisi Mesin & Transmisi</span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Mesin halus, bebas kebocoran oli, kompresi silinder normal, dan perpindahan gigi responsif tanpa hentakan abnormal.
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                      <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Integritas Rangka & Sasis</span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Pilar A, B, C, apron depan, dan lantai bagasi belakang utuh orisinal tanpa bekas pengelasan ulang atau perbaikan benturan.
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                      <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Interior & Kelistrikan</span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        AC dingin optimal, seluruh panel meter instrumen berfungsi, jok orisinal bersih bebas bau apek atau residu lumpur banjir.
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                      <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Keabsahan Surat & Legalitas</span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Nomor rangka & mesin sesuai 100% fisik dengan BPKB, STNK, dan data registrasi Samsat setempat. Pajak berlaku aktif.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Fase 1: analisis segmen K-Means (posisi harga & kedekatan centroid) */}
          <Reveal className="pt-6">
            <SegmenInsightCard carId={car.id} />
          </Reveal>

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
                        src={getCarPhoto(similar.nama_mobil, (similar as any).foto_url || (similar as any).foto || (similar as any).transmisi)}
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

        {/* Right Col: Sticky Action Box - Velox Concierge Desk */}
        <div>
          <div className="sticky top-24 bg-white dark:bg-[#1A1A24] rounded-[14px] border border-[#E4E4EE] dark:border-[#2A2A38] p-6 sm:p-7 shadow-sm space-y-5">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5B4EF0] dark:text-[#8277FF]">
                Layanan Konsultasi &amp; Test Drive
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white mt-1">
                Langkah Berikutnya
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                Jadwalkan inspeksi langsung atau uji jalan gratis tanpa komitmen di dealer cabang kami.
              </p>
            </div>

            <div className="rounded-[10px] border border-[#E4E4EE] dark:border-[#2A2A38] bg-[#F6F6FB] dark:bg-[#16161F] p-4 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400 uppercase text-[10px]">Harga Tunai:</span>
                <span className="font-bold text-zinc-900 dark:text-white">Rp {(car.harga_rp ?? 0).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400 uppercase text-[10px]">Angsuran Mulai:</span>
                <span className="font-bold text-[#5B4EF0] dark:text-[#8277FF]">
                  Rp {(car.angsuran_bulanan_rp ?? car.cicilan_rp ?? 0).toLocaleString('id-ID')}/bln
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400 uppercase text-[10px]">Lokasi Dealer:</span>
                <span className="font-bold text-zinc-900 dark:text-white">{car.lokasi}</span>
              </div>
            </div>

            <button
              onClick={() => navigate(`/booking?mobil_id=${car.id}`)}
              className="cg-btn-primary w-full flex items-center justify-center gap-2 rounded-[10px] py-3 text-xs font-semibold shadow-xs cursor-pointer"
            >
              <span>Jadwalkan Test Drive Gratis</span>
            </button>

            <button
              type="button"
              onClick={() => toggleFavorite(car.id, { returnTo: `/mobil/${car.id}` })}
              aria-label={isFav ? 'Hapus dari favorit' : 'Simpan ke favorit'}
              className={`w-full flex items-center justify-center gap-2 rounded-[10px] py-2.5 text-xs font-medium border transition-all cursor-pointer ${
                isFav
                  ? 'text-[#EF4444] border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30'
                  : 'text-zinc-700 dark:text-zinc-200 border-[#E4E4EE] dark:border-[#2A2A38] hover:bg-[#EEEDFB] dark:hover:bg-[#22222E]'
              }`}
            >
              <Heart className={`h-4 w-4 ${isFav ? 'fill-[#EF4444] text-[#EF4444]' : 'text-zinc-400'}`} />
              <span>{isFav ? 'Tersimpan di Mobil Favorit' : 'Simpan ke Mobil Favorit'}</span>
            </button>

            <button
              type="button"
              onClick={() => toggleCompare(car.id)}
              className={`w-full flex items-center justify-center gap-2 rounded-[10px] py-2.5 text-xs font-medium border transition-all cursor-pointer ${
                compared
                  ? 'text-[#5B4EF0] dark:text-[#8277FF] border-[#5B4EF0]/30 bg-[#EEEDFB] dark:bg-white/10'
                  : 'text-zinc-700 dark:text-zinc-200 border-[#E4E4EE] dark:border-[#2A2A38] hover:bg-[#EEEDFB] dark:hover:bg-[#22222E]'
              }`}
            >
              <Scale className={`h-4 w-4 ${compared ? 'text-[#5B4EF0] dark:text-[#8277FF]' : 'text-zinc-400'}`} />
              <span>{compared ? 'Terpilih di Perbandingan' : 'Bandingkan dengan Unit Lain'}</span>
            </button>

            <a
              href={`https://wa.me/6281234567890?text=Halo%20CekGarasi,%20saya%20tertarik%20dengan%20${encodeURIComponent(car.nama_mobil)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 rounded-[10px] py-2.5 text-xs font-medium border border-[#E4E4EE] dark:border-[#2A2A38] text-zinc-700 dark:text-zinc-200 hover:bg-[#EEEDFB] dark:hover:bg-[#22222E] transition-colors"
            >
              <span>Hubungi Konsultan via WhatsApp</span>
            </a>

            <div className="pt-2 text-center text-[11px] text-zinc-400 dark:text-zinc-500 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Sertifikasi Standar 11 Fitur Spesifikasi</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
