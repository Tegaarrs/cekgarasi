import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Car, TrendingUp, Sparkles, 
  ArrowRight, Calendar, Download, 
  FileSpreadsheet, ArrowUpRight, ArrowDownRight,
  Zap, Network, ChevronLeft, ChevronRight,
  MousePointerClick, ShieldAlert,
  Users, UserCheck, Filter, RotateCcw,
  Lightbulb, AlertTriangle
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

export interface ScatterCarPoint {
  id: number;
  nama: string;
  klaster: 0 | 1 | 2; // 0: Premium, 1: Keluarga Muda, 2: Ekonomis
  tahun: number;
  km: number;
  harga: number; // in Rupiah
  transmisi: 'A/T' | 'M/T' | 'CVT';
  bodi: string;
  daysOnLot: number;
  marginEst: number; // in Juta Rupiah
  isAnomaly?: boolean;
  anomalyType?: 'Di Atas Q3' | 'Di Bawah Q1';
  catatanOperasional: string;
}

export const SAMPLE_SCATTER_CARS: ScatterCarPoint[] = [
  // Klaster 0: Premium & SUV (Biru #2557D6) - 15 unit
  { id: 101, nama: 'Toyota Fortuner 2.4 VRZ A/T', klaster: 0, tahun: 2021, km: 32000, harga: 385000000, transmisi: 'A/T', bodi: 'SUV', daysOnLot: 16, marginEst: 26, isAnomaly: true, anomalyType: 'Di Atas Q3', catatanOperasional: 'Unit premium favorit konsumen eksekutif. Margin tebal Rp 26 Jt, prioritaskan promo paket cicilan BCA Finance.' },
  { id: 102, nama: 'Mitsubishi Pajero Sport Dakar 4x2', klaster: 0, tahun: 2020, km: 41000, harga: 370000000, transmisi: 'A/T', bodi: 'SUV', daysOnLot: 22, marginEst: 24, isAnomaly: true, anomalyType: 'Di Atas Q3', catatanOperasional: 'Permintaan diesel ladder-frame tinggi. Sertakan bukti record servis resmi Mitsubishi untuk percepat closing.' },
  { id: 103, nama: 'Honda CR-V 1.5 Turbo Prestige', klaster: 0, tahun: 2021, km: 28000, harga: 355000000, transmisi: 'CVT', bodi: 'SUV', daysOnLot: 19, marginEst: 22, catatanOperasional: 'Dilengkapi panoramic sunroof & fitur Honda Sensing. Rotasi sangat sehat (19 hari di showroom).' },
  { id: 104, nama: 'Mazda CX-5 2.5 Elite Sunroof', klaster: 0, tahun: 2020, km: 36000, harga: 330000000, transmisi: 'A/T', bodi: 'SUV', daysOnLot: 25, marginEst: 20, catatanOperasional: 'Favorit profesional muda perkotaan. Tawarkan bundling coating salon 3-layer untuk menjaga nilai jual.' },
  { id: 105, nama: 'Toyota Kijang Innova 2.4 V Diesel A/T', klaster: 0, tahun: 2019, km: 44000, harga: 295000000, transmisi: 'A/T', bodi: 'MPV', daysOnLot: 14, marginEst: 19, catatanOperasional: 'Likuiditas resale value nomor satu di kelasnya. Selalu laku dalam tempo kurang dari 15 hari.' },
  { id: 106, nama: 'Hyundai Santa Fe 2.2 CRDi Signature', klaster: 0, tahun: 2019, km: 52000, harga: 280000000, transmisi: 'A/T', bodi: 'SUV', daysOnLot: 32, marginEst: 18, catatanOperasional: 'Mendekati batas aging 35 hari. Siapkan penawaran subsidi asuransi all-risk 1 tahun untuk segera deal.' },
  { id: 107, nama: 'Toyota Corolla Cross 1.8 Hybrid', klaster: 0, tahun: 2021, km: 25000, harga: 310000000, transmisi: 'CVT', bodi: 'SUV', daysOnLot: 18, marginEst: 21, catatanOperasional: 'Segmen elektrifikasi hemat BBM (1:22 km/L). Garansi baterai pabrikan masih aktif hingga 2026.' },
  { id: 108, nama: 'Nissan X-Trail 2.5 CVT', klaster: 0, tahun: 2018, km: 58000, harga: 215000000, transmisi: 'CVT', bodi: 'SUV', daysOnLot: 38, marginEst: 15, catatanOperasional: 'Status: Aging Stock (38 hari). Turunkan harga listing Rp 6 Jt mendekati median pasar agar perputaran modal tidak mandek.' },
  { id: 109, nama: 'Honda HR-V 1.8 Prestige Sunroof', klaster: 0, tahun: 2018, km: 51000, harga: 225000000, transmisi: 'CVT', bodi: 'SUV', daysOnLot: 24, marginEst: 16, catatanOperasional: 'Varian teratas HR-V mesin 1.800cc. Kondisi interior kulit utuh dan bebas bau rokok.' },
  { id: 110, nama: 'Toyota Fortuner 2.7 SRZ Bensin', klaster: 0, tahun: 2017, km: 65000, harga: 230000000, transmisi: 'A/T', bodi: 'SUV', daysOnLot: 42, marginEst: 14, catatanOperasional: 'Peringatan aging 42 hari (varian bensin rotasi lebih lambat). Tawarkan subsidi DP minim via Mandiri Tunas Finance.' },
  { id: 111, nama: 'Mitsubishi Pajero Sport Exceed', klaster: 0, tahun: 2018, km: 62000, harga: 260000000, transmisi: 'A/T', bodi: 'SUV', daysOnLot: 28, marginEst: 17, catatanOperasional: 'Kaki-kaki padat dan ban masih 85%. Cocok untuk pembeli luar Jabodetabek yang butuh SUV tangguh.' },
  { id: 112, nama: 'Toyota Kijang Innova 2.0 G Bensin A/T', klaster: 0, tahun: 2018, km: 59000, harga: 210000000, transmisi: 'A/T', bodi: 'MPV', daysOnLot: 20, marginEst: 15, catatanOperasional: 'Mobil keluarga paling stabil di pasar sekunder. Perawatan mudah, suku cadang melimpah.' },
  { id: 113, nama: 'Mazda 3 Hatchback 2.0 SKYACTIV', klaster: 0, tahun: 2019, km: 40000, harga: 275000000, transmisi: 'A/T', bodi: 'Hatchback', daysOnLot: 30, marginEst: 18, catatanOperasional: 'Unit premium berkarakter sporty. Pembeli spesifik segmen hobi yang tidak sensitif diskon.' },
  { id: 114, nama: 'Subaru Forester 2.0i-L AWD', klaster: 0, tahun: 2016, km: 78000, harga: 175000000, transmisi: 'CVT', bodi: 'SUV', daysOnLot: 46, marginEst: 12, isAnomaly: true, anomalyType: 'Di Bawah Q1', catatanOperasional: 'Harga di bawah kuartil Q1 segmen (Rp 197 Jt). Peluang menaikkan harga Rp 10 Jt setelah rekondisi servis boxermotor.' },
  { id: 115, nama: 'Toyota Alphard 2.4 G Sunroof', klaster: 0, tahun: 2014, km: 98000, harga: 265000000, transmisi: 'A/T', bodi: 'MPV', daysOnLot: 44, marginEst: 22, catatanOperasional: 'Van mewah VIP. Pembeli sangat menguji kelembutan suspensi dan fungsi pintu geser elektrik.' },

  // Klaster 1: Keluarga Muda & Urban MPV (Hijau #0CA678) - 15 unit
  { id: 201, nama: 'Mitsubishi Xpander Ultimate A/T', klaster: 1, tahun: 2021, km: 24000, harga: 205000000, transmisi: 'A/T', bodi: 'MPV', daysOnLot: 11, marginEst: 11, catatanOperasional: 'Warna putih mutiara favorit keluarga muda. Waktu laku rata-rata hanya 11 hari dengan refund leasing Rp 4,5 Jt.' },
  { id: 202, nama: 'Toyota Avanza 1.5 Veloz A/T', klaster: 1, tahun: 2020, km: 31000, harga: 185000000, transmisi: 'A/T', bodi: 'MPV', daysOnLot: 9, marginEst: 10, catatanOperasional: 'Fast-moving juara showroom (9 hari laku). Prioritaskan pencarian unit serupa saat pengadaan / buy-in.' },
  { id: 203, nama: 'Honda HR-V 1.5 E CVT', klaster: 1, tahun: 2019, km: 42000, harga: 198000000, transmisi: 'CVT', bodi: 'SUV', daysOnLot: 14, marginEst: 12, catatanOperasional: 'Desain modern, transmisi halus. Paket kredit TDP Rp 20 Jt cicilan Rp 4,1 Jt/bln langsung ramai peminat.' },
  { id: 204, nama: 'Toyota Avanza 1.3 G A/T', klaster: 1, tahun: 2019, km: 39000, harga: 155000000, transmisi: 'A/T', bodi: 'MPV', daysOnLot: 8, marginEst: 9, catatanOperasional: 'Tulang punggung likuiditas showroom. Rotasi hanya 8 hari, menghasilkan arus kas operasional cepat.' },
  { id: 205, nama: 'Mitsubishi Xpander Exceed M/T', klaster: 1, tahun: 2019, km: 45000, harga: 160000000, transmisi: 'M/T', bodi: 'MPV', daysOnLot: 12, marginEst: 9, catatanOperasional: 'Pilihan transmisi manual bagi pembeli keluarga pinggiran Jabodetabek yang ingin konsumsi BBM lebih irit.' },
  { id: 206, nama: 'Honda Brio RS 1.2 CVT', klaster: 1, tahun: 2021, km: 22000, harga: 175000000, transmisi: 'CVT', bodi: 'Hatchback', daysOnLot: 7, marginEst: 10, catatanOperasional: 'Mobil perkotaan paling lincah. Closing rata-rata hanya dalam kurun 7 hari setelah listing tayang.' },
  { id: 207, nama: 'Suzuki All New Ertiga GX A/T', klaster: 1, tahun: 2020, km: 35000, harga: 168000000, transmisi: 'A/T', bodi: 'MPV', daysOnLot: 15, marginEst: 9.5, catatanOperasional: 'Kenyamanan suspensi terbaik di kelas LMPV. Nilai jual kembali stabil didukung AC digital dan keyless entry.' },
  { id: 208, nama: 'Toyota Rush 1.5 S TRD Sportivo', klaster: 1, tahun: 2019, km: 48000, harga: 180000000, transmisi: 'A/T', bodi: 'SUV', daysOnLot: 16, marginEst: 11, catatanOperasional: 'LSUV 7-seater ground clearance tinggi. Banyak dicari konsumen yang sering mudik ke jalan berkontur.' },
  { id: 209, nama: 'Daihatsu Terios R Deluxe A/T', klaster: 1, tahun: 2019, km: 49000, harga: 172000000, transmisi: 'A/T', bodi: 'SUV', daysOnLot: 17, marginEst: 10, catatanOperasional: 'Fitur kamera 360 derajat lengkap dengan harga lebih terjangkau dibanding Rush. Pembeli cepat closing.' },
  { id: 210, nama: 'Honda Mobilio 1.5 E CVT', klaster: 1, tahun: 2018, km: 54000, harga: 138000000, transmisi: 'CVT', bodi: 'MPV', daysOnLot: 14, marginEst: 8.5, catatanOperasional: 'Tarikan mesin i-VTEC bertenaga dan handling stabil. Pilihan favorit keluarga berjiwa muda.' },
  { id: 211, nama: 'Daihatsu Xenia 1.3 X M/T', klaster: 1, tahun: 2018, km: 58000, harga: 128000000, transmisi: 'M/T', bodi: 'MPV', daysOnLot: 13, marginEst: 8, catatanOperasional: 'Biaya pajak tahunan dan suku cadang sangat terjangkau. Target pasar pekerja komuter harian.' },
  { id: 212, nama: 'Suzuki XL7 Alpha A/T', klaster: 1, tahun: 2021, km: 29000, harga: 195000000, transmisi: 'A/T', bodi: 'SUV', daysOnLot: 15, marginEst: 11, catatanOperasional: 'Varian tertinggi Alpha two-tone dengan smart e-mirror. Alternatif kuat bagi yang ingin tampil beda dari Xpander.' },
  { id: 213, nama: 'Nissan Livina 1.5 VE A/T', klaster: 1, tahun: 2019, km: 46000, harga: 148000000, transmisi: 'A/T', bodi: 'MPV', daysOnLot: 21, marginEst: 9, catatanOperasional: 'Basis sasis Xpander dengan kenyamanan busa kursi khas Nissan. Nilai ekonomis tinggi di pasar bekas.' },
  { id: 214, nama: 'Toyota Avanza 1.3 E M/T', klaster: 1, tahun: 2017, km: 72000, harga: 118000000, transmisi: 'M/T', bodi: 'MPV', daysOnLot: 18, marginEst: 7.5, catatanOperasional: 'Entry MPV terjangkau. 70% pembeli membayar secara tunai bertahap atau DP leluasa.' },
  { id: 215, nama: 'Honda Jazz 1.5 RS CVT', klaster: 1, tahun: 2017, km: 60000, harga: 188000000, transmisi: 'CVT', bodi: 'Hatchback', daysOnLot: 13, marginEst: 11.5, catatanOperasional: 'Mobil legendaris anak muda, harga pasar bekas sangat kuat dan tahan banting. Permintaan konstan tinggi.' },

  // Klaster 2: LCGC, City Car & Ekonomis (Ungu #AE3EC9) - 12 unit
  { id: 301, nama: 'Daihatsu Sigra 1.2 R Deluxe A/T', klaster: 2, tahun: 2019, km: 58000, harga: 115000000, transmisi: 'A/T', bodi: 'MPV', daysOnLot: 16, marginEst: 6.5, catatanOperasional: 'Mobil 7-seater paling ramah kantong. Mayoritas pembeli tunai langsung tanpa proses leasing berbelit.' },
  { id: 302, nama: 'Toyota Calya 1.2 G A/T', klaster: 2, tahun: 2019, km: 62000, harga: 118000000, transmisi: 'A/T', bodi: 'MPV', daysOnLot: 14, marginEst: 6.8, catatanOperasional: 'Kondisi mesin bersih kering. Pembeli sangat mengutamakan AC dingin dan kebersihan jok kabin.' },
  { id: 303, nama: 'Honda Brio Satya 1.2 E M/T', klaster: 2, tahun: 2018, km: 68000, harga: 122000000, transmisi: 'M/T', bodi: 'City Car', daysOnLot: 10, marginEst: 7, catatanOperasional: 'Efisiensi BBM 1:19 km/L. Paling dicari oleh pembeli mobil pertama keluarga atau first-jobber.' },
  { id: 304, nama: 'Daihatsu Ayla 1.2 R M/T', klaster: 2, tahun: 2018, km: 71000, harga: 102000000, transmisi: 'M/T', bodi: 'City Car', daysOnLot: 12, marginEst: 6, catatanOperasional: 'Biaya perawatan super ekonomis. Pembeli umumnya membayar tunai lunas di hari inspeksi unit.' },
  { id: 305, nama: 'Toyota Agya 1.2 G TRD M/T', klaster: 2, tahun: 2017, km: 79000, harga: 106000000, transmisi: 'M/T', bodi: 'City Car', daysOnLot: 15, marginEst: 6.2, catatanOperasional: 'Aksen bodykit sporty TRD membuat unit terlihat segar dan mempermudah negosiasi harga.' },
  { id: 306, nama: 'Suzuki Karimun Wagon R GS', klaster: 2, tahun: 2017, km: 84000, harga: 82000000, transmisi: 'M/T', bodi: 'City Car', daysOnLot: 22, marginEst: 5, catatanOperasional: 'Ruang kepala tinggi dan kabin fleksibel. Sering diserap untuk mobil operasional toko atau kurir barang ringan.' },
  { id: 307, nama: 'Datsun GO+ Panca T Style', klaster: 2, tahun: 2016, km: 92000, harga: 68000000, transmisi: 'M/T', bodi: 'MPV', daysOnLot: 35, marginEst: 4.5, catatanOperasional: 'Harga di bawah Rp 70 Jt. Pasang promo ganti oli mesin gratis untuk mempercepat closing sebelum 40 hari.' },
  { id: 308, nama: 'Daihatsu Gran Max 1.3 D', klaster: 2, tahun: 2016, km: 108000, harga: 78000000, transmisi: 'M/T', bodi: 'Minibus', daysOnLot: 19, marginEst: 5.5, catatanOperasional: 'Andalan niaga UMKM. Pembeli mengutamakan kapasitas angkut dan ketahanan gardan belakang.' },
  { id: 309, nama: 'Suzuki Ertiga GL M/T', klaster: 2, tahun: 2015, km: 95000, harga: 105000000, transmisi: 'M/T', bodi: 'MPV', daysOnLot: 24, marginEst: 6, catatanOperasional: 'Mobil keluarga harga Rp 100 jutaan. Double blower dingin dan kaki-kaki baru direkondisi.' },
  { id: 310, nama: 'Toyota Calya 1.2 E M/T Non-ABS', klaster: 2, tahun: 2016, km: 102000, harga: 92000000, transmisi: 'M/T', bodi: 'MPV', daysOnLot: 26, marginEst: 5.2, isAnomaly: true, anomalyType: 'Di Bawah Q1', catatanOperasional: 'Harga di bawah kuartil Q1 segmen (Rp 115 Jt). Pilihan pas untuk pembeli yang butuh mobil 7-seater dengan dana terbatas.' },
  { id: 311, nama: 'Daihatsu Sigra 1.0 D M/T Fleet', klaster: 2, tahun: 2017, km: 92000, harga: 85000000, transmisi: 'M/T', bodi: 'MPV', daysOnLot: 28, marginEst: 5, isAnomaly: true, anomalyType: 'Di Bawah Q1', catatanOperasional: 'Konsumsi bahan bakar luar biasa irit (mesin 1.000cc). Cocok untuk armada taksi online dengan pajak murah.' },
  { id: 312, nama: 'Nissan March 1.2 M/T', klaster: 2, tahun: 2015, km: 89000, harga: 76000000, transmisi: 'M/T', bodi: 'City Car', daysOnLot: 31, marginEst: 4.8, catatanOperasional: 'Kenyamanan suspensi hatchback Jepang dengan harga setara motor matik 250cc. Minat closing stabil.' },
];

