import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { spring, dur, ease } from '@/lib/motion';
import { X } from 'lucide-react';

interface ToastProps {
  show: boolean;
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose?: () => void;
  className?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function Toast({
  show,
  message,
  type = 'info',
  onClose,
  className = '',
  icon,
  action,
}: ToastProps) {
  const shouldReduce = useReducedMotion();

  const typeStyles = {
    success: 'bg-emerald-600 text-white shadow-emerald-900/20',
    error: 'bg-rose-600 text-white shadow-rose-900/20',
    info: 'bg-slate-900 text-white shadow-slate-900/20',
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={shouldReduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.96 }}
          animate={shouldReduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          exit={shouldReduce ? { opacity: 0 } : { opacity: 0, y: 16, transition: { duration: dur.fast, ease: ease.inOut } }}
          transition={spring.snappy}
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg ${typeStyles[type]} ${className}`}
          role="status"
          aria-live="polite"
        >
          {icon}
          <span className="text-sm font-medium">{message}</span>
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className="ml-2 rounded-lg bg-white/20 hover:bg-white/30 px-2.5 py-1 text-xs font-bold text-white transition-colors cursor-pointer"
            >
              {action.label}
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="ml-2 rounded p-1 opacity-75 hover:opacity-100 focus:outline-none cursor-pointer"
              aria-label="Tutup notifikasi"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
