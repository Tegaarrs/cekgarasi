import { useEffect, useState } from 'react';
import { TrendingDown, TrendingUp, Minus, Crosshair, Info } from 'lucide-react';
import { apiFetch } from '@/services/api';

interface AnalisisMobil {
  segmen: { nama_pendek?: string; nama_lengkap?: string; warna_hex?: string };
  km_tidak_wajar: boolean;
  posisi_harga: {
    harga_rp: number;
    median_segmen_rp: number;
    selisih_rp: number;
    selisih_persen: number;
    verdict: 'Murah' | 'Wajar' | 'Mahal';
    ambang_murah_persen: number;
    ambang_mahal_persen: number;
    jumlah_pembanding: number;
    penjelasan: string;
  };
  kedekatan_centroid: {
    jarak: number;
    jarak_rata_segmen: number | null;
    kecocokan_persen: number;
    penjelasan: string;
  };
}

const rpJuta = (v: number) => `Rp ${Math.round(v / 1_000_000).toLocaleString('id-ID')} Jt`;

const VERDICT_STYLE = {
  Murah: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', Icon: TrendingDown },
  Wajar: { cls: 'bg-blue-50 text-blue-700 border-blue-200', Icon: Minus },
  Mahal: { cls: 'bg-rose-50 text-rose-700 border-rose-200', Icon: TrendingUp },
} as const;

/** Fase 1: kartu "Posisi Harga dalam Segmen" & "Kedekatan dengan Centroid" (hasil K-Means). */
export function SegmenInsightCard({ carId }: { carId: number }) {
  const [data, setData] = useState<AnalisisMobil | null>(null);
  const [gagal, setGagal] = useState(false);

  useEffect(() => {
    let batal = false;
    setData(null);
    setGagal(false);
    apiFetch<AnalisisMobil>(`/bi/mobil/${carId}`)
      .then((d) => !batal && setData(d))
      .catch(() => !batal && setGagal(true));
    return () => {
      batal = true;
    };
  }, [carId]);

  if (gagal) return null;
  if (!data) {
    return <div className="h-40 rounded-2xl bg-slate-100 animate-pulse" aria-label="Memuat analisis segmen" />;
  }

  const { posisi_harga: ph, kedekatan_centroid: kc, segmen } = data;
  const v = VERDICT_STYLE[ph.verdict];
  const warna = segmen.warna_hex || '#2557D6';
  const tanda = ph.selisih_persen > 0 ? '+' : '';

  return (
    <section className="space-y-4" aria-labelledby="analisis-segmen-judul">
      <div>
        <h3 id="analisis-segmen-judul" className="font-display text-xl font-bold text-slate-900">
          Analisis Segmen K-Means
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Unit ini masuk ke segmen <strong style={{ color: warna }}>{segmen.nama_pendek}</strong>. Berikut posisinya
          terhadap unit lain di segmen yang sama.
        </p>
      </div>

      {data.km_tidak_wajar && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800 flex gap-2">
          <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>Odometer unit ini tidak wajar, sehingga kecocokan segmen mungkin tidak mencerminkan kondisi sebenarnya.</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Posisi harga */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Posisi Harga dalam Segmen</span>
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${v.cls}`}>
              <v.Icon className="h-3 w-3" />
              {ph.verdict}
            </span>
          </div>
          <div className="mt-3 font-display text-3xl font-extrabold text-slate-900">
            {tanda}
            {ph.selisih_persen.toLocaleString('id-ID')}%
          </div>
          <p className="text-xs text-slate-500">
            dari median segmen ({rpJuta(ph.median_segmen_rp)}); selisih {ph.selisih_rp > 0 ? '+' : '-'}
            {rpJuta(Math.abs(ph.selisih_rp))}
          </p>
          <div className="mt-4 grid grid-cols-3 text-[10px] font-semibold text-center">
            <span className="rounded-l-lg bg-emerald-100 text-emerald-800 py-1">Murah &lt; {ph.ambang_murah_persen}%</span>
            <span className="bg-blue-100 text-blue-800 py-1">Wajar</span>
            <span className="rounded-r-lg bg-rose-100 text-rose-800 py-1">Mahal &gt; +{ph.ambang_mahal_persen}%</span>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-slate-500">{ph.penjelasan}</p>
        </div>

        {/* Kedekatan centroid */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Kedekatan dengan Centroid</span>
            <Crosshair className="h-4 w-4" style={{ color: warna }} />
          </div>
          <div className="mt-3 font-display text-3xl font-extrabold text-slate-900">
            {kc.kecocokan_persen.toLocaleString('id-ID')}%
          </div>
          <p className="text-xs text-slate-500">tingkat kecocokan dengan segmen {segmen.nama_pendek}</p>
          <div className="mt-4 h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, Math.max(0, kc.kecocokan_persen))}%`, backgroundColor: warna }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] text-slate-400">
            <span>Jarak ke centroid: {kc.jarak.toLocaleString('id-ID')}</span>
            {kc.jarak_rata_segmen !== null && <span>Rata-rata segmen: {kc.jarak_rata_segmen.toLocaleString('id-ID')}</span>}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-slate-500">{kc.penjelasan}</p>
        </div>
      </div>
    </section>
  );
}
