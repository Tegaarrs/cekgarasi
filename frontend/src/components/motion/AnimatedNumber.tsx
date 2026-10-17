import { animate, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

interface AnimatedNumberProps {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
}

export function AnimatedNumber({
  value,
  format = (n: number) => Math.round(n).toLocaleString("id-ID"),
  duration = 0.9,
  className = "",
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (reduce) {
      el.textContent = format(value);
      return;
    }

    if (!inView) {
      el.textContent = format(0);
      return;
    }

    const c = animate(0, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        el.textContent = format(v);
      },
    });

    return () => c.stop();
  }, [inView, value, reduce, duration, format]);

  return <span ref={ref} className={`tabular-nums ${className}`} />;
}
