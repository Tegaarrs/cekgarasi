import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { stagger, fadeUp } from '@/lib/motion';

interface StaggerProps {
  children: React.ReactNode;
  className?: string;
  interval?: number;
  viewportOnce?: boolean;
}

export function Stagger({
  children,
  className = '',
  interval = 0.06,
  viewportOnce = true,
}: StaggerProps) {
  const shouldReduce = useReducedMotion();

  if (shouldReduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      variants={stagger(interval)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: viewportOnce, amount: 0.1 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface StaggerItemProps {
  children: React.ReactNode;
  className?: string;
  index?: number;
}

export function StaggerItem({
  children,
  className = '',
  index,
}: StaggerItemProps) {
  const shouldReduce = useReducedMotion();

  // If index > 11 (more than 12 items), render without per-item stagger animation
  if (shouldReduce || (index !== undefined && index >= 12)) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div variants={fadeUp} className={className}>
      {children}
    </motion.div>
  );
}
