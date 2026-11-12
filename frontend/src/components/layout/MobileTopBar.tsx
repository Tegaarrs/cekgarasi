import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/common/Logo';
import { LocationSheet } from '@/components/common/LocationSheet';
import { getUser } from '@/services/api';
import { useTheme } from '@/context/ThemeContext';
import { MapPin, ChevronDown, User as UserIcon, Sun, Moon } from 'lucide-react';

interface MobileTopBarProps {
  currentLocation?: string;
  onLocationChange?: (loc: string) => void;
}

export function MobileTopBar({ currentLocation, onLocationChange }: MobileTopBarProps) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
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
      <header className="sticky top-0 z-40 w-full px-4 py-2.5 bg-[#0B0B0F] dark:bg-[#11111A] text-white border-b border-white/10 dark:border-[#2A2A38] md:hidden shadow-xs select-none">
        <div className="flex items-center justify-between gap-2">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center flex-shrink-0" aria-label="CekGarasi Beranda">
            <Logo size="sm" wordmarkClassName="text-white font-bold" />
          </Link>

          {/* Location Selector Pill */}
          <button
            onClick={() => setIsLocationOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full max-w-[140px] border border-white/15 bg-white/10 text-white shadow-xs"
            aria-label={`Lokasi: ${selectedLoc}`}
          >
            <MapPin className="w-3.5 h-3.5 text-[#8277FF] flex-shrink-0" />
            <span className="text-xs font-medium truncate">
              {selectedLoc}
            </span>
            <ChevronDown className="w-3 h-3 text-zinc-400 flex-shrink-0" />
          </button>

          {/* Right Actions: Theme Toggle + Auth */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'}
              className="w-8 h-8 rounded-full border border-white/10 bg-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-zinc-300" />
              )}
            </button>

            {user ? (
              <button
                onClick={() => navigate('/akun')}
                className="w-8 h-8 rounded-full bg-[#5B4EF0] text-white flex items-center justify-center font-bold text-xs border border-white/20 shadow-xs active:scale-95 transition-transform"
                title="Akun Saya"
                aria-label="Akun Saya"
              >
                {(user as { nama?: string; email?: string }).nama?.[0]?.toUpperCase() || <UserIcon className="w-3.5 h-3.5" />}
              </button>
            ) : (
              <div className="flex items-center gap-1.5 text-xs font-medium">
                <Link
                  to="/welcome"
                  className="px-2 py-1 rounded-[8px] text-zinc-300 hover:text-white transition-colors"
                >
                  Masuk
                </Link>
                <Link
                  to="/daftar"
                  className="px-3 py-1 font-semibold text-white bg-[#5B4EF0] hover:bg-[#4B3FE0] rounded-[8px] shadow-xs active:scale-95"
                >
                  Daftar
                </Link>
              </div>
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
