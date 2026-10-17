import React from 'react';

interface RupiahInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export function formatNumberToRupiah(num: number): string {
  if (isNaN(num) || num === null || num === undefined) return '0';
  return num.toLocaleString('id-ID');
}

export function terbilangSingkat(num: number): string {
  if (!num || isNaN(num) || num <= 0) return 'Nol Rupiah';
  if (num >= 1000000000) {
    const m = (num / 1000000000).toFixed(1).replace('.0', '');
    return `${m} Miliar Rupiah`;
  }
  if (num >= 1000000) {
    const jt = (num / 1000000).toFixed(num % 1000000 === 0 ? 0 : 1);
    return `${jt} Juta Rupiah`;
  }
  if (num >= 1000) {
    const rb = (num / 1000).toFixed(0);
    return `${rb} Ribu Rupiah`;
  }
  return `${num} Rupiah`;
}

export const RupiahInput: React.FC<RupiahInputProps> = ({
  value,
  onChange,
  label = 'Harga Penawaran Listing',
  placeholder = 'Contoh: 235.000.000',
  className = '',
  required = false
}) => {
  const displayVal = formatNumberToRupiah(value);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const num = raw ? parseInt(raw, 10) : 0;
    onChange(num);
  };

  const handleStep = (amount: number) => {
    const next = Math.max(0, (value || 0) + amount);
    onChange(next);
  };

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="block font-bold text-[#001540] text-xs">{label}</label>
          <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
            {terbilangSingkat(value)}
          </span>
        </div>
      )}

      <div className="relative flex items-center">
        <span className="absolute left-3.5 text-xs font-extrabold text-blue-700 select-none">
          Rp
        </span>
        <input
          type="text"
          inputMode="numeric"
          required={required}
          value={displayVal}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="w-full pl-10 pr-24 py-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-xs text-blue-800 tracking-wide focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs transition-all"
        />

        <div className="absolute right-1.5 flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleStep(-5000000)}
            title="Kurang 5 Juta"
            className="px-1.5 py-1 text-[10px] font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 rounded transition-colors"
          >
            -5Jt
          </button>
          <button
            type="button"
            onClick={() => handleStep(5000000)}
            title="Tambah 5 Juta"
            className="px-1.5 py-1 text-[10px] font-bold text-blue-700 bg-blue-100/60 hover:bg-blue-100 rounded transition-colors"
          >
            +5Jt
          </button>
        </div>
      </div>
    </div>
  );
};
