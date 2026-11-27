import React from 'react';

interface SilutLogoProps {
  variant?: 'full' | 'compact' | 'mark';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Logotipo oficial de SILUT (Sistema de Información Lucy Tejada · Pereira).
 */
export const SilutLogo: React.FC<SilutLogoProps> = ({
  variant = 'full',
  size = 'md',
  className = '',
}) => {
  const iconSize =
    size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-11 h-11' : 'w-9 h-9';
  const titleSize =
    size === 'sm' ? 'text-[15px]' : size === 'lg' ? 'text-xl' : 'text-[17px]';
  const subSize =
    size === 'sm' ? 'text-[10px]' : size === 'lg' ? 'text-xs' : 'text-[11px]';

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${iconSize} shrink-0`}
        aria-hidden="true"
      >
        <rect width="48" height="48" rx="10" fill="#0F2440" />
        <path
          d="M14 33V20C14 15.5817 17.5817 12 22 12H26C30.4183 12 34 15.5817 34 20V33"
          stroke="#FFFFFF"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M20 33V21.5C20 19.2909 21.7909 17.5 24 17.5C26.2091 17.5 28 19.2909 28 21.5V33"
          stroke="#D2A75E"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M11 33.5H37"
          stroke="#B0843B"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>

      {variant !== 'mark' && (
        <div className="leading-none min-w-0">
          <span
            className={`font-display font-bold tracking-[0.04em] text-brand-navy block ${titleSize}`}
          >
            SILUT
          </span>
          {variant === 'full' && (
            <span className={`block text-gray-500 font-normal mt-1 truncate ${subSize}`}>
              Centro Cultural Lucy Tejada
            </span>
          )}
        </div>
      )}
    </div>
  );
};
