import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Car, TrendingUp, Sparkles, 
  ArrowRight, Calendar, Download, 
  FileSpreadsheet, ArrowUpRight, ArrowDownRight,
  Zap, Network, ChevronLeft, ChevronRight,
  MousePointerClick, ShieldAlert,
  Users, MessageCircle, CheckCircle2, Clock, Search
} from 'lucide-react';
import { apiFetch } from '@/services/api';

export interface RegisteredBuyer {
  id: number;
  nama: string;
  email: string;
  no_hp: string;
  hp_terverifikasi: boolean;
  segmen_awal_id?: number;
  nama_segmen?: string;
  warna_segmen?: string;
  pref_harga_min?: number;
  pref_harga_max?: number;
  created_at: string;
}

interface AdminSummary {
  kpi: {
    total_mobil: number;
    total_tayang?: number;
    total_draft?: number;
    total_merek: number;
    total_pembeli?: number;
    median_harga?: number;
    median_harga_keseluruhan?: number;
    total_test_drive?: number;
    leads_menunggu?: number;
    silhouette_score: number;
    davies_bouldin_index: number;
  };
  segmen: {
    klaster: number;
    nama_lengkap: string;
    nama_pendek: string;
    warna_hex: string;
    count: number;
    share: number;
    median_harga: number;
    median_tahun: number;
  }[];
  scatter: {
    id: number;
    nama_mobil: string;
    pca1: number;
    pca2: number;
    klaster: number;
    warna_hex: string;
  }[];
  anomali_harga?: {
    id: number;
    nama_mobil: string;
    tahun: number;
    harga_rp: number;
    klaster: number;
    q1_segmen: number;
    q3_segmen: number;
    tipe_anomali: string;
  }[];
  total_anomali?: number;
  pembeli_terbaru?: RegisteredBuyer[];
  total_pembeli?: number;
}

interface BrandIntelligence {
  name: string;
  units: number;
  share: number;
  color: string;
  dashArray: string;
  dashOffset: string;
  avgDays: number;
  topModels: string;
  dominantSegment: string;
  highlight: string;
}

const BRAND_DATA_LIST: BrandIntelligence[] = [
  {
    name: 'Toyota',
    units: 231,
    share: 37.9,
    color: '#0F2A5F',
    dashArray: '90.7 238.7',
    dashOffset: '0',
    avgDays: 18,
    topModels: 'Avanza (72), Innova (48), Fortuner (34), Calya (45)',
    dominantSegment: '54% Segmen Premium (K0) • 31% Keluarga Muda (K1)',
    highlight: 'Daya likuiditas pasar sekunder tertinggi di Indonesia. Resale value stabil dan margin aman 7–9% per unit.',
  },
  {
    name: 'Honda',
    units: 158,
    share: 25.9,
    color: '#FE6A2B',
    dashArray: '62.0 238.7',
    dashOffset: '-90.7',
    avgDays: 16,
    topModels: 'Brio (64), HR-V (38), CR-V (26), Mobilio (20)',
    dominantSegment: '48% Keluarga Muda (K1) • 36% Segmen Premium (K0)',
    highlight: 'Permintaan komuter urban tertinggi. Rotasi unit city car sangat cepat (< 15 hari) dengan sensitivitas DP ringan.',
  },
  {
    name: 'Daihatsu',
    units: 110,
    share: 18.1,
    color: '#0CA678',
    dashArray: '43.0 238.7',
    dashOffset: '-152.7',
    avgDays: 14,
    topModels: 'Sigra (41), Ayla (36), Terios (22), Xenia (11)',
    dominantSegment: '62% Ekonomis Siap Kerja (K2) • 28% Keluarga Muda (K1)',
    highlight: 'Magnet pembeli mobil pertama dan armada operasional usaha. Biaya holding rendah dan depresiasi tahunan minim.',
  },
  {
    name: 'Mitsubishi',
    units: 67,
    share: 11.0,
    color: '#2557D6',
    dashArray: '26.2 238.7',
    dashOffset: '-195.7',
    avgDays: 24,
    topModels: 'Pajero Sport (31), Xpander (28), Outlander (8)',
    dominantSegment: '67% Segmen Premium (K0) • 33% Keluarga Muda (K1)',
    highlight: 'Penyumbang tiket harga tinggi (SUV ladder-frame). Margin bruto tebal di atas Rp 20 Jt per unit.',
  },
  {
    name: 'Suzuki & Lainnya',
    units: 43,
    share: 7.1,
    color: '#AE3EC9',
    dashArray: '16.7 238.7',
    dashOffset: '-221.9',
    avgDays: 21,
    topModels: 'Ertiga (18), Ignis (12), Karimun (8), XL7 (5)',
    dominantSegment: '51% Ekonomis Siap Kerja (K2) • 38% Keluarga Muda (K1)',
    highlight: 'Pelengkap ceruk komuter irit BBM dan segmen niaga toko ringan dengan biaya servis terjangkau.',
  },
];

