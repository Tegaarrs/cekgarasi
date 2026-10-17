import { useNavigate } from 'react-router-dom';
import { BottomSheet } from './BottomSheet';
import { content } from '@/content/id';
import { Heart, LogIn } from 'lucide-react';

interface GuestLoginSheetProps {
  isOpen: boolean;
  onClose: () => void;
  redirectPath?: string;
}

export function GuestLoginSheet({
  isOpen,
  onClose,
  redirectPath = '/cari',
}: GuestLoginSheetProps) {
  const navigate = useNavigate();

  const handleLoginClick = () => {
    onClose();
    navigate(`/welcome?redirect=${encodeURIComponent(redirectPath)}`);
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={content.auth.guestFavoriteSheetTitle}>
      <div className="flex flex-col items-center text-center py-4 space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 shadow-sm ring-4 ring-rose-50/50">
          <Heart className="w-8 h-8 fill-rose-500" />
        </div>
        
        <p className="text-sm text-slate-600 max-w-xs leading-relaxed">
          {content.auth.guestFavoriteSheetDesc}
        </p>

        <div className="w-full pt-2 space-y-2">
          <button
            onClick={handleLoginClick}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md transition-all active:scale-[0.98]"
          >
            <LogIn className="w-4 h-4" />
            <span>{content.auth.loginCta}</span>
          </button>
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm transition-colors"
          >
            Nanti saja
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
