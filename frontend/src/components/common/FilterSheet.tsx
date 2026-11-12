import { useState, useEffect } from 'react';
import { BottomSheet } from './BottomSheet';
import { apiFetch } from '@/services/api';
import { content } from '@/content/id';
import { RotateCcw, Check, Sparkles } from 'lucide-react';

export interface FilterState {
  q?: string;
  merk?: string;
  segmen?: string;
  lokasi?: string;
  harga_min?: number | string;
  harga_max?: number | string;
  tahun_min?: number | string;
  tahun_max?: number | string;
  transmisi?: string;
  model?: string;
}

interface FilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onApply: (applied: FilterState) => void;
  onReset: () => void;
}

export function FilterSheet({
  isOpen,
  onClose,
  filters,
  onApply,
  onReset,
}: FilterSheetProps) {
  // Local draft state
  const [draft, setDraft] = useState<FilterState>(filters);
  const [liveCount, setLiveCount] = useState<number | null>(null);
  const [isCounting, setIsCounting] = useState<boolean>(false);

  // Sync draft with incoming filters when opened
  useEffect(() => {
    if (isOpen) {
      setDraft(filters);
    }
  }, [isOpen, filters]);

  // Debounced live count fetch
  useEffect(() => {
    if (!isOpen) return;

    setIsCounting(true);
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (draft.q) params.set('q', draft.q);
      if (draft.merk) params.set('merk', draft.merk);
      if (draft.segmen) params.set('segmen', draft.segmen);
      if (draft.lokasi && draft.lokasi !== 'Semua') params.set('lokasi', draft.lokasi);
      if (draft.harga_min) params.set('harga_min', String(draft.harga_min));
      if (draft.harga_max) params.set('harga_max', String(draft.harga_max));
      if (draft.tahun_min) params.set('tahun_min', String(draft.tahun_min));
      if (draft.tahun_max) params.set('tahun_max', String(draft.tahun_max));
      if (draft.transmisi && draft.transmisi !== 'Semua') params.set('transmisi', draft.transmisi);
      if (draft.model) params.set('model', draft.model);

      apiFetch<{ total: number }>(`/cari/hitung?${params.toString()}`)
        .then((res) => {
          setLiveCount(res.total);
        })
        .catch(() => {
          setLiveCount(null);
        })
        .finally(() => {
          setIsCounting(false);
        });
    }, 300);

    return () => clearTimeout(timer);
  }, [isOpen, draft]);

  const handleSegmentToggle = (slug: string) => {
    setDraft((prev) => ({
      ...prev,
      segmen: prev.segmen === slug ? '' : slug,
    }));
  };

  const handlePricePreset = (min?: number, max?: number) => {
    setDraft((prev) => ({
      ...prev,
      harga_min: min ?? '',
      harga_max: max ?? '',
    }));
  };

  const handleTransmissionSelect = (val: string) => {
    setDraft((prev) => ({
      ...prev,
      transmisi: val === 'Semua' ? '' : val,
    }));
  };

  const handleReset = () => {
    const emptyState: FilterState = {
      q: '',
      segmen: '',
      lokasi: '',
      harga_min: '',
      harga_max: '',
      tahun_min: '',
      tahun_max: '',
      transmisi: '',
      model: '',
    };
    setDraft(emptyState);
    onReset();
  };

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  const segmentOptions = [
    { slug: 'premium', label: content.segments.names[0], color: content.segments.colors[0] },
    { slug: 'keluarga-muda', label: content.segments.names[1], color: content.segments.colors[1] },
    { slug: 'ekonomis', label: content.segments.names[2], color: content.segments.colors[2] },
  ];

  const pricePresets = [
    { label: '< 150 Jt', max: 150000000 },
    { label: '150 - 250 Jt', min: 150000000, max: 250000000 },
    { label: '> 250 Jt', min: 250000000 },
  ];

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Filter Pencarian Mobil">
      <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1 pb-4">
        
        {/* 1. Segmen K-Means */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Segmen Pasar Mobil</span>
            </label>
            {draft.segmen && (
              <button
                onClick={() => setDraft((prev) => ({ ...prev, segmen: '' }))}
                className="text-xs text-blue-600 font-medium hover:underline"
              >
                Hapus
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {segmentOptions.map((seg) => {
              const isSelected = draft.segmen === seg.slug;
              return (
                <button
                  key={seg.slug}
                  onClick={() => handleSegmentToggle(seg.slug)}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    isSelected
                      ? 'border-transparent text-white font-bold shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                  style={{
                    backgroundColor: isSelected ? seg.color : undefined,
                  }}
                >
                  <span className="text-xs block leading-tight">{seg.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Merek Mobil */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Merek Mobil
            </label>
            {draft.merk && (
              <button
                onClick={() => setDraft((prev) => ({ ...prev, merk: '' }))}
                className="text-xs text-blue-600 font-medium hover:underline"
              >
                Hapus
              </button>
            )}
          </div>
          <select
            value={draft.merk || ''}
            onChange={(e) => setDraft((prev) => ({ ...prev, merk: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none"
          >
            <option value="">Semua Merek</option>
            {['Toyota', 'Honda', 'Daihatsu', 'Mitsubishi', 'Suzuki', 'Nissan', 'Mazda', 'Wuling', 'Hyundai', 'BMW', 'Chevrolet', 'Ford', 'Datsun'].map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        {/* 2. Rentang Harga */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2.5">
            Rentang Harga ({content.finance.priceNote})
          </label>
          <div className="flex gap-2 mb-3">
            {pricePresets.map((preset) => {
              const isSelected =
                (preset.min === undefined || Number(draft.harga_min) === preset.min) &&
                (preset.max === undefined || Number(draft.harga_max) === preset.max);

              return (
                <button
                  key={preset.label}
                  onClick={() => handlePricePreset(preset.min, preset.max)}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors ${
                    isSelected
                      ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[11px] text-slate-500 block mb-1">Harga Minimum</span>
              <input
                type="number"
                placeholder="Rp Min (contoh: 100000000)"
                value={draft.harga_min || ''}
                onChange={(e) => setDraft((prev) => ({ ...prev, harga_min: e.target.value }))}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block mb-1">Harga Maksimum</span>
              <input
                type="number"
                placeholder="Rp Maks (contoh: 250000000)"
                value={draft.harga_max || ''}
                onChange={(e) => setDraft((prev) => ({ ...prev, harga_max: e.target.value }))}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 3. Tahun Pembuatan */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2.5">
            Tahun Pembuatan
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[11px] text-slate-500 block mb-1">Dari Tahun</span>
              <select
                value={draft.tahun_min || ''}
                onChange={(e) => setDraft((prev) => ({ ...prev, tahun_min: e.target.value }))}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white focus:border-blue-500 focus:outline-none"
              >
                <option value="">Semua Tahun</option>
                {[2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011].map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block mb-1">Sampai Tahun</span>
              <select
                value={draft.tahun_max || ''}
                onChange={(e) => setDraft((prev) => ({ ...prev, tahun_max: e.target.value }))}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white focus:border-blue-500 focus:outline-none"
              >
                <option value="">Semua Tahun</option>
                {[2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011].map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 4. Transmisi */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2.5">
            Transmisi
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { val: 'Semua', label: 'Semua' },
              { val: 'Automatic', label: 'Automatic' },
              { val: 'Manual', label: 'Manual' },
            ].map((item) => {
              const isSelected = (!draft.transmisi && item.val === 'Semua') || draft.transmisi === item.val;
              return (
                <button
                  key={item.val}
                  onClick={() => handleTransmissionSelect(item.val)}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#2563EB] border-[#2563EB] text-white font-bold shadow-xs'
                      : 'border-[#E4E4EE] dark:border-[#2A2A38] bg-[#F6F6FB] dark:bg-[#16161F] text-zinc-700 dark:text-zinc-200 hover:bg-[#EEEDFB] dark:hover:bg-[#22222E]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. Model Populer */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2.5">
            Model Populer
          </label>
          <div className="flex flex-wrap gap-1.5">
            {['Avanza', 'Brio', 'Xpander', 'Innova', 'HR-V', 'Calya', 'Sigra', 'Rush', 'Fortuner', 'Pajero'].map((m) => {
              const isSelected = draft.model?.toLowerCase() === m.toLowerCase();
              return (
                <button
                  key={m}
                  onClick={() => setDraft((prev) => ({ ...prev, model: isSelected ? '' : m }))}
                  className={`py-1.5 px-3 rounded-full text-xs transition-colors border ${
                    isSelected
                      ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* Sheet Action Footer: Reset + Apply with Live Count */}
      <div className="pt-4 border-t border-slate-200/60 flex items-center gap-3">
        <button
          onClick={handleReset}
          className="ios-glass-btn-secondary flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl text-slate-700 text-xs font-semibold"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Atur Ulang</span>
        </button>

        <button
          onClick={handleApply}
          disabled={isCounting}
          className="ios-glass-btn-primary liquid-shine flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white text-xs font-bold shadow-md active:scale-95 transition-all disabled:opacity-75"
        >
          <Check className="w-4 h-4" />
          <span>
            {isCounting
              ? 'Menghitung...'
              : liveCount !== null
              ? liveCount === 0
                ? 'Tidak Ada Mobil (Lihat Saran)'
                : `Tampilkan ${liveCount} Mobil`
              : 'Terapkan Filter'}
          </span>
        </button>
      </div>
    </BottomSheet>
  );
}
