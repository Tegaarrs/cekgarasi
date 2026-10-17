import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/common/Logo';
import { LocationSheet } from '@/components/common/LocationSheet';
import { getUser } from '@/services/api';
import { MapPin, ChevronDown, User as UserIcon } from 'lucide-react';

interface MobileTopBarProps {
  currentLocation?: string;
  onLocationChange?: (loc: string) => void;
}

export function MobileTopBar({ currentLocation, onLocationChange }: MobileTopBarProps) {
  const navigate = useNavigate();
  const [user, setUser] = useState(getUser());
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [selectedLoc, setSelectedLoc] = useState(
    currentLocation || localStorage.getItem('cekgarasi_lokasi') || 'Semua lokasi'
  );

  useEffect(() => {
    setUser(getUser());
  }, []);

  useEffect(() => {
    if (currentLocation) {
      setSelectedLoc(currentLocation);
    }
  }, [currentLocation]);

  const handleSelectLocation = (loc: string) => {
    const val = !loc || loc === 'Semua' ? 'Semua lokasi' : loc;
    setSelectedLoc(val);
    localStorage.setItem('cekgarasi_lokasi', val);
    if (onLocationChange) {
      onLocationChange(val);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-xs pt-[env(safe-area-inset-top)] md:hidden">
        <div className="flex h-16 items-center justify-between px-4 gap-2">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center flex-shrink-0" aria-label="CekGarasi Beranda">
            <Logo size="sm" />
          </Link>

          {/* Location Selector Pill */}
          <button
            onClick={() => setIsLocationOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200/80 active:scale-95 transition-all max-w-[170px] border border-slate-200/60"
            aria-label="Pilih lokasi mobil"
          >
            <MapPin className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
            <span className="text-xs font-semibold text-slate-700 truncate">
              {selectedLoc}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400 flex-shrink-0" />
          </button>

          {/* User Auth Action */}
          <div className="flex items-center flex-shrink-0">
            {user ? (
              <button
                onClick={() => navigate('/akun')}
                className="w-9 h-9 rounded-full bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-bold text-xs shadow-xs active:scale-95 transition-transform"
                title="Akun Saya"
                aria-label="Akun Saya"
              >
                {(user as { nama?: string; email?: string }).nama?.[0]?.toUpperCase() || <UserIcon className="w-4 h-4" />}
              </button>
            ) : (
              <Link
                to="/welcome"
                className="px-3.5 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 rounded-full transition-colors border border-blue-200/60"
              >
                Masuk
              </Link>
            )}
          </div>
        </div>
      </header>

      <LocationSheet
        isOpen={isLocationOpen}
        onClose={() => setIsLocationOpen(false)}
        selectedLocation={selectedLoc}
        onSelect={handleSelectLocation}
      />
    </>
  );
}
