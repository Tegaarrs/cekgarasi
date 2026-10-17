import { motion, useReducedMotion } from 'motion/react';

interface SpinnerProps {
  size?: number;
  className?: string;
  color?: string;
}

export function Spinner({
  size = 18,
  className = '',
  color = 'currentColor',
}: SpinnerProps) {
  const shouldReduce = useReducedMotion();

  if (shouldReduce) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`inline-block opacity-75 ${className}`}
      >
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
    );
  }

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
      className={`inline-block ${className}`}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </motion.svg>
  );
}
