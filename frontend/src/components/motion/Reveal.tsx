import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { fadeUp } from '@/lib/motion';

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  amount?: number;
}

export function Reveal({
  children,
  className = '',
  delay = 0,
  amount = 0.2,
}: RevealProps) {
  const shouldReduce = useReducedMotion();

  if (shouldReduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
