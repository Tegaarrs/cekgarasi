import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { heroConfig } from '@/config/hero';
import {
  heroDominantColor,
  heroLqip,
  heroSourceWidth,
  heroSourceHeight,
  heroAvailableWidths,
  heroMaxWidth,
} from '@/lib/hero-lqip';

export function HeroBackground() {
  const shouldReduce = useReducedMotion();
  const [imageLoaded, setImageLoaded] = useState(false);

  // Generate srcset strings from available widths
  const avifSrcSet = heroAvailableWidths
    .map((w) => `/images/hero/hero-${w}.avif ${w}w`)
    .join(', ');
  const webpSrcSet = heroAvailableWidths
    .map((w) => `/images/hero/hero-${w}.webp ${w}w`)
    .join(', ');
  const jpgSrcSet = heroAvailableWidths
    .map((w) => `/images/hero/hero-${w}.jpg ${w}w`)
    .join(', ');

  const filterStyle = [
    `saturate(${heroConfig.photoFilter.saturate})`,
    `contrast(${heroConfig.photoFilter.contrast})`,
    heroSourceWidth < 1600 && heroConfig.photoFilter.blur
      ? `blur(${heroConfig.photoFilter.blur})`
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className="absolute inset-0 overflow-hidden [isolation:isolate] pointer-events-none select-none"
      aria-hidden="true"
      style={{ backgroundColor: heroDominantColor }}
    >
      {/* 1. Low-Quality Image Placeholder (LQIP) blurred background */}
      <div
        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-700 ${
          imageLoaded ? 'opacity-0' : 'opacity-100'
        }`}
        style={{
          backgroundImage: `url(${heroLqip})`,
          filter: 'blur(10px)',
          transform: 'scale(1.08)',
        }}
      />

      {/* 2. Scaled / Animated Hero Photo with Picture element */}
      <motion.div
        initial={shouldReduce ? { scale: 1 } : { scale: 1.04 }}
        animate={{ scale: 1 }}
        transition={{ duration: 2.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative h-full w-full"
      >
        <picture>
          <source type="image/avif" srcSet={avifSrcSet} sizes="100vw" />
          <source type="image/webp" srcSet={webpSrcSet} sizes="100vw" />
          <source type="image/jpeg" srcSet={jpgSrcSet} sizes="100vw" />
          <img
            src={`/images/hero/hero-${heroMaxWidth}.jpg`}
            alt=""
            width={heroSourceWidth}
            height={heroSourceHeight}
            loading="eager"
            decoding="async"
            fetchPriority="high"
            onLoad={() => setImageLoaded(true)}
            className="h-full w-full object-cover transition-opacity duration-500 [object-position:68%_60%] md:[object-position:50%_63%]"
            style={{
              filter: filterStyle,
            }}
          />
        </picture>
      </motion.div>

      {/* 3. Blue Filter Layer A: #0F2A5F Tint (mix-blend: multiply, opacity 0.55) */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: heroConfig.blueFilter.tint.color,
          mixBlendMode: heroConfig.blueFilter.tint.mixBlendMode,
          opacity: heroConfig.blueFilter.tint.opacity,
        }}
      />

      {/* 4. Blue Filter Layer B: Legibility Gradient (Desktop & Mobile) */}
      {/* Desktop Gradient */}
      <div
        className="hidden md:block absolute inset-0"
        style={{
          backgroundImage: heroConfig.blueFilter.legibilityGradient.desktop,
        }}
      />
      {/* Mobile Gradient */}
      <div
        className="block md:hidden absolute inset-0"
        style={{
          backgroundImage: heroConfig.blueFilter.legibilityGradient.mobile,
        }}
      />

      {/* 5. Blue Filter Layer C: Film-grain noise layer (3% opacity) */}
      <svg
        className="absolute inset-0 h-full w-full"
        style={{ opacity: heroConfig.blueFilter.filmGrain.opacity }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <filter id="hero-film-grain-noise">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves="3"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#hero-film-grain-noise)" />
      </svg>
    </div>
  );
}
