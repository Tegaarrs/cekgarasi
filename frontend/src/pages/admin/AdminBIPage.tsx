import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, ZAxis,
  BarChart, Bar,
} from 'recharts';
import { Car, Wallet, Gauge, CalendarClock, Filter, RotateCcw, Lightbulb, AlertTriangle, ExternalLink } from 'lucide-react';
import { apiFetch } from '@/services/api';

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
const card = 'bg-white rounded-xl border border-slate-200/80 shadow-xs';
const input = 'w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30';

export function AdminBIPage() {
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
    data?.segmen.forEach((s) => { m[s.klaster] = s.warna_hex; });
    return m;
  }, [data]);

  const set = (k: keyof Filter) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFilter((f) => ({ ...f, [k]: e.target.value }));

  if (error && !data) {
    return <div className={`${card} p-6 text-sm text-rose-600`}>Gagal memuat dashboard BI: {error}</div>;
  }
  if (!data) return <div className="h-64 rounded-xl bg-white/60 animate-pulse" />;

  const opsi = data.opsi_filter;
  const aktif = Object.values(filter).some(Boolean);

  return (
    <div className="space-y-6">
      <header>
        <div className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Business Intelligence</div>
        <h1 className="font-display text-2xl font-extrabold text-[#001540]">Dashboard BI Segmentasi Stok</h1>
        <p className="text-xs text-slate-500 mt-1 max-w-2xl">
          Seluruh angka dihitung dari data inventori dan hasil segmentasi K-Means (K=3). Ubah filter untuk
          memperbarui semua KPI, grafik, dan tabel.
        </p>
      </header>

      {/* Filter */}
      <section className={`${card} p-4`} aria-label="Filter dashboard">
        <div className="flex items-center justify-between mb-3">
          <span className="flex items-center gap-1.5 text-xs font-bold text-[#001540]"><Filter className="h-3.5 w-3.5" /> Filter Interaktif</span>
          {aktif && (
            <button type="button" onClick={() => setFilter(FILTER_AWAL)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:underline cursor-pointer">
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-[11px] font-semibold text-slate-500">
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
          <div className={`${card} p-10 text-center text-sm text-slate-500`}>Tidak ada unit yang cocok dengan filter ini.</div>
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
                <div key={label} className={`${card} p-4`}>
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400"><Icon className="h-3.5 w-3.5" />{label}</div>
                  <div className="mt-1.5 font-display text-xl font-extrabold text-[#001540]">{val}</div>
                </div>
              ))}
              {data.kpi.per_segmen.map((s) => (
                <div key={s.klaster} className={`${card} p-4 border-l-4`} style={{ borderLeftColor: s.warna_hex }}>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Unit {s.nama_pendek}</div>
                  <div className="mt-1.5 font-display text-xl font-extrabold" style={{ color: s.warna_hex }}>{s.jumlah.toLocaleString('id-ID')}</div>
                </div>
              ))}
              <div className={`${card} p-4 text-[11px] text-slate-500 col-span-2 lg:col-span-1`}>
                Umur dihitung dari tahun {data.kpi.tahun_acuan_umur}.
                {data.kpi.unit_km_dikeluarkan > 0 && ` ${data.kpi.unit_km_dikeluarkan} unit dengan odometer tidak wajar tidak dihitung pada rata-rata KM.`}
              </div>
            </section>

            {/* Donut + insight */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className={`${card} p-5 lg:col-span-2`}>
                <h2 className="text-sm font-bold text-[#001540]">Komposisi Unit per Segmen</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.komposisi.filter((k) => k.jumlah > 0)} dataKey="jumlah" nameKey="nama" innerRadius={60} outerRadius={95} paddingAngle={2}
                        label={(p: { nama: string; persen: number }) => `${p.nama} ${p.persen}%`} isAnimationActive={false}>
                        {data.komposisi.map((k) => <Cell key={k.klaster} fill={k.warna} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => `${v} unit`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className={`${card} p-5`}>
                <h2 className="flex items-center gap-1.5 text-sm font-bold text-[#001540]"><Lightbulb className="h-4 w-4 text-amber-500" /> Insight Otomatis</h2>
                <ul className="mt-3 space-y-2.5 text-xs text-slate-600 leading-relaxed">
                  {data.insight.map((t) => <li key={t} className="rounded-lg bg-slate-50 p-2.5">{t}</li>)}
                </ul>
              </div>
            </section>

            {/* Scatter */}
            <section className={`${card} p-5`}>
              <h2 className="text-sm font-bold text-[#001540]">Sebaran Harga vs Tahun (warna = segmen)</h2>
              <div className="h-80 mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" dataKey="tahun" name="Tahun" domain={['dataMin - 1', 'dataMax + 1']} tickCount={8} allowDecimals={false} />
                    <YAxis type="number" dataKey="harga" name="Harga" tickFormatter={(v: number) => `${Math.round(v / 1e6)} Jt`} width={70} />
                    <ZAxis range={[28, 28]} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }}
                      content={({ payload }) => {
                        const p = payload?.[0]?.payload as Dashboard['scatter'][number] | undefined;
                        if (!p) return null;
                        return (
                          <div className="rounded-lg border bg-white p-2 text-[11px] shadow">
                            <div className="font-bold">{p.nama_mobil}</div>
                            <div>{p.tahun} • {rpJt(p.harga)} • {p.km} rb km</div>
                          </div>
                        );
                      }} />
                    <Legend />
                    {data.segmen.map((s) => (
                      <Scatter key={s.klaster} name={s.nama_pendek} fill={s.warna_hex} fillOpacity={0.6} isAnimationActive={false}
                        data={data.scatter.filter((p) => p.klaster === s.klaster)} />
                    ))}
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Top merek */}
            <section>
              <h2 className="text-sm font-bold text-[#001540] mb-3">5 Merek Teratas per Segmen</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {data.segmen.map((s) => {
                  const rows = data.top_merek[String(s.klaster)] || [];
                  return (
                    <div key={s.klaster} className={`${card} p-4`}>
                      <div className="text-xs font-bold mb-2" style={{ color: s.warna_hex }}>{s.nama_pendek}</div>
                      {rows.length === 0 ? (
                        <div className="h-40 flex items-center justify-center text-[11px] text-slate-400">Tidak ada data</div>
                      ) : (
                        <div className="h-44">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={rows} layout="vertical" margin={{ left: 10, right: 20 }}>
                              <XAxis type="number" allowDecimals={false} />
                              <YAxis type="category" dataKey="merek" width={80} tick={{ fontSize: 11 }} />
                              <Tooltip formatter={(v: number) => `${v} unit`} />
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
              <div className="p-5 pb-3"><h2 className="text-sm font-bold text-[#001540]">Analisis Stok per Segmen</h2></div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
                    <tr><th className="px-5 py-3">Segmen</th><th className="px-4 py-3">Jumlah Unit</th><th className="px-4 py-3">Persentase</th><th className="px-4 py-3">Rata-rata Harga</th><th className="px-4 py-3">Median Harga</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.stok.map((s) => (
                      <tr key={s.klaster}>
                        <td className="px-5 py-3 font-bold" style={{ color: s.warna_hex }}>{s.nama_pendek}</td>
                        <td className="px-4 py-3">{s.jumlah.toLocaleString('id-ID')}</td>
                        <td className="px-4 py-3">{s.persen}%</td>
                        <td className="px-4 py-3">{s.jumlah ? rpJt(s.rata_harga) : '-'}</td>
                        <td className="px-4 py-3">{s.jumlah ? rpJt(s.median_harga) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Perlu perhatian */}
            <section className={`${card} overflow-hidden`}>
              <div className="p-5 pb-3">
                <h2 className="flex items-center gap-1.5 text-sm font-bold text-[#001540]"><AlertTriangle className="h-4 w-4 text-amber-500" /> Unit Perlu Perhatian</h2>
                <p className="text-[11px] text-slate-500 mt-1">
                  Harga menyimpang ≥ {data.ambang_perhatian_persen}% dari median segmennya (atau odometer tidak wajar).
                  Menampilkan {data.perhatian.length} dari {data.total_perhatian} unit.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
                    <tr><th className="px-5 py-3">Unit</th><th className="px-4 py-3">Segmen</th><th className="px-4 py-3">Harga</th><th className="px-4 py-3">Median Segmen</th><th className="px-4 py-3">Selisih</th><th className="px-4 py-3">Catatan</th><th className="px-4 py-3" /></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.perhatian.length === 0 && <tr><td colSpan={7} className="px-5 py-6 text-center text-slate-400">Tidak ada unit yang perlu perhatian pada filter ini.</td></tr>}
                    {data.perhatian.map((u) => (
                      <tr key={u.id}>
                        <td className="px-5 py-3 font-semibold text-[#001540]">{u.nama_mobil} <span className="text-slate-400 font-normal">({u.tahun})</span></td>
                        <td className="px-4 py-3" style={{ color: warna[u.klaster] }}>{u.nama_segmen}</td>
                        <td className="px-4 py-3">{rpJt(u.harga_rp)}</td>
                        <td className="px-4 py-3">{rpJt(u.median_segmen_rp)}</td>
                        <td className={`px-4 py-3 font-bold ${u.selisih_persen > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{u.selisih_persen > 0 ? '+' : ''}{u.selisih_persen}%</td>
                        <td className="px-4 py-3 text-slate-600">{u.catatan}</td>
                        <td className="px-4 py-3"><Link to={`/mobil/${u.id}`} target="_blank" className="text-blue-600 hover:text-blue-800" aria-label={`Lihat ${u.nama_mobil}`}><ExternalLink className="h-3.5 w-3.5" /></Link></td>
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
