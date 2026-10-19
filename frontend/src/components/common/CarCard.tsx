import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Gauge, MapPin, Heart } from 'lucide-react';
import { CarPlaceholder } from './CarPlaceholder';
import { getCarPhoto } from '@/utils/carPhoto';
import { formatInstallment } from '@/lib/finance';
import { content } from '@/content/id';
import {
  isFavorite as checkIsFavorite,
  toggleFavorite,
  subscribeFavorites,
} from '@/services/favoriteStore';

export interface CarCardData {
  id: number;
  nama_mobil: string;
  tahun: number;
  harga_rp: number;
  jarak_tempuh_ribu_km: number;
  lokasi: string;
  transmisi: string;
  klaster: number;
  nama_segmen?: string;
  warna_segmen?: string;
  foto?: string | null;
}

interface CarCardProps {
  car: CarCardData;
  isFavorite?: boolean;
  onFavoriteClick?: (carId: number, e: React.MouseEvent) => void;
  className?: string;
}

export function CarCard({
  car,
  isFavorite: isFavoriteProp,
  onFavoriteClick,
  className = '',
}: CarCardProps) {
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);
  const [storeFavorite, setStoreFavorite] = useState<boolean>(() => checkIsFavorite(car.id));

  useEffect(() => {
    if (isFavoriteProp !== undefined) return;
    setStoreFavorite(checkIsFavorite(car.id));
    const unsub = subscribeFavorites(() => {
      setStoreFavorite(checkIsFavorite(car.id));
    });
    return unsub;
  }, [car.id, isFavoriteProp]);

  const isFav = isFavoriteProp !== undefined ? isFavoriteProp : storeFavorite;

  const segmentName = car.nama_segmen || content.segments.names[car.klaster] || `Segmen ${car.klaster}`;
  const segmentColor = car.warna_segmen || content.segments.colors[car.klaster] || '#2563EB';
  const installmentText = formatInstallment(car.harga_rp);
  const photoUrl = getCarPhoto(car.nama_mobil, car.foto || car.transmisi);

  const handleCardClick = () => {
    navigate(`/mobil/${car.id}`);
  };

  const handleHeartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onFavoriteClick) {
      onFavoriteClick(car.id, e);
    } else {
      toggleFavorite(car.id);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`group cursor-pointer rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 overflow-hidden flex flex-col ${className}`}
      role="article"
      aria-label={`${car.nama_mobil} ${car.tahun}`}
    >
      {/* Photo Container */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100 flex items-center justify-center">
        {!imageError && photoUrl ? (
          <img
            src={photoUrl}
            alt={car.nama_mobil}
            onError={() => setImageError(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <CarPlaceholder klaster={car.klaster} className="w-full h-full p-2" />
        )}

        {/* Segment Pill Badge */}
        <div className="absolute top-2.5 left-2.5 z-10">
          <span
            className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold text-white shadow-xs drop-shadow-sm"
            style={{ backgroundColor: segmentColor }}
          >
            {segmentName}
          </span>
        </div>

        {/* Favorite Button */}
        <button
          type="button"
          onClick={handleHeartClick}
          aria-label={isFav ? 'Hapus dari favorit' : 'Simpan ke favorit'}
          className="absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow-xs flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-white active:scale-90 transition-all cursor-pointer"
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              isFav ? 'fill-rose-500 text-rose-500' : 'text-slate-500'
            }`}
          />
        </button>
      </div>

      {/* Details Body */}
      <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between space-y-2.5">
        <div>
          <h3 className="font-semibold text-sm sm:text-base text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
            {car.nama_mobil}
          </h3>

          <div className="mt-1">
            <span className="font-bold text-base sm:text-lg text-slate-900 block leading-tight">
              Rp {car.harga_rp.toLocaleString('id-ID')}
            </span>
            <span className="text-[11px] font-medium text-slate-500 block mt-0.5">
              {content.finance.installmentLabel(installmentText)}
            </span>
          </div>
        </div>

        {/* Specs Pill List */}
        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span>{car.tahun}</span>
          </span>
          <span className="flex items-center gap-1">
            <Gauge className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span>{car.jarak_tempuh_ribu_km} rb km</span>
          </span>
          <span className="flex items-center gap-1 truncate max-w-[90px]">
            <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className="truncate">{car.lokasi || 'DKI Jakarta'}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
