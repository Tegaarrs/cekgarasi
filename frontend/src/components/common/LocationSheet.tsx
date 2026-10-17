import { useEffect, useState } from 'react';
import { BottomSheet } from './BottomSheet';
import { apiFetch } from '@/services/api';
import { MapPin, Check } from 'lucide-react';

interface LocationGroupItem {
  lokasi: string;
  count: number;
}

interface FilterOpsiResponse {
  lokasi_jakarta: LocationGroupItem[];
  lokasi_lainnya: LocationGroupItem[];
  total_semua: number;
}

interface LocationSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLocation: string;
  onSelect: (location: string) => void;
}

export function LocationSheet({
  isOpen,
  onClose,
  selectedLocation,
  onSelect,
}: LocationSheetProps) {
  const [data, setData] = useState<FilterOpsiResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && !data) {
      setLoading(true);
      apiFetch<FilterOpsiResponse>('/filter-opsi')
        .then((res) => {
          setData(res);
        })
        .catch((err) => {
          console.error('Failed to load filter options:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, data]);

  const handleSelect = (loc: string) => {
    localStorage.setItem('cekgarasi_lokasi', loc);
    onSelect(loc);
    onClose();
  };

  const isAll = !selectedLocation || selectedLocation === 'Semua' || selectedLocation === 'Semua lokasi';

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Pilih Lokasi Mobil">
      <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
        {/* Option: Semua Lokasi */}
        <div>
          <button
            onClick={() => handleSelect('Semua')}
            className={`w-full flex items-center justify-between p-3.5 rounded-xl text-left border transition-all ${
              isAll
                ? 'bg-blue-50 border-blue-500 text-blue-900 font-semibold'
                : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <MapPin className={`w-5 h-5 ${isAll ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>Semua Lokasi</span>
            </div>
            <div className="flex items-center gap-2">
              {data && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                  {data.total_semua} unit
                </span>
              )}
              {isAll && <Check className="w-5 h-5 text-blue-600" />}
            </div>
          </button>
        </div>

        {loading && (
          <div className="space-y-3 py-4 animate-pulse">
            <div className="h-4 w-32 bg-slate-200 rounded" />
            <div className="h-12 bg-slate-100 rounded-xl" />
            <div className="h-12 bg-slate-100 rounded-xl" />
          </div>
        )}

        {/* Group: Jakarta & Sekitarnya */}
        {data && data.lokasi_jakarta.length > 0 && (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
              DKI Jakarta & Sekitarnya
            </h4>
            <div className="grid grid-cols-1 gap-1.5">
              {data.lokasi_jakarta.map((item) => {
                const isSelected = selectedLocation === item.lokasi;
                return (
                  <button
                    key={item.lokasi}
                    onClick={() => handleSelect(item.lokasi)}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-left border transition-all ${
                      isSelected
                        ? 'bg-blue-50 border-blue-500 text-blue-900 font-semibold'
                        : 'bg-white border-slate-100 text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-sm">{item.lokasi}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{item.count} unit</span>
                      {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Group: Kota Lainnya */}
        {data && data.lokasi_lainnya.length > 0 && (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
              Kota Lainnya
            </h4>
            <div className="grid grid-cols-1 gap-1.5">
              {data.lokasi_lainnya.map((item) => {
                const isSelected = selectedLocation === item.lokasi;
                return (
                  <button
                    key={item.lokasi}
                    onClick={() => handleSelect(item.lokasi)}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-left border transition-all ${
                      isSelected
                        ? 'bg-blue-50 border-blue-500 text-blue-900 font-semibold'
                        : 'bg-white border-slate-100 text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-sm">{item.lokasi}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{item.count} unit</span>
                      {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
