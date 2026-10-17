// Hero Configuration & Visual Tuning Parameters
// Allows tuning focal points, photo filters, tint, gradients, and film-grain

export const heroConfig = {
  focalPoints: {
    desktop: '50% 63%',
    mobile: '68% 60%',
  },
  photoFilter: {
    saturate: 0.75,
    contrast: 1.05,
    blur: '0.6px', // Applied when sourceWidth < 1600px to soften upscale pixelation
  },
  blueFilter: {
    tint: {
      color: '#0F2A5F',
      mixBlendMode: 'multiply' as const,
      opacity: 0.65,
    },
    legibilityGradient: {
      desktop:
        'linear-gradient(90deg, rgba(8,20,48,.88) 0%, rgba(8,20,48,.72) 38%, rgba(8,20,48,.40) 70%, rgba(8,20,48,.30) 100%)',
      mobile:
        'linear-gradient(180deg, rgba(8,20,48,.98) 0%, rgba(8,20,48,.94) 55%, rgba(8,20,48,.96) 100%)',
    },
    filmGrain: {
      opacity: 0.03,
    },
  },
};
