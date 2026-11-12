import type { Variants, Transition } from "motion/react";

export const dur = { fast: 0.15, base: 0.28, slow: 0.45 };
export const ease = {
  out: [0.22, 1, 0.36, 1] as [number, number, number, number],
  inOut: [0.65, 0, 0.35, 1] as [number, number, number, number],
};
export const spring: Record<string, Transition> = {
  snappy: { type: "spring", stiffness: 420, damping: 32 },
  soft: { type: "spring", stiffness: 180, damping: 24 },
};
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: ease.out } },
};
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: dur.base } },
};
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  show: { opacity: 1, scale: 1, transition: spring.snappy },
};
export const stagger = (s = 0.08): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: s, delayChildren: 0.08 } },
});
export const slideInRight: Variants = {
  hidden: { x: "100%" },
  show: { x: 0, transition: spring.soft },
  exit: { x: "100%", transition: { duration: dur.fast, ease: ease.inOut } },
};