export const getScatterCoords = (car: ScatterCarPoint, mode: 'tahun' | 'km') => {
  // Y-axis: Rp 60.000.000 (y=275) to Rp 390.000.000 (y=25)
  const minY = 25;
  const maxY = 275;
  const minHarga = 60000000;
  const maxHarga = 390000000;
  const clampedHarga = Math.min(Math.max(car.harga, minHarga), maxHarga);
  const cy = maxY - ((clampedHarga - minHarga) / (maxHarga - minHarga)) * (maxY - minY);

  // X-axis:
  // 'tahun': 2013 (x=60) to 2023 (x=640)
  // 'km': 120.000 km (x=60) to 10.000 km (x=640)
  const minX = 60;
  const maxX = 640;
  let cx = 0;
  if (mode === 'tahun') {
    const minTahun = 2013;
    const maxTahun = 2023;
    const clampedTahun = Math.min(Math.max(car.tahun, minTahun), maxTahun);
    cx = minX + ((clampedTahun - minTahun) / (maxTahun - minTahun)) * (maxX - minX);
  } else {
    const maxKm = 120000;
    const minKm = 10000;
    const clampedKm = Math.min(Math.max(car.km, minKm), maxKm);
    cx = minX + ((maxKm - clampedKm) / (maxKm - minKm)) * (maxX - minX);
  }
  return { cx: Math.round(cx), cy: Math.round(cy) };
};

