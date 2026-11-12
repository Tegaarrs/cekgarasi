import { useState, useMemo } from 'react';
import {
  Zap,
  Settings,
  Maximize2,
  ShieldCheck,
  FileText,
  Search,
  CheckCircle2,
  Fuel,
  Users,
  Car,
  Sparkles,
  Copy,
  Check,
  X,
  CheckCheck
} from 'lucide-react';
import { generateCarSpecifications, RawCarData } from '@/utils/carSpecs';

interface CarSpecsSectionProps {
  car: RawCarData;
}

export function CarSpecsSection({ car }: CarSpecsSectionProps) {
  const specProfile = useMemo(() => generateCarSpecifications(car), [car]);
  const [selectedCategory, setSelectedCategory] = useState<string>('semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Icon mapping for categories
  const getCategoryIcon = (id: string, className = 'w-4 h-4') => {
    switch (id) {
      case 'mesin':
        return <Zap className={className} />;
      case 'transmisi_sasis':
        return <Settings className={className} />;
      case 'dimensi_kabin':
        return <Maximize2 className={className} />;
      case 'efisiensi_bbm':
        return <Fuel className={className} />;
      case 'eksterior_keamanan':
      case 'keselamatan':
        return <ShieldCheck className={className} />;
      case 'legalitas_dokumen':
        return <FileText className={className} />;
      default:
        return <Car className={className} />;
    }
  };

  // Filter items based on active category and search query
  const filteredCategories = useMemo(() => {
    let cats = specProfile.kategori;
    if (selectedCategory !== 'semua') {
      cats = cats.filter((c) => c.id === selectedCategory);
    }

    if (!searchQuery.trim()) {
      return cats;
    }

    const q = searchQuery.toLowerCase().trim();
    return cats
      .map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (item) =>
            item.label.toLowerCase().includes(q) ||
            item.value.toLowerCase().includes(q) ||
            (item.keterangan && item.keterangan.toLowerCase().includes(q))
        ),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [specProfile, selectedCategory, searchQuery]);

  const totalSpecCount = useMemo(() => {
    return specProfile.kategori.reduce((acc, cat) => acc + cat.items.length, 0);
  }, [specProfile]);

  const handleCopySummary = () => {
    const text = [
      `Spesifikasi ${car.nama_mobil} (${car.tahun}):`,
      `- Mesin: ${specProfile.ringkasan.kapasitas_mesin} (${specProfile.ringkasan.tipe_mesin})`,
      `- Tenaga / Torsi: ${specProfile.ringkasan.tenaga_maks} / ${specProfile.ringkasan.torsi_maks}`,
      `- Transmisi & Penggerak: ${specProfile.ringkasan.transmisi_detail} • ${specProfile.ringkasan.penggerak}`,
      `- Kapasitas: ${specProfile.ringkasan.kapasitas_penumpang} (${specProfile.ringkasan.tipe_bodi})`,
      `- Konsumsi BBM: ${specProfile.ringkasan.konsumsi_bbm}`,
      `- Ground Clearance: ${specProfile.ringkasan.ground_clearance}`,
      `- Harga: Rp ${(car.harga_rp ?? 0).toLocaleString('id-ID')}`,
      `Diverifikasi oleh CekGarasi`,
    ].join('\n');

    try {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Quick Highlight Cards Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 p-5 sm:p-6 text-white shadow-md">
        <div className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-3 py-1 text-[11px] font-semibold text-blue-300 backdrop-blur-md mb-2 border border-blue-400/20">
              <Sparkles className="w-3.5 h-3.5 text-blue-300" />
              <span>Ringkasan Dapur Pacu & Karakteristik Kendaraan</span>
            </div>
            <h3 className="font-display text-lg sm:text-xl font-bold tracking-tight text-white">
              {car.nama_mobil}
            </h3>
            <p className="text-xs text-blue-200/80 mt-1 max-w-xl">
              Spesifikasi teknis resmi standar pabrikan untuk varian {car.transmisi} tahun rakitan {car.tahun}.
            </p>
          </div>

          <button
            type="button"
            onClick={handleCopySummary}
            className="self-start md:self-auto inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-md border border-white/15 transition-all cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300">Spesifikasi Disalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-blue-300" />
                <span>Salin Ringkasan</span>
              </>
            )}
          </button>
        </div>

        {/* 4 Pillars of Highlights */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-white/10">
          <div className="rounded-xl bg-white/5 p-3 backdrop-blur-sm border border-white/5">
            <div className="flex items-center gap-2 text-blue-300 text-[11px] font-medium">
              <Zap className="w-3.5 h-3.5" />
              <span>Kapasitas Mesin</span>
            </div>
            <div className="text-sm font-extrabold text-white mt-1">
              {specProfile.ringkasan.kapasitas_mesin}
            </div>
            <div className="text-[10px] text-blue-200/70 truncate mt-0.5">
              {specProfile.ringkasan.tenaga_maks.split('@')[0]}
            </div>
          </div>

          <div className="rounded-xl bg-white/5 p-3 backdrop-blur-sm border border-white/5">
            <div className="flex items-center gap-2 text-blue-300 text-[11px] font-medium">
              <Settings className="w-3.5 h-3.5" />
              <span>Transmisi & Drive</span>
            </div>
            <div className="text-sm font-extrabold text-white mt-1">
              {car.transmisi}
            </div>
            <div className="text-[10px] text-blue-200/70 truncate mt-0.5">
              {specProfile.ringkasan.penggerak.replace('Penggerak ', '')}
            </div>
          </div>

          <div className="rounded-xl bg-white/5 p-3 backdrop-blur-sm border border-white/5">
            <div className="flex items-center gap-2 text-blue-300 text-[11px] font-medium">
              <Users className="w-3.5 h-3.5" />
              <span>Kapasitas Penumpang</span>
            </div>
            <div className="text-sm font-extrabold text-white mt-1">
              {specProfile.ringkasan.kapasitas_penumpang}
            </div>
            <div className="text-[10px] text-blue-200/70 truncate mt-0.5">
              Tipe {specProfile.ringkasan.tipe_bodi}
            </div>
          </div>

          <div className="rounded-xl bg-white/5 p-3 backdrop-blur-sm border border-white/5">
            <div className="flex items-center gap-2 text-emerald-300 text-[11px] font-medium">
              <Fuel className="w-3.5 h-3.5" />
              <span>Konsumsi BBM Est.</span>
            </div>
            <div className="text-sm font-extrabold text-emerald-300 mt-1">
              {specProfile.ringkasan.konsumsi_bbm.split('(')[0].trim()}
            </div>
            <div className="text-[10px] text-blue-200/70 truncate mt-0.5">
              Tangki {specProfile.ringkasan.kapasitas_tangki}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Interactive Filter Controls & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategory('semua')}
            className={`flex-shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
              selectedCategory === 'semua'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
            }`}
          >
            <span>Semua Spesifikasi</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${
                selectedCategory === 'semua' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {totalSpecCount}
            </span>
          </button>

          {specProfile.kategori.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex-shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                }`}
              >
                {getCategoryIcon(cat.id, 'w-3.5 h-3.5')}
                <span>{cat.nama}</span>
              </button>
            );
          })}
        </div>

        {/* Quick Search in Specs */}
        <div className="relative min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari spek (misal: cc, ban, rem...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-9 pr-8 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 3. Categorized Specification Tables / Cards */}
      <div className="space-y-6">
        {filteredCategories.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
            <Search className="mx-auto h-8 w-8 text-slate-400 mb-2" />
            <p className="text-xs font-semibold">Tidak ditemukan spesifikasi yang cocok dengan "{searchQuery}"</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('semua');
              }}
              className="mt-3 text-xs font-bold text-blue-600 hover:underline"
            >
              Reset pencarian
            </button>
          </div>
        ) : (
          filteredCategories.map((cat) => (
            <div
              key={cat.id}
              className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm overflow-hidden"
            >
              {/* Category Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                    {getCategoryIcon(cat.id, 'w-4 h-4')}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{cat.nama}</h4>
                    <p className="text-[11px] text-slate-500">{cat.deskripsi}</p>
                  </div>
                </div>

                {cat.badge && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-700 border border-slate-200/60">
                    {cat.badge}
                  </span>
                )}
              </div>

              {/* Spec Items Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {cat.items.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-xl p-3.5 transition-all ${
                      item.isHighlight
                        ? 'border border-blue-200/80 bg-blue-50/40 hover:bg-blue-50/70'
                        : 'border border-slate-100 bg-slate-50/70 hover:bg-slate-50 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                        {item.label}
                      </span>
                      {item.isHighlight && (
                        <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-700">
                          Utama
                        </span>
                      )}
                    </div>

                    <div className="mt-1 text-xs sm:text-sm font-extrabold text-slate-900 leading-snug">
                      {item.value}
                    </div>

                    {item.keterangan && (
                      <p className="mt-1 text-[10px] text-slate-500 leading-relaxed flex items-center gap-1">
                        <CheckCheck className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                        <span>{item.keterangan}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 4. Verified Inspection Footer Note */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 flex items-center gap-3">
        <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
        <div className="text-xs text-emerald-900">
          <span className="font-bold">Standar Spesifikasi CekGarasi Terverifikasi:</span> Seluruh data teknis di atas
          telah diverifikasi sesuai varian fisik unit di dealer resmi, dokumen BPKB/STNK, dan hasil uji kelayakan jalan.
        </div>
      </div>
    </div>
  );
}
