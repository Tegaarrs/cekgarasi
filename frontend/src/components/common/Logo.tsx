import React from 'react';

interface LogoProps {
  className?: string;
  showWordmark?: boolean;
  size?: 'sm' | 'md' | 'lg';
  alt?: string;
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  showWordmark = true,
  size = 'md',
  alt = 'CekGarasi',
}) => {
  const iconDimensions = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
  }[size];

  const textSize = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  }[size];

  return (
    <div className={`inline-flex items-center gap-2 font-bold tracking-tight select-none ${className}`} aria-label={alt}>
      <svg
        className={`${iconDimensions} flex-shrink-0 drop-shadow-sm`}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={alt}
      >
        <title>{alt}</title>
        {/* Rounded Container */}
        <rect width="40" height="40" rx="10" fill="#2563EB" />
        {/* Car Roof & Cabin */}
        <path
          d="M11 23L15.2 13.8C15.6 13.0 16.4 12.5 17.3 12.5H22.7C23.6 12.5 24.4 13.0 24.8 13.8L29 23H11Z"
          fill="#93C5FD"
        />
        {/* Car Body */}
        <path
          d="M9 22.5C9 21.7 9.7 21 10.5 21H29.5C30.3 21 31 21.7 31 22.5V26.5C31 27.3 30.3 28 29.5 28H10.5C9.7 28 9 27.3 9 26.5V22.5Z"
          fill="white"
        />
        {/* Headlight Left & Right */}
        <rect x="10.5" y="22.5" width="3.5" height="2" rx="1" fill="#FBBF24" />
        <rect x="26" y="22.5" width="3.5" height="2" rx="1" fill="#FBBF24" />
        {/* Wheels */}
        <circle cx="14" cy="28" r="3" fill="#1E293B" />
        <circle cx="14" cy="28" r="1.2" fill="#94A3B8" />
        <circle cx="26" cy="28" r="3" fill="#1E293B" />
        <circle cx="26" cy="28" r="1.2" fill="#94A3B8" />
      </svg>
      {showWordmark && (
        <span className={`${textSize} font-extrabold text-slate-900 dark:text-white tracking-tight`}>
          Cek<span className="text-blue-600">Garasi</span>
        </span>
      )}
    </div>
  );
};
