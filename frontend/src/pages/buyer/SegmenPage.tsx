import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, 
  Tooltip, Cell 
} from 'recharts';
import { apiFetch } from '@/services/api';
import { content } from '@/content/id';
import { 
  Sparkles, ChevronDown, ArrowRight, Layers, 
  Gauge, Calendar, Calculator, Crown, Info
} from 'lucide-react';

interface SegmentDetail {
  klaster: number;
  slug: string;
  nama_lengkap: string;
  nama_pendek: string;
  warna_hex: string;
  deskripsi: string;
  count: number;
  share: number;
  median_harga: number;
  q1_harga: number;
  q3_harga: number;
  median_tahun: number;
  mean_km: number;
  mean_total_fitur: number;
  top_3_model: Array<{ model: string; count: number }>;
  terbesar?: boolean;
}

interface SegmenApiResponse {
  segmen: SegmentDetail[];
  total_mobil: number;
  silhouette_k3: number;
  fitur_list: string[];
}

interface SebaranCarPoint {
  id: number;
  nama_mobil: string;
  tahun: number;
  harga_rp: number;
  harga_juta: number;
  klaster: number;
  nama_segmen: string;
  warna_hex: string;
}

interface JitteredPoint extends SebaranCarPoint {
  x: number;
  y: number;
}

