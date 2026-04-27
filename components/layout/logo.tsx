'use client'

interface LogoProps {
  variant?: 'full' | 'mark' | 'stacked'
  animated?: boolean
  size?: number
  className?: string
  gradient?: boolean
}

export function Logo({
  variant = 'full',
  animated = true,
  size = 36,
  className = '',
  gradient = true,
}: LogoProps) {
  const markOnly = variant === 'mark'
  const stacked = variant === 'stacked'
  const drawClass = animated ? 'ld-anim' : ''

  return (
    <span
      className={`ld-logo ${className}`}
      style={{
        display: 'inline-flex',
        flexDirection: stacked ? 'column' : 'row',
        alignItems: 'center',
        gap: '0.625rem',
        lineHeight: 1,
        fontFamily: 'var(--font-brand)',
      }}
      aria-label="LegalDoc"
      role="img"
    >
      <LogoMark size={size} drawClass={drawClass} />
      {!markOnly && (
        <span
          className={`${drawClass} ld-word`}
          style={{
            fontSize: `${stacked ? size * 0.45 : size * 0.5}px`,
            fontWeight: 600,
            letterSpacing: '-0.02em',
            backgroundImage: gradient
              ? 'linear-gradient(135deg, #F5F5F7 0%, #7EB8FF 48%, #49D6C8 100%)'
              : 'none',
            WebkitBackgroundClip: gradient ? 'text' : 'border-box',
            backgroundClip: gradient ? 'text' : 'border-box',
            WebkitTextFillColor: gradient ? 'transparent' : '#F5F5F7',
            color: gradient ? 'transparent' : '#F5F5F7',
            whiteSpace: 'nowrap',
          }}
        >
          LegalDoc
        </span>
      )}
      <style jsx>{`
        .ld-logo :global(svg path),
        .ld-logo :global(svg circle) {
          vector-effect: non-scaling-stroke;
        }

        .ld-logo :global(.ld-anim) {
          stroke-dasharray: 60;
          stroke-dashoffset: 60;
          opacity: 0;
          animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
          animation-fill-mode: both;
        }

        .ld-logo :global(.ld-col) {
          animation: ld-draw 0.72s 0s forwards;
        }
        .ld-logo :global(.ld-beam) {
          animation: ld-draw 0.72s 0.18s forwards;
        }
        .ld-logo :global(.ld-foot) {
          animation: ld-draw 0.72s 0.28s forwards;
        }
        .ld-logo :global(.ld-chain-l) {
          animation: ld-draw 0.6s 0.42s forwards;
        }
        .ld-logo :global(.ld-chain-r) {
          animation: ld-draw 0.6s 0.48s forwards;
        }
        .ld-logo :global(.ld-pan-l) {
          animation: ld-draw 0.72s 0.56s forwards;
        }
        .ld-logo :global(.ld-pan-r) {
          animation: ld-draw 0.72s 0.62s forwards;
        }

        .ld-logo :global(circle.ld-anim) {
          animation: ld-fade 0.5s 0.9s forwards;
        }

        .ld-logo :global(.ld-word.ld-anim) {
          stroke-dasharray: none;
          stroke-dashoffset: 0;
          transform: translateY(4px);
          animation: ld-word 0.6s 0.52s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes ld-draw {
          0% {
            stroke-dashoffset: 60;
            opacity: 0.15;
          }
          60% {
            opacity: 1;
          }
          100% {
            stroke-dashoffset: 0;
            opacity: 1;
          }
        }

        @keyframes ld-fade {
          from {
            opacity: 0;
            transform: scale(0.7);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes ld-word {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .ld-logo :global(.ld-anim) {
            animation: none !important;
            opacity: 1 !important;
            stroke-dashoffset: 0 !important;
            transform: none !important;
          }
        }
      `}</style>
    </span>
  )
}

function LogoMark({ size, drawClass }: { size: number; drawClass: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <path
        d="M24 10 L24 40"
        stroke="#F5F5F7"
        strokeWidth="2"
        strokeLinecap="round"
        className={`${drawClass} ld-col`}
      />
      <path
        d="M9 15 L39 15"
        stroke="#F5F5F7"
        strokeWidth="2"
        strokeLinecap="round"
        className={`${drawClass} ld-beam`}
      />
      <path
        d="M17 40 L31 40"
        stroke="#F5F5F7"
        strokeWidth="2"
        strokeLinecap="round"
        className={`${drawClass} ld-foot`}
      />
      <path
        d="M12 15 L12 24"
        stroke="rgba(245,245,247,0.7)"
        strokeWidth="1.25"
        strokeLinecap="round"
        className={`${drawClass} ld-chain-l`}
      />
      <path
        d="M6 24 Q12 30 18 24"
        stroke="#7EB8FF"
        strokeWidth="1.75"
        strokeLinecap="round"
        fill="none"
        className={`${drawClass} ld-pan-l`}
      />
      <path
        d="M36 15 L36 24"
        stroke="rgba(245,245,247,0.7)"
        strokeWidth="1.25"
        strokeLinecap="round"
        className={`${drawClass} ld-chain-r`}
      />
      <path
        d="M30 24 Q36 30 42 24"
        stroke="#49D6C8"
        strokeWidth="1.75"
        strokeLinecap="round"
        fill="none"
        className={`${drawClass} ld-pan-r`}
      />
      <circle cx="24" cy="10" r="2" fill="#007AFF" className={`${drawClass} ld-cap`} />
    </svg>
  )
}
