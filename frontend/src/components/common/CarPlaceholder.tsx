import React from 'react';

interface CarPlaceholderProps {
  segmentId?: number | null;
  klaster?: number | null;
  namaMobil?: string;
  className?: string;
  aspectRatio?: '16/10' | '4/3' | '16/9';
}

export const CarPlaceholder: React.FC<CarPlaceholderProps> = ({
  segmentId,
  klaster,
  namaMobil = 'Mobil CekGarasi',
  className = '',
  aspectRatio = '16/10',
}) => {
  const effectiveSegment = klaster !== undefined && klaster !== null ? klaster : (segmentId ?? 0);
  // Theme accents by segment
  const segmentThemes: Record<number, { bgFrom: string; bgTo: string; carFill: string; accent: string }> = {
    0: {
      bgFrom: 'from-blue-50/80',
      bgTo: 'to-slate-100',
      carFill: '#2557D6',
      accent: '#60A5FA',
    },
    1: {
      bgFrom: 'from-emerald-50/80',
      bgTo: 'to-slate-100',
      carFill: '#0CA678',
      accent: '#34D399',
    },
    2: {
      bgFrom: 'from-purple-50/80',
      bgTo: 'to-slate-100',
      carFill: '#AE3EC9',
      accent: '#C084FC',
    },
  };

  const theme = segmentThemes[effectiveSegment] || segmentThemes[0];

  const aspectClass = {
    '16/10': 'aspect-[16/10]',
    '4/3': 'aspect-[4/3]',
    '16/9': 'aspect-[16/9]',
  }[aspectRatio];

  return (
    <div
      className={`relative w-full ${aspectClass} overflow-hidden rounded-xl bg-gradient-to-b ${theme.bgFrom} ${theme.bgTo} flex items-center justify-center select-none ${className}`}
      role="img"
      aria-label={`Ilustrasi ${namaMobil}`}
    >
      {/* Decorative background grid and lighting */}
      <svg
        className="absolute inset-0 w-full h-full opacity-40 pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
      >
        <defs>
          <pattern id="car-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-slate-300" />
          </pattern>
          <linearGradient id={`grad-glow-${segmentId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={theme.accent} stopOpacity="0.25" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#car-grid)" />
        <circle cx="50%" cy="40%" r="35%" fill={`url(#grad-glow-${segmentId})`} />
      </svg>

      {/* Aerodynamic SVG Vector Car */}
      <svg
        className="relative z-10 w-[78%] h-auto max-h-[72%] drop-shadow-md"
        viewBox="0 0 320 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Ground shadow */}
        <ellipse cx="160" cy="142" rx="135" ry="10" fill="#0F172A" fillOpacity="0.12" />

        {/* Car Cabin Roof Profile */}
        <path
          d="M72 90 L108 45 C113 39 122 36 130 36 H195 C205 36 214 41 219 49 L252 90 Z"
          fill="#1E293B"
          fillOpacity="0.85"
        />

        {/* Windows glass tint */}
        <path
          d="M112 47 L82 86 H148 V42 H130 C123 42 116 44 112 47 Z"
          fill="#94A3B8"
          fillOpacity="0.5"
        />
        <path
          d="M156 42 V86 H242 L214 48 C210 44 204 42 198 42 H156 Z"
          fill="#94A3B8"
          fillOpacity="0.45"
        />

        {/* Body Main Shell */}
        <path
          d="M28 102 C28 94 34 88 42 88 L72 88 L104 45 C111 36 122 32 133 32 H192 C204 32 215 38 221 47 L256 88 L286 91 C295 92 302 99 302 108 V118 C302 123 298 127 293 127 H264 C263 114 252 104 238 104 C224 104 213 114 212 127 H116 C115 114 104 104 90 104 C76 104 65 114 64 127 H37 C32 127 28 123 28 118 V102 Z"
          fill={theme.carFill}
        />

        {/* Character Shoulder Line */}
        <path
          d="M40 92 Q160 84 288 93"
          stroke="#FFFFFF"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeOpacity="0.4"
        />

        {/* Headlight (LED Daytime) */}
        <path
          d="M276 96 L298 97 C300 97 301 98 301 100 V103 L274 100 Z"
          fill="#FDE047"
        />
        {/* Taillight */}
        <path
          d="M29 96 L42 96 L40 102 L29 101 C28.5 101 28 100.5 28 100 V97 C28 96.5 28.5 96 29 96 Z"
          fill="#EF4444"
        />

        {/* Front Wheel Assembly */}
        <g transform="translate(238, 127)">
          <circle cx="0" cy="0" r="22" fill="#0F172A" />
          <circle cx="0" cy="0" r="14" fill="#64748B" />
          <circle cx="0" cy="0" r="7" fill="#CBD5E1" />
          <line x1="0" y1="-14" x2="0" y2="14" stroke="#475569" strokeWidth="2" />
          <line x1="-14" y1="0" x2="14" y2="0" stroke="#475569" strokeWidth="2" />
        </g>

        {/* Rear Wheel Assembly */}
        <g transform="translate(90, 127)">
          <circle cx="0" cy="0" r="22" fill="#0F172A" />
          <circle cx="0" cy="0" r="14" fill="#64748B" />
          <circle cx="0" cy="0" r="7" fill="#CBD5E1" />
          <line x1="0" y1="-14" x2="0" y2="14" stroke="#475569" strokeWidth="2" />
          <line x1="-14" y1="0" x2="14" y2="0" stroke="#475569" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
};