export function SegmenPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const aktifParam = searchParams.get('aktif') || 'premium';

  const [segmenData, setSegmenData] = useState<SegmenApiResponse | null>(null);
  const [sebaran, setSebaran] = useState<SebaranCarPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showMethodology, setShowMethodology] = useState<boolean>(false);

  // Fetch segment summary and scatter data
  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiFetch<any>('/segmen'),
      apiFetch<SebaranCarPoint[]>('/segmen/sebaran'),
    ])
      .then(([segRes, sebaranRes]) => {
        if (segRes) {
          if (Array.isArray(segRes.segmen)) {
            setSegmenData(segRes);
          } else if (Array.isArray(segRes)) {
            setSegmenData({
              segmen: segRes,
              total_mobil: 609,
              silhouette_k3: 0.3061,
              fitur_list: [],
            });
          }
        }
        if (Array.isArray(sebaranRes)) {
          setSebaran(sebaranRes);
        }
      })
      .catch((err) => {
        console.error('Failed to load segment data:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Compute active segment
  const activeSegment = useMemo(() => {
    if (!segmenData || !segmenData.segmen.length) return null;
    const match = segmenData.segmen.find((s) => s.slug === aktifParam);
    return match || segmenData.segmen[0];
  }, [segmenData, aktifParam]);

  const activeKlaster = activeSegment ? activeSegment.klaster : 0;

  // Tab switch handler syncing with URL
  const handleTabClick = (slug: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('aktif', slug);
    setSearchParams(newParams);
  };

  // Prepare jittered scatter points
  const chartPoints = useMemo<JitteredPoint[]>(() => {
    return sebaran.map((car) => {
      // Deterministic jitter +/- 0.25 based on car.id and tahun
      const pseudo = Math.sin(car.id * 12.9898 + car.tahun * 78.233) * 43758.5453;
      const frac = pseudo - Math.floor(pseudo);
      const jitter = (frac - 0.5) * 0.5; // [-0.25, 0.25]
      return {
        ...car,
        x: car.tahun + jitter,
        y: Math.round(car.harga_rp / 1_000_000),
      };
    });
  }, [sebaran]);

  const totalMobil = segmenData?.total_mobil || 609;

  return (
    <div className="min-h-screen bg-slate-50 py-4 sm:py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        
        {/* Header Title */}
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-2 border border-blue-200/60">
            <Layers className="w-3.5 h-3.5" />
            <span>Analisis Pasar CekGarasi</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Segmentasi Pasar Mobil Bekas
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-xl leading-relaxed">
            Mobil dikelompokkan secara otomatis ke dalam 3 segmen pasar utama berdasarkan kesamaan harga, tahun pembuatan, odometer, dan kelengkapan fitur agar perbandingan lebih adil.
          </p>
        </div>

        {/* 1. Mobile Scatter Plot Chart */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Sebaran Pasar ({totalMobil} Mobil)</span>
              </h2>
              <span className="text-[11px] text-slate-500 block">
                Sumbu X: Tahun Pembuatan (dengan jitter) • Sumbu Y: Harga Listing (Juta Rp)
              </span>
            </div>
            {activeSegment && (
              <span
                className="hidden sm:inline-block px-2.5 py-1 rounded-full text-xs font-bold text-white shadow-2xs"
                style={{ backgroundColor: activeSegment.warna_hex }}
              >
                Fokus: {activeSegment.nama_pendek}
              </span>
            )}
          </div>

          {/* Scatter Chart Container */}
          <div className="h-64 sm:h-80 w-full pt-2">
            {loading ? (
              <div className="h-full w-full flex items-center justify-center bg-slate-50 rounded-xl animate-pulse">
                <span className="text-xs text-slate-400 font-medium">Memuat data sebaran 609 mobil...</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="Tahun"
                    domain={[2010, 2025]}
                    tickCount={8}
                    tickFormatter={(v) => String(Math.round(v))}
                    stroke="#94A3B8"
                    fontSize={11}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="Harga"
                    domain={[50, 580]}
                    tickFormatter={(v) => `${v}jt`}
                    stroke="#94A3B8"
                    fontSize={11}
                    width={40}
                  />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ payload }) => {
                      if (!payload || !payload.length) return null;
                      const point = payload[0].payload as JitteredPoint;
                      return (
                        <div className="bg-slate-900/95 backdrop-blur-sm text-white p-2.5 rounded-xl text-xs shadow-lg space-y-1 border border-slate-700 max-w-[200px]">
                          <div className="font-bold truncate text-white">{point.nama_mobil}</div>
                          <div className="text-slate-300">Tahun: {point.tahun}</div>
                          <div className="text-amber-300 font-semibold">
                            Rp {point.harga_rp.toLocaleString('id-ID')}
                          </div>
                          <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                            Segmen: {point.nama_segmen}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Scatter name="Mobil" data={chartPoints} isAnimationActive={false}>
                    {chartPoints.map((entry) => {
                      const isHighlighted = entry.klaster === activeKlaster;
                      return (
                        <Cell
                          key={`cell-${entry.id}`}
                          fill={entry.warna_hex}
                          fillOpacity={isHighlighted ? 0.85 : 0.12}
                          stroke={isHighlighted ? entry.warna_hex : 'transparent'}
                          strokeWidth={isHighlighted ? 1 : 0}
                          r={isHighlighted ? 3.5 : 2}
                        />
                      );
                    })}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="flex items-center justify-center gap-4 pt-1 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2557D6]" />
              <span>Premium</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0CA678]" />
              <span>Keluarga Muda</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#AE3EC9]" />
              <span>Ekonomis</span>
            </span>
          </div>
        </div>

        {/* 2. Segment Tabs Synced with URL */}
        <div className="grid grid-cols-3 gap-2">
          {segmenData?.segmen.map((seg) => {
            const isSelected = activeSegment?.slug === seg.slug;
            return (
              <button
                key={seg.slug}
                onClick={() => handleTabClick(seg.slug)}
                className={`p-3 rounded-2xl border text-center transition-all relative ${
                  isSelected
                    ? 'border-transparent text-white font-bold shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
                style={{
                  backgroundColor: isSelected ? seg.warna_hex : undefined,
                }}
              >
                {seg.terbesar && (
                  <span
                    className={`absolute -top-2 right-2 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-0.5 shadow-2xs ${
                      isSelected ? 'bg-amber-400 text-slate-900' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    <Crown className="w-2.5 h-2.5 fill-current" />
                    <span>Terbesar</span>
                  </span>
                )}
                <span className="text-xs sm:text-sm block leading-tight">{seg.nama_pendek}</span>
                <span
                  className={`text-[10px] block mt-0.5 ${
                    isSelected ? 'text-white/80' : 'text-slate-400'
                  }`}
                >
                  {seg.count} unit ({Math.round(seg.share * 100)}%)
                </span>
              </button>
            );
          })}
        </div>

        {/* 3. Active Segment Detail Card */}
        {activeSegment && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-5">
            
            {/* Title & Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: activeSegment.warna_hex }}
                  />
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    {activeSegment.nama_lengkap}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {activeSegment.deskripsi}
                </p>
              </div>

              {activeSegment.terbesar && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold self-start">
                  <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>Segmen Terbesar: {(activeSegment.share * 100).toFixed(1)}% Pasar</span>
                </span>
              )}
            </div>

            {/* Price Distribution Bar: Q1, Median, Q3 */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                Distribusi Harga Pasar ({content.finance.priceNote})
              </span>
              
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/70">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white p-2 rounded-lg border border-slate-100">
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                      Q1 (25%)
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-slate-800">
                      Rp {Math.round(activeSegment.q1_harga / 1e6)} Jt
                    </span>
                  </div>

                  <div className="bg-blue-50/80 p-2 rounded-lg border border-blue-200 text-blue-900">
                    <span className="text-[10px] font-bold text-blue-600 block uppercase">
                      Median (50%)
                    </span>
                    <span className="text-xs sm:text-sm font-black text-blue-700">
                      Rp {Math.round(activeSegment.median_harga / 1e6)} Jt
                    </span>
                  </div>

                  <div className="bg-white p-2 rounded-lg border border-slate-100">
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                      Q3 (75%)
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-slate-800">
                      Rp {Math.round(activeSegment.q3_harga / 1e6)} Jt
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 block text-center mt-2">
                  50% unit di segmen ini berada di antara Rp {Math.round(activeSegment.q1_harga / 1e6)} Jt hingga Rp {Math.round(activeSegment.q3_harga / 1e6)} Jt
                </span>
              </div>
            </div>

            {/* Summary Metric Tiles (2x2 Grid) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                  <Calculator className="w-3.5 h-3.5" />
                  <span>Median Harga</span>
                </div>
                <div className="text-sm font-bold text-slate-900">
                  Rp {Math.round(activeSegment.median_harga / 1e6)} Juta
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Median Tahun</span>
                </div>
                <div className="text-sm font-bold text-slate-900">
                  {activeSegment.median_tahun}
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                  <Gauge className="w-3.5 h-3.5" />
                  <span>Rata-rata KM</span>
                </div>
                <div className="text-sm font-bold text-slate-900">
                  {typeof activeSegment.mean_km === 'number'
                    ? activeSegment.mean_km.toFixed(1)
                    : typeof (activeSegment as any).km_rata_rata_ribu === 'number'
                    ? (activeSegment as any).km_rata_rata_ribu.toFixed(1)
                    : '0'} rb km
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Kelengkapan Fitur</span>
                </div>
                <div className="text-sm font-bold text-slate-900">
                  {typeof activeSegment.mean_total_fitur === 'number'
                    ? activeSegment.mean_total_fitur.toFixed(1)
                    : typeof (activeSegment as any).fitur_rata_rata === 'number'
                    ? (activeSegment as any).fitur_rata_rata.toFixed(1)
                    : '0'} dari 11 fitur
                </div>
              </div>
            </div>

            {/* Top 3 Models */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2.5">
                Model Paling Banyak di Segmen Ini
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(activeSegment.top_3_model || (activeSegment as any).model_teratas || []).map((m: any, idx: number) => (
                  <div
                    key={m.model}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/60"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-semibold text-slate-800 truncate max-w-[140px]">
                        {m.model}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 font-medium">{m.count} unit</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA Link to Cari with this segment */}
            <button
              onClick={() => navigate(`/cari?segmen=${activeSegment.slug}`)}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white font-bold text-xs shadow-sm transition-all active:scale-95"
              style={{ backgroundColor: activeSegment.warna_hex }}
            >
              <span>Lihat {activeSegment.count} Mobil di {activeSegment.nama_pendek}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

          </div>
        )}

        {/* 4. Truthful Methodology Accordion */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
          <button
            onClick={() => setShowMethodology(!showMethodology)}
            className="w-full flex items-center justify-between text-left font-bold text-sm text-slate-900"
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600" />
              <span>{content.segments.methodologyTitle}</span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform ${
                showMethodology ? 'rotate-180' : ''
              }`}
            />
          </button>

          {showMethodology && (
            <div className="mt-3.5 pt-3.5 border-t border-slate-100 text-xs text-slate-600 space-y-3 leading-relaxed">
              <p>
                {content.segments.methodologyBody(totalMobil)}
              </p>
              
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 space-y-1.5">
                <span className="font-bold text-slate-800 block text-[11px]">
                  Variabel yang dianalisis:
                </span>
                <ul className="list-disc list-inside space-y-0.5 text-slate-600 text-[11px]">
                  <li>Harga listing (harga yang ditawarkan penjual)</li>
                  <li>Tahun pembuatan kendaraan</li>
                  <li>Jarak tempuh (sesuai data listing, belum diverifikasi fisik)</li>
                  <li>Jumlah fitur dari 11 fitur tercatat (kamera 360, sunroof, sensor, dll.)</li>
                </ul>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
