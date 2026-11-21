import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { ease } from '@/lib/motion';

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const shouldReduce = useReducedMotion();
  const isAdminShell =
    location.pathname.startsWith('/admin') && location.pathname !== '/admin/login';
  const transitionKey = isAdminShell ? '/admin-shell' : location.pathname;

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [location.pathname]);

  if (shouldReduce) {
    return <div key={transitionKey}>{children}</div>;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={transitionKey}
        initial={{ opacity: 0, y: 16 }}
        animate={{
          opacity: 1,
          y: 0,
          transition: { duration: 0.32, ease: ease.out },
        }}
        exit={{
          opacity: 0,
          y: -10,
          transition: { duration: 0.18, ease: ease.inOut },
        }}
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
