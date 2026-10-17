import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { spring } from '@/lib/motion';

interface PressableCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  tabIndex?: number;
  id?: string;
  title?: string;
}

export function PressableCard({
  children,
  className = '',
  onClick,
  tabIndex = 0,
  id,
  title,
}: PressableCardProps) {
  const shouldReduce = useReducedMotion();

  if (shouldReduce) {
    return (
      <div
        id={id}
        title={title}
        className={`rounded-xl transition-colors ${className}`}
        onClick={onClick}
        tabIndex={tabIndex}
        onKeyDown={(e) => {
          if (onClick && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onClick();
          }
        }}
      >
        {children}
      </div>
    );
  }

  return (
    <motion.div
      id={id}
      title={title}
      whileHover={{ y: -4, boxShadow: '0 12px 24px -8px rgba(0, 0, 0, 0.12)' }}
      whileTap={{ scale: 0.98 }}
      whileFocus={{ y: -4, boxShadow: '0 12px 24px -8px rgba(0, 0, 0, 0.12)' }}
      transition={spring.snappy}
      className={`cursor-pointer rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${className}`}
      onClick={onClick}
      tabIndex={tabIndex}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {children}
    </motion.div>
  );
}
