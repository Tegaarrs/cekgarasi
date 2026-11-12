import React from 'react';

interface LogoProps {
  className?: string;
  showWordmark?: boolean;
  size?: 'sm' | 'md' | 'lg';
  alt?: string;
  wordmarkClassName?: string;
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  showWordmark = true,
  size = 'md',
  alt = 'CekGarasi',
  wordmarkClassName = '',
}) => {
  const iconDimensions = {
    sm: 'w-7 h-7',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  }[size];

  const textSize = {
    sm: 'text-base font-bold',
    md: 'text-lg font-bold',
    lg: 'text-2xl font-extrabold',
  }[size];

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`} aria-label={alt}>
      {/* Clean Emblem without overlapping dots */}
      <div className="relative flex-shrink-0">
        <img
          src="/images/logo.png"
          alt={alt}
          className={`${iconDimensions} flex-shrink-0 object-cover rounded-full shadow-sm ring-1 ring-white/20 bg-zinc-900`}
          onError={(e) => {
            const target = e.currentTarget as HTMLImageElement;
            if (!target.src.endsWith('/logo.png')) {
              target.src = '/logo.png';
            }
          }}
        />
      </div>

      {showWordmark && (
        <span className={`tracking-tight ${textSize} ${wordmarkClassName || 'text-white'}`}>
          CekGarasi
        </span>
      )}
    </div>
  );
};
