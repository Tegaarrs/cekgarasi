import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, ZAxis,
  BarChart, Bar,
} from 'recharts';
import { Car, Wallet, Gauge, CalendarClock, Filter, RotateCcw, Lightbulb, AlertTriangle, ExternalLink } from 'lucide-react';
import { apiFetch } from '@/services/api';
import { useTheme } from '@/context/ThemeContext';

interface Seg { klaster: number; nama_pendek: string; nama_lengkap: string; warna_hex: string }
interface Dashboard {
  kosong: boolean;
  kpi: {
    total_unit: number; rata_harga: number; rata_km: number; rata_umur: number;
    tahun_acuan_umur: number; unit_km_dikeluarkan: number;
    per_segmen: (Seg & { jumlah: number })[];
  };
  komposisi: { klaster: number; nama: string; warna: string; jumlah: number; persen: number }[];
  scatter: { id: number; nama_mobil: string; tahun: number; harga: number; km: number; klaster: number }[];
  top_merek: Record<string, { merek: string; jumlah: number }[]>;
  stok: (Seg & { jumlah: number; persen: number; rata_harga: number; median_harga: number })[];
  insight: string[];
  perhatian: {
    id: number; nama_mobil: string; tahun: number; harga_rp: number; median_segmen_rp: number;
    selisih_persen: number; klaster: number; nama_segmen: string; catatan: string;
  }[];
  total_perhatian: number;
  ambang_perhatian_persen: number;
  opsi_filter: { merek: string[]; harga_min: number; harga_max: number; tahun_min: number; tahun_max: number };
  segmen: Seg[];
}

interface Filter { segmen: string; merek: string; hargaMin: string; hargaMax: string; tahunMin: string; tahunMax: string }
const FILTER_AWAL: Filter = { segmen: '', merek: '', hargaMin: '', hargaMax: '', tahunMin: '', tahunMax: '' };

const rpJt = (v: number) => `Rp ${Math.round(v / 1_000_000).toLocaleString('id-ID')} Jt`;
const card =
  'bg-white dark:bg-[#1A1A24] text-slate-800 dark:text-[#E8E8F0] rounded-xl border border-slate-200/80 dark:border-[#2A2A38] shadow-xs dark:shadow-card-dark transition-colors duration-200';
const input =
  'mt-1.5 w-full rounded-lg border border-slate-200 dark:border-[#2A2A38] bg-white dark:bg-[#14141E] px-3 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:focus:ring-blue-400/35 [color-scheme:light] dark:[color-scheme:dark] transition-colors duration-200';

const DARK_SEGMENT_COLORS: Record<string, string> = {
  '#2557D6': '#60A5FA',
  '#2563EB': '#60A5FA',
  '#0CA678': '#34D399',
  '#10B981': '#34D399',
  '#AE3EC9': '#E879F9',
  '#FD7E14': '#FBBF24',
  '#F59E0B': '#FBBF24',
  '#FA5252': '#FB7185',
  '#7950F2': '#A78BFA',
};

const resolveSegmentColor = (hex: string | undefined, isDark: boolean) => {
  if (!hex) return isDark ? '#60A5FA' : '#2563EB';
  if (!isDark) return hex;
  return DARK_SEGMENT_COLORS[hex.toUpperCase()] ?? hex;
};

interface PieLabelProps {
  cx?: number;
  cy?: number;
  x?: number;
  y?: number;
  nama?: string;
  persen?: number;
}