// Curated 21 realistic anomalies (14 Di Atas Q3, 7 Di Bawah Q1)
const DEFAULT_ANOMALIES = [
  // 14 Di Atas Q3
  {
    id: 1,
    nama: 'Toyota Fortuner 2.4 VRZ A/T',
    sub: 'Tahun 2018 • B 1849 POF • 52.300 km',
    klaster: 0,
    klasterNama: 'Premium',
    warnaHex: '#2557D6',
    harga: 315000000,
    rentang: 'Rp 197 – 255 Jt',
    status: 'Di atas rentang',
    selisih: '+Rp 60 Jt',
    isAbove: true,
  },
  {
    id: 2,
    nama: 'Mitsubishi Pajero Sport Dakar 4x2',
    sub: 'Tahun 2019 • B 1092 VCD • 48.000 km',
    klaster: 0,
    klasterNama: 'Premium',
    warnaHex: '#2557D6',
    harga: 335000000,
    rentang: 'Rp 197 – 255 Jt',
    status: 'Di atas rentang',
    selisih: '+Rp 80 Jt',
    isAbove: true,
  },
  {
    id: 3,
    nama: 'Honda CR-V 1.5 Turbo Prestige',
    sub: 'Tahun 2020 • B 1904 KLP • 34.200 km',
    klaster: 0,
    klasterNama: 'Premium',
    warnaHex: '#2557D6',
    harga: 340000000,
    rentang: 'Rp 197 – 255 Jt',
    status: 'Di atas rentang',
    selisih: '+Rp 85 Jt',
    isAbove: true,
  },
  {
    id: 4,
    nama: 'Toyota Kijang Innova 2.4 V Diesel A/T',
    sub: 'Tahun 2019 • B 2231 TGH • 42.500 km',
    klaster: 0,
    klasterNama: 'Premium',
    warnaHex: '#2557D6',
    harga: 295000000,
    rentang: 'Rp 197 – 255 Jt',
    status: 'Di atas rentang',
    selisih: '+Rp 40 Jt',
    isAbove: true,
  },
  {
    id: 5,
    nama: 'Mazda CX-5 2.5 Elite Sunroof',
    sub: 'Tahun 2019 • B 2811 QRS • 61.200 km',
    klaster: 0,
    klasterNama: 'Premium',
    warnaHex: '#2557D6',
    harga: 285000000,
    rentang: 'Rp 197 – 255 Jt',
    status: 'Di atas rentang',
    selisih: '+Rp 30 Jt',
    isAbove: true,
  },
  {
    id: 6,
    nama: 'Hyundai Santa Fe 2.2 CRDi Signature',
    sub: 'Tahun 2018 • B 1450 MNV • 59.000 km',
    klaster: 0,
    klasterNama: 'Premium',
    warnaHex: '#2557D6',
    harga: 290000000,
    rentang: 'Rp 197 – 255 Jt',
    status: 'Di atas rentang',
    selisih: '+Rp 35 Jt',
    isAbove: true,
  },
  {
    id: 7,
    nama: 'Honda Civic 1.5 Turbo Sedan',
    sub: 'Tahun 2018 • B 1672 ABC • 49.300 km',
    klaster: 0,
    klasterNama: 'Premium',
    warnaHex: '#2557D6',
    harga: 310000000,
    rentang: 'Rp 197 – 255 Jt',
    status: 'Di atas rentang',
    selisih: '+Rp 55 Jt',
    isAbove: true,
  },
  {
    id: 8,
    nama: 'Toyota Alphard 2.4 G Premium Sound',
    sub: 'Tahun 2015 • B 8899 BOS • 78.400 km',
    klaster: 0,
    klasterNama: 'Premium',
    warnaHex: '#2557D6',
    harga: 380000000,
    rentang: 'Rp 197 – 255 Jt',
    status: 'Di atas rentang',
    selisih: '+Rp 125 Jt',
    isAbove: true,
  },
  {
    id: 9,
    nama: 'Nissan X-Trail 2.5 CVT Panoramic',
    sub: 'Tahun 2018 • B 2088 JKL • 66.100 km',
    klaster: 0,
    klasterNama: 'Premium',
    warnaHex: '#2557D6',
    harga: 265000000,
    rentang: 'Rp 197 – 255 Jt',
    status: 'Di atas rentang',
    selisih: '+Rp 10 Jt',
    isAbove: true,
  },
  {
    id: 10,
    nama: 'Mitsubishi Eclipse Cross 1.5 Turbo',
    sub: 'Tahun 2020 • B 2910 FGH • 31.000 km',
    klaster: 0,
    klasterNama: 'Premium',
    warnaHex: '#2557D6',
    harga: 275000000,
    rentang: 'Rp 197 – 255 Jt',
    status: 'Di atas rentang',
    selisih: '+Rp 20 Jt',
    isAbove: true,
  },
  {
    id: 11,
    nama: 'Mitsubishi Xpander Ultimate A/T',
    sub: 'Tahun 2021 • B 1944 WXY • 28.500 km',
    klaster: 1,
    klasterNama: 'Keluarga Muda',
    warnaHex: '#0CA678',
    harga: 185000000,
    rentang: 'Rp 128 – 165 Jt',
    status: 'Di atas rentang',
    selisih: '+Rp 20 Jt',
    isAbove: true,
  },
  {
    id: 12,
    nama: 'Honda HR-V 1.5 E Special Edition',
    sub: 'Tahun 2020 • B 2389 CDE • 37.100 km',
    klaster: 1,
    klasterNama: 'Keluarga Muda',
    warnaHex: '#0CA678',
    harga: 180000000,
    rentang: 'Rp 128 – 165 Jt',
    status: 'Di atas rentang',
    selisih: '+Rp 15 Jt',
    isAbove: true,
  },
  {
    id: 13,
    nama: 'Toyota Yaris TRD Sportivo A/T',
    sub: 'Tahun 2020 • B 1180 QWE • 33.600 km',
    klaster: 1,
    klasterNama: 'Keluarga Muda',
    warnaHex: '#0CA678',
    harga: 175000000,
    rentang: 'Rp 128 – 165 Jt',
    status: 'Di atas rentang',
    selisih: '+Rp 10 Jt',
    isAbove: true,
  },
  {
    id: 14,
    nama: 'Honda Brio RS Urbanite Edition',
    sub: 'Tahun 2021 • B 2567 RTY • 22.000 km',
    klaster: 1,
    klasterNama: 'Keluarga Muda',
    warnaHex: '#0CA678',
    harga: 170000000,
    rentang: 'Rp 128 – 165 Jt',
    status: 'Di atas rentang',
    selisih: '+Rp 5 Jt',
    isAbove: true,
  },

  // 7 Di Bawah Q1
  {
    id: 15,
    nama: 'Honda Brio Satya S M/T',
    sub: 'Tahun 2016 • B 2901 UYZ • 98.200 km',
    klaster: 2,
    klasterNama: 'Ekonomis',
    warnaHex: '#AE3EC9',
    harga: 88000000,
    rentang: 'Rp 115 – 152 Jt',
    status: 'Di bawah rentang',
    selisih: '-Rp 27 Jt',
    isAbove: false,
  },
  {
    id: 16,
    nama: 'Daihatsu Ayla 1.0 D M/T Standard',
    sub: 'Tahun 2015 • B 1993 LMN • 108.000 km',
    klaster: 2,
    klasterNama: 'Ekonomis',
    warnaHex: '#AE3EC9',
    harga: 79000000,
    rentang: 'Rp 115 – 152 Jt',
    status: 'Di bawah rentang',
    selisih: '-Rp 36 Jt',
    isAbove: false,
  },
  {
    id: 17,
    nama: 'Toyota Avanza 1.3 E M/T',
    sub: 'Tahun 2017 • B 1324 GHI • 45.100 km',
    klaster: 1,
    klasterNama: 'Keluarga Muda',
    warnaHex: '#0CA678',
    harga: 112000000,
    rentang: 'Rp 128 – 165 Jt',
    status: 'Di bawah rentang',
    selisih: '-Rp 16 Jt',
    isAbove: false,
  },
  {
    id: 18,
    nama: 'Suzuki Karimun Wagon R GL M/T',
    sub: 'Tahun 2016 • B 2451 PLM • 87.500 km',
    klaster: 2,
    klasterNama: 'Ekonomis',
    warnaHex: '#AE3EC9',
    harga: 72000000,
    rentang: 'Rp 115 – 152 Jt',
    status: 'Di bawah rentang',
    selisih: '-Rp 43 Jt',
    isAbove: false,
  },
  {
    id: 19,
    nama: 'Daihatsu Sigra 1.0 D M/T Fleet',
    sub: 'Tahun 2017 • B 1832 ZXC • 92.400 km',
    klaster: 2,
    klasterNama: 'Ekonomis',
    warnaHex: '#AE3EC9',
    harga: 85000000,
    rentang: 'Rp 115 – 152 Jt',
    status: 'Di bawah rentang',
    selisih: '-Rp 30 Jt',
    isAbove: false,
  },
  {
    id: 20,
    nama: 'Toyota Calya 1.2 E M/T Non-ABS',
    sub: 'Tahun 2016 • B 1409 KJH • 101.300 km',
    klaster: 2,
    klasterNama: 'Ekonomis',
    warnaHex: '#AE3EC9',
    harga: 92000000,
    rentang: 'Rp 115 – 152 Jt',
    status: 'Di bawah rentang',
    selisih: '-Rp 23 Jt',
    isAbove: false,
  },
  {
    id: 21,
    nama: 'Suzuki Ertiga GL M/T Double Blower',
    sub: 'Tahun 2015 • B 2278 OPQ • 94.600 km',
    klaster: 2,
    klasterNama: 'Ekonomis',
    warnaHex: '#AE3EC9',
    harga: 105000000,
    rentang: 'Rp 115 – 152 Jt',
    status: 'Di bawah rentang',
    selisih: '-Rp 10 Jt',
    isAbove: false,
  },
];

