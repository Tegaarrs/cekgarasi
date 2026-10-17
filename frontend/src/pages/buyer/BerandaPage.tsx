import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { scaleIn } from '@/lib/motion';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';
import { PressableCard } from '@/components/motion/PressableCard';
import { HeroBackground } from '@/components/hero/HeroBackground';
import { CarCard, CarCardData } from '@/components/common/CarCard';
import { GuestLoginSheet } from '@/components/common/GuestLoginSheet';
import { CarListSkeleton } from '@/components/common/Skeletons';
import { apiFetch, getToken } from '@/services/api';
import { content } from '@/content/id';
import { 
  Search, ShieldCheck, CheckCircle2, Award, Zap, 
  HelpCircle, ArrowRight, Sparkles, ChevronRight, Calculator, Calendar
} from 'lucide-react';

interface SegmentSummary {
  klaster: number;
  nama_lengkap: string;
  nama_pendek: string;
  warna_hex: string;
  deskripsi: string;
  count: number;
  share: number;
  median_harga: number;
  median_tahun: number;
  mean_km: number;
  mean_total_fitur: number;
}

export function BerandaPage() {
  const navigate = useNavigate();
  const token = getToken();

  const [segments, setSegments] = useState<SegmentSummary[]>([]);
  const [recommendations, setRecommendations] = useState<CarCardData[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [activeMlPopover, setActiveMlPopover] = useState(false);
  const [showGuestSheet, setShowGuestSheet] = useState(false);

  // Load segment summary and recommendations
  useEffect(() => {
    // 1. Segmen
    apiFetch<SegmentSummary[]>('/segmen/ringkasan')
      .then((data) => {
        if (Array.isArray(data)) {
          setSegments(data);
        }
      })
      .catch(() => {});

    // 2. Rekomendasi Beranda (B6)
    setLoadingRecs(true);
    apiFetch<{ items: CarCardData[] }>('/rekomendasi/beranda')
      .then((res) => {
        if (res && Array.isArray(res.items)) {
          setRecommendations(res.items);
        }
      })
      .catch(() => {
        // Fallback to /cari
        apiFetch<{ items: CarCardData[] }>('/cari?page_size=6')
          .then((res) => {
            if (res && Array.isArray(res.items)) {
              setRecommendations(res.items);
            }
          })
          .catch(() => {});
      })
      .finally(() => {
        setLoadingRecs(false);
      });

    // 3. Favorites if logged in
    if (token) {
      apiFetch<{ items: Array<{ id: number }> }>('/favorit')
        .then((res) => {
          if (res && Array.isArray(res.items)) {
            setFavoriteIds(res.items.map((c) => c.id));
          }
        })
        .catch(() => {});
    }
  }, [token]);

  const handleFavoriteToggle = async (carId: number) => {
    if (!token) {
      setShowGuestSheet(true);
      return;
    }

    const isFav = favoriteIds.includes(carId);
    try {
      if (isFav) {
        await apiFetch(`/favorit/${carId}`, { method: 'DELETE' });
        setFavoriteIds((prev) => prev.filter((id) => id !== carId));
      } else {
        await apiFetch('/favorit', {
          method: 'POST',
          body: JSON.stringify({ car_id: carId }),
        });
        setFavoriteIds((prev) => [...prev, carId]);
      }
      window.dispatchEvent(new CustomEvent('cekgarasi:favorite_changed'));
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchKeyword.trim()) params.append('q', searchKeyword.trim());
    if (selectedBrand) {
      params.append('merk', selectedBrand);
    }
    navigate(`/cari?${params.toString()}`);
  };

  const quickFilterChips = [
    { label: 'Semua', path: '/cari' },
    { label: 'Premium', path: '/cari?segmen=premium' },
    { label: 'Keluarga Muda', path: '/cari?segmen=keluarga-muda' },
    { label: 'Ekonomis', path: '/cari?segmen=ekonomis' },
    { label: '< 150 Jt', path: '/cari?harga_max=150000000' },
    { label: 'Matic', path: '/cari?transmisi=Automatic' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      
      {/* ============================================================ */}
      {/* MOBILE VIEW (< 768px) - M1 Beranda                          */}
      {/* ============================================================ */}
      <div className="block md:hidden pb-10">
        
        {/* Mobile Search & Hero Header */}
        <div className="bg-gradient-to-b from-blue-700 via-blue-600 to-slate-900 text-white px-4 pt-6 pb-6">
          <div className="mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-blue-100 text-[11px] font-semibold backdrop-blur-xs">
              <Zap className="w-3 h-3 text-amber-300" />
              <span>{content.brand.tagline}</span>
            </span>
            <h1 className="text-2xl font-black tracking-tight mt-2 text-white">
              Cek harga dulu,<br />baru nego mobil bekas.
            </h1>
            <p className="text-xs text-blue-100/90 mt-1.5 leading-relaxed">
              Tiap mobil dibandingkan dengan mobil sejenis di segmennya, hitung perkiraan cicilan, lalu test drive online.
            </p>
          </div>

          {/* Search Box Input */}
          <form onSubmit={handleSearchSubmit} className="relative mt-4">
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder={content.search.placeholder}
              className="w-full bg-white text-slate-900 rounded-2xl py-3.5 pl-11 pr-24 text-xs font-medium placeholder-slate-400 shadow-md focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
            <button
              type="submit"
              className="absolute right-2 top-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all"
            >
              Cari
            </button>
          </form>

          {/* Quick Filter Horizontal Scroll */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pt-4 -mx-4 px-4">
            {quickFilterChips.map((chip) => (
              <Link
                key={chip.label}
                to={chip.path}
                className="flex-shrink-0 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-medium backdrop-blur-xs active:scale-95 transition-all"
              >
                {chip.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Jelajahi Segmen (3 Cards) */}
        <section className="px-4 py-6">
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Jelajahi Segmen Pasar</span>
              </h2>
              <span className="text-[11px] text-slate-500">
                {content.segments.chipLabel}
              </span>
            </div>
            <Link to="/segmen" className="text-xs font-bold text-blue-600 flex items-center gap-0.5">
              <span>Detail</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {[
              {
                klaster: 0,
                name: content.segments.names[0],
                slug: content.segments.slugs[0],
                color: content.segments.colors[0],
                desc: 'Fitur lengkap & prestise',
              },
              {
                klaster: 1,
                name: content.segments.names[1],
                slug: content.segments.slugs[1],
                color: content.segments.colors[1],
                desc: 'Kabin luas & efisien',
              },
              {
                klaster: 2,
                name: content.segments.names[2],
                slug: content.segments.slugs[2],
                color: content.segments.colors[2],
                desc: 'Hemat biaya & praktis',
              },
            ].map((seg) => {
              const count = segments.find((s) => s.klaster === seg.klaster)?.count;
              return (
                <Link
                  key={seg.klaster}
                  to={`/cari?segmen=${seg.slug}`}
                  className="rounded-2xl p-3 text-white flex flex-col justify-between h-28 shadow-xs active:scale-95 transition-all relative overflow-hidden"
                  style={{ backgroundColor: seg.color }}
                >
                  <div className="relative z-10">
                    <span className="text-[11px] font-bold block leading-tight">
                      {seg.name}
                    </span>
                    <span className="text-[9px] text-white/80 block mt-0.5">
                      {count ? `${count} unit` : 'Klaster ML'}
                    </span>
                  </div>
                  <span className="relative z-10 text-[9px] text-white/90 font-medium">
                    {seg.desc}
                  </span>
                  <div className="absolute -bottom-4 -right-4 w-12 h-12 rounded-full bg-white/10" />
                </Link>
              );
            })}
          </div>
        </section>

        {/* Rekomendasi Pilihan Unit (B6) */}
        <section className="px-4 py-2">
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Rekomendasi untuk Kamu
              </h2>
              <p className="text-[11px] text-slate-500">
                Pilihan unit seimbang antar segmen pasar
              </p>
            </div>
            <Link to="/cari" className="text-xs font-bold text-blue-600 flex items-center gap-0.5">
              <span>Semua</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loadingRecs ? (
            <CarListSkeleton count={4} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {recommendations.slice(0, 6).map((car) => (
                <CarCard
                  key={car.id}
                  car={car}
                  isFavorite={favoriteIds.includes(car.id)}
                  onFavoriteClick={handleFavoriteToggle}
                />
              ))}
            </div>
          )}
        </section>

        {/* Trust Strip */}
        <section className="px-4 py-6 mt-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Kenapa CekGarasi?
            </h3>
            {content.trustStrip.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {idx === 0 ? <Sparkles className="w-4 h-4" /> : idx === 1 ? <Calculator className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Cara Beli Steps */}
        <section className="px-4 py-2">
          <h3 className="text-base font-bold text-slate-900 mb-3">
            Cara Mudah Belanja Mobil
          </h3>
          <div className="grid grid-cols-2 gap-2.5">
            {content.howToBuySteps.map((step) => (
              <div
                key={step.step}
                className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <span className="text-xs font-black text-blue-600 block mb-1">
                    0{step.step}
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 mb-1 leading-snug">
                    {step.title}
                  </h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* ============================================================ */}
      {/* DESKTOP VIEW (≥ 768px)                                       */}
      {/* ============================================================ */}
      <div className="hidden md:block">
        
        {/* 1. Hero Section with responsive HeroBackground */}
        <section className="relative overflow-hidden bg-slate-950 py-16 sm:py-24 text-white">
          <HeroBackground />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-xs font-semibold text-blue-400 mb-6">
                <Zap className="h-3.5 w-3.5" />
                <span>Biar nawarnya nggak sambil nebak-nebak</span>
              </div>

              {/* Headline */}
              <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight sm:leading-tight text-balance">
                Cek dulu harganya,<br className="hidden md:block" /> baru nego.
              </h1>

              <p className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed">
                Nawar tanpa tahu harga pasar itu seperti menebak skor bola. Di sini tiap mobil sudah dibandingkan dengan yang mirip, jadi kamu tahu murah, wajar, atau kemahalan.
              </p>
            </div>

            {/* Search Card */}
            <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900/90 p-4 sm:p-6 shadow-2xl backdrop-blur-xl">
              <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-400 mb-1">Lagi naksir mobil apa?</label>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      placeholder="Contoh: Avanza, Brio, HR-V, Xpander..."
                      className="w-full rounded-xl border border-slate-700 bg-slate-800/80 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Merek</label>
                  <select
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/80 py-2.5 px-3 text-sm text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Semua merek</option>
                    <option value="Toyota">Toyota</option>
                    <option value="Honda">Honda</option>
                    <option value="Daihatsu">Daihatsu</option>
                    <option value="Mitsubishi">Mitsubishi</option>
                    <option value="Suzuki">Suzuki</option>
                    <option value="Nissan">Nissan</option>
                    <option value="Mazda">Mazda</option>
                    <option value="Wuling">Wuling</option>
                    <option value="Hyundai">Hyundai</option>
                    <option value="BMW">BMW</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition-colors"
                  >
                    <Search className="h-4 w-4" />
                    <span>Cek Mobil</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Trust Strip */}
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-800/80 pt-6 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Harga sudah dibandingkan otomatis</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-blue-400" />
                <span>Cicilan bisa dihitung sebelum datang</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-purple-400" />
                <span>Test drive tinggal pilih jadwal</span>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Three Segment Cards */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-2xl font-bold text-slate-900">
                  Segmentasi Pasar Cerdas (K-Means)
                </h2>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setActiveMlPopover(!activeMlPopover)}
                    className="rounded-full p-1 text-slate-400 hover:text-blue-600 transition-colors"
                    aria-label="Info segmentasi ML"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </button>
                  <AnimatePresence>
                    {activeMlPopover && (
                      <motion.div
                        variants={scaleIn}
                        initial="hidden"
                        animate="show"
                        exit="hidden"
                        className="absolute left-0 top-full mt-2 z-30 w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-xl text-xs text-slate-600"
                      >
                        <div className="font-bold text-slate-900 mb-1">Bagaimana K-Means Bekerja?</div>
                        <p>
                          Algoritma scikit-learn K-Means (k=3) mengelompokkan 609 mobil berdasarkan 4 variabel: tahun pembuatan, jarak tempuh, harga pasar (listing), dan total kelengkapan fitur dari 11 fitur tercatat.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Pengelompokan objektif non-asumtif untuk memudahkan kamu menemukan mobil paling rasional
              </p>
            </div>
            <Link
              to="/cari"
              className="mt-4 sm:mt-0 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              <span>Lihat Semua Katalog</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <Stagger className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(Array.isArray(segments) ? segments : []).map((seg, idx) => {
              const sharePercent = Math.round((seg.share || 0) * 100);
              const slug = content.segments.slugs[seg.klaster] || 'premium';
              return (
                <StaggerItem key={seg.klaster ?? idx} index={idx}>
                  <PressableCard
                    onClick={() => navigate(`/cari?segmen=${slug}`)}
                    className="h-full border border-slate-200 bg-white p-6 shadow-sm hover:border-slate-300"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <span
                        className="px-2.5 py-1 rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: seg.warna_hex || '#2563EB' }}
                      >
                        {seg.nama_pendek}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">
                        {seg.count} Unit
                      </span>
                    </div>

                    <h3 className="font-display text-lg font-bold text-slate-900 mb-2">
                      {seg.nama_lengkap}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed mb-5 min-h-[40px]">
                      {seg.deskripsi}
                    </p>

                    <div className="mb-4">
                      <div className="flex justify-between text-xs font-medium text-slate-600 mb-1.5">
                        <span>Pangsa Pasar:</span>
                        <span className="font-bold text-slate-900">{sharePercent}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${sharePercent}%` }}
                          viewport={{ once: true, amount: 0.2 }}
                          transition={{ duration: 0.7, ease: 'easeOut' }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: seg.warna_hex || '#2563EB' }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-4 border-t border-slate-100 text-[11px] text-slate-500">
                      <div>
                        <span className="block text-slate-400">Median Harga:</span>
                        <span className="font-bold text-slate-800">
                          Rp {Math.round(seg.median_harga / 1000000)} Juta
                        </span>
                      </div>
                      <div>
                        <span className="block text-slate-400">Median Tahun:</span>
                        <span className="font-bold text-slate-800">{seg.median_tahun}</span>
                      </div>
                    </div>
                  </PressableCard>
                </StaggerItem>
              );
            })}
          </Stagger>
        </section>

        {/* 3. Recommendation Showcase */}
        <section className="py-12 bg-white border-y border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="font-display text-2xl font-bold text-slate-900">Unit Pilihan Terbaru</h2>
                <p className="text-sm text-slate-500">Kondisi siap pakai dengan verifikasi dokumen lengkap</p>
              </div>
              <Link to="/cari" className="text-sm font-semibold text-blue-600 hover:underline">
                Jelajahi Semua →
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendations.slice(0, 6).map((car) => (
                <CarCard
                  key={car.id}
                  car={car}
                  isFavorite={favoriteIds.includes(car.id)}
                  onFavoriteClick={handleFavoriteToggle}
                />
              ))}
            </div>
          </div>
        </section>

        {/* 4. Cara Membeli Steps */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className="font-display text-2xl font-bold text-slate-900">Cara Mudah Membeli Mobil</h2>
            <p className="mt-2 text-sm text-slate-500">Transparansi penuh di setiap langkah tanpa biaya siluman</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {content.howToBuySteps.map((item) => (
              <div key={stepKey(item.step)} className="h-full">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm h-full flex flex-col justify-between">
                  <div>
                    <div className="font-display text-3xl font-extrabold text-blue-600/30 mb-2">
                      0{item.step}
                    </div>
                    <h3 className="font-bold text-slate-900 text-base mb-1">{item.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* Guest Login Sheet Modal */}
      <GuestLoginSheet
        isOpen={showGuestSheet}
        onClose={() => setShowGuestSheet(false)}
        redirectPath="/"
      />
    </div>
  );
}

function stepKey(step: number): string {
  return `step-${step}`;
}
