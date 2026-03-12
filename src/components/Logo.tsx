import React from 'react'

interface LogoProps {
  /** Size of the icon square in px */
  iconSize?: number
  /** Show text alongside icon */
  showText?: boolean
  /** Text colour (defaults to white for dark backgrounds) */
  textColor?: string
  className?: string
}

/**
 * GreenTrace Lucid Sunset — V1 logo.
 * Icon: rounded orange square with a stylised palm-leaf / data-node motif.
 */
export default function Logo({
  iconSize = 32,
  showText = true,
  textColor = '#f4f4f5',
  className = '',
}: LogoProps) {
  const r = iconSize * 0.22 // corner radius

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Icon mark */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="gt-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="60%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#e11d48" />
          </linearGradient>
        </defs>
        {/* Background square */}
        <rect width="32" height="32" rx="7" fill="url(#gt-grad)" />

        {/* Palm leaf / data motif — overlapping arcs forming a leaf cluster */}
        {/* Central stem */}
        <line x1="16" y1="22" x2="16" y2="10" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        {/* Left leaf arc */}
        <path
          d="M16 18 Q9 14 10 8 Q14 10 16 18"
          fill="white"
          fillOpacity="0.9"
        />
        {/* Right leaf arc */}
        <path
          d="M16 18 Q23 14 22 8 Q18 10 16 18"
          fill="white"
          fillOpacity="0.75"
        />
        {/* Small data dot at base */}
        <circle cx="16" cy="23" r="1.5" fill="white" fillOpacity="0.8" />
      </svg>

      {/* Wordmark */}
      {showText && (
        <span
          style={{ color: textColor }}
          className="text-base font-semibold tracking-tight select-none"
        >
          GreenTrace
        </span>
      )}
    </div>
  )
}
