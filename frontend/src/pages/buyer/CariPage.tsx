import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';
import { PressableCard } from '@/components/motion/PressableCard';
import { Skeleton } from '@/components/motion/Skeleton';
import { apiFetch } from '@/services/api';
import { getCarPhoto } from '@/utils/carPhoto';
import { 
  Search, SlidersHorizontal, Sparkles, AlertCircle, 
  X, Sliders, ChevronRight,
  ShieldCheck, Heart, ArrowRight, RotateCcw, Check, Info
} from 'lucide-react';
import { AlgorithmScenarioTester } from '@/components/algo/AlgorithmScenarioTester';

interface CarItem {
  id: number;
  nama_mobil: string;
  tahun: number;
  harga_rp: number;
  jarak_tempuh_ribu_km: number;
  lokasi: string;
  transmisi: string;
  tipe_bodi?: string;
  klaster: number;
  nama_segmen: string;
  warna_segmen: string;
}

interface SearchResponse {
  total: number;
  page: number;
  limit: number;
  items: CarItem[];
  segmen_cocok?: {
    klaster: number;
    nama_lengkap: string;
    nama_pendek: string;
    warna_hex: string;
    alasan: string;
  };
  rekomendasi_alternatif?: CarItem[];
}

export function CariPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const shouldReduce = useReducedMotion();

  // Simulation State for B4 view testing
  const [simState, setSimState] = useState<'found' | 'zero'>('found');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SearchResponse | null>(null);
  const [showAlgoTester, setShowAlgoTester] = useState(false);

  // Filter input states
  const query = searchParams.get('q') || '';
  const brand = searchParams.get('merk') || searchParams.get('merek') || '';
  const tipeBodi = searchParams.get('tipe_bodi') || '';
  const klaster = searchParams.get('klaster') || '';
  const transmisi = searchParams.get('transmisi') || '';
  const lokasi = searchParams.get('lokasi') || '';
  const hargaMax = searchParams.get('harga_max') || '';
  const tahunMin = searchParams.get('tahun_min') || '';
  const kmMax = searchParams.get('km_max') || '';
  const fiturMin = searchParams.get('fitur_min') || '';

  const queryString = searchParams.toString();

  useEffect(() => {
    if (simState === 'zero') {
      setData({
        total: 0,
        page: 1,
        limit: 10,
        items: [],
        segmen_cocok: {
          klaster: 1,
          nama_lengkap: 'Segmen 1: Mobil Keluarga Muda',
          nama_pendek: 'Keluarga Muda',
          warna_hex: '#0CA678',
          alasan: 'Mitsubishi Xpander termasuk dalam klaster Keluarga Muda dengan median harga pasar Rp 195 - 225 Juta.'
        },
        rekomendasi_alternatif: [
          {
            id: 101,
            nama_mobil: 'Toyota Avanza 1.3 G M/T',
            tahun: 2018,
            harga_rp: 148000000,
            jarak_tempuh_ribu_km: 62,
            lokasi: 'Jakarta Selatan',
            transmisi: 'Manual',
            tipe_bodi: 'MPV',
            klaster: 1,
            nama_segmen: 'Keluarga Muda',
            warna_segmen: '#0CA678'
          },
          {
            id: 102,
            nama_mobil: 'Honda Mobilio 1.5 E CVT',
            tahun: 2017,
            harga_rp: 145000000,
            jarak_tempuh_ribu_km: 71,
            lokasi: 'Tangerang',
            transmisi: 'Automatic',
            tipe_bodi: 'MPV',
            klaster: 1,
            nama_segmen: 'Keluarga Muda',
            warna_segmen: '#0CA678'
          },
          {
            id: 103,
            nama_mobil: 'Suzuki Ertiga 1.4 GL M/T',
            tahun: 2018,
            harga_rp: 142000000,
            jarak_tempuh_ribu_km: 65,
            lokasi: 'Bekasi',
            transmisi: 'Manual',
            tipe_bodi: 'MPV',
            klaster: 1,
            nama_segmen: 'Keluarga Muda',
            warna_segmen: '#0CA678'
          },
          {
            id: 104,
            nama_mobil: 'Daihatsu Xenia 1.3 R Deluxe',
            tahun: 2019,
            harga_rp: 139000000,
            jarak_tempuh_ribu_km: 58,
            lokasi: 'Jakarta Barat',
            transmisi: 'Manual',
            tipe_bodi: 'MPV',
            klaster: 1,
            nama_segmen: 'Keluarga Muda',
            warna_segmen: '#0CA678'
          }
        ]
      });
      return;
    }

    setLoading(true);
    apiFetch<SearchResponse>(`/cari?${queryString}`)
      .then((res) => {
        setData(res);
      })
      .catch(() => {
        // Fallback realistic 10 items if server is offline or empty
        setData({
          total: 10,
          page: 1,
          limit: 10,
          items: [
            {
              id: 1,
              nama_mobil: 'Honda Brio Satya E 1.2 CVT',
              tahun: 2019,
              harga_rp: 142000000,
              jarak_tempuh_ribu_km: 38.2,
              lokasi: 'Jakarta Selatan',
              transmisi: 'Automatic',
              tipe_bodi: 'Hatchback',
              klaster: 1,
              nama_segmen: 'Keluarga Muda',
              warna_segmen: '#0CA678'
            },
            {
              id: 2,
              nama_mobil: 'Toyota Avanza 1.3 G M/T',
              tahun: 2018,
              harga_rp: 148000000,
              jarak_tempuh_ribu_km: 52.1,
              lokasi: 'Jakarta Timur',
              transmisi: 'Manual',
              tipe_bodi: 'MPV',
              klaster: 1,
              nama_segmen: 'Keluarga Muda',
              warna_segmen: '#0CA678'
            },
            {
              id: 3,
              nama_mobil: 'Toyota Yaris 1.5 S TRD Sportivo',
              tahun: 2019,
              harga_rp: 208000000,
              jarak_tempuh_ribu_km: 42.1,
              lokasi: 'Jakarta Selatan',
              transmisi: 'Automatic',
              tipe_bodi: 'Hatchback',
              klaster: 1,
              nama_segmen: 'Keluarga Muda',
              warna_segmen: '#0CA678'
            },
            {
              id: 4,
              nama_mobil: 'Honda Mobilio 1.5 E CVT',
              tahun: 2018,
              harga_rp: 155000000,
              jarak_tempuh_ribu_km: 46.8,
              lokasi: 'Tangerang Selatan',
              transmisi: 'Automatic',
              tipe_bodi: 'MPV',
              klaster: 1,
              nama_segmen: 'Keluarga Muda',
              warna_segmen: '#0CA678'
            },
            {
              id: 5,
              nama_mobil: 'Daihatsu Terios 1.5 R Deluxe',
              tahun: 2019,
              harga_rp: 185000000,
              jarak_tempuh_ribu_km: 55.4,
              lokasi: 'Depok',
              transmisi: 'Automatic',
              tipe_bodi: 'SUV',
              klaster: 1,
              nama_segmen: 'Keluarga Muda',
              warna_segmen: '#0CA678'
            },
            {
              id: 6,
              nama_mobil: 'Suzuki Ertiga 1.5 GX A/T',
              tahun: 2019,
              harga_rp: 172000000,
              jarak_tempuh_ribu_km: 49.3,
              lokasi: 'Bekasi',
              transmisi: 'Automatic',
              tipe_bodi: 'MPV',
              klaster: 1,
              nama_segmen: 'Keluarga Muda',
              warna_segmen: '#0CA678'
            },
            {
              id: 7,
              nama_mobil: 'Toyota Calya 1.2 G A/T',
              tahun: 2020,
              harga_rp: 125000000,
              jarak_tempuh_ribu_km: 33.1,
              lokasi: 'Jakarta Barat',
              transmisi: 'Automatic',
              tipe_bodi: 'MPV',
              klaster: 1,
              nama_segmen: 'Keluarga Muda',
              warna_segmen: '#0CA678'
            },
            {
              id: 8,
              nama_mobil: 'Daihatsu Sigra 1.2 R Deluxe',
              tahun: 2020,
              harga_rp: 129000000,
              jarak_tempuh_ribu_km: 39.0,
              lokasi: 'Tangerang',
              transmisi: 'Automatic',
              tipe_bodi: 'MPV',
              klaster: 1,
              nama_segmen: 'Keluarga Muda',
              warna_segmen: '#0CA678'
            },
            {
              id: 9,
              nama_mobil: 'Toyota Rush 1.5 S TRD',
              tahun: 2018,
              harga_rp: 198000000,
              jarak_tempuh_ribu_km: 58.0,
              lokasi: 'Jakarta Utara',
              transmisi: 'Automatic',
              tipe_bodi: 'SUV',
              klaster: 1,
              nama_segmen: 'Keluarga Muda',
              warna_segmen: '#0CA678'
            },
            {
              id: 10,
              nama_mobil: 'Honda Jazz 1.5 RS CVT',
              tahun: 2018,
              harga_rp: 215000000,
              jarak_tempuh_ribu_km: 44.2,
              lokasi: 'Jakarta Selatan',
              transmisi: 'Automatic',
              tipe_bodi: 'Hatchback',
              klaster: 1,
              nama_segmen: 'Keluarga Muda',
              warna_segmen: '#0CA678'
            }
          ],
          segmen_cocok: {
            klaster: 1,
            nama_lengkap: 'Segmen 1: Mobil Keluarga Muda',
            nama_pendek: 'Keluarga Muda',
            warna_hex: '#0CA678',
            alasan: 'Berdasarkan tahun (2017-2023) dan rentang harga Rp 100 - 250 Jt, algoritma K-Means kami mengelompokkan preferensi ini ke klaster mobil keluarga modern hemat perawatan dengan efisiensi bahan bakar tinggi.'
          }
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [queryString, simState]);

  const updateFilter = (key: string, val: string) => {
    const next = new URLSearchParams(searchParams);
    if (val) {
      next.set(key, val);
      if (key === 'merk') next.set('merek', val);
      if (key === 'merek') next.set('merk', val);
    } else {
      next.delete(key);
      if (key === 'merk') next.delete('merek');
      if (key === 'merek') next.delete('merk');
    }
    setSearchParams(next);
  };

  const removeFilter = (key: string) => {
    const next = new URLSearchParams(searchParams);
    next.delete(key);
    if (key === 'merk') next.delete('merek');
    if (key === 'merek') next.delete('merk');
    setSearchParams(next);
  };

  const activeFilters = [
    query ? { key: 'q', label: `Kata Kunci: "${query}"` } : null,
    brand ? { key: 'merk', label: `Merek: ${brand}` } : null,
    tipeBodi ? { key: 'tipe_bodi', label: `Tipe: ${tipeBodi}` } : null,
    klaster !== '' ? { key: 'klaster', label: `Segmen: ${klaster}` } : null,
    transmisi ? { key: 'transmisi', label: `Transmisi: ${transmisi}` } : null,
    lokasi ? { key: 'lokasi', label: `Kota: ${lokasi}` } : null,
    hargaMax ? { key: 'harga_max', label: `Maks: Rp ${Number(hargaMax).toLocaleString('id-ID')}` } : null,
    tahunMin ? { key: 'tahun_min', label: `Min Tahun: ${tahunMin}` } : null,
    kmMax ? { key: 'km_max', label: `Maks: ${kmMax} rb km` } : null,
    fiturMin ? { key: 'fitur_min', label: `Min ${fiturMin} Fitur` } : null,
  ].filter(Boolean) as { key: string; label: string }[];

  const displayedItems = data?.items || [];

  return (
    <div className="min-h-screen bg-[#F9F9FF] text-[#111C2D]">
      
      {/* 1. Interactive View State Controller Header (Simulation Switcher) */}
      <section className="bg-[#F0F3FF] py-2.5 px-4 sm:px-6 border-b border-[#DFE8FF]">
        <div className="max-w-[1240px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#0F2A5F] text-white text-[11px] font-bold">ML</span>
            <span className="text-xs font-bold text-[#001540]">Simulasi State Hasil Pencarian (B4):</span>
          </div>
          <div className="inline-flex p-1 bg-[#D9E3FB] rounded-xl shadow-inner gap-1">
            <button
              onClick={() => {
                setSimState('found');
                removeFilter('q');
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                simState === 'found'
                  ? 'bg-white text-[#001540] shadow-sm'
                  : 'text-[#44464F] hover:text-[#001540]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#0CA678]"></span>
              <span>Hasil Ditemukan (10 Unit)</span>
            </button>
            <button
              onClick={() => {
                setSimState('zero');
                updateFilter('q', 'Xpander');
                updateFilter('harga_max', '150000000');
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                simState === 'zero'
                  ? 'bg-white text-[#001540] shadow-sm'
                  : 'text-[#44464F] hover:text-[#001540]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#FE6A2B]"></span>
              <span>Kondisi 0 Hasil (Xpander &lt; 150 Jt)</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. Step Indicator & Breadcrumb Bar */}
      <section className="bg-white border-b border-[#E8EEFF] shadow-xs">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-[#44464F]">
            <a href="/" className="hover:text-[#001540] transition-colors">Beranda</a>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-[#001540] font-bold">Hasil Pencarian</span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">
              {simState === 'zero' ? 'Xpander < 150 Jt (0 Unit)' : 'Keluarga Muda (10 Mobil)'}
            </span>
          </nav>

          {/* Purchase Journey Flow Steps */}
          <div className="flex items-center gap-2 overflow-x-auto py-0.5 text-xs">
            {/* Step 1: Active */}
            <div className="flex items-center gap-1.5 bg-[#0F2A5F] text-white px-3 py-1 rounded-full shadow-xs shrink-0 font-bold">
              <span className="w-4 h-4 rounded-full bg-[#FE6A2B] text-white text-[10px] flex items-center justify-center font-bold">1</span>
              <span>Cari Mobil</span>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
            {/* Step 2 */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 text-slate-500 shrink-0 font-medium">
              <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-600 text-[10px] flex items-center justify-center font-bold">2</span>
              <span>Pilih Unit</span>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
            {/* Step 3 */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 text-slate-500 shrink-0 font-medium">
              <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-600 text-[10px] flex items-center justify-center font-bold">3</span>
              <span>Cicilan & Test Drive</span>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
            {/* Step 4 */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 text-slate-500 shrink-0 font-medium">
              <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-600 text-[10px] flex items-center justify-center font-bold">4</span>
              <span>Konfirmasi</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Main Workspace: Split Screen Filter (Left ~310px) + Results (Right) */}
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          
          {/* LEFT STICKY FILTER PANEL (~310px) */}
          <aside className="w-full lg:w-[310px] shrink-0 bg-white rounded-2xl shadow-xs border border-[#DFE8FF] p-5 flex flex-col gap-4 lg:sticky lg:top-20">
            {/* Filter Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <SlidersHorizontal className="h-4 w-4 text-[#001540]" />
                <h2 className="text-sm font-bold text-[#001540]">Filter Pencarian</h2>
              </div>
              <button 
                onClick={() => {
                  setSearchParams(new URLSearchParams());
                  setSimState('found');
                }}
                className="text-xs font-semibold text-rose-600 hover:underline"
              >
                Reset
              </button>
            </div>

            {/* Model & Merk Search Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#001540]">Model & Merek</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => updateFilter('q', e.target.value)}
                  placeholder="Ketik Avanza, Brio, Xpander..."
                  className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#F0F3FF] text-xs text-[#111C2D] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0F2A5F] transition-all"
                />
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {['Toyota', 'Honda', 'Mitsubishi'].map(b => (
                  <button
                    key={b}
                    onClick={() => updateFilter('merk', brand === b ? '' : b)}
                    className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${
                      brand === b ? 'bg-[#001540] text-white font-bold' : 'bg-[#E8EEFF] text-[#001540] hover:bg-[#DFE8FF]'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {/* Segmen Pasar AI (Cluster K-Means) */}
            <div className="flex flex-col gap-2 p-2.5 bg-[#F0F3FF] rounded-xl border border-[#DFE8FF]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#001540]">Segmen Pasar AI</span>
                <span className="text-[10px] bg-[#0F2A5F] text-white font-bold px-1.5 py-0.5 rounded">K-Means</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {[
                  { id: '1', name: 'Keluarga Muda', color: '#0CA678', count: '197 unit' },
                  { id: '0', name: 'Premium', color: '#2557D6', count: '258 unit' },
                  { id: '2', name: 'Ekonomis & Kompak', color: '#AE3EC9', count: '154 unit' },
                ].map((s) => (
                  <label
                    key={s.id}
                    onClick={() => updateFilter('klaster', klaster === s.id ? '' : s.id)}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all border ${
                      klaster === s.id ? 'bg-white border-[#001540] shadow-xs' : 'bg-white/70 border-transparent hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }}></span>
                      <span className="text-xs font-bold text-[#111C2D]">{s.name}</span>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500 bg-[#E8EEFF] px-1.5 py-0.5 rounded-full">{s.count}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Rentang Anggaran Cash */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="font-bold text-[#001540]">Rentang Anggaran</label>
                <span className="text-slate-500 font-mono text-[11px] font-semibold">
                  {hargaMax ? `Maks Rp ${Math.round(Number(hargaMax)/1000000)} Jt` : 'Semua Harga'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <button
                  onClick={() => updateFilter('harga_max', '150000000')}
                  className={`p-1.5 rounded-lg border text-left ${hargaMax === '150000000' ? 'bg-[#001540] text-white border-[#001540]' : 'bg-[#F0F3FF] border-slate-200 text-[#001540]'}`}
                >
                  <span className="text-[10px] opacity-70 block">Ekonomis</span>
                  <span className="font-bold">&le; Rp 150 Jt</span>
                </button>
                <button
                  onClick={() => updateFilter('harga_max', '250000000')}
                  className={`p-1.5 rounded-lg border text-left ${hargaMax === '250000000' ? 'bg-[#001540] text-white border-[#001540]' : 'bg-[#F0F3FF] border-slate-200 text-[#001540]'}`}
                >
                  <span className="text-[10px] opacity-70 block">Menengah</span>
                  <span className="font-bold">&le; Rp 250 Jt</span>
                </button>
              </div>
            </div>

            {/* Tipe Bodi (Skenario A Feature) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#001540]">Tipe Bodi Kendaraan</label>
              <select
                value={tipeBodi}
                onChange={(e) => updateFilter('tipe_bodi', e.target.value)}
                className="h-9 px-2.5 rounded-lg bg-[#F0F3FF] text-xs font-medium text-[#111C2D] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#001540]"
              >
                <option value="">Semua Tipe Bodi</option>
                <option value="Hatchback">Hatchback (Brio, Yaris)</option>
                <option value="MPV">MPV (Avanza, Xpander)</option>
                <option value="SUV">SUV (Rush, Terios, Pajero)</option>
                <option value="Sedan">Sedan (Civic, City)</option>
                <option value="Niaga">Niaga (GranMax, Carry)</option>
              </select>
            </div>

            {/* Transmisi */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#001540]">Transmisi</label>
              <div className="grid grid-cols-3 gap-1 bg-[#E8EEFF] p-1 rounded-lg text-center text-xs">
                {['', 'Automatic', 'Manual'].map((t) => (
                  <button
                    key={t}
                    onClick={() => updateFilter('transmisi', t)}
                    className={`py-1 rounded-md font-semibold transition-all ${
                      transmisi === t ? 'bg-[#0F2A5F] text-white shadow-xs font-bold' : 'text-[#44464F] hover:text-[#001540]'
                    }`}
                  >
                    {t === '' ? 'Semua' : t === 'Automatic' ? 'Matik' : 'Manual'}
                  </button>
                ))}
              </div>
            </div>

            {/* Tahun Produksi */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#001540]">Tahun Produksi Minimal</label>
              <select
                value={tahunMin}
                onChange={(e) => updateFilter('tahun_min', e.target.value)}
                className="h-9 px-2.5 rounded-lg bg-[#F0F3FF] text-xs font-medium text-[#111C2D] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#001540]"
              >
                <option value="">Semua Tahun Perakitan</option>
                <option value="2020">2020 ke atas (Usia &lt; 4 tahun)</option>
                <option value="2018">2018 ke atas (Rekomendasi ML)</option>
                <option value="2015">2015 ke atas (Ekonomis)</option>
              </select>
            </div>

            {/* Jarak Tempuh */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#001540]">Jarak Tempuh (KM)</label>
              <select
                value={kmMax}
                onChange={(e) => updateFilter('km_max', e.target.value)}
                className="h-9 px-2.5 rounded-lg bg-[#F0F3FF] text-xs font-medium text-[#111C2D] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#001540]"
              >
                <option value="">Bebas Jarak Tempuh</option>
                <option value="30">&le; 30.000 km (Keluarga Muda Low KM)</option>
                <option value="60">&le; 60.000 km (Standar Wajar)</option>
                <option value="100">&le; 100.000 km</option>
              </select>
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 flex flex-col gap-2">
              <button 
                onClick={() => {}}
                className="w-full py-2.5 bg-[#FE6A2B] hover:bg-[#A83900] text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Check className="h-4 w-4" />
                <span>Terapkan Filter ({displayedItems.length} Unit)</span>
              </button>
            </div>
          </aside>

          {/* RIGHT RESULTS MAIN AREA (~930px) */}
          <main className="w-full flex-1 flex flex-col gap-5">
            
            {/* Search Header Bar (Light Blue Gradient 60% Opacity) */}
            <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-r from-sky-100/60 via-blue-100/60 to-cyan-100/60 backdrop-blur-md p-4 shadow-xs space-y-3">
              <div className="flex flex-col md:flex-row items-center gap-3">
                {/* Search input with 60% gradient styling */}
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-blue-700" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => updateFilter('q', e.target.value)}
                    placeholder="Cari model mobil (e.g. Avanza, Brio, Xpander, Fortuner)..."
                    className="w-full rounded-xl border border-blue-300/80 bg-gradient-to-r from-sky-100/60 via-blue-100/60 to-cyan-100/60 backdrop-blur-sm py-2 pl-10 pr-4 text-xs font-medium text-slate-900 placeholder-slate-500 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/30 shadow-xs transition-all"
                  />
                </div>

                {/* Algorithm Scenario Tester Toggle */}
                <button
                  onClick={() => setShowAlgoTester(!showAlgoTester)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shadow-xs shrink-0 ${
                    showAlgoTester
                      ? 'bg-[#001540] text-white shadow-[#001540]/30 ring-2 ring-blue-400'
                      : 'bg-white/95 text-[#001540] hover:bg-white border border-blue-300'
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5 text-[#FE6A2B]" />
                  <span>{showAlgoTester ? 'Tutup Uji Algoritma' : 'Uji Coba Algoritma'}</span>
                </button>
              </div>

              {/* Active Removable Chips */}
              {activeFilters.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-blue-200/50">
                  <span className="text-[11px] font-bold text-slate-600 mr-1 flex items-center gap-1">
                    <Sliders className="h-3 w-3 text-blue-600" />
                    Filter Aktif:
                  </span>
                  {activeFilters.map((f) => (
                    <span
                      key={f.key}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/90 text-[#001540] font-bold text-[11px] border border-blue-200 shadow-2xs"
                    >
                      <span>{f.label}</span>
                      <button
                        onClick={() => removeFilter(f.key)}
                        className="hover:text-rose-600 focus:outline-none"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <button
                    onClick={() => {
                      setSearchParams(new URLSearchParams());
                      setSimState('found');
                    }}
                    className="text-[11px] font-bold text-rose-600 hover:underline ml-2"
                  >
                    Hapus Semua
                  </button>
                </div>
              )}
            </div>

            {/* Algorithm Scenario Tester Panel (Expanded when clicked) */}
            <AnimatePresence>
              {showAlgoTester && (
                <motion.div
                  initial={shouldReduce ? { opacity: 0 } : { opacity: 0, height: 0, y: -10 }}
                  animate={shouldReduce ? { opacity: 1 } : { opacity: 1, height: 'auto', y: 0 }}
                  exit={shouldReduce ? { opacity: 0 } : { opacity: 0, height: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <AlgorithmScenarioTester
                    onApplyFilters={(filters) => {
                      const next = new URLSearchParams(searchParams);
                      if (filters.tipe_bodi) next.set('tipe_bodi', filters.tipe_bodi);
                      if (filters.hargaMax) next.set('harga_max', String(filters.hargaMax));
                      if (filters.tahunMin) next.set('tahun_min', String(filters.tahunMin));
                      if (filters.kmMax) next.set('km_max', String(filters.kmMax));
                      if (filters.fiturMin) next.set('fitur_min', String(filters.fiturMin));
                      setSearchParams(next);
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Top Results Bar & Sorting */}
            <div className="bg-white p-4 rounded-xl shadow-xs border border-[#E8EEFF] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-baseline gap-2">
                <h1 className="text-base font-extrabold text-[#001540]">
                  {simState === 'zero' ? '0 Mobil Ditemukan' : `${displayedItems.length} Mobil Ditemukan`}
                </h1>
                <span className="text-xs text-slate-500">Lolos 175-Titik Inspeksi CekGarasi</span>
              </div>
              <div className="flex items-center gap-2 shrink-0 text-xs">
                <span className="text-slate-500 font-medium">Urutkan:</span>
                <select className="h-9 px-3 rounded-lg bg-[#F0F3FF] text-[#001540] font-bold text-xs focus:outline-none border border-slate-200">
                  <option>Harga Terendah</option>
                  <option>Harga Tertinggi</option>
                  <option>Tahun Terbaru</option>
                  <option>Jarak Tempuh Terendah</option>
                  <option>Skor Inspeksi Tertinggi</option>
                </select>
              </div>
            </div>

            {/* ML CLUSTERING INSIGHT CARD */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#F0F3FF] via-white to-[#F0F3FF] rounded-xl p-5 border border-[#DFE8FF] shadow-xs">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1 flex flex-col gap-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white text-[#001540] border border-blue-200 shadow-xs w-fit text-xs font-bold">
                    <Sparkles className="h-3.5 w-3.5 text-[#FE6A2B]" />
                    <span>Segmen Otomatis (K-Means Clustering)</span>
                  </div>
                  <h3 className="text-sm font-extrabold text-[#001540]">
                    Kriteria Anda paling dekat dengan segmen: <span className="text-[#0CA678]">Keluarga Muda</span>
                  </h3>
                  <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                    Berdasarkan tahun (2017-2023) dan rentang harga yang Anda pilih, algoritma K-Means kami mengelompokkan preferensi ini ke klaster mobil keluarga modern hemat perawatan dengan efisiensi bahan bakar tinggi.
                  </p>
                  
                  {/* 4 Metric Chips */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-2xs">
                      <span className="text-[10px] text-slate-500 font-semibold block">Median Harga</span>
                      <span className="text-xs font-extrabold text-[#001540]">Rp 141 Juta</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-2xs">
                      <span className="text-[10px] text-slate-500 font-semibold block">Tahun Tipikal</span>
                      <span className="text-xs font-extrabold text-[#001540]">2019</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-2xs">
                      <span className="text-[10px] text-slate-500 font-semibold block">Transmisi Klaster</span>
                      <span className="text-xs font-extrabold text-[#001540]">53% Matik</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-2xs">
                      <span className="text-[10px] text-slate-500 font-semibold block">Total Unit Segmen</span>
                      <span className="text-xs font-extrabold text-[#001540]">197 Mobil</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center md:self-center">
                  <button 
                    onClick={() => updateFilter('klaster', '1')}
                    className="h-10 px-3.5 rounded-lg bg-white hover:bg-slate-50 text-[#001540] border border-blue-200 font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <span>Lihat 197 mobil segmen ini</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* RESULTS VIEWPORT: Either 10 Found Units OR 0-Result State */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                    <Skeleton height={160} />
                    <Skeleton height={18} width="70%" />
                    <Skeleton height={22} width="50%" />
                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                      <Skeleton height={14} width="30%" />
                      <Skeleton height={14} width="30%" />
                    </div>
                  </div>
                ))}
              </div>
            ) : simState === 'found' && displayedItems.length > 0 ? (
              /* GRID OF CAR CARDS (3 COLUMNS) */
              <Stagger key={queryString} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {displayedItems.map((car, idx) => (
                  <StaggerItem key={car.id} index={idx}>
                    <PressableCard
                      onClick={() => navigate(`/mobil/${car.id}`)}
                      className="bg-white rounded-xl shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col border border-slate-200 group"
                    >
                      <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
                        <img
                          src={getCarPhoto(car.nama_mobil, car.transmisi)}
                          alt={car.nama_mobil}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E6F7F0] text-[#0CA678] text-[10px] shadow-xs font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#0CA678]"></span>
                            {car.nama_segmen}
                          </span>
                        </div>
                        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                          <span className="bg-[#12A150] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3" />
                            Terinspeksi
                          </span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                            className="w-7 h-7 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-slate-500 hover:text-rose-600 shadow-xs transition-colors"
                          >
                            <Heart className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                        <div>
                          <h3 className="font-bold text-sm text-[#001540] tracking-tight group-hover:text-[#FE6A2B] transition-colors line-clamp-1">
                            {car.nama_mobil}
                          </h3>
                          <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                            <span>{car.tahun}</span>
                            <span>•</span>
                            <span>{car.jarak_tempuh_ribu_km} rb km</span>
                            <span>•</span>
                            <span>{car.transmisi}</span>
                            <span>•</span>
                            <span className="text-slate-600">{car.lokasi}</span>
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-end justify-between">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-semibold">Harga Tunai</span>
                            <div className="text-sm font-extrabold text-[#001540]">
                              Rp {car.harga_rp.toLocaleString('id-ID')}
                            </div>
                            <span className="text-[10px] text-slate-500">
                              Cicilan mulai Rp {Math.round(car.harga_rp * 0.021 / 1000000).toFixed(1)} Jt/bln
                            </span>
                          </div>
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#FE6A2B] group-hover:translate-x-1 transition-transform">
                            <span>Detail</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </span>
                        </div>
                      </div>
                    </PressableCard>
                  </StaggerItem>
                ))}
              </Stagger>
            ) : (
              /* ZERO-RESULTS ARTBOARD (Xpander < 150 Jt) */
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col gap-6"
              >
                {/* Clean AI Zero Results Alert Box */}
                <div className="bg-white rounded-2xl border border-amber-200/80 p-6 shadow-xs flex flex-col gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
                      <AlertCircle className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[11px] mb-1">
                        <Info className="h-3.5 w-3.5" />
                        <span>Kondisi 0 Hasil Pencarian</span>
                      </div>
                      <h2 className="text-lg font-bold text-[#001540]">
                        Unit Belum Tersedia untuk Kriteria "Xpander &lt; Rp 150 Jt"
                      </h2>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-3xl">
                        Berdasarkan kalibrasi 609 unit database CekGarasi dan algoritma K-Means, <strong className="text-[#001540]">Mitsubishi Xpander</strong> berada di Klaster <span className="text-[#0CA678] font-bold">Keluarga Muda / Premium</span> dengan rentang harga wajar pasar (Q1–Q3) di angka <strong className="text-[#001540]">Rp 185 Juta – Rp 230 Juta</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Recommendation Actions for Zero State */}
                  <div className="bg-[#F0F3FF] p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 border border-[#DFE8FF]">
                    <div className="text-xs text-[#001540]">
                      <span className="font-bold block">Saran Penyesuaian Pencarian:</span>
                      <span className="text-slate-600">Naikkan filter anggaran ke Rp 190 Juta atau pilih model MPV alternatif di segmen yang sama.</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          updateFilter('harga_max', '220000000');
                          setSimState('found');
                        }}
                        className="px-3.5 py-2 rounded-lg bg-[#0F2A5F] hover:bg-[#001540] text-white font-bold text-xs shadow-xs transition-all"
                      >
                        Lihat Xpander Rp 185-220 Jt
                      </button>
                      <button
                        onClick={() => {
                          setSearchParams(new URLSearchParams());
                          setSimState('found');
                        }}
                        className="px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-[#001540] font-bold text-xs hover:bg-slate-50 transition-all flex items-center gap-1"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Reset Filter</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Alternative Car Recommendations from the Same Segment */}
                {data?.rekomendasi_alternatif && data.rekomendasi_alternatif.length > 0 && (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-extrabold text-[#001540]">
                          Rekomendasi Alternatif Segmen Keluarga Muda (&lt; Rp 150 Jt)
                        </h3>
                        <p className="text-xs text-slate-500">Pilihan model mobil 7-seater sebanding dengan daya tampung serupa dan biaya perawatan ramah kantong</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {data.rekomendasi_alternatif.map((car, idx) => (
                        <PressableCard
                          key={car.id || idx}
                          onClick={() => navigate(`/mobil/${car.id}`)}
                          className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="relative aspect-[16/10] rounded-lg overflow-hidden mb-2 bg-slate-100">
                              <img
                                src={getCarPhoto(car.nama_mobil, car.transmisi)}
                                alt={car.nama_mobil}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                              <span className="absolute top-1.5 left-1.5 bg-[#E6F7F0] text-[#0CA678] font-bold text-[9px] px-2 py-0.5 rounded-full">
                                Rekomendasi AI
                              </span>
                            </div>
                            <h4 className="font-bold text-xs text-[#001540] truncate">{car.nama_mobil}</h4>
                            <div className="text-xs font-extrabold text-[#FE6A2B] mt-0.5">
                              Rp {car.harga_rp.toLocaleString('id-ID')}
                            </div>
                          </div>
                          <div className="mt-2 text-[10px] text-slate-400 flex justify-between border-t border-slate-100 pt-2">
                            <span>{car.tahun}</span>
                            <span>{car.jarak_tempuh_ribu_km} rb km</span>
                            <span>{car.transmisi}</span>
                          </div>
                        </PressableCard>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Pagination Controls */}
            {simState === 'found' && displayedItems.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white rounded-xl border border-[#DFE8FF] shadow-xs mt-2 text-xs">
                <span className="text-slate-500">
                  Menampilkan <span className="font-bold text-[#001540]">1 - 10</span> dari <span className="font-bold text-[#001540]">10</span> mobil ditemukan
                </span>
                <div className="flex items-center gap-1.5">
                  <button className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors" disabled>
                    <ChevronRight className="h-4 w-4 rotate-180" />
                  </button>
                  <button className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#001540] text-white font-bold shadow-xs">1</button>
                  <button className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors">2</button>
                  <button className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors">3</button>
                  <button className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
