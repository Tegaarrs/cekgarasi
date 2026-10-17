import { motion, useReducedMotion } from 'motion/react';

interface AnimatedCheckProps {
  size?: number;
  className?: string;
  color?: string;
  strokeWidth?: number;
}

export function AnimatedCheck({
  size = 48,
  className = '',
  color = '#10B981',
  strokeWidth = 3,
}: AnimatedCheckProps) {
  const shouldReduce = useReducedMotion();

  if (shouldReduce) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 52 52"
        fill="none"
        className={className}
      >
        <circle cx="26" cy="26" r="24" stroke={color} strokeWidth={strokeWidth} />
        <path
          d="M14 27l8 8 16-16"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 52 52"
      fill="none"
      className={className}
    >
      <motion.circle
        cx="26"
        cy="26"
        r="24"
        stroke={color}
        strokeWidth={strokeWidth}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      />
      <motion.path
        d="M14 27l8 8 16-16"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.25, duration: 0.35, ease: 'easeOut' }}
      />
    </svg>
  );
}
