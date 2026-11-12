// Hero Configuration & Visual Tuning Parameters
// Crisp, sharp, realistic automotive presentation with gentle legibility gradient

export const heroConfig = {
  focalPoints: {
    desktop: '50% 60%',
    mobile: '65% 58%',
  },
  photoFilter: {
    saturate: 1.12,
    contrast: 1.12,
    blur: '', // Clear, sharp luxury vehicle image
  },
  blueFilter: {
    tint: {
      color: '#070709',
      mixBlendMode: 'multiply' as const,
      opacity: 0.22, // Deep luxury showroom tint
    },
    legibilityGradient: {
      desktop:
        'linear-gradient(90deg, rgba(7,7,9,0.92) 0%, rgba(7,7,9,0.70) 50%, rgba(7,7,9,0.30) 80%, rgba(7,7,9,0.12) 100%)',
      mobile:
        'linear-gradient(180deg, rgba(7,7,9,0.92) 0%, rgba(7,7,9,0.72) 60%, rgba(7,7,9,0.45) 100%)',
    },
    filmGrain: {
      opacity: 0.02,
    },
  },
};
