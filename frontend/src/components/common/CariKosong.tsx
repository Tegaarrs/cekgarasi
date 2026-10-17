import { RotateCcw, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { content } from '@/content/id';

export interface DiagnosisData {
  model_total?: number;
  model_tahun_ok?: number;
  model_harga_ok?: number;
  harga_termurah_model?: number;
  saran?: Array<{
    label: string;
    param: string;
    value: string | number;
  }>;
}

interface CariKosongProps {
  keyword?: string;
  diagnosis?: DiagnosisData;
  onApplySaran: (param: string, value: string | number) => void;
  onReset: () => void;
}

export function CariKosong({
  keyword,
  diagnosis,
  onApplySaran,
  onReset,
}: CariKosongProps) {
  const hasDiagnosis = diagnosis && (diagnosis.model_total || diagnosis.harga_termurah_model || (diagnosis.saran && diagnosis.saran.length > 0));

  return (
    <div className="py-10 px-4 text-center max-w-lg mx-auto">
      <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 mx-auto mb-4 shadow-xs">
        <AlertCircle className="w-8 h-8" />
      </div>

      <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">
        {content.search.emptyTitle}
      </h2>

      <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed">
        {keyword
          ? `Kami mencari dengan kata kunci "${keyword}", tetapi belum ada unit yang cocok dengan kombinasi filter saat ini.`
          : 'Coba longgarkan rentang harga atau pilih tahun yang lebih fleksibel.'}
      </p>

      {/* Honest diagnosis breakdown if available */}
      {hasDiagnosis && (
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-left mb-6 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Diagnosis Ketersediaan Data</span>
          </div>

          <div className="text-xs text-slate-600 space-y-1">
            {diagnosis.model_total !== undefined && diagnosis.model_total > 0 && (
              <p>
                • Total model ini di katalog CekGarasi:{' '}
                <strong className="text-slate-800">{diagnosis.model_total} unit</strong>.
              </p>
            )}
            {diagnosis.harga_termurah_model !== undefined && (
              <p>
                • Harga termurah yang tersedia:{' '}
                <strong className="text-blue-700">
                  Rp {(diagnosis.harga_termurah_model / 1000000).toLocaleString('id-ID')} Juta
                </strong>.
              </p>
            )}
            {diagnosis.model_tahun_ok !== undefined && (
              <p>
                • Unit yang sesuai dengan filter tahun:{' '}
                <strong className="text-slate-800">{diagnosis.model_tahun_ok} unit</strong>.
              </p>
            )}
          </div>

          {/* Ranked Relaxation Chips */}
          {diagnosis.saran && diagnosis.saran.length > 0 && (
            <div className="pt-2 border-t border-slate-200/60">
              <span className="text-[11px] font-semibold text-slate-500 block mb-2">
                Saran penyesuaian filter:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {diagnosis.saran.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => onApplySaran(s.param, s.value)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 text-xs font-semibold shadow-2xs active:scale-95 transition-all"
                  >
                    <span>{s.label}</span>
                    <ArrowRight className="w-3 h-3 text-blue-500" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reset CTA */}
      <button
        onClick={onReset}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition-all active:scale-95"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span>{content.search.emptyResetCta}</span>
      </button>
    </div>
  );
}
