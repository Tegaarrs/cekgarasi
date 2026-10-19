import { LoginPrompt } from './LoginPrompt';
import { content } from '@/content/id';

interface GuestLoginSheetProps {
  isOpen: boolean;
  onClose: () => void;
  redirectPath?: string;
}

export function GuestLoginSheet({
  isOpen,
  onClose,
}: GuestLoginSheetProps) {
  return (
    <LoginPrompt
      isOpen={isOpen}
      onClose={onClose}
      title={content.auth.guestFavoriteSheetTitle || 'Masuk untuk menyimpan favorit'}
      description={content.auth.guestFavoriteSheetDesc || 'Simpan mobil yang kamu taksir, bandingkan, dan lihat rekomendasi yang mirip.'}
    />
  );
}