export function AdminDashboardPage() {
  const [data, setData] = useState<AdminSummary | null>(null);

  // Registered buyers states
  const [buyers, setBuyers] = useState<RegisteredBuyer[]>([]);

  // Scatter plot mode: 'tahun' (Tahun vs Harga) or 'km' (KM vs Harga)
  const [scatterMode, setScatterMode] = useState<'tahun' | 'km'>('tahun');

  // Interactive cluster filter for scatter plot & strategic evaluation
  const [selectedClusterFilter, setSelectedClusterFilter] = useState<'all' | 0 | 1 | 2 | 'anomali'>('all');
  const [hoveredCar, setHoveredCar] = useState<ScatterCarPoint | null>(null);
  const [selectedCar, setSelectedCar] = useState<ScatterCarPoint | null>(null);
  const [hoveredCentroid, setHoveredCentroid] = useState<number | null>(null);

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

  const verifiedBuyersCount = buyers.filter((b) => b.hp_terverifikasi).length;

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

          <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0">
            <motion.button 
              type="button"
              whileHover={{ y: -1.5, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="btn-liquid-secondary liquid-shine flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
            >
              <Calendar className="h-4 w-4 text-slate-500" />
              <span>Siklus 7 Hari Terakhir</span>
            </motion.button>
            <motion.button 
              type="button"
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="btn-liquid-primary liquid-shine flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Unduh Rekap Eksekutif</span>
            </motion.button>
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
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-[#001540] tracking-tight flex items-center gap-2">
              <span>Peta Sebaran Klaster &amp; Intelijen Pasar Otomatis</span>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-extrabold uppercase tracking-wider">
                Interaktif
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl">
              Visualisasi posisi unit showroom berdasarkan umur dan jarak tempuh terhadap level harga pasar, dilengkapi filter klaster langsung, inspeksi titik mobil, dan panduan taktis operasional dealer.
            </p>
          </div>

          {selectedClusterFilter !== 'all' && (
            <button
              onClick={() => setSelectedClusterFilter('all')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer self-start sm:self-auto shrink-0 shadow-2xs"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
              <span>Reset Filter Tampilan</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left: Interactive Scatter Plot (8 cols) */}
          <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col gap-5">
            
            {/* Top Bar inside Card: Mode Toggles + Cluster Quick Filter Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="text-base font-bold text-[#001540]">Peta Segmen Pasar</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-[#001540] text-[11px] font-bold border border-blue-200/60">
                  <Sparkles className="h-3 w-3 text-[#FE6A2B]" />
                  K-Means (k=3)
                </span>
              </div>

              {/* Mode Switcher: Tahun vs KM */}
              <div className="flex items-center gap-1.5 bg-slate-100/90 backdrop-blur-md p-1 rounded-xl border border-slate-200/80 shadow-2xs">
                <motion.button
                  type="button"
                  onClick={() => setScatterMode('tahun')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    scatterMode === 'tahun'
                      ? 'bg-white shadow-xs font-extrabold text-[#001540] border border-slate-200/60'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Tahun vs Harga
                </motion.button>
                <motion.button
                  type="button"
                  onClick={() => setScatterMode('km')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    scatterMode === 'km'
                      ? 'bg-white shadow-xs font-extrabold text-[#001540] border border-slate-200/60'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  KM vs Harga
                </motion.button>
              </div>
            </div>

            {/* Quick Cluster Focus Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold scrollbar-none">
              <span className="text-slate-400 text-[11px] font-bold flex items-center gap-1 shrink-0">
                <Filter className="h-3.5 w-3.5" /> Fokus:
              </span>
              <button
                onClick={() => setSelectedClusterFilter('all')}
                className={`px-3 py-1 rounded-full transition-all cursor-pointer shrink-0 ${
                  selectedClusterFilter === 'all'
                    ? 'bg-[#001540] text-white shadow-xs font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Semua (42 Unit Sampel)
              </button>
              <button
                onClick={() => setSelectedClusterFilter(selectedClusterFilter === 0 ? 'all' : 0)}
                className={`px-3 py-1 rounded-full transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  selectedClusterFilter === 0
                    ? 'bg-[#2557D6] text-white shadow-xs font-bold ring-2 ring-blue-300'
                    : 'bg-blue-50 text-[#2557D6] hover:bg-blue-100'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#2557D6] inline-block" />
                <span>Klaster 1: Premium</span>
              </button>
              <button
                onClick={() => setSelectedClusterFilter(selectedClusterFilter === 1 ? 'all' : 1)}
                className={`px-3 py-1 rounded-full transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  selectedClusterFilter === 1
                    ? 'bg-[#0CA678] text-white shadow-xs font-bold ring-2 ring-emerald-300'
                    : 'bg-emerald-50 text-[#0CA678] hover:bg-emerald-100'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#0CA678] inline-block" />
                <span>Klaster 2: Keluarga Muda</span>
              </button>
              <button
                onClick={() => setSelectedClusterFilter(selectedClusterFilter === 2 ? 'all' : 2)}
                className={`px-3 py-1 rounded-full transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  selectedClusterFilter === 2
                    ? 'bg-[#AE3EC9] text-white shadow-xs font-bold ring-2 ring-purple-300'
                    : 'bg-purple-50 text-[#AE3EC9] hover:bg-purple-100'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#AE3EC9] inline-block" />
                <span>Klaster 3: LCGC &amp; Ekonomis</span>
              </button>
              <button
                onClick={() => setSelectedClusterFilter(selectedClusterFilter === 'anomali' ? 'all' : 'anomali')}
                className={`px-3 py-1 rounded-full transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  selectedClusterFilter === 'anomali'
                    ? 'bg-[#FE6A2B] text-white shadow-xs font-bold ring-2 ring-orange-300'
                    : 'bg-orange-50 text-[#FE6A2B] hover:bg-orange-100'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#FE6A2B] inline-block" />
                <span className="flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Anomali Harga</span>
                </span>
              </button>
            </div>

            {/* Interactive SVG Scatter Plot Container */}
            <div className="relative w-full bg-[#F8FAFC] rounded-2xl p-4 overflow-hidden border border-slate-200/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
              <svg 
                className="w-full min-w-[560px] h-[350px]" 
                fill="none" 
                viewBox="0 0 680 340" 
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Subtle Grid Horizontal Lines */}
                <line stroke="#E2E8F0" strokeDasharray="3 3" x1="50" x2="650" y1="30" y2="30" />
                <line stroke="#E2E8F0" strokeDasharray="3 3" x1="50" x2="650" y1="85" y2="85" />
                <line stroke="#E2E8F0" strokeDasharray="3 3" x1="50" x2="650" y1="140" y2="140" />
                <line stroke="#E2E8F0" strokeDasharray="3 3" x1="50" x2="650" y1="195" y2="195" />
                <line stroke="#E2E8F0" strokeDasharray="3 3" x1="50" x2="650" y1="250" y2="250" />

                {/* Subtle Grid Vertical Lines */}
                <line stroke="#E2E8F0" strokeDasharray="3 3" x1="118" x2="118" y1="20" y2="280" />
                <line stroke="#E2E8F0" strokeDasharray="3 3" x1="234" x2="234" y1="20" y2="280" />
                <line stroke="#E2E8F0" strokeDasharray="3 3" x1="350" x2="350" y1="20" y2="280" />
                <line stroke="#E2E8F0" strokeDasharray="3 3" x1="466" x2="466" y1="20" y2="280" />
                <line stroke="#E2E8F0" strokeDasharray="3 3" x1="582" x2="582" y1="20" y2="280" />

                {/* Y-Axes Labels (Harga Jual OTR) */}
                <text className="text-[10px] fill-slate-400 font-mono font-semibold" textAnchor="end" x="44" y="34">380 Jt</text>
                <text className="text-[10px] fill-slate-400 font-mono font-semibold" textAnchor="end" x="44" y="89">310 Jt</text>
                <text className="text-[10px] fill-slate-400 font-mono font-semibold" textAnchor="end" x="44" y="144">240 Jt</text>
                <text className="text-[10px] fill-slate-400 font-mono font-semibold" textAnchor="end" x="44" y="199">170 Jt</text>
                <text className="text-[10px] fill-slate-400 font-mono font-semibold" textAnchor="end" x="44" y="254">100 Jt</text>

                {/* X-Axes Dynamic Labels */}
                {scatterMode === 'tahun' ? (
                  <>
                    <text className="text-[10px] fill-slate-500 font-mono font-bold" textAnchor="middle" x="118" y="298">2014</text>
                    <text className="text-[10px] fill-slate-500 font-mono font-bold" textAnchor="middle" x="234" y="298">2016</text>
                    <text className="text-[10px] fill-slate-500 font-mono font-bold" textAnchor="middle" x="350" y="298">2018</text>
                    <text className="text-[10px] fill-slate-500 font-mono font-bold" textAnchor="middle" x="466" y="298">2020</text>
                    <text className="text-[10px] fill-slate-500 font-mono font-bold" textAnchor="middle" x="582" y="298">2022</text>
                    <text className="text-[10px] fill-slate-400 italic" textAnchor="end" x="650" y="320">Sumbu X: Tahun Kendaraan →</text>
                  </>
                ) : (
                  <>
                    <text className="text-[10px] fill-slate-500 font-mono font-bold" textAnchor="middle" x="118" y="298">110k km</text>
                    <text className="text-[10px] fill-slate-500 font-mono font-bold" textAnchor="middle" x="234" y="298">85k km</text>
                    <text className="text-[10px] fill-slate-500 font-mono font-bold" textAnchor="middle" x="350" y="298">60k km</text>
                    <text className="text-[10px] fill-slate-500 font-mono font-bold" textAnchor="middle" x="466" y="298">35k km</text>
                    <text className="text-[10px] fill-slate-500 font-mono font-bold" textAnchor="middle" x="582" y="298">15k km</text>
                    <text className="text-[10px] fill-slate-400 italic" textAnchor="end" x="650" y="320">Sumbu X: Jarak Tempuh (Odometer Rendah di Kanan) →</text>
                  </>
                )}

                {/* Centroid Halos with Dynamic Centers */}
                <circle
                  cx={scatterMode === 'tahun' ? 234 : 192}
                  cy={213}
                  fill="#AE3EC9"
                  fillOpacity={selectedClusterFilter === 'all' || selectedClusterFilter === 2 ? 0.1 : 0.02}
                  r="56"
                  className="transition-all duration-700 ease-out"
                />
                <circle
                  cx={scatterMode === 'tahun' ? 408 : 487}
                  cy={212}
                  fill="#0CA678"
                  fillOpacity={selectedClusterFilter === 'all' || selectedClusterFilter === 1 ? 0.1 : 0.02}
                  r="64"
                  className="transition-all duration-700 ease-out"
                />
                <circle
                  cx={scatterMode === 'tahun' ? 408 : 460}
                  cy={156}
                  fill="#2557D6"
                  fillOpacity={selectedClusterFilter === 'all' || selectedClusterFilter === 0 ? 0.1 : 0.02}
                  r="72"
                  className="transition-all duration-700 ease-out"
                />

                {/* Dynamic Car Data Points */}
                {SAMPLE_SCATTER_CARS.map((car) => {
                  const coords = getScatterCoords(car, scatterMode);
                  const isFilteredOut = 
                    (selectedClusterFilter === 0 && car.klaster !== 0) ||
                    (selectedClusterFilter === 1 && car.klaster !== 1) ||
                    (selectedClusterFilter === 2 && car.klaster !== 2) ||
                    (selectedClusterFilter === 'anomali' && !car.isAnomaly);
                  
                  const isHovered = hoveredCar?.id === car.id;
                  const isSelected = selectedCar?.id === car.id;
                  const clusterColor = car.klaster === 0 ? '#2557D6' : car.klaster === 1 ? '#0CA678' : '#AE3EC9';

                  return (
                    <g key={car.id} className="cursor-pointer">
                      {/* Active / Anomaly Pulse Ring */}
                      {(isHovered || isSelected || (selectedClusterFilter === 'anomali' && car.isAnomaly)) && (
                        <circle
                          cx={coords.cx}
                          cy={coords.cy}
                          r={isHovered || isSelected ? 11 : 9}
                          fill="none"
                          stroke={car.isAnomaly ? '#FE6A2B' : clusterColor}
                          strokeWidth={2}
                          strokeDasharray={car.isAnomaly ? '2 2' : undefined}
                          className="animate-pulse"
                        />
                      )}

                      {/* Main Interactive Circle Dot */}
                      <circle
                        cx={coords.cx}
                        cy={coords.cy}
                        r={isSelected ? 7 : isHovered ? 6.5 : isFilteredOut ? 3.5 : 5}
                        fill={clusterColor}
                        fillOpacity={isFilteredOut ? 0.12 : isSelected || isHovered ? 1 : 0.85}
                        stroke="#ffffff"
                        strokeWidth={isHovered || isSelected ? 2 : 1}
                        className="transition-all duration-500 ease-out hover:scale-125"
                        onMouseEnter={() => setHoveredCar(car)}
                        onMouseLeave={() => setHoveredCar(null)}
                        onClick={() => setSelectedCar(selectedCar?.id === car.id ? null : car)}
                      />
                    </g>
                  );
                })}

                {/* Centroid 1: Premium (Biru #2557D6) */}
                <g 
                  transform={`translate(${scatterMode === 'tahun' ? 408 : 460}, 156)`}
                  className="transition-all duration-700 ease-out cursor-pointer"
                  onClick={() => setSelectedClusterFilter(selectedClusterFilter === 0 ? 'all' : 0)}
                  onMouseEnter={() => setHoveredCentroid(0)}
                  onMouseLeave={() => setHoveredCentroid(null)}
                >
                  <rect fill="#2557D6" height="16" transform="rotate(45)" width="16" x="-8" y="-8" rx="2" />
                  <circle cx="0" cy="0" fill="#ffffff" r="3" />
                  <text className="text-[11px] font-extrabold fill-[#2557D6] filter drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)]" x="14" y="4">
                    {scatterMode === 'tahun' ? 'C1 (2019, Rp 212 Jt)' : 'C1 (44k km, Rp 212 Jt)'}
                  </text>
                </g>

                {/* Centroid 2: Keluarga Muda (Hijau #0CA678) */}
                <g 
                  transform={`translate(${scatterMode === 'tahun' ? 408 : 487}, 212)`}
                  className="transition-all duration-700 ease-out cursor-pointer"
                  onClick={() => setSelectedClusterFilter(selectedClusterFilter === 1 ? 'all' : 1)}
                  onMouseEnter={() => setHoveredCentroid(1)}
                  onMouseLeave={() => setHoveredCentroid(null)}
                >
                  <rect fill="#0CA678" height="16" transform="rotate(45)" width="16" x="-8" y="-8" rx="2" />
                  <circle cx="0" cy="0" fill="#ffffff" r="3" />
                  <text className="text-[11px] font-extrabold fill-[#0CA678] filter drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)]" x="14" y="4">
                    {scatterMode === 'tahun' ? 'C2 (2019, Rp 141 Jt)' : 'C2 (39k km, Rp 141 Jt)'}
                  </text>
                </g>

                {/* Centroid 3: Ekonomis (Ungu #AE3EC9) */}
                <g 
                  transform={`translate(${scatterMode === 'tahun' ? 234 : 192}, 213)`}
                  className="transition-all duration-700 ease-out cursor-pointer"
                  onClick={() => setSelectedClusterFilter(selectedClusterFilter === 2 ? 'all' : 2)}
                  onMouseEnter={() => setHoveredCentroid(2)}
                  onMouseLeave={() => setHoveredCentroid(null)}
                >
                  <rect fill="#AE3EC9" height="16" transform="rotate(45)" width="16" x="-8" y="-8" rx="2" />
                  <circle cx="0" cy="0" fill="#ffffff" r="3" />
                  <text className="text-[11px] font-extrabold fill-[#AE3EC9] filter drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)]" x="14" y="4">
                    {scatterMode === 'tahun' ? 'C3 (2016, Rp 139 Jt)' : 'C3 (95k km, Rp 139 Jt)'}
                  </text>
                </g>
              </svg>

              {/* Floating Rich Tooltip on Hover */}
              {hoveredCar && (
                <div 
                  className="absolute z-30 pointer-events-none transition-all duration-150"
                  style={{
                    left: `${(getScatterCoords(hoveredCar, scatterMode).cx / 680) * 100}%`,
                    top: `${(getScatterCoords(hoveredCar, scatterMode).cy / 340) * 100}%`,
                    transform: 'translate(-50%, -115%)',
                  }}
                >
                  <div className="bg-slate-900/95 backdrop-blur-xl border border-white/20 p-3.5 rounded-2xl shadow-2xl text-white min-w-[270px] max-w-[320px]">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span 
                          className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider mb-1"
                          style={{
                            backgroundColor: hoveredCar.klaster === 0 ? 'rgba(37, 99, 235, 0.25)' : hoveredCar.klaster === 1 ? 'rgba(16, 185, 129, 0.25)' : 'rgba(168, 85, 247, 0.25)',
                            color: hoveredCar.klaster === 0 ? '#93c5fd' : hoveredCar.klaster === 1 ? '#6ee7b7' : '#d8b4fe'
                          }}
                        >
                          {hoveredCar.klaster === 0 ? 'Klaster 1: Premium & SUV' : hoveredCar.klaster === 1 ? 'Klaster 2: Keluarga Muda' : 'Klaster 3: LCGC & Ekonomis'}
                        </span>
                        <h4 className="text-xs font-bold text-white leading-snug">{hoveredCar.nama}</h4>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300 font-mono font-bold shrink-0">
                        {hoveredCar.transmisi}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-white/5 p-2 rounded-xl border border-white/10 mb-2">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Harga Listing:</span>
                        <span className="font-extrabold text-amber-300 text-xs">Rp {Math.round(hoveredCar.harga / 1000000)} Jt</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Tahun / Odo:</span>
                        <span className="font-semibold text-slate-200">{hoveredCar.tahun} • {(hoveredCar.km / 1000).toFixed(0)}k km</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Rotasi Garasi:</span>
                        <span className={`font-semibold ${hoveredCar.daysOnLot <= 15 ? 'text-emerald-400' : hoveredCar.daysOnLot <= 35 ? 'text-amber-400' : 'text-rose-400'}`}>
                          {hoveredCar.daysOnLot} Hari ({hoveredCar.daysOnLot <= 15 ? 'Cepat' : hoveredCar.daysOnLot <= 35 ? 'Normal' : 'Aging'})
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Est. Margin Bersih:</span>
                        <span className="font-semibold text-emerald-300">+Rp {hoveredCar.marginEst} Jt</span>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-300 border-t border-white/10 pt-1.5 flex items-start gap-1.5">
                      <span className="text-blue-400 font-bold shrink-0 flex items-center gap-1">
                        <Lightbulb className="w-3.5 h-3.5" />
                        <span>Taktis:</span>
                      </span>
                      <span className="leading-tight">{hoveredCar.catatanOperasional}</span>
                    </div>

                    {hoveredCar.isAnomaly && (
                      <div className="mt-2 text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2 py-1 rounded-lg border border-amber-400/30 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        <span>{hoveredCar.anomalyType}: Di luar kuartil Q1–Q3 segmen</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Floating Rich Tooltip on Centroid Hover */}
              {hoveredCentroid !== null && (
                <div 
                  className="absolute z-30 pointer-events-none transition-all duration-150"
                  style={{
                    left: hoveredCentroid === 0 
                      ? `${((scatterMode === 'tahun' ? 408 : 460) / 680) * 100}%` 
                      : hoveredCentroid === 1 
                      ? `${((scatterMode === 'tahun' ? 408 : 487) / 680) * 100}%`
                      : `${((scatterMode === 'tahun' ? 234 : 192) / 680) * 100}%`,
                    top: hoveredCentroid === 0 ? '42%' : '58%',
                    transform: 'translate(-50%, -115%)',
                  }}
                >
                  <div className="bg-slate-900/95 backdrop-blur-xl border border-white/20 p-3 rounded-xl shadow-2xl text-white text-xs min-w-[220px]">
                    <p className="font-extrabold text-white flex items-center gap-1.5 mb-1.5">
                      <span className="w-2.5 h-2.5 rotate-45 inline-block" style={{ backgroundColor: hoveredCentroid === 0 ? '#2557D6' : hoveredCentroid === 1 ? '#0CA678' : '#AE3EC9' }} />
                      <span>Centroid C{hoveredCentroid + 1}: {hoveredCentroid === 0 ? 'Premium & SUV' : hoveredCentroid === 1 ? 'Keluarga Muda' : 'LCGC & Ekonomis'}</span>
                    </p>
                    <div className="text-[11px] text-slate-300 space-y-1">
                      <p>• Median Harga: <span className="font-bold text-amber-300">{hoveredCentroid === 0 ? 'Rp 212 Jt' : hoveredCentroid === 1 ? 'Rp 141 Jt' : 'Rp 139 Jt'}</span></p>
                      <p>• Rata-rata Usia / Odo: <span className="font-semibold text-white">{hoveredCentroid === 0 ? '2019 • 44k km' : hoveredCentroid === 1 ? '2019 • 39k km' : '2016 • 95k km'}</span></p>
                      <p>• Total Populasi: <span className="font-semibold text-white">{hoveredCentroid === 0 ? '258 Unit (42,4%)' : hoveredCentroid === 1 ? '197 Unit (32,3%)' : '154 Unit (25,3%)'}</span></p>
                    </div>
                    <p className="mt-2 text-[10px] text-blue-300 font-bold border-t border-white/10 pt-1 flex items-center gap-1">
                      <Lightbulb className="w-3 h-3 text-blue-300" />
                      <span>Klik centroid untuk filter klaster ini</span>
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Selected Car Inspector Banner (If a dot is clicked) */}
            {selectedCar && (
              <motion.div 
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/15 border border-blue-400/30 flex items-center justify-center text-blue-700 shrink-0 mt-0.5">
                    <Car className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-[#001540]">{selectedCar.nama}</span>
                      <span 
                        className="text-[10px] font-extrabold px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: selectedCar.klaster === 0 ? '#DBEAFE' : selectedCar.klaster === 1 ? '#D1FAE5' : '#F3E8FF',
                          color: selectedCar.klaster === 0 ? '#1E40AF' : selectedCar.klaster === 1 ? '#065F46' : '#6B21A8'
                        }}
                      >
                        {selectedCar.klaster === 0 ? 'Premium & SUV' : selectedCar.klaster === 1 ? 'Keluarga Muda' : 'LCGC & Ekonomis'}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                        Rp {Math.round(selectedCar.harga / 1000000)} Jt
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        Tahun {selectedCar.tahun} • {selectedCar.km.toLocaleString('id-ID')} km • Transmisi {selectedCar.transmisi}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 mt-1.5 leading-relaxed">
                      <strong className="text-[#001540]">Rekomendasi Manajer Showroom:</strong> {selectedCar.catatanOperasional}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => setSelectedCar(null)}
                    className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                  >
                    Tutup
                  </button>
                  <Link
                    to="/admin/inventori"
                    className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <span>Buka Inventori</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </motion.div>
            )}

            {/* Scatter Legend & Centroid Info */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-1 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
                <button
                  onClick={() => setSelectedClusterFilter(selectedClusterFilter === 0 ? 'all' : 0)}
                  className={`flex items-center gap-2 transition-all p-1 rounded-lg ${selectedClusterFilter === 0 ? 'bg-blue-50 font-bold text-[#2557D6]' : 'text-slate-700 hover:text-[#2557D6]'}`}
                >
                  <span className="w-3.5 h-3.5 rounded-full bg-[#2557D6] shadow-xs" />
                  <span>Segmen Premium (258 Unit)</span>
                </button>
                <button
                  onClick={() => setSelectedClusterFilter(selectedClusterFilter === 1 ? 'all' : 1)}
                  className={`flex items-center gap-2 transition-all p-1 rounded-lg ${selectedClusterFilter === 1 ? 'bg-emerald-50 font-bold text-[#0CA678]' : 'text-slate-700 hover:text-[#0CA678]'}`}
                >
                  <span className="w-3.5 h-3.5 rounded-full bg-[#0CA678] shadow-xs" />
                  <span>Segmen Keluarga Muda (197 Unit)</span>
                </button>
                <button
                  onClick={() => setSelectedClusterFilter(selectedClusterFilter === 2 ? 'all' : 2)}
                  className={`flex items-center gap-2 transition-all p-1 rounded-lg ${selectedClusterFilter === 2 ? 'bg-purple-50 font-bold text-[#AE3EC9]' : 'text-slate-700 hover:text-[#AE3EC9]'}`}
                >
                  <span className="w-3.5 h-3.5 rounded-full bg-[#AE3EC9] shadow-xs" />
                  <span>Segmen Ekonomis (154 Unit)</span>
                </button>
              </div>
              <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
                <span className="w-2.5 h-2.5 rotate-45 bg-[#001540] inline-block" />
                <span>Titik Centroid (Pusat Klaster)</span>
              </div>
            </div>
          </div>

          {/* Right: Authentic Showroom Operational Intelligence (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-3.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-base font-bold text-[#001540]">Evaluasi Strategis Klaster</span>
              <span className="px-2 py-0.5 rounded-md bg-[#001540] text-white text-[11px] font-bold tracking-wide">
                Intel Operasional
              </span>
            </div>

            {/* Card 1: Klaster 1 Premium & SUV */}
            <div 
              onClick={() => setSelectedClusterFilter(selectedClusterFilter === 0 ? 'all' : 0)}
              className={`bg-white p-4.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group hover:shadow-md ${
                selectedClusterFilter === 0
                  ? 'border-[#2557D6] ring-2 ring-blue-500/30 bg-blue-50/20 shadow-xs'
                  : 'border-slate-200/90 shadow-2xs hover:border-blue-300'
              }`}
            >
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#2557D6]" />
              <div className="pl-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#2557D6]" />
                    <span className="text-[10px] font-extrabold text-[#2557D6] tracking-wider uppercase">
                      KLASTER 1: PREMIUM &amp; HIGH-VALUE SUV
                    </span>
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800">
                    42,4% Portofolio
                  </span>
                </div>

                <div className="space-y-2 text-xs text-slate-700 leading-relaxed">
                  <p>
                    <strong className="text-[#001540]">Valuasi &amp; Modal Terikat:</strong> Menyerap <strong className="text-[#001540]">58,4% total modal kerja</strong> (258 unit, median <strong className="text-[#001540]">Rp 212 Jt</strong>, 91% matik). Rata-rata waktu laku <strong className="text-[#001540]">28 hari</strong> dengan margin bruto <strong className="text-blue-700 font-bold">8%–12% (Rp 18–28 Jt/unit)</strong>.
                  </p>
                  <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <strong className="text-[#001540]">Aturan Aging 35 Hari:</strong> Bunga modal floor-plan rata-rata 1,2%/bulan. Jika unit &gt;Rp 250 Jt tertahan &gt;35 hari, segera potong harga listing Rp 5–7 Jt agar margin tidak habis tergerus biaya simpan garasi.
                  </p>
                  <p className="text-[11px] text-slate-600">
                    <strong className="text-[#001540]">SOP Closing:</strong> 82% pembeli memakai leasing tier-1 (BCA/Mandiri). Sertifikat inspeksi bebas tabrak &amp; banjir 160 titik mutlak disertakan untuk closing cepat.
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between text-slate-500 text-[11px] pt-2 border-t border-slate-100">
                  <span className="flex items-center gap-1 font-medium text-slate-600">
                    <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
                    <span>Fortuner, Pajero, CX-5, CR-V</span>
                  </span>
                  <span className="font-extrabold text-blue-700">Margin Tertinggi</span>
                </div>
              </div>
            </div>

            {/* Card 2: Klaster 2 Keluarga Muda */}
            <div 
              onClick={() => setSelectedClusterFilter(selectedClusterFilter === 1 ? 'all' : 1)}
              className={`bg-white p-4.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group hover:shadow-md ${
                selectedClusterFilter === 1
                  ? 'border-[#0CA678] ring-2 ring-emerald-500/30 bg-emerald-50/20 shadow-xs'
                  : 'border-slate-200/90 shadow-2xs hover:border-emerald-300'
              }`}
            >
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#0CA678]" />
              <div className="pl-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#0CA678]" />
                    <span className="text-[10px] font-extrabold text-[#0CA678] tracking-wider uppercase">
                      KLASTER 2: KELUARGA MUDA &amp; URBAN MPV
                    </span>
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800">
                    32,3% Portofolio
                  </span>
                </div>

                <div className="space-y-2 text-xs text-slate-700 leading-relaxed">
                  <p>
                    <strong className="text-[#001540]">Tulang Punggung Likuiditas:</strong> Unit perputaran <strong className="text-emerald-700 font-extrabold">tercepat (14 hari keluar garasi)</strong> (197 unit, tahun tipikal 2019, 39 rb km). Menghasilkan arus kas likuid mingguan untuk biaya operasional dealer.
                  </p>
                  <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <strong className="text-[#001540]">Skema Keuntungan Ganda:</strong> Margin jual Rp 8–12 Jt ditambah <strong className="text-emerald-700 font-bold">refund leasing Adira/ACC/OTO</strong> sebesar Rp 3,5–5,5 Jt per kontrak. Konsumen sangat sensitif paket TDP ringan (DP 15–20 Jt).
                  </p>
                  <p className="text-[11px] text-slate-600">
                    <strong className="text-[#001540]">Pedoman Buy-In:</strong> Amankan stok minimal 20 unit untuk warna aman (Putih &amp; Hitam). Warna alternatif (merah/biru) rotasinya 2x lebih lambat.
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between text-slate-500 text-[11px] pt-2 border-t border-slate-100">
                  <span className="flex items-center gap-1 font-medium text-slate-600">
                    <Car className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Avanza, Xpander, Brio RS, HR-V</span>
                  </span>
                  <span className="font-extrabold text-emerald-700">Rotasi Tercepat (14 Hari)</span>
                </div>
              </div>
            </div>

            {/* Card 3: Klaster 3 LCGC & Ekonomis */}
            <div 
              onClick={() => setSelectedClusterFilter(selectedClusterFilter === 2 ? 'all' : 2)}
              className={`bg-white p-4.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group hover:shadow-md ${
                selectedClusterFilter === 2
                  ? 'border-[#AE3EC9] ring-2 ring-purple-500/30 bg-purple-50/20 shadow-xs'
                  : 'border-slate-200/90 shadow-2xs hover:border-purple-300'
              }`}
            >
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#AE3EC9]" />
              <div className="pl-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#AE3EC9]" />
                    <span className="text-[10px] font-extrabold text-[#AE3EC9] tracking-wider uppercase">
                      KLASTER 3: LCGC, CITY CAR &amp; EKONOMIS
                    </span>
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-50 text-purple-800">
                    25,3% Portofolio
                  </span>
                </div>

                <div className="space-y-2 text-xs text-slate-700 leading-relaxed">
                  <p>
                    <strong className="text-[#001540]">Pasar Tunai &amp; Armada Usaha:</strong> Didominasi <strong className="text-[#001540]">64% pembeli tunai langsung (cash keras)</strong> untuk mobil pertama atau armada taksi online (154 unit, median <strong className="text-[#001540]">Rp 139 Jt</strong>, 95 rb km).
                  </p>
                  <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <strong className="text-[#001540]">Sensitivitas Rekondisi:</strong> Depresiasi unit sangat landai (&lt;Rp 3 Jt/thn). Kunci closing terletak pada kepastian AC dingin menggigil dan ketebalan ban. Ganti 4 ban baru budget hemat (Rp 1,4 Jt) memangkas waktu closing dari 25 hari jadi 9 hari.
                  </p>
                  <p className="text-[11px] text-slate-600">
                    <strong className="text-[#001540]">Program Trade-In:</strong> Buka opsi tukar tambah dari motor Honda/Yamaha sebagai pengurang DP untuk menyerap pasar pekerja yang naik kelas ke roda empat.
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between text-slate-500 text-[11px] pt-2 border-t border-slate-100">
                  <span className="flex items-center gap-1 font-medium text-slate-600">
                    <Zap className="h-3.5 w-3.5 text-purple-600" />
                    <span>Calya, Sigra, Ayla, Karimun</span>
                  </span>
                  <span className="font-extrabold text-purple-700">Pasar Tunai (64% Cash)</span>
                </div>
              </div>
            </div>

            {/* Bottom Alert Card: Peringatan Anomali Harga */}
            <div 
              onClick={() => setSelectedClusterFilter(selectedClusterFilter === 'anomali' ? 'all' : 'anomali')}
              className={`bg-orange-50/90 border p-4.5 rounded-2xl shadow-xs flex items-start gap-3 transition-all cursor-pointer hover:shadow-md ${
                selectedClusterFilter === 'anomali'
                  ? 'border-orange-500 ring-2 ring-orange-400/40 bg-orange-100/70'
                  : 'border-orange-200/90 hover:border-orange-400'
              }`}
            >
              <div className="w-8 h-8 rounded-xl bg-[#FE6A2B] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                <ShieldAlert className="h-4.5 w-4.5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-[#001540]">Peringatan Discrepancy Harga</p>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-orange-200/80 text-orange-900">
                    21 Unit Terdeteksi
                  </span>
                </div>
                <p className="text-[11px] text-slate-700 mt-1 leading-snug">
                  Terdeteksi <strong className="font-bold text-[#A83900]">14 unit overpriced (&gt;Q3)</strong> yang menahan modal showroom <strong>Rp 4,4 Miliar</strong>, dan <strong className="font-bold text-[#A83900]">7 unit underpriced (&lt;Q1)</strong> yang kehilangan potensi laba markup.
                </p>
                <div className="mt-2.5 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#A83900] hover:underline">
                    <span>{selectedClusterFilter === 'anomali' ? 'Tampilkan Semua Titik' : 'Klik untuk Sorot 21 Titik di Grafik'}</span>
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
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
          <div className="p-4 bg-slate-50/80 backdrop-blur-md border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <motion.button
                type="button"
                onClick={() => setAnomalyFilter('all')}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                className={`btn-liquid-tab liquid-shine px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  anomalyFilter === 'all'
                    ? 'btn-liquid-primary'
                    : 'bg-white text-slate-700 hover:text-[#001540] border border-slate-200/80 shadow-2xs'
                }`}
              >
                Semua (21)
              </motion.button>
              <motion.button
                type="button"
                onClick={() => setAnomalyFilter('above')}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                className={`btn-liquid-tab liquid-shine px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  anomalyFilter === 'above'
                    ? 'btn-liquid-danger text-white'
                    : 'bg-white text-slate-700 hover:text-[#001540] border border-slate-200/80 shadow-2xs'
                }`}
              >
                Di Atas Rentang (14)
              </motion.button>
              <motion.button
                type="button"
                onClick={() => setAnomalyFilter('below')}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                className={`btn-liquid-tab liquid-shine px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  anomalyFilter === 'below'
                    ? 'btn-liquid-primary'
                    : 'bg-white text-slate-700 hover:text-[#001540] border border-slate-200/80 shadow-2xs'
                }`}
              >
                Di Bawah Rentang (7)
              </motion.button>
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
              <motion.button 
                type="button" 
                onClick={() => setAnomalyPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                whileHover={safePage === 1 ? {} : { scale: 1.04 }}
                whileTap={safePage === 1 ? {} : { scale: 0.96 }}
                className="btn-liquid-secondary liquid-shine flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-xs font-bold"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Sebelumnya</span>
              </motion.button>

              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
                <motion.button
                  key={pageNum}
                  type="button"
                  onClick={() => setAnomalyPage(pageNum)}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.94 }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    safePage === pageNum
                      ? 'btn-liquid-primary'
                      : 'btn-liquid-secondary'
                  }`}
                >
                  {pageNum}
                </motion.button>
              ))}

              <motion.button 
                type="button" 
                onClick={() => setAnomalyPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages || filteredAnomalies.length === 0}
                whileHover={safePage === totalPages || filteredAnomalies.length === 0 ? {} : { scale: 1.04 }}
                whileTap={safePage === totalPages || filteredAnomalies.length === 0 ? {} : { scale: 0.96 }}
                className="btn-liquid-secondary liquid-shine flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-xs font-bold"
              >
                <span>Berikutnya</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </motion.button>
            </div>
          </div>
        </div>

      </section>

      {/* ============================================================ */}
      {/* 4. PINDAH KE MENU MANAJEMEN PENGGUNA (BAR KIRI)              */}
      {/* ============================================================ */}
      <section className="bg-gradient-to-r from-slate-900 via-indigo-950 to-[#001540] rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-800">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
            <UserCheck className="h-3.5 w-3.5 text-amber-400" />
            <span>Fitur Baru: Manajemen Pengguna &amp; Calon Pembeli di Bar Kiri</span>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">
            Manajemen Pengguna, Analisis Anggaran &amp; CRUD Akun Anomali
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Fitur Manajemen Pengguna &amp; Calon Pembeli kini dapat diakses secara terdedikasi melalui menu <strong>Bar Kiri</strong>. Dilengkapi visualisasi analisis preferensi rentang anggaran, fokus utama penggunaan mobil, serta aksi CRUD lengkap (Tambah, Edit, Hapus) untuk membersihkan akun anomali.
          </p>
        </div>

        <Link
          to="/admin/pengguna"
          className="btn-liquid-primary liquid-shine px-5 py-3 rounded-xl text-white text-xs font-bold inline-flex items-center gap-2 shrink-0 group cursor-pointer"
        >
          <UserCheck className="h-4 w-4 text-amber-300" />
          <span>Buka Manajemen Pengguna</span>
          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </section>

    </div>
  );
}
