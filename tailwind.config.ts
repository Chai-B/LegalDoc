import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#080808',
        surface: '#0f0f0f',
        'surface-elevated': '#171717',
        card: '#141414',
        'card-hover': '#1a1a1a',
        'card-border': 'rgba(255,255,255,0.06)',
        'card-border-hover': 'rgba(255,255,255,0.12)',
        accent: '#007AFF',
        'accent-hover': '#0a84ff',
        'accent-muted': 'rgba(0,122,255,0.15)',
        'accent-glow': 'rgba(0,122,255,0.25)',
        iris: '#8B8CFF',
        'iris-muted': 'rgba(139,140,255,0.14)',
        teal: '#49D6C8',
        foreground: '#F5F5F7',
        secondary: '#E0E0E5',
        muted: '#86868B',
        'muted-dark': '#3A3A3C',
        separator: 'rgba(255,255,255,0.08)',
      },
      fontFamily: {
        sans: ['var(--font-brand)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        display: ['3.5rem', { lineHeight: '1.05', letterSpacing: '-0.03em', fontWeight: '700' }],
        'display-sm': ['2.5rem', { lineHeight: '1.1', letterSpacing: '-0.025em', fontWeight: '700' }],
        heading: ['1.5rem', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '600' }],
        label: ['0.6875rem', { lineHeight: '1.4', letterSpacing: '0.06em', fontWeight: '500' }],
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.16,1,0.3,1) forwards',
        shimmer: 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
        'card-hover': '0 4px 16px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)',
        blue: '0 0 24px rgba(0,122,255,0.2)',
        'blue-sm': '0 0 12px rgba(0,122,255,0.15)',
        soft: '0 18px 60px rgba(126,184,255,0.08)',
        inner: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      },
      backdropBlur: {
        xs: '4px',
      },
    },
  },
  plugins: [],
}
export default config
