import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Calendar, Gauge, MapPin, Heart, Scale } from 'lucide-react';
import { CarPlaceholder } from './CarPlaceholder';
import { getCarPhoto } from '@/utils/carPhoto';
import { formatInstallment } from '@/lib/finance';
import { content } from '@/content/id';
import { getSegmentMeta } from '@/utils/segmentConstants';
import {
  isFavorite as checkIsFavorite,
  toggleFavorite,
  subscribeFavorites,
} from '@/services/favoriteStore';
import {
  isCompared,
  toggleCompare,
  subscribeCompare,
} from '@/services/compareStore';

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
  foto_url?: string | null;
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
  const [storeCompare, setStoreCompare] = useState<boolean>(() => isCompared(car.id));

  useEffect(() => {
    if (isFavoriteProp !== undefined) return;
    setStoreFavorite(checkIsFavorite(car.id));
    const unsub = subscribeFavorites(() => {
      setStoreFavorite(checkIsFavorite(car.id));
    });
    return unsub;
  }, [car.id, isFavoriteProp]);

  useEffect(() => {
    setStoreCompare(isCompared(car.id));
    const unsub = subscribeCompare(() => {
      setStoreCompare(isCompared(car.id));
    });
    return unsub;
  }, [car.id]);

  const isFav = isFavoriteProp !== undefined ? isFavoriteProp : storeFavorite;

  const meta = getSegmentMeta(car.klaster);
  const SegmentIcon = meta.icon;
  const segmentName = car.nama_segmen || meta.nama;
  const segmentColor = car.warna_segmen || meta.colorHex;
  const installmentText = formatInstallment(car.harga_rp);
  const photoUrl = getCarPhoto(car.nama_mobil, car.foto_url || car.foto || car.transmisi);

  const handleCardClick = () => {
    if ('startViewTransition' in document) {
      (document as any).startViewTransition(() => {
        navigate(`/mobil/${car.id}`);
      });
    } else {
      navigate(`/mobil/${car.id}`);
    }
  };

  const handleCompareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleCompare(car.id);
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
      className={`group cursor-pointer rounded-[14px] bg-white dark:bg-[#1A1A24] border border-[#E4E4EE] dark:border-[#2A2A38] hover:border-[#5B4EF0]/50 dark:hover:border-[#8277FF]/50 shadow-sm hover:shadow-card-hover hover:-translate-y-1 transition-all duration-200 overflow-hidden flex flex-col ${className}`}
      role="article"
      aria-label={`${car.nama_mobil} ${car.tahun}`}
    >
      {/* Photo Container */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
        {!imageError && photoUrl ? (
          <img
            src={photoUrl}
            alt={car.nama_mobil}
            onError={() => setImageError(true)}
            style={{ viewTransitionName: `car-hero-${car.id}` }}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <CarPlaceholder klaster={car.klaster} className="w-full h-full p-2" />
        )}

        {/* Ambient Dark Scrim for Image Polish */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

        {/* Segment Pill Badge */}
        <div className="absolute top-3 left-3 z-10">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-white shadow-sm border border-white/20 backdrop-blur-md"
            style={{ backgroundColor: segmentColor }}
          >
            <SegmentIcon className="w-3 h-3 text-white" />
            <span>{segmentName}</span>
          </span>
        </div>

        {/* Transmission Pill Tag on Image Bottom */}
        <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md border border-white/10 text-white text-[10px] font-medium">
            {car.transmisi || 'Automatic'}
          </span>
        </div>

        {/* Action Buttons: Compare (Scale) & Favorite (Heart) */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
          {/* Compare Button with Hover Micro-Interaction */}
          <motion.button
            type="button"
            onClick={handleCompareClick}
            whileHover={{ scale: 1.15, rotate: -6 }}
            whileTap={{ scale: 0.88 }}
            aria-label={storeCompare ? 'Hapus dari perbandingan' : 'Tambah ke perbandingan'}
            title={storeCompare ? 'Hapus dari bandingkan' : 'Bandingkan mobil ini'}
            className={`w-8 h-8 rounded-full backdrop-blur-md border shadow-sm flex items-center justify-center transition-all cursor-pointer ${
              storeCompare
                ? 'bg-[#2563EB] text-white border-[#2563EB]'
                : 'bg-black/50 hover:bg-black/80 text-zinc-200 hover:text-white border-white/20'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
          </motion.button>

          {/* Favorite Heart Button with Pop Micro-Interaction & Burst Particles */}
          <motion.button
            type="button"
            onClick={handleHeartClick}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.85 }}
            aria-label={isFav ? 'Hapus dari favorit' : 'Simpan ke favorit'}
            title={isFav ? 'Hapus dari favorit' : 'Simpan ke favorit'}
            className={`relative w-8 h-8 rounded-full backdrop-blur-md border shadow-sm flex items-center justify-center transition-all cursor-pointer ${
              isFav
                ? 'bg-white text-[#EF4444] border-white shadow-md'
                : 'bg-black/50 hover:bg-black/80 text-zinc-200 hover:text-white border-white/20'
            }`}
          >
            {isFav && (
              <>
                <span className="absolute inset-0 rounded-full animate-pulse-ring bg-rose-500/50 pointer-events-none" />
                <motion.span
                  initial={{ x: 0, y: 0, scale: 0.4, opacity: 1 }}
                  animate={{ x: -14, y: -16, scale: 1, opacity: 0 }}
                  transition={{ duration: 0.42, ease: 'easeOut' }}
                  className="absolute w-2 h-2 rounded-full bg-rose-500 pointer-events-none"
                />
                <motion.span
                  initial={{ x: 0, y: 0, scale: 0.4, opacity: 1 }}
                  animate={{ x: 14, y: -16, scale: 1, opacity: 0 }}
                  transition={{ duration: 0.42, ease: 'easeOut' }}
                  className="absolute w-2 h-2 rounded-full bg-rose-500 pointer-events-none"
                />
                <motion.span
                  initial={{ x: 0, y: 0, scale: 0.4, opacity: 1 }}
                  animate={{ x: 0, y: -20, scale: 1.2, opacity: 0 }}
                  transition={{ duration: 0.45, ease: 'easeOut' }}
                  className="absolute w-2 h-2 rounded-full bg-amber-400 pointer-events-none"
                />
                <motion.span
                  initial={{ x: 0, y: 0, scale: 0.4, opacity: 1 }}
                  animate={{ x: 12, y: 12, scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.38, ease: 'easeOut' }}
                  className="absolute w-1.5 h-1.5 rounded-full bg-pink-400 pointer-events-none"
                />
              </>
            )}
            <motion.div
              key={isFav ? 'fav' : 'unfav'}
              initial={isFav ? { scale: 0.5 } : false}
              animate={isFav ? { scale: [0.6, 1.6, 0.8, 1.2, 1] } : { scale: 1 }}
              transition={{ duration: 0.45, ease: [0.175, 0.885, 0.32, 1.275] }}
            >
              <Heart
                className={`w-3.5 h-3.5 transition-colors duration-200 ${
                  isFav ? 'fill-[#EF4444] text-[#EF4444]' : 'text-white'
                }`}
              />
            </motion.div>
          </motion.button>
        </div>
      </div>

      {/* Details Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-[#5B4EF0] dark:group-hover:text-[#8277FF] transition-colors line-clamp-1 leading-snug">
            {car.nama_mobil}
          </h3>

          <div className="mt-1.5 flex items-baseline justify-between gap-2">
            <div>
              <span className="font-extrabold text-xl sm:text-2xl text-zinc-950 dark:text-white block leading-tight tracking-tight">
                Rp {car.harga_rp.toLocaleString('id-ID')}
              </span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mt-0.5">
                {content.finance.installmentLabel(installmentText)}
              </span>
            </div>
          </div>
        </div>

        {/* Specs Micro-Pills with Micro-Motion Icons */}
        <div className="pt-3 border-t border-[#E4E4EE] dark:border-[#2A2A38] flex items-center justify-between gap-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-[8px] bg-[#EEEDFB]/60 dark:bg-white/5 border border-[#E4E4EE] dark:border-white/10 hover:border-blue-400/40 transition-colors" title={`Tahun pembuatan: ${car.tahun}`}>
            <Calendar className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#60A5FA] flex-shrink-0 group-hover:-translate-y-0.5 transition-transform duration-300" />
            <span className="font-semibold text-zinc-900 dark:text-white">{car.tahun}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-[8px] bg-[#EEEDFB]/60 dark:bg-white/5 border border-[#E4E4EE] dark:border-white/10 hover:border-blue-400/40 transition-colors" title={`Jarak tempuh: ${car.jarak_tempuh_ribu_km} ribu km`}>
            <Gauge className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#60A5FA] flex-shrink-0 group-hover:rotate-12 transition-transform duration-300" />
            <span>{car.jarak_tempuh_ribu_km} rb km</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-[8px] bg-[#EEEDFB]/60 dark:bg-white/5 border border-[#E4E4EE] dark:border-white/10 hover:border-blue-400/40 transition-colors truncate max-w-[110px]" title={car.lokasi || 'DKI Jakarta'}>
            <MapPin className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#60A5FA] flex-shrink-0 group-hover:translate-y-0.5 transition-transform duration-300" />
            <span className="truncate">{car.lokasi || 'DKI Jakarta'}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
