import { AlertCircle, RotateCcw } from 'lucide-react';

interface ErrorRetryProps {
  message?: string;
  onRetry: () => void;
  className?: string;
}

export function ErrorRetry({
  message = 'Gagal memuat data. Periksa koneksi internet kamu dan coba lagi.',
  onRetry,
  className = '',
}: ErrorRetryProps) {
  return (
    <div className={`p-6 rounded-2xl bg-amber-50 border border-amber-200 text-center flex flex-col items-center justify-center gap-3 ${className}`}>
      <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
        <AlertCircle className="w-6 h-6" />
      </div>
      <p className="text-sm font-medium text-amber-900 max-w-sm">
        {message}
      </p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors active:scale-95"
      >
        <RotateCcw className="w-4 h-4" />
        <span>Coba Lagi</span>
      </button>
    </div>
  );
}
