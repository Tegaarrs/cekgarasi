import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { dur } from '@/lib/motion';
import { getSegmentMeta } from '@/utils/segmentConstants';

interface SegmentBadgeProps {
  klaster: number;
  nama?: string;
  warnaHex?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export function SegmentBadge({
  klaster,
  nama,
  warnaHex,
  className = '',
  size = 'md',
  showIcon = true,
}: SegmentBadgeProps) {
  const shouldReduce = useReducedMotion();
  const meta = getSegmentMeta(klaster);
  const Icon = meta.icon;

  const displayText = nama || meta.nama;
  const dotColor = warnaHex || meta.colorHex;

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1.5 font-semibold',
    md: 'text-xs font-semibold px-2.5 py-1 gap-1.5',
    lg: 'text-sm font-semibold px-3 py-1.5 gap-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  const badgeContent = (
    <>
      {showIcon ? (
        <Icon className={`${iconSizes[size]} flex-shrink-0`} style={{ color: dotColor }} />
      ) : (
        <span
          className="h-2 w-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: dotColor }}
        />
      )}
      <span>{displayText}</span>
    </>
  );

  if (shouldReduce) {
    return (
      <span
        className={`inline-flex items-center rounded-full border shadow-2xs ${meta.badgeBg} ${meta.badgeText} ${meta.badgeBorder} ${sizeClasses[size]} ${className}`}
      >
        {badgeContent}
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
        className={`inline-flex items-center rounded-full border shadow-2xs ${meta.badgeBg} ${meta.badgeText} ${meta.badgeBorder} ${sizeClasses[size]} ${className}`}
      >
        {badgeContent}
      </motion.span>
    </AnimatePresence>
  );
}