export function AdminBIPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [data, setData] = useState<Dashboard | null>(null);
  const [filter, setFilter] = useState<Filter>(FILTER_AWAL);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      const p = new URLSearchParams();
      if (filter.segmen !== '') p.set('segmen', filter.segmen);
      if (filter.merek) p.set('merek', filter.merek);
      if (filter.hargaMin) p.set('harga_min', String(Number(filter.hargaMin) * 1_000_000));
      if (filter.hargaMax) p.set('harga_max', String(Number(filter.hargaMax) * 1_000_000));
      if (filter.tahunMin) p.set('tahun_min', filter.tahunMin);
      if (filter.tahunMax) p.set('tahun_max', filter.tahunMax);
      setLoading(true);
      apiFetch<Dashboard>(`/bi/dashboard?${p.toString()}`)
        .then((d) => { setData(d); setError(''); })
        .catch((e: Error) => setError(e.message))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [filter]);

  const warna = useMemo(() => {
    const m: Record<number, string> = {};
    data?.segmen.forEach((s) => { m[s.klaster] = resolveSegmentColor(s.warna_hex, isDark); });
    return m;
  }, [data, isDark]);

  const set = (k: keyof Filter) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFilter((f) => ({ ...f, [k]: e.target.value }));

  if (error && !data) {
    return <div className={`${card} p-6 text-base text-rose-700 dark:text-rose-400`}>Gagal memuat dashboard BI: {error}</div>;
  }
  if (!data) return <div className="h-64 rounded-xl bg-white/60 dark:bg-[#1A1A24]/70 animate-pulse transition-colors duration-200" />;

  const opsi = data.opsi_filter;
  const aktif = Object.values(filter).some(Boolean);

  const gridStroke = isDark ? '#2A2A38' : '#E2E8F0';
  const axisStroke = isDark ? '#475569' : '#CBD5E1';
  const axisTick = { fill: isDark ? '#CBD5E1' : '#334155', fontSize: 13, fontWeight: 500 };
  const legendStyle = {
    color: isDark ? '#E2E8F0' : '#1E293B',
    fontSize: '13px',
    fontWeight: 500,
    paddingTop: '8px',
    transition: 'color 200ms ease',
  };
  const tooltipStyle = {
    backgroundColor: isDark ? '#16161F' : '#FFFFFF',
    borderColor: isDark ? '#2A2A38' : '#CBD5E1',
    borderRadius: '0.75rem',
    color: isDark ? '#F1F5F9' : '#0F172A',
    fontSize: '13px',
    boxShadow: isDark ? '0 10px 25px rgba(0,0,0,0.5)' : '0 4px 16px rgba(15,23,42,0.08)',
  };
  const tooltipItemStyle = { color: isDark ? '#E2E8F0' : '#0F172A', fontSize: '13px', fontWeight: 600 };
  const tooltipLabelStyle = { color: isDark ? '#F8FAFC' : '#0F172A', fontSize: '13px', fontWeight: 700, marginBottom: '4px' };

  const renderPieLabel = ({ cx = 0, x = 0, y = 0, nama, persen }: PieLabelProps) => {
    if (!nama || persen === undefined) return null;
    return (
      <text
        x={x}
        y={y}
        fill={isDark ? '#F1F5F9' : '#0F172A'}
        textAnchor={x >= cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={13}
        fontWeight={600}
        style={{ transition: 'fill 200ms ease' }}
      >
        {`${nama} ${persen}%`}
      </text>
    );
  };

  return (
    <div className="space-y-6 transition-colors duration-200">
      <header>
        <div className="text-sm font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 transition-colors duration-200">
          Business Intelligence
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#001540] dark:text-white mt-0.5 transition-colors duration-200">
          Dashboard BI Segmentasi Stok
        </h1>
        <p className="text-sm sm:text-[15px] text-slate-600 dark:text-slate-300 mt-1.5 max-w-3xl leading-relaxed transition-colors duration-200">
          Seluruh angka dihitung dari data inventori dan hasil segmentasi K-Means (K=3). Ubah filter untuk
          memperbarui semua KPI, grafik, dan tabel.
        </p>
      </header>

      {/* Filter */}
      <section className={`${card} p-5`} aria-label="Filter dashboard">
        <div className="flex items-center justify-between mb-3.5">
          <span className="flex items-center gap-2 text-sm sm:text-base font-bold text-[#001540] dark:text-white transition-colors duration-200">
            <Filter className="h-4 w-4 text-blue-700 dark:text-blue-400" /> Filter Interaktif
          </span>
          {aktif && (
            <button
              type="button"
              onClick={() => setFilter(FILTER_AWAL)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer transition-colors duration-200"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3.5 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 transition-colors duration-200">
          <label>Segmen
            <select className={input} value={filter.segmen} onChange={set('segmen')}>
              <option value="">Semua</option>
              {data.segmen.map((s) => <option key={s.klaster} value={s.klaster}>{s.nama_pendek}</option>)}
            </select>
          </label>
          <label>Merek
            <select className={input} value={filter.merek} onChange={set('merek')}>
              <option value="">Semua</option>
              {opsi.merek.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
          <label>Harga min (Jt)
            <input className={input} type="number" min={0} placeholder={String(Math.round(opsi.harga_min / 1e6))} value={filter.hargaMin} onChange={set('hargaMin')} />
          </label>
          <label>Harga maks (Jt)
            <input className={input} type="number" min={0} placeholder={String(Math.round(opsi.harga_max / 1e6))} value={filter.hargaMax} onChange={set('hargaMax')} />
          </label>
          <label>Tahun min
            <input className={input} type="number" placeholder={String(opsi.tahun_min)} value={filter.tahunMin} onChange={set('tahunMin')} />
          </label>
          <label>Tahun maks
            <input className={input} type="number" placeholder={String(opsi.tahun_max)} value={filter.tahunMax} onChange={set('tahunMax')} />
          </label>
        </div>
      </section>

      <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
        {data.kosong ? (
          <div className={`${card} p-10 text-center text-base text-slate-600 dark:text-slate-300`}>
            Tidak ada unit yang cocok dengan filter ini.
          </div>
        ) : (
          <div className="space-y-6">
            {/* KPI */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-4" aria-label="KPI">
              {[
                { Icon: Car, label: 'Total Unit', val: data.kpi.total_unit.toLocaleString('id-ID') },
                { Icon: Wallet, label: 'Rata-rata Harga', val: rpJt(data.kpi.rata_harga) },
                { Icon: Gauge, label: 'Rata-rata KM', val: `${data.kpi.rata_km.toLocaleString('id-ID')} rb km` },
                { Icon: CalendarClock, label: 'Rata-rata Umur', val: `${data.kpi.rata_umur.toLocaleString('id-ID')} thn` },
              ].map(({ Icon, label, val }) => (
                <div key={label} className={`${card} p-5`}>
                  <div className="flex items-center gap-2 text-xs sm:text-[13px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 transition-colors duration-200">
                    <Icon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    {label}
                  </div>
                  <div className="mt-2 font-display text-2xl sm:text-[26px] font-extrabold text-[#001540] dark:text-white transition-colors duration-200">
                    {val}
                  </div>
                </div>
              ))}
              {data.kpi.per_segmen.map((s) => {
                const segColor = resolveSegmentColor(s.warna_hex, isDark);
                return (
                  <div key={s.klaster} className={`${card} p-5 border-l-4`} style={{ borderLeftColor: segColor }}>
                    <div className="text-xs sm:text-[13px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 transition-colors duration-200">
                      Unit {s.nama_pendek}
                    </div>
                    <div className="mt-2 font-display text-2xl sm:text-[26px] font-extrabold transition-colors duration-200" style={{ color: segColor }}>
                      {s.jumlah.toLocaleString('id-ID')}
                    </div>
                  </div>
                );
              })}
              <div className={`${card} p-5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed flex items-center col-span-2 lg:col-span-1`}>
                <span>
                  Umur dihitung dari tahun {data.kpi.tahun_acuan_umur}.
                  {data.kpi.unit_km_dikeluarkan > 0 && ` ${data.kpi.unit_km_dikeluarkan} unit dengan odometer tidak wajar tidak dihitung pada rata-rata KM.`}
                </span>
              </div>
            </section>

            {/* Donut + insight */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className={`${card} p-5 lg:col-span-2`}>
                <h2 className="text-base sm:text-lg font-bold text-[#001540] dark:text-white transition-colors duration-200">
                  Komposisi Unit per Segmen
                </h2>
                <div className="h-72 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.komposisi.filter((k) => k.jumlah > 0)}
                        dataKey="jumlah"
                        nameKey="nama"
                        innerRadius={62}
                        outerRadius={98}
                        paddingAngle={2}
                        label={renderPieLabel}
                        labelLine={{ stroke: axisStroke }}
                        isAnimationActive={false}
                      >
                        {data.komposisi
                          .filter((k) => k.jumlah > 0)
                          .map((k) => <Cell key={k.klaster} fill={resolveSegmentColor(k.warna, isDark)} />)}
                      </Pie>
                      <Tooltip
                        formatter={(v: number) => `${v} unit`}
                        contentStyle={tooltipStyle}
                        itemStyle={tooltipItemStyle}
                        labelStyle={tooltipLabelStyle}
                      />
                      <Legend wrapperStyle={legendStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className={`${card} p-5`}>
                <h2 className="flex items-center gap-2 text-base sm:text-lg font-bold text-[#001540] dark:text-white transition-colors duration-200">
                  <Lightbulb className="h-5 w-5 text-amber-500 dark:text-amber-400" /> Insight Otomatis
                </h2>
                <ul className="mt-3.5 space-y-3 text-sm text-slate-700 dark:text-slate-200 leading-relaxed transition-colors duration-200">
                  {data.insight.map((t) => (
                    <li
                      key={t}
                      className="rounded-lg bg-slate-50 dark:bg-[#14141E] border border-slate-100 dark:border-[#2A2A38] p-3 transition-colors duration-200"
                    >
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Scatter */}
            <section className={`${card} p-5`}>
              <h2 className="text-base sm:text-lg font-bold text-[#001540] dark:text-white transition-colors duration-200">
                Sebaran Harga vs Tahun (warna = segmen)
              </h2>
              <div className="h-[340px] mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 12, right: 24, bottom: 12, left: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                    <XAxis
                      type="number"
                      dataKey="tahun"
                      name="Tahun"
                      domain={['dataMin - 1', 'dataMax + 1']}
                      tickCount={8}
                      allowDecimals={false}
                      tick={axisTick}
                      stroke={axisStroke}
                      axisLine={{ stroke: axisStroke }}
                      tickLine={{ stroke: axisStroke }}
                    />
                    <YAxis
                      type="number"
                      dataKey="harga"
                      name="Harga"
                      tickFormatter={(v: number) => `${Math.round(v / 1e6)} Jt`}
                      width={82}
                      tick={axisTick}
                      stroke={axisStroke}
                      axisLine={{ stroke: axisStroke }}
                      tickLine={{ stroke: axisStroke }}
                    />
                    <ZAxis range={[36, 36]} />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3', stroke: axisStroke }}
                      content={({ payload }) => {
                        const p = payload?.[0]?.payload as Dashboard['scatter'][number] | undefined;
                        if (!p) return null;
                        return (
                          <div className="rounded-xl border border-slate-200 dark:border-[#2A2A38] bg-white dark:bg-[#16161F] p-3 text-sm text-slate-800 dark:text-slate-100 shadow-lg transition-colors duration-200">
                            <div className="font-bold text-[#001540] dark:text-white">{p.nama_mobil}</div>
                            <div className="mt-0.5 text-slate-600 dark:text-slate-300">{p.tahun} • {rpJt(p.harga)} • {p.km} rb km</div>
                          </div>
                        );
                      }}
                    />
                    <Legend wrapperStyle={legendStyle} />
                    {data.segmen.map((s) => (
                      <Scatter
                        key={s.klaster}
                        name={s.nama_pendek}
                        fill={resolveSegmentColor(s.warna_hex, isDark)}
                        fillOpacity={isDark ? 0.78 : 0.65}
                        isAnimationActive={false}
                        data={data.scatter.filter((p) => p.klaster === s.klaster)}
                      />
                    ))}
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Top merek */}
            <section>
              <h2 className="text-base sm:text-lg font-bold text-[#001540] dark:text-white mb-3 transition-colors duration-200">
                5 Merek Teratas per Segmen
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {data.segmen.map((s) => {
                  const rows = data.top_merek[String(s.klaster)] || [];
                  const segColor = resolveSegmentColor(s.warna_hex, isDark);
                  return (
                    <div key={s.klaster} className={`${card} p-5`}>
                      <div className="text-sm sm:text-base font-bold mb-2.5 transition-colors duration-200" style={{ color: segColor }}>
                        {s.nama_pendek}
                      </div>
                      {rows.length === 0 ? (
                        <div className="h-44 flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                          Tidak ada data
                        </div>
                      ) : (
                        <div className="h-52">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 20 }}>
                              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridStroke} />
                              <XAxis
                                type="number"
                                allowDecimals={false}
                                tick={axisTick}
                                stroke={axisStroke}
                                axisLine={{ stroke: axisStroke }}
                                tickLine={{ stroke: axisStroke }}
                              />
                              <YAxis
                                type="category"
                                dataKey="merek"
                                width={104}
                                tick={axisTick}
                                stroke={axisStroke}
                                axisLine={{ stroke: axisStroke }}
                                tickLine={{ stroke: axisStroke }}
                              />
                              <Tooltip
                                formatter={(v: number) => `${v} unit`}
                                contentStyle={tooltipStyle}
                                itemStyle={tooltipItemStyle}
                                labelStyle={tooltipLabelStyle}
                                cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.04)' }}
                              />
                              <Bar dataKey="jumlah" fill={warna[s.klaster]} radius={[0, 4, 4, 0]} isAnimationActive={false} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Tabel stok */}
            <section className={`${card} overflow-hidden`}>
              <div className="p-5 pb-3">
                <h2 className="text-base sm:text-lg font-bold text-[#001540] dark:text-white transition-colors duration-200">
                  Analisis Stok per Segmen
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left transition-colors duration-200">
                  <thead className="bg-slate-50 dark:bg-[#14141E] text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 transition-colors duration-200">
                    <tr>
                      <th className="px-5 py-3.5">Segmen</th>
                      <th className="px-4 py-3.5">Jumlah Unit</th>
                      <th className="px-4 py-3.5">Persentase</th>
                      <th className="px-4 py-3.5">Rata-rata Harga</th>
                      <th className="px-4 py-3.5">Median Harga</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#2A2A38] text-slate-700 dark:text-slate-200 transition-colors duration-200">
                    {data.stok.map((s) => (
                      <tr key={s.klaster} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors">
                        <td className="px-5 py-3.5 font-bold" style={{ color: resolveSegmentColor(s.warna_hex, isDark) }}>
                          {s.nama_pendek}
                        </td>
                        <td className="px-4 py-3.5 font-medium">{s.jumlah.toLocaleString('id-ID')}</td>
                        <td className="px-4 py-3.5">{s.persen}%</td>
                        <td className="px-4 py-3.5">{s.jumlah ? rpJt(s.rata_harga) : '-'}</td>
                        <td className="px-4 py-3.5">{s.jumlah ? rpJt(s.median_harga) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Perlu perhatian */}
            <section className={`${card} overflow-hidden`}>
              <div className="p-5 pb-3">
                <h2 className="flex items-center gap-2 text-base sm:text-lg font-bold text-[#001540] dark:text-white transition-colors duration-200">
                  <AlertTriangle className="h-5 w-5 text-amber-500 dark:text-amber-400" /> Unit Perlu Perhatian
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1.5 transition-colors duration-200">
                  Harga menyimpang ≥ {data.ambang_perhatian_persen}% dari median segmennya (atau odometer tidak wajar).
                  Menampilkan {data.perhatian.length} dari {data.total_perhatian} unit.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left transition-colors duration-200">
                  <thead className="bg-slate-50 dark:bg-[#14141E] text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 transition-colors duration-200">
                    <tr>
                      <th className="px-5 py-3.5">Unit</th>
                      <th className="px-4 py-3.5">Segmen</th>
                      <th className="px-4 py-3.5">Harga</th>
                      <th className="px-4 py-3.5">Median Segmen</th>
                      <th className="px-4 py-3.5">Selisih</th>
                      <th className="px-4 py-3.5">Catatan</th>
                      <th className="px-4 py-3.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#2A2A38] text-slate-700 dark:text-slate-200 transition-colors duration-200">
                    {data.perhatian.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-5 py-7 text-center text-base text-slate-500 dark:text-slate-400">
                          Tidak ada unit yang perlu perhatian pada filter ini.
                        </td>
                      </tr>
                    )}
                    {data.perhatian.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors">
                        <td className="px-5 py-3.5 font-semibold text-[#001540] dark:text-white transition-colors duration-200">
                          {u.nama_mobil} <span className="text-slate-500 dark:text-slate-400 font-normal">({u.tahun})</span>
                        </td>
                        <td className="px-4 py-3.5 font-semibold" style={{ color: warna[u.klaster] }}>{u.nama_segmen}</td>
                        <td className="px-4 py-3.5">{rpJt(u.harga_rp)}</td>
                        <td className="px-4 py-3.5">{rpJt(u.median_segmen_rp)}</td>
                        <td className={`px-4 py-3.5 font-bold ${u.selisih_persen > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                          {u.selisih_persen > 0 ? '+' : ''}{u.selisih_persen}%
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 transition-colors duration-200">{u.catatan}</td>
                        <td className="px-4 py-3.5">
                          <Link
                            to={`/mobil/${u.id}`}
                            target="_blank"
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200"
                            aria-label={`Lihat ${u.nama_mobil}`}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
