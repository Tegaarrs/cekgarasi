import { motion } from 'motion/react';

interface AnimatedMenuToggleProps {
  isOpen: boolean;
  className?: string;
}

export function AnimatedMenuToggle({ isOpen, className = '' }: AnimatedMenuToggleProps) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Top line -> Morphs into first diagonal of X */}
      <motion.line
        x1="4"
        y1="6"
        x2="20"
        y2="6"
        animate={
          isOpen
            ? { x1: 5, y1: 5, x2: 19, y2: 19 }
            : { x1: 4, y1: 6, x2: 20, y2: 6 }
        }
        transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      />
      {/* Middle line -> Fades out & shrinks to zero */}
      <motion.line
        x1="4"
        y1="12"
        x2="20"
        y2="12"
        animate={
          isOpen
            ? { opacity: 0, scaleX: 0 }
            : { opacity: 1, scaleX: 1 }
        }
        transition={{ duration: 0.18 }}
      />
      {/* Bottom line -> Morphs into second diagonal of X */}
      <motion.line
        x1="4"
        y1="18"
        x2="20"
        y2="18"
        animate={
          isOpen
            ? { x1: 5, y1: 19, x2: 19, y2: 5 }
            : { x1: 4, y1: 18, x2: 20, y2: 18 }
        }
        transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      />
    </svg>
  );
}

