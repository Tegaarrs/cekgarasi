import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { dur } from '@/lib/motion';

interface SegmentBadgeProps {
  klaster: number;
  nama?: string;
  warnaHex?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SEGMENT_COLORS: Record<number, { bg: string; text: string; border: string; dot: string; label: string }> = {
  0: {
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    dot: '#2557D6',
    label: 'Segmen 0 - Premium & Eksekutif',
  },
  1: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    dot: '#0CA678',
    label: 'Segmen 1 - Keluarga Muda',
  },
  2: {
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800',
    dot: '#AE3EC9',
    label: 'Segmen 2 - Ekonomis & Komuter',
  },
};

export function SegmentBadge({
  klaster,
  nama,
  warnaHex,
  className = '',
  size = 'md',
}: SegmentBadgeProps) {
  const shouldReduce = useReducedMotion();
  const cfg = SEGMENT_COLORS[klaster] || {
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
    dot: warnaHex || '#64748B',
    label: `Segmen ${klaster}`,
  };

  const displayText = nama || cfg.label;
  const dotColor = warnaHex || cfg.dot;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1.5',
    md: 'text-xs font-semibold px-2.5 py-1 gap-2',
    lg: 'text-sm font-semibold px-3 py-1.5 gap-2.5',
  };

  if (shouldReduce) {
    return (
      <span
        className={`inline-flex items-center rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border} ${sizeClasses[size]} ${className}`}
      >
        <span
          className="h-2 w-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: dotColor }}
        />
        <span>{displayText}</span>
      </span>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={klaster}
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ duration: dur.fast }}
        className={`inline-flex items-center rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border} ${sizeClasses[size]} ${className}`}
      >
        <motion.span
          className="h-2 w-2 rounded-full flex-shrink-0"
          animate={{ backgroundColor: dotColor }}
          transition={{ duration: 0.25 }}
        />
        <span>{displayText}</span>
      </motion.span>
    </AnimatePresence>
  );
}