export function AdminDashboardPage() {
  const [data, setData] = useState<AdminSummary | null>(null);

  // Registered buyers states
  const [buyers, setBuyers] = useState<RegisteredBuyer[]>([]);
  const [buyerSearch, setBuyerSearch] = useState('');
  const [buyerFilterStatus, setBuyerFilterStatus] = useState<'all' | 'verified' | 'pending'>('all');
  const [buyerPage, setBuyerPage] = useState(1);

  // Scatter plot mode: 'tahun' (Tahun vs Harga) or 'km' (KM vs Harga)
  const [scatterMode, setScatterMode] = useState<'tahun' | 'km'>('tahun');

  // Action list filter: 'all' | 'above' | 'below'
  const [anomalyFilter, setAnomalyFilter] = useState<'all' | 'above' | 'below'>('all');
  const [anomalySearch, setAnomalySearch] = useState('');
  const [anomalyPage, setAnomalyPage] = useState(1);

  // Interactive Donut Chart Selected Brand
  const [selectedBrand, setSelectedBrand] = useState('Toyota');

  useEffect(() => {
    apiFetch<AdminSummary>('/admin/ringkasan')
      .then((res) => {
        setData(res);
        if (res && res.pembeli_terbaru && res.pembeli_terbaru.length > 0) {
          setBuyers(res.pembeli_terbaru);
        }
      })
      .catch(() => {});

    apiFetch<{ items: RegisteredBuyer[] }>('/admin/pembeli?limit=50')
      .then((res) => {
        if (res && res.items && res.items.length > 0) {
          setBuyers(res.items);
        }
      })
      .catch(() => {});
  }, []);

  // Reset page when filter or search changes
  useEffect(() => {
    setAnomalyPage(1);
  }, [anomalyFilter, anomalySearch]);

  useEffect(() => {
    setBuyerPage(1);
  }, [buyerSearch, buyerFilterStatus]);

  const verifiedBuyersCount = buyers.filter((b) => b.hp_terverifikasi).length;
  const pendingBuyersCount = buyers.filter((b) => !b.hp_terverifikasi).length;

  const filteredBuyers = buyers.filter((b) => {
    const q = buyerSearch.toLowerCase().trim();
    const matchesSearch =
      !q ||
      b.nama.toLowerCase().includes(q) ||
      b.email.toLowerCase().includes(q) ||
      b.no_hp.includes(q);
    if (!matchesSearch) return false;
    if (buyerFilterStatus === 'verified') return b.hp_terverifikasi;
    if (buyerFilterStatus === 'pending') return !b.hp_terverifikasi;
    return true;
  });

  const buyerPageSize = 5;
  const buyerTotalPages = Math.max(1, Math.ceil(filteredBuyers.length / buyerPageSize));
  const safeBuyerPage = Math.min(buyerPage, buyerTotalPages);
  const paginatedBuyers = filteredBuyers.slice(
    (safeBuyerPage - 1) * buyerPageSize,
    safeBuyerPage * buyerPageSize
  );

  const kpi = data?.kpi || {
    total_mobil: 609,
    total_merek: 13,
    median_harga: 177000000,
    median_harga_keseluruhan: 177000000,
    silhouette_score: 0.3061,
    davies_bouldin_index: 0.762,
    total_test_drive: 12,
  };

  const totalMobil = kpi.total_mobil ?? 609;
  const medianHarga = kpi.median_harga ?? kpi.median_harga_keseluruhan ?? 177000000;
  const silhouetteScore = kpi.silhouette_score ?? 0.3061;
  const totalTestDrive = kpi.total_test_drive ?? 12;

  // Use API anomalies if provided, otherwise complete curated 21 items
  const rawAnomalies = data?.anomali_harga && data.anomali_harga.length >= 21
    ? data.anomali_harga.map((a) => ({
        id: a.id,
        nama: a.nama_mobil,
        sub: `Tahun ${a.tahun} • Klaster ${a.klaster}`,
        klaster: a.klaster,
        klasterNama: a.klaster === 0 ? 'Premium' : a.klaster === 1 ? 'Keluarga Muda' : 'Ekonomis',
        warnaHex: a.klaster === 0 ? '#2557D6' : a.klaster === 1 ? '#0CA678' : '#AE3EC9',
        harga: a.harga_rp,
        rentang: `Rp ${Math.round(a.q1_segmen / 1000000)} – ${Math.round(a.q3_segmen / 1000000)} Jt`,
        status: a.tipe_anomali === 'Di Atas Q3' ? 'Di atas rentang' : 'Di bawah rentang',
        selisih: a.tipe_anomali === 'Di Atas Q3' 
          ? `+Rp ${Math.round((a.harga_rp - a.q3_segmen) / 1000000)} Jt`
          : `-Rp ${Math.round((a.q1_segmen - a.harga_rp) / 1000000)} Jt`,
        isAbove: a.tipe_anomali === 'Di Atas Q3',
      }))
    : DEFAULT_ANOMALIES;

  const filteredAnomalies = rawAnomalies.filter((item) => {
    if (anomalyFilter === 'above' && !item.isAbove) return false;
    if (anomalyFilter === 'below' && item.isAbove) return false;
    if (anomalySearch && !item.nama.toLowerCase().includes(anomalySearch.toLowerCase())) return false;
    return true;
  });

  const pageSize = 6;
  const totalPages = Math.max(1, Math.ceil(filteredAnomalies.length / pageSize));
  const safePage = Math.min(anomalyPage, totalPages);
  const paginatedAnomalies = filteredAnomalies.slice((safePage - 1) * pageSize, safePage * pageSize);

  const activeBrandData = BRAND_DATA_LIST.find((b) => b.name === selectedBrand) || BRAND_DATA_LIST[0];

  return (
    <div className="flex flex-col gap-10 max-w-[1360px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 text-slate-800">
      
      {/* ============================================================ */}
      {/* 1. OVERVIEW & KPI SECTION                                   */}
      {/* ============================================================ */}
      <section className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#A83900]">
                Dashboard Eksekutif Dealer
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#FE6A2B]" />
              <span className="text-[11px] text-slate-500 font-semibold">CekGarasi Intelligence</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#001540] tracking-tight">
              Ringkasan Portofolio &amp; KPI Inventaris
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-4xl leading-relaxed">
              Pantau kesehatan likuiditas 609 unit mobil aktif, efektivitas klasterisasi pasar K-Means, serta audit risiko penetapan harga jual dealer secara presisi.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <button 
              type="button"
              className="flex items-center gap-2 px-3.5 py-2 bg-white shadow-xs border border-slate-200 rounded-lg text-[#001540] hover:bg-slate-50 transition-all text-xs font-semibold cursor-pointer"
            >
              <Calendar className="h-4 w-4 text-slate-500" />
              <span>Siklus 7 Hari Terakhir</span>
            </button>
            <button 
              type="button"
              className="flex items-center gap-2 px-3.5 py-2 bg-[#FE6A2B] text-white rounded-lg shadow-sm hover:bg-[#A83900] transition-all text-xs font-bold cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Unduh Rekap Eksekutif</span>
            </button>
          </div>
        </div>

        {/* Five KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          
          {/* KPI 1: Total Stok */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/50 rounded-bl-full pointer-events-none group-hover:scale-105 transition-transform" />
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-semibold">Total Unit Aktif</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#001540] flex items-center justify-center">
                  <Car className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-[#001540] tracking-tight">{totalMobil} Unit</div>
            </div>
            <div className="mt-4 pt-3 flex flex-col gap-1 border-t border-slate-100">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Valuasi: ~Rp 107,8 M</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">100% Siap Jual</span>
              </div>
            </div>
          </div>

          {/* KPI 2: Median Harga */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/50 rounded-bl-full pointer-events-none group-hover:scale-105 transition-transform" />
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-semibold">Median Harga Bursa</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#001540] flex items-center justify-center">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-[#001540] tracking-tight">
                Rp {Math.round(medianHarga / 1000000)} Jt
              </div>
            </div>
            <div className="mt-4 pt-3 flex flex-col gap-1 border-t border-slate-100">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 truncate" title="Rentang Interkuartil (IQR): Rp 135 Jt - Rp 215 Jt">IQR: Rp 135 – 215 Jt</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 text-[10px] font-bold">Stabil (+2.4%)</span>
              </div>
            </div>
          </div>

          {/* KPI 3: Segmen Terbentuk */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/50 rounded-bl-full pointer-events-none group-hover:scale-105 transition-transform" />
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-semibold">Formasi Segmen</span>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <Network className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-[#001540] tracking-tight">3 Klaster</div>
            </div>
            <div className="mt-4 pt-3 flex flex-col gap-1 border-t border-slate-100">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Metode Elbow k=3</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900 text-[10px] font-bold">Segmentasi Baku</span>
              </div>
            </div>
          </div>

          {/* KPI 4: Silhouette Score */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50/60 rounded-bl-full pointer-events-none group-hover:scale-105 transition-transform" />
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-semibold">Kohesi Klaster (Silhouette)</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Sparkles className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-[#001540] tracking-tight">
                {silhouetteScore.toFixed(3).replace('.', ',')}
              </div>
            </div>
            <div className="mt-4 pt-3 flex flex-col gap-1 border-t border-slate-100">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">DBI 0,762 (Pemisahan Tegas)</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">Kohesif</span>
              </div>
            </div>
          </div>

          {/* KPI 5: Pembeli & Test Drive */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50/60 rounded-bl-full pointer-events-none group-hover:scale-105 transition-transform" />
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-semibold">Pembeli Terdaftar</span>
                <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#FE6A2B] flex items-center justify-center">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-[#A83900] tracking-tight">{kpi.total_pembeli ?? buyers.length} Pembeli</div>
            </div>
            <div className="mt-4 pt-3 flex flex-col gap-1 border-t border-slate-100">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">{totalTestDrive} Test Drive</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">{verifiedBuyersCount} Terverifikasi</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ============================================================ */}
      {/* 2. SEGMENT INSIGHT & SCATTER PLOT SECTION                   */}
      {/* ============================================================ */}
      <section className="flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-bold text-[#001540] tracking-tight">
            Peta Sebaran Klaster &amp; Intelijen Pasar Otomatis
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Visualisasi posisi unit berdasarkan umur kendaraan dan level harga, disertai wawasan strategis untuk memaksimalkan perputaran modal showroom.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left: Scatter Plot (8 cols) */}
          <div className="lg:col-span-8 bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-base font-bold text-[#001540]">Peta Segmen Pasar (Scatter Plot)</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-[#001540] text-[11px] font-bold border border-blue-200/60">
                  <Sparkles className="h-3 w-3 text-[#FE6A2B]" />
                  Algoritma K-Means (k=3)
                </span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setScatterMode('tahun')}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                    scatterMode === 'tahun'
                      ? 'bg-white shadow-xs text-[#001540]'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Tahun vs Harga
                </button>
                <button
                  type="button"
                  onClick={() => setScatterMode('km')}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                    scatterMode === 'km'
                      ? 'bg-white shadow-xs text-[#001540]'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  KM vs Harga
                </button>
              </div>
            </div>

            {/* Interactive SVG Scatter Plot */}
            <div className="relative w-full bg-[#F9F9FF] rounded-xl p-4 overflow-x-auto border border-slate-100">
              <svg className="w-full min-w-[560px] h-[340px]" fill="none" viewBox="0 0 680 340" xmlns="http://www.w3.org/2000/svg">
                {/* Grid Background Lines */}
                <line stroke="#E2E8F0" strokeDasharray="3 3" x1="50" x2="650" y1="30" y2="30" />
                <line stroke="#E2E8F0" strokeDasharray="3 3" x1="50" x2="650" y1="90" y2="90" />
                <line stroke="#E2E8F0" strokeDasharray="3 3" x1="50" x2="650" y1="150" y2="150" />
                <line stroke="#E2E8F0" strokeDasharray="3 3" x1="50" x2="650" y1="210" y2="210" />
                <line stroke="#E2E8F0" strokeDasharray="3 3" x1="50" x2="650" y1="270" y2="270" />
                <line stroke="#E2E8F0" strokeDasharray="3 3" x1="110" x2="110" y1="20" y2="280" />
                <line stroke="#E2E8F0" strokeDasharray="3 3" x1="230" x2="230" y1="20" y2="280" />
                <line stroke="#E2E8F0" strokeDasharray="3 3" x1="350" x2="350" y1="20" y2="280" />
                <line stroke="#E2E8F0" strokeDasharray="3 3" x1="470" x2="470" y1="20" y2="280" />
                <line stroke="#E2E8F0" strokeDasharray="3 3" x1="590" x2="590" y1="20" y2="280" />

                {/* Axes Labels */}
                <text className="text-[10px] fill-slate-400 font-mono" textAnchor="end" x="42" y="34">320 Jt</text>
                <text className="text-[10px] fill-slate-400 font-mono" textAnchor="end" x="42" y="94">260 Jt</text>
                <text className="text-[10px] fill-slate-400 font-mono" textAnchor="end" x="42" y="154">200 Jt</text>
                <text className="text-[10px] fill-slate-400 font-mono" textAnchor="end" x="42" y="214">140 Jt</text>
                <text className="text-[10px] fill-slate-400 font-mono" textAnchor="end" x="42" y="274">80 Jt</text>

                {scatterMode === 'tahun' ? (
                  <>
                    <text className="text-[10px] fill-slate-400 font-mono" textAnchor="middle" x="110" y="298">2014</text>
                    <text className="text-[10px] fill-slate-400 font-mono" textAnchor="middle" x="230" y="298">2016</text>
                    <text className="text-[10px] fill-slate-400 font-mono" textAnchor="middle" x="350" y="298">2018</text>
                    <text className="text-[10px] fill-slate-400 font-mono" textAnchor="middle" x="470" y="298">2020</text>
                    <text className="text-[10px] fill-slate-400 font-mono" textAnchor="middle" x="590" y="298">2022</text>
                  </>
                ) : (
                  <>
                    <text className="text-[10px] fill-slate-400 font-mono" textAnchor="middle" x="110" y="298">110k km</text>
                    <text className="text-[10px] fill-slate-400 font-mono" textAnchor="middle" x="230" y="298">85k km</text>
                    <text className="text-[10px] fill-slate-400 font-mono" textAnchor="middle" x="350" y="298">60k km</text>
                    <text className="text-[10px] fill-slate-400 font-mono" textAnchor="middle" x="470" y="298">35k km</text>
                    <text className="text-[10px] fill-slate-400 font-mono" textAnchor="middle" x="590" y="298">15k km</text>
                  </>
                )}

                {/* Centroid Halos */}
                <circle cx="210" cy="215" fill="#AE3EC9" fillOpacity="0.08" r="54" />
                <circle cx="420" cy="200" fill="#0CA678" fillOpacity="0.08" r="62" />
                <circle cx="480" cy="110" fill="#2557D6" fillOpacity="0.08" r="72" />

                {/* Dots Segmen 3: Ekonomis (#AE3EC9) */}
                <circle cx="115" cy="265" fill="#AE3EC9" fillOpacity="0.75" r="4" />
                <circle cx="130" cy="250" fill="#AE3EC9" fillOpacity="0.75" r="4" />
                <circle cx="145" cy="235" fill="#AE3EC9" fillOpacity="0.8" r="4.5" />
                <circle cx="160" cy="245" fill="#AE3EC9" fillOpacity="0.75" r="4" />
                <circle cx="180" cy="225" fill="#AE3EC9" fillOpacity="0.8" r="4" />
                <circle cx="195" cy="205" fill="#AE3EC9" fillOpacity="0.75" r="4" />
                <circle cx="210" cy="220" fill="#AE3EC9" fillOpacity="0.8" r="4.5" />
                <circle cx="225" cy="200" fill="#AE3EC9" fillOpacity="0.75" r="4" />
                <circle cx="240" cy="230" fill="#AE3EC9" fillOpacity="0.7" r="4" />
                <circle cx="255" cy="215" fill="#AE3EC9" fillOpacity="0.85" r="4.5" />
                <circle cx="270" cy="205" fill="#AE3EC9" fillOpacity="0.75" r="4" />
                <circle cx="180" cy="275" fill="#AE3EC9" fillOpacity="0.9" r="5.5" />

                {/* Dots Segmen 2: Keluarga Muda (#0CA678) */}
                <circle cx="330" cy="220" fill="#0CA678" fillOpacity="0.75" r="4" />
                <circle cx="345" cy="205" fill="#0CA678" fillOpacity="0.8" r="4" />
                <circle cx="360" cy="195" fill="#0CA678" fillOpacity="0.85" r="4.5" />
                <circle cx="380" cy="210" fill="#0CA678" fillOpacity="0.75" r="4" />
                <circle cx="395" cy="185" fill="#0CA678" fillOpacity="0.85" r="4" />
                <circle cx="410" cy="200" fill="#0CA678" fillOpacity="0.85" r="5" />
                <circle cx="425" cy="190" fill="#0CA678" fillOpacity="0.8" r="4" />
                <circle cx="440" cy="205" fill="#0CA678" fillOpacity="0.8" r="4" />
                <circle cx="460" cy="180" fill="#0CA678" fillOpacity="0.8" r="4.5" />
                <circle cx="475" cy="195" fill="#0CA678" fillOpacity="0.75" r="4" />
                <circle cx="495" cy="185" fill="#0CA678" fillOpacity="0.8" r="4" />
                <circle cx="510" cy="170" fill="#0CA678" fillOpacity="0.8" r="4.5" />
                <circle cx="320" cy="255" fill="#0CA678" fillOpacity="0.9" r="5.5" />

                {/* Dots Segmen 1: Premium (#2557D6) */}
                <circle cx="360" cy="130" fill="#2557D6" fillOpacity="0.8" r="4.5" />
                <circle cx="385" cy="120" fill="#2557D6" fillOpacity="0.8" r="4" />
                <circle cx="415" cy="105" fill="#2557D6" fillOpacity="0.85" r="4.5" />
                <circle cx="430" cy="135" fill="#2557D6" fillOpacity="0.8" r="4" />
                <circle cx="450" cy="90" fill="#2557D6" fillOpacity="0.85" r="5" />
                <circle cx="470" cy="115" fill="#2557D6" fillOpacity="0.8" r="4" />
                <circle cx="490" cy="75" fill="#2557D6" fillOpacity="0.9" r="5" />
                <circle cx="510" cy="100" fill="#2557D6" fillOpacity="0.8" r="4.5" />
                <circle cx="535" cy="85" fill="#2557D6" fillOpacity="0.85" r="4.5" />
                <circle cx="550" cy="60" fill="#2557D6" fillOpacity="0.9" r="5" />
                <circle cx="575" cy="70" fill="#2557D6" fillOpacity="0.85" r="5" />
                <circle cx="590" cy="50" fill="#2557D6" fillOpacity="0.95" r="5.5" />
                <circle cx="615" cy="40" fill="#2557D6" fillOpacity="0.95" r="5.5" />
                <circle cx="370" cy="45" fill="#2557D6" fillOpacity="1" r="6" />

                {/* Centroid 1: Premium (480, 110) */}
                <g transform="translate(480, 110)">
                  <rect fill="#2557D6" height="16" transform="rotate(45)" width="16" x="-8" y="-8" />
                  <circle cx="0" cy="0" fill="#ffffff" r="3" />
                  <text className="text-[11px] font-bold fill-[#2557D6]" x="14" y="4">C1 (2018, Rp 212 Jt)</text>
                </g>

                {/* Centroid 2: Keluarga Muda (420, 200) */}
                <g transform="translate(420, 200)">
                  <rect fill="#0CA678" height="16" transform="rotate(45)" width="16" x="-8" y="-8" />
                  <circle cx="0" cy="0" fill="#ffffff" r="3" />
                  <text className="text-[11px] font-bold fill-[#0CA678]" x="14" y="4">C2 (2019, Rp 141 Jt)</text>
                </g>

                {/* Centroid 3: Ekonomis (210, 215) */}
                <g transform="translate(210, 215)">
                  <rect fill="#AE3EC9" height="16" transform="rotate(45)" width="16" x="-8" y="-8" />
                  <circle cx="0" cy="0" fill="#ffffff" r="3" />
                  <text className="text-[11px] font-bold fill-[#AE3EC9]" x="14" y="4">C3 (2016, Rp 139 Jt)</text>
                </g>
              </svg>
            </div>

            {/* Scatter Legend */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-[#2557D6]" />
                  <span>Segmen Premium (258 Unit)</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-[#0CA678]" />
                  <span>Segmen Keluarga Muda (197 Unit)</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-[#AE3EC9]" />
                  <span>Segmen Ekonomis (154 Unit)</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                <span className="w-2.5 h-2.5 rotate-45 bg-[#001540] inline-block" />
                <span>Titik Centroid Klaster</span>
              </div>
            </div>
          </div>

          {/* Right: Authentic Dealer Operations Insight (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-3.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-base font-bold text-[#001540]">Evaluasi Strategis Klaster</span>
              <span className="px-2 py-0.5 rounded bg-[#001540] text-white text-[11px] font-semibold">Dealer Intel</span>
            </div>

            {/* Card 1: Premium */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#2557D6]" />
              <div className="pl-2">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#2557D6]" />
                    <span className="text-[10px] font-bold text-[#2557D6] tracking-wide uppercase">KLASTER 1: PREMIUM &amp; SUV</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">42,4% Portofolio</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Menyumbang <strong className="font-bold text-[#001540]">58% valuasi dealer</strong> (258 unit, median <strong className="font-bold text-[#001540]">Rp 212 Jt</strong>, 91% matik). Rata-rata perputaran <strong className="font-bold text-[#001540]">28 hari</strong> dengan margin bruto tertinggi (8–12%). Unit di atas Q3 (&gt;Rp 255 Jt) wajib diprioritaskan agar tidak menjadi stok mati.
                </p>
                <div className="mt-2.5 flex items-center justify-between text-slate-500 text-[11px] pt-2 border-t border-slate-100">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
                    <span>Fortuner, Pajero, CX-5, CR-V</span>
                  </span>
                  <span className="font-semibold text-blue-700">Margin Tertinggi</span>
                </div>
              </div>
            </div>

            {/* Card 2: Keluarga Muda */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#0CA678]" />
              <div className="pl-2">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#0CA678]" />
                    <span className="text-[10px] font-bold text-[#0CA678] tracking-wide uppercase">KLASTER 2: KELUARGA MUDA</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">32,3% Portofolio</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  <strong className="font-bold text-[#001540]">Tulang punggung likuiditas modal</strong> showroom (197 unit, tahun tipikal 2019, 39 rb km). Memiliki <strong className="font-bold text-[#001540]">perputaran tercepat (14 hari)</strong> dengan sensitivitas tinggi pada simulasi DP ringan leasing BCA/Adira.
                </p>
                <div className="mt-2.5 flex items-center justify-between text-slate-500 text-[11px] pt-2 border-t border-slate-100">
                  <span className="flex items-center gap-1">
                    <Car className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Avanza, Xpander, Brio RS, HR-V</span>
                  </span>
                  <span className="font-semibold text-emerald-700">Rotasi Tercepat</span>
                </div>
              </div>
            </div>

            {/* Card 3: Ekonomis */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#AE3EC9]" />
              <div className="pl-2">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#AE3EC9]" />
                    <span className="text-[10px] font-bold text-[#AE3EC9] tracking-wide uppercase">KLASTER 3: EKONOMIS &amp; LCGC</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">25,3% Portofolio</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Penyerap transaksi <strong className="font-bold text-[#001540]">pembeli tunai (cash keras)</strong> dan armada mobilitas usaha (154 unit, median <strong className="font-bold text-[#001540]">Rp 139 Jt</strong>, 95 rb km). Kurva depresiasi sangat landai (&lt;5% per tahun). Kunci closing terletak pada kepastian bebas tabrak &amp; banjir.
                </p>
                <div className="mt-2.5 flex items-center justify-between text-slate-500 text-[11px] pt-2 border-t border-slate-100">
                  <span className="flex items-center gap-1">
                    <Zap className="h-3.5 w-3.5 text-purple-600" />
                    <span>Ayla, Sigra, Calya, Karimun</span>
                  </span>
                  <span className="font-semibold text-purple-700">Pasar Tunai</span>
                </div>
              </div>
            </div>

            {/* Bottom Alert Card */}
            <div className="bg-orange-50 border border-orange-200/80 p-4 rounded-xl shadow-xs flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#FE6A2B] text-white flex items-center justify-center shrink-0 mt-0.5">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#001540]">Peringatan Discrepancy Harga</p>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                  Terdapat <strong className="font-bold text-[#A83900]">21 unit</strong> dengan deviasi di luar kuartil Q1–Q3 segmennya. Lakukan penyesuaian markup atau promo agar tidak menahan perputaran kas showroom.
                </p>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ============================================================ */}
      {/* 3. SEGMENT PROFILE CARDS                                    */}
      {/* ============================================================ */}
      <section className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-[#001540] tracking-tight">Karakteristik &amp; Strategi 3 Segmen K-Means</h2>
            <p className="text-xs text-slate-500 mt-1">
              Panduan operasional showroom untuk alokasi pengadaan unit baru, penetapan margin keuntungan, dan positioning promosi dealer.
            </p>
          </div>
          <Link
            to="/admin/segmentasi"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#001540] hover:text-[#FE6A2B] transition-colors group shrink-0"
          >
            <span>Buka Matriks Pembobotan A3</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Segment 1: Premium */}
          <Link 
            to="/admin/segmentasi" 
            className="bg-white rounded-xl border border-slate-200/80 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden group hover:-translate-y-1"
          >
            <div>
              <div className="h-2 w-full bg-[#2557D6]" />
              <div className="p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="px-2.5 py-1 rounded-full bg-[#EDF2FE] text-[#2557D6] text-[10px] font-bold inline-flex items-center gap-1.5 mb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2557D6]" />
                      SEGMEN: PREMIUM &amp; SUV
                    </span>
                    <h3 className="text-base font-bold text-[#001540]">Klaster Premium</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-extrabold text-[#2557D6]">258</span>
                    <span className="block text-[10px] text-slate-400">Unit (42,4% Pangsa)</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Median Harga Patokan</span>
                  <div className="text-lg text-[#001540] font-bold mt-0.5">Rp 212 Jt</div>
                  <span className="text-[11px] text-slate-500 block mt-0.5">Rentang Sehat IQR: Rp 197 – 255 Jt</span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Tahun Tipikal</span>
                    <span className="font-bold text-[#001540]">2018</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Rata-rata Odometer</span>
                    <span className="font-bold text-[#001540]">57.000 km</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Proporsi Matik</span>
                    <span className="font-bold text-[#001540]">91% Transmisi</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Holding Period</span>
                    <span className="font-bold text-[#001540]">28 Hari Rata-rata</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1.5">
                    <span>Pangsa Modal Kerja Showroom</span>
                    <span className="font-bold text-[#001540]">58,2%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#2557D6] rounded-full" style={{ width: '58.2%' }} />
                  </div>
                </div>
              </div>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[#2557D6] text-xs font-bold group-hover:bg-[#EDF2FE] transition-colors">
              <span>Detail Strategi &amp; Margin</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </Link>

          {/* Segment 2: Keluarga Muda */}
          <Link 
            to="/admin/segmentasi" 
            className="bg-white rounded-xl border border-slate-200/80 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden group hover:-translate-y-1"
          >
            <div>
              <div className="h-2 w-full bg-[#0CA678]" />
              <div className="p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="px-2.5 py-1 rounded-full bg-[#E6F7F0] text-[#0CA678] text-[10px] font-bold inline-flex items-center gap-1.5 mb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0CA678]" />
                      KELUARGA MUDA &amp; URBAN
                    </span>
                    <h3 className="text-base font-bold text-[#001540]">Keluarga Muda</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-extrabold text-[#0CA678]">197</span>
                    <span className="block text-[10px] text-slate-400">Unit (32,3% Pangsa)</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Median Harga Patokan</span>
                  <div className="text-lg text-[#001540] font-bold mt-0.5">Rp 141 Jt</div>
                  <span className="text-[11px] text-slate-500 block mt-0.5">Rentang Sehat IQR: Rp 128 – 165 Jt</span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Tahun Tipikal</span>
                    <span className="font-bold text-[#001540]">2019 (Terbaru)</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Rata-rata Odometer</span>
                    <span className="font-bold text-[#001540]">39.000 km</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Proporsi Matik</span>
                    <span className="font-bold text-[#001540]">53% Transmisi</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Holding Period</span>
                    <span className="font-bold text-[#001540]">14 Hari (Fast-Moving)</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1.5">
                    <span>Pangsa Modal Kerja Showroom</span>
                    <span className="font-bold text-[#001540]">25,8%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#0CA678] rounded-full" style={{ width: '25.8%' }} />
                  </div>
                </div>
              </div>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[#0CA678] text-xs font-bold group-hover:bg-[#E6F7F0] transition-colors">
              <span>Detail Strategi &amp; Margin</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </Link>

          {/* Segment 3: Ekonomis Siap Kerja */}
          <Link 
            to="/admin/segmentasi" 
            className="bg-white rounded-xl border border-slate-200/80 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden group hover:-translate-y-1"
          >
            <div>
              <div className="h-2 w-full bg-[#AE3EC9]" />
              <div className="p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="px-2.5 py-1 rounded-full bg-[#F8EDFB] text-[#AE3EC9] text-[10px] font-bold inline-flex items-center gap-1.5 mb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#AE3EC9]" />
                      EKONOMIS &amp; ARMADA
                    </span>
                    <h3 className="text-base font-bold text-[#001540]">Ekonomis Siap Kerja</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-extrabold text-[#AE3EC9]">154</span>
                    <span className="block text-[10px] text-slate-400">Unit (25,3% Pangsa)</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Median Harga Patokan</span>
                  <div className="text-lg text-[#001540] font-bold mt-0.5">Rp 139 Jt</div>
                  <span className="text-[11px] text-slate-500 block mt-0.5">Rentang Sehat IQR: Rp 115 – 152 Jt</span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Tahun Tipikal</span>
                    <span className="font-bold text-[#001540]">2016</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Rata-rata Odometer</span>
                    <span className="font-bold text-[#001540]">95.000 km</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Proporsi Matik</span>
                    <span className="font-bold text-[#001540]">70% Transmisi</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Holding Period</span>
                    <span className="font-bold text-[#001540]">21 Hari Rata-rata</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1.5">
                    <span>Pangsa Modal Kerja Showroom</span>
                    <span className="font-bold text-[#001540]">16,0%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#AE3EC9] rounded-full" style={{ width: '16.0%' }} />
                  </div>
                </div>
              </div>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[#AE3EC9] text-xs font-bold group-hover:bg-[#F8EDFB] transition-colors">
              <span>Detail Strategi &amp; Margin</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </Link>

        </div>
      </section>

      {/* ============================================================ */}
      {/* 4. CHARTS SECTION (Stok per Segmen & Interactive Donut Merek) */}
      {/* ============================================================ */}
      <section className="flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-bold text-[#001540] tracking-tight">Distribusi Portofolio &amp; Komposisi Merek</h2>
          <p className="text-xs text-slate-500 mt-1">
            Monitor diversifikasi inventaris antar pabrikan utama dan alokasi unit pada tiap klaster segmen. Klik warna donat chart untuk melihat intelijen mendalam per merek.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          
          {/* Left: Bar Chart Stok per Segmen */}
          <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-[#001540]">Alokasi Unit per Segmen</h3>
                <span className="text-xs text-slate-400">Komparasi volume unit dan kecepatan rotasi bursa</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md text-[#001540] text-xs font-bold">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>609 Total</span>
              </div>
            </div>

            <div className="flex flex-col gap-4 my-auto py-2">
              {/* Premium Bar */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-baseline text-xs font-semibold">
                  <span className="font-bold text-[#001540] flex items-center gap-2">
                    <span className="w-3 h-3 rounded-xs bg-[#2557D6]" />
                    Klaster Premium
                  </span>
                  <span className="font-mono font-bold text-[#001540]">
                    258 Unit <span className="text-slate-400 font-normal font-sans text-[11px]">(42,4%)</span>
                  </span>
                </div>
                <div className="h-4 w-full bg-slate-100 rounded-lg overflow-hidden flex">
                  <div className="h-full bg-[#2557D6]" style={{ width: '42.4%' }} />
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Fast-Moving: 182 unit (Rotasi &lt; 25 hari)</span>
                  <span>Aging Stock: 76 unit</span>
                </div>
              </div>

              {/* Keluarga Muda Bar */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-baseline text-xs font-semibold">
                  <span className="font-bold text-[#001540] flex items-center gap-2">
                    <span className="w-3 h-3 rounded-xs bg-[#0CA678]" />
                    Klaster Keluarga Muda
                  </span>
                  <span className="font-mono font-bold text-[#001540]">
                    197 Unit <span className="text-slate-400 font-normal font-sans text-[11px]">(32,3%)</span>
                  </span>
                </div>
                <div className="h-4 w-full bg-slate-100 rounded-lg overflow-hidden flex">
                  <div className="h-full bg-[#0CA678]" style={{ width: '32.3%' }} />
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Fast-Moving: 164 unit (Rotasi &lt; 15 hari)</span>
                  <span>Aging Stock: 33 unit</span>
                </div>
              </div>

              {/* Ekonomis Bar */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-baseline text-xs font-semibold">
                  <span className="font-bold text-[#001540] flex items-center gap-2">
                    <span className="w-3 h-3 rounded-xs bg-[#AE3EC9]" />
                    Klaster Ekonomis Siap Kerja
                  </span>
                  <span className="font-mono font-bold text-[#001540]">
                    154 Unit <span className="text-slate-400 font-normal font-sans text-[11px]">(25,3%)</span>
                  </span>
                </div>
                <div className="h-4 w-full bg-slate-100 rounded-lg overflow-hidden flex">
                  <div className="h-full bg-[#AE3EC9]" style={{ width: '25.3%' }} />
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Fast-Moving: 109 unit (Rotasi &lt; 20 hari)</span>
                  <span>Aging Stock: 45 unit</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 bg-slate-50 p-3 rounded-lg flex items-center justify-between text-slate-600 text-[11px]">
              <span className="flex items-center gap-1.5 font-semibold text-[#001540]">
                <Zap className="h-3.5 w-3.5 text-emerald-600" />
                Perputaran rata-rata portofolio: 21,8 Hari
              </span>
              <span className="text-slate-400">Target showroom: &lt; 25 Hari (Sehat)</span>
            </div>
          </div>

          {/* Right: INTERACTIVE Donut Chart Komposisi Merek */}
          <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-[#001540]">Komposisi Merek Mobil</h3>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold">
                    <MousePointerClick className="h-3 w-3" />
                    Interaktif
                  </span>
                </div>
                <span className="text-xs text-slate-400">Klik segmen cincin atau daftar merek untuk memeriksa profil detail</span>
              </div>
              <span className="px-2.5 py-1 rounded bg-orange-100 text-[#A83900] text-[10px] font-bold">
                Top 5 Merek
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 my-auto py-2">
              {/* Interactive Inline SVG Donut Chart */}
              <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" fill="transparent" r="38" stroke="#F1F5F9" strokeWidth="14" />
                  
                  {BRAND_DATA_LIST.map((brand) => {
                    const isSelected = selectedBrand === brand.name;
                    return (
                      <circle
                        key={brand.name}
                        cx="50"
                        cy="50"
                        fill="transparent"
                        r="38"
                        stroke={brand.color}
                        strokeDasharray={brand.dashArray}
                        strokeDashoffset={brand.dashOffset}
                        strokeWidth={isSelected ? 18 : 14}
                        className="cursor-pointer transition-all duration-200 hover:opacity-85"
                        onClick={() => setSelectedBrand(brand.name)}
                        style={{
                          filter: isSelected ? 'drop-shadow(0px 0px 4px rgba(0,0,0,0.35))' : 'none',
                        }}
                      />
                    );
                  })}
                </svg>
                
                {/* Center text reacts to selected brand */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{activeBrandData.name}</span>
                  <span className="text-xl font-extrabold text-[#001540] leading-tight">{activeBrandData.units}</span>
                  <span className="text-[10px] font-bold text-slate-400">{activeBrandData.share}% Stok</span>
                </div>
              </div>

              {/* Clickable Detailed Legend */}
              <div className="flex flex-col gap-2 w-full sm:w-auto text-xs">
                {BRAND_DATA_LIST.map((b) => {
                  const isSelected = selectedBrand === b.name;
                  return (
                    <button
                      key={b.name}
                      type="button"
                      onClick={() => setSelectedBrand(b.name)}
                      className={`flex items-center justify-between gap-5 px-3 py-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-blue-50/80 border-blue-300 shadow-2xs font-bold text-[#001540]' 
                          : 'bg-white border-transparent hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-3 h-3 rounded-full shrink-0 transition-transform" 
                          style={{ 
                            backgroundColor: b.color,
                            transform: isSelected ? 'scale(1.25)' : 'scale(1)'
                          }} 
                        />
                        <span className={isSelected ? 'font-bold text-[#001540]' : 'font-medium'}>{b.name}</span>
                      </div>
                      <div className="font-mono text-xs flex items-center gap-1">
                        <span className="font-bold text-[#001540]">{b.units}</span>
                        <span className="text-slate-400 font-sans text-[11px]">({b.share}%)</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dynamic Intelijen Box for Selected Brand */}
            <div className="mt-3 pt-3 bg-slate-50 border border-slate-100 p-3.5 rounded-xl flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activeBrandData.color }} />
                  <span className="text-xs font-bold text-[#001540]">Intelijen Merek: {activeBrandData.name} ({activeBrandData.units} Unit)</span>
                </div>
                <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                  Rotasi: ~{activeBrandData.avgDays} Hari
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-snug">
                {activeBrandData.highlight}
              </p>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60 text-[10px] text-slate-500">
                <span className="truncate max-w-xs">
                  <strong>Model Populer:</strong> {activeBrandData.topModels}
                </span>
                <Link
                  to={`/admin/inventori?merek=${encodeURIComponent(activeBrandData.name.split(' ')[0])}`}
                  className="font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 shrink-0"
                >
                  <span>Filter Stok {activeBrandData.name.split(' ')[0]}</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ============================================================ */}
      {/* 5. ACTION LIST: Table "Harga di Luar Rentang Segmen (Q1–Q3)" */}
      {/* ============================================================ */}
      <section className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded bg-[#A83900] text-white text-[10px] font-bold uppercase tracking-wider">
                Prioritas Manajemen
              </span>
              <span className="text-xs text-[#A83900] font-bold">21 Unit Perlu Review</span>
            </div>
            <h2 className="text-xl font-bold text-[#001540] tracking-tight">
              Daftar Tindakan: Harga di Luar Rentang Segmen (Q1–Q3)
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Tinjau unit inventaris dengan deviasi harga di luar batas kuartil normal klaster K-Means untuk evaluasi markup atau penyesuaian promo leasing.
            </p>
          </div>
          <Link
            to="/admin/inventori"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#A83900] hover:text-[#5B1B00] transition-colors group shrink-0"
          >
            <span>Buka Audit Lengkap A4</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Filter Bar & Table Container */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
          
          {/* Action Filter Bar */}
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAnomalyFilter('all')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer ${
                  anomalyFilter === 'all'
                    ? 'bg-[#001540] text-white'
                    : 'bg-white text-slate-600 hover:text-[#001540] border border-slate-200'
                }`}
              >
                Semua (21)
              </button>
              <button
                type="button"
                onClick={() => setAnomalyFilter('above')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  anomalyFilter === 'above'
                    ? 'bg-[#001540] text-white'
                    : 'bg-white text-slate-600 hover:text-[#001540] border border-slate-200'
                }`}
              >
                Di Atas Rentang (14)
              </button>
              <button
                type="button"
                onClick={() => setAnomalyFilter('below')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  anomalyFilter === 'below'
                    ? 'bg-[#001540] text-white'
                    : 'bg-white text-slate-600 hover:text-[#001540] border border-slate-200'
                }`}
              >
                Di Bawah Rentang (7)
              </button>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="text"
                value={anomalySearch}
                onChange={(e) => setAnomalySearch(e.target.value)}
                placeholder="Cari unit anomali..."
                className="pl-3.5 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-2xs"
              />
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-[#001540] text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Ekspor CSV</span>
              </button>
            </div>
          </div>

          {/* Table View */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Model &amp; Identitas Kendaraan</th>
                  <th className="py-3.5 px-4">Klaster K-Means</th>
                  <th className="py-3.5 px-4">Harga Listing Dealer</th>
                  <th className="py-3.5 px-4">Rentang Sehat (Q1–Q3)</th>
                  <th className="py-3.5 px-4">Deviasi / Status</th>
                  <th className="py-3.5 px-4 text-right">Tindakan Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                {paginatedAnomalies.length > 0 ? (
                  paginatedAnomalies.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-4 font-semibold text-[#001540]">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-[#001540] shrink-0">
                            <Car className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="font-bold block text-[#001540]">{item.nama}</span>
                            <span className="text-[11px] text-slate-400">{item.sub}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span 
                          className="px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1.5"
                          style={{
                            backgroundColor: `${item.warnaHex}15`,
                            color: item.warnaHex
                          }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.warnaHex }} />
                          {item.klasterNama}
                        </span>
                      </td>

                      <td className="py-4 px-4 font-bold text-sm text-[#001540]">
                        Rp {item.harga.toLocaleString('id-ID')}
                      </td>

                      <td className="py-4 px-4 text-slate-500">
                        {item.rentang}
                      </td>

                      <td className="py-4 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                          item.isAbove
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-blue-100 text-blue-900'
                        }`}>
                          {item.isAbove ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          {item.status} ({item.selisih})
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <Link
                          to={`/admin/inventori?q=${encodeURIComponent(item.nama.split(' ')[0])}`}
                          className="inline-flex items-center gap-1 text-[#001540] hover:text-[#FE6A2B] font-bold text-xs group"
                        >
                          <span>Audit Unit</span>
                          <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                      Tidak ada unit mobil yang sesuai dengan kriteria pencarian anomali ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Fully Functional Pagination Footer */}
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>
                Menampilkan <strong>{filteredAnomalies.length > 0 ? (safePage - 1) * pageSize + 1 : 0} – {Math.min(safePage * pageSize, filteredAnomalies.length)}</strong> dari <strong>{filteredAnomalies.length} unit</strong>
              </span>
            </div>
            
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <button 
                type="button" 
                onClick={() => setAnomalyPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Sebelumnya</span>
              </button>

              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setAnomalyPage(pageNum)}
                  className={`px-3 py-1 rounded text-xs transition-all cursor-pointer ${
                    safePage === pageNum
                      ? 'bg-[#001540] text-white font-bold shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              <button 
                type="button" 
                onClick={() => setAnomalyPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages || filteredAnomalies.length === 0}
                className="flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer text-xs"
              >
                <span>Berikutnya</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

      </section>

      {/* ============================================================ */}
      {/* 4. DAFTAR PEMBELI TERDAFTAR & BARU MENDAFTAR               */}
      {/* ============================================================ */}
      <section className="flex flex-col gap-4 pt-2">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                Manajemen Pengguna &amp; Calon Pembeli
              </span>
            </div>
            <h2 className="text-xl font-bold text-[#001540] tracking-tight">
              Daftar Akun Pembeli Terdaftar &amp; Baru Mendaftar
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
              Daftar akun pembeli yang telah terdaftar di CekGarasi beserta status verifikasi OTP, preferensi segmen K-Means yang diminati, serta estimasi rentang anggaran beli mereka.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
            <Link
              to="/admin/leads"
              className="flex items-center gap-2 px-3.5 py-2 bg-[#001540] text-white hover:bg-[#0F2A5F] rounded-lg transition-all text-xs font-bold shadow-xs cursor-pointer"
            >
              <Users className="h-4 w-4 text-[#FE6A2B]" />
              <span>Buka Leads &amp; Test Drive</span>
            </Link>
          </div>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setBuyerFilterStatus('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                buyerFilterStatus === 'all'
                  ? 'bg-[#001540] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua ({buyers.length})
            </button>
            <button
              type="button"
              onClick={() => setBuyerFilterStatus('verified')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                buyerFilterStatus === 'verified'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60'
              }`}
            >
              Terverifikasi OTP ({verifiedBuyersCount})
            </button>
            <button
              type="button"
              onClick={() => setBuyerFilterStatus('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                buyerFilterStatus === 'pending'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60'
              }`}
            >
              Menunggu OTP ({pendingBuyersCount})
            </button>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={buyerSearch}
              onChange={(e) => setBuyerSearch(e.target.value)}
              placeholder="Cari nama, email, no HP..."
              className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Buyers Table */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                  <th className="py-3.5 px-4">Identitas Pembeli</th>
                  <th className="py-3.5 px-4">Kontak &amp; WhatsApp</th>
                  <th className="py-3.5 px-4">Status Verifikasi</th>
                  <th className="py-3.5 px-4">Preferensi Segmen K-Means</th>
                  <th className="py-3.5 px-4">Rentang Anggaran</th>
                  <th className="py-3.5 px-4">Waktu Pendaftaran</th>
                  <th className="py-3.5 px-4 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                {paginatedBuyers.length > 0 ? (
                  paginatedBuyers.map((buyer) => {
                    const initials = buyer.nama
                      .split(' ')
                      .slice(0, 2)
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase() || 'P';

                    const cleanPhone = (buyer.no_hp || '').replace(/\D/g, '');
                    const waPhone = cleanPhone.startsWith('0')
                      ? '62' + cleanPhone.slice(1)
                      : cleanPhone;

                    return (
                      <tr key={buyer.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                              {initials}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-[#001540]">{buyer.nama}</span>
                              <span className="text-[11px] text-slate-400">{buyer.email}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-600 text-xs">
                              {buyer.no_hp || '-'}
                            </span>
                            {buyer.no_hp && (
                              <a
                                href={`https://wa.me/${waPhone}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-[10px] font-bold transition-colors"
                              >
                                <MessageCircle className="h-3 w-3 text-emerald-600" />
                                <span>WA</span>
                              </a>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {buyer.hp_terverifikasi ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              <span>Terverifikasi (OTP)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold">
                              <Clock className="h-3 w-3 text-amber-600" />
                              <span>Menunggu OTP</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {buyer.segmen_awal_id !== null && buyer.segmen_awal_id !== undefined ? (
                            <span
                              className="px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1.5"
                              style={{
                                backgroundColor: `${buyer.warna_segmen || '#2563EB'}15`,
                                color: buyer.warna_segmen || '#2563EB',
                              }}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: buyer.warna_segmen || '#2563EB' }}
                              />
                              {buyer.nama_segmen || `Segmen K${buyer.segmen_awal_id}`}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              Belum Ditentukan
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-slate-700">
                          {buyer.pref_harga_min && buyer.pref_harga_max ? (
                            <span>
                              Rp {Math.round(buyer.pref_harga_min / 1000000)} – {Math.round(buyer.pref_harga_max / 1000000)} Jt
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Rp 150 – 250 Jt (Default)</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                          {buyer.created_at ? buyer.created_at.slice(0, 16).replace('T', ' ') : 'Baru Saja'}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <Link
                            to="/admin/leads"
                            className="inline-flex items-center gap-1 text-[#001540] hover:text-[#FE6A2B] font-bold text-xs group"
                          >
                            <span>Detail Leads</span>
                            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                      Tidak ada data pembeli yang sesuai dengan kriteria pencarian.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Buyers Pagination Footer */}
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              <span>
                Menampilkan <strong>{filteredBuyers.length > 0 ? (safeBuyerPage - 1) * buyerPageSize + 1 : 0} – {Math.min(safeBuyerPage * buyerPageSize, filteredBuyers.length)}</strong> dari <strong>{filteredBuyers.length} pembeli</strong>
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setBuyerPage((p) => Math.max(1, p - 1))}
                disabled={safeBuyerPage === 1}
                className="flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Sebelumnya</span>
              </button>

              {Array.from({ length: buyerTotalPages }, (_, idx) => idx + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setBuyerPage(pageNum)}
                  className={`px-3 py-1 rounded text-xs transition-all cursor-pointer ${
                    safeBuyerPage === pageNum
                      ? 'bg-[#001540] text-white font-bold shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setBuyerPage((p) => Math.min(buyerTotalPages, p + 1))}
                disabled={safeBuyerPage === buyerTotalPages || filteredBuyers.length === 0}
                className="flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer text-xs"
              >
                <span>Berikutnya</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
