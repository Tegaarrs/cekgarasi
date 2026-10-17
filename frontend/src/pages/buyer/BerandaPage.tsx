import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { scaleIn } from '@/lib/motion';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';
import { PressableCard } from '@/components/motion/PressableCard';
import { Reveal } from '@/components/motion/Reveal';
import { SegmentBadge } from '@/components/motion/SegmentBadge';
import { HeroBackground } from '@/components/hero/HeroBackground';
import { apiFetch } from '@/services/api';
import { getCarPhoto } from '@/utils/carPhoto';
import { 
  Search, ShieldCheck, CheckCircle2, Award, Zap, 
  HelpCircle, ArrowRight, Gauge, Calendar, MapPin
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

interface CarItem {
  id: number;
  nama_mobil: string;
  tahun: number;
  harga_rp: number;
  jarak_tempuh_ribu_km: number;
  lokasi: string;
  transmisi: string;
  klaster: number;
  nama_segmen: string;
  warna_segmen: string;
}

export function BerandaPage() {
  const navigate = useNavigate();

  const [segments, setSegments] = useState<SegmentSummary[]>([]);
  const [recommendations, setRecommendations] = useState<CarItem[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [activeMlPopover, setActiveMlPopover] = useState(false);

  useEffect(() => {
    // Load segment stats
    apiFetch<SegmentSummary[]>('/segmen/ringkasan')
      .then((data) => {
        if (Array.isArray(data)) {
          setSegments(data);
        }
      })
      .catch(() => {});

    // Load recommendations
    apiFetch<{ items: CarItem[] }>('/cari?limit=6')
      .then((data) => {
        if (data && Array.isArray(data.items)) {
          setRecommendations(data.items);
        }
      })
      .catch(() => {});
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchKeyword.trim()) params.append('q', searchKeyword.trim());
    if (selectedBrand) {
      params.append('merek', selectedBrand);
      params.append('merk', selectedBrand);
    }
    navigate(`/cari?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      
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
            <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight sm:leading-tight text-balance [text-wrap:balance]">
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
                  <option value="Datsun">Datsun</option>
                  <option value="Ford">Ford</option>
                  <option value="Chevrolet">Chevrolet</option>
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
              <span>Harga sudah dibandingkan</span>
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

      {/* 2. Three Segment Cards with Stagger + PressableCard & Animated Share Bar */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-2xl font-bold text-slate-900">
                Segmentasi Pasar Cerdas (K-Means)
              </h2>
              {/* ML Chip Popover opening with scaleIn */}
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
                      className="absolute left-0 top-full mt-2 z-30 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl text-xs text-slate-600"
                    >
                      <div className="font-bold text-slate-900 mb-1">Bagaimana K-Means Bekerja?</div>
                      <p>
                        Algoritma scikit-learn K-Means (k=3) mengelompokkan 609 mobil berdasarkan 4 fitur: tahun rilis, jarak tempuh, harga pasar, dan total kelengkapan fitur canggih.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Pengelompokan objektif non-asumtif untuk memudahkan Anda menemukan mobil paling rasional
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

        {/* Staggered Segment Cards */}
        <Stagger className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(Array.isArray(segments) ? segments : []).map((seg, idx) => {
            const sharePercent = Math.round((seg.share || 0) * 100);
            return (
              <StaggerItem key={seg.klaster ?? idx} index={idx}>
                <PressableCard
                  onClick={() => navigate(`/cari?klaster=${seg.klaster}`)}
                  className="h-full border border-slate-200 bg-white p-6 shadow-sm hover:border-slate-300"
                >
                  <div className="flex items-start justify-between mb-4">
                    <SegmentBadge klaster={seg.klaster} nama={seg.nama_pendek} size="sm" />
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

                  {/* Share Bar animating from 0 to percentage over 700ms when scrolled into view */}
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

      {/* 3. Recommendation Showcase with FadeUp */}
      <section className="py-12 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-display text-2xl font-bold text-slate-900">Unit Pilihan Terbaru</h2>
              <p className="text-sm text-slate-500">Kondisi istimewa siap pakai dengan verifikasi dokumen lengkap</p>
            </div>
            <Link to="/cari" className="text-sm font-semibold text-blue-600 hover:underline">
              Jelajahi Semua →
            </Link>
          </div>

          <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(Array.isArray(recommendations) ? recommendations : []).map((car, index) => (
              <StaggerItem key={car.id} index={index}>
                <PressableCard
                  onClick={() => navigate(`/mobil/${car.id}`)}
                  className="overflow-hidden border border-slate-200 bg-white shadow-sm"
                >
                  <div className="relative h-44 w-full overflow-hidden bg-slate-100">
                    <img
                      src={getCarPhoto(car.nama_mobil, car.transmisi)}
                      alt={car.nama_mobil}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute top-3 left-3">
                      <SegmentBadge klaster={car.klaster} nama={car.nama_segmen} size="sm" />
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="font-display text-base font-bold text-slate-900 truncate">
                      {car.nama_mobil}
                    </h3>
                    <div className="mt-1 font-display text-lg font-extrabold text-blue-600">
                      Rp {car.harga_rp.toLocaleString('id-ID')}
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {car.tahun}
                      </span>
                      <span className="flex items-center gap-1">
                        <Gauge className="h-3.5 w-3.5 text-slate-400" />
                        {car.jarak_tempuh_ribu_km} rb km
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        {car.lokasi}
                      </span>
                    </div>
                  </div>
                </PressableCard>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* 4. "Cara Membeli" Steps with Reveal */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-xl mx-auto mb-12">
          <h2 className="font-display text-2xl font-bold text-slate-900">Cara Mudah Membeli Mobil</h2>
          <p className="mt-2 text-sm text-slate-500">Transparansi penuh di setiap langkah tanpa biaya siluman</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { step: '01', title: 'Pilih & Bandingkan', desc: 'Gunakan filter dan segmentasi K-Means untuk mencari mobil yang cocok.' },
            { step: '02', title: 'Jadwalkan Test Drive', desc: 'Booking uji jalan gratis di cabang Jakarta, BSD, atau Bekasi.' },
            { step: '03', title: 'Simulasi Pembiayaan', desc: 'Dapatkan rincian angsuran transparan dengan bunga anuitas kompetitif 8%.' },
            { step: '04', title: 'Mobil Diantar ke Rumah', desc: 'Serah terima aman dengan garansi mesin resmi selama 1 tahun penuh.' },
          ].map((item, idx) => (
            <Reveal key={item.step} delay={idx * 0.1} className="h-full">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm h-full flex flex-col justify-between">
                <div>
                  <div className="font-display text-3xl font-extrabold text-blue-600/30 mb-2">
                    {item.step}
                  </div>
                  <h3 className="font-bold text-slate-900 text-base mb-1">{item.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}
