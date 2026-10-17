import { useReducedMotion } from 'motion/react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  className = '',
  width,
  height,
}: SkeletonProps) {
  const shouldReduce = useReducedMotion();

  return (
    <div
      style={{
        width: width !== undefined ? width : undefined,
        height: height !== undefined ? height : undefined,
      }}
      className={`relative overflow-hidden rounded-md bg-slate-200 dark:bg-slate-700 ${className}`}
    >
      {!shouldReduce && (
        <div
          className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 dark:via-slate-600/40 to-transparent"
        />
      )}
    </div>
  );
}
