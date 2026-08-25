/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      borderRadius: {
        none: '0',
        sm: '5px',
        DEFAULT: '6px',
        md: '7px',
        lg: '7px',
        xl: '7px',
        '2xl': '7px',
        '3xl': '7px',
        full: '9999px',
      },
      colors: {
        background: '#09090B',
        surface: {
          DEFAULT: '#18181B',
          hover: '#27272A',
          border: '#27272A',
          active: '#3F3F46',
        },
        brand: {
          DEFAULT: '#EF4444',
          hover: '#DC2626',
          subtle: 'rgba(239, 68, 68, 0.15)',
          border: 'rgba(239, 68, 68, 0.3)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.4', filter: 'drop-shadow(0 0 10px rgba(239, 68, 68, 0.5))' },
          '50%': { opacity: '0.8', filter: 'drop-shadow(0 0 20px rgba(239, 68, 68, 0.8))' },
        },
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0px) translateX(0px)', opacity: '0.3' },
          '50%': { transform: 'translateY(-20px) translateX(10px)', opacity: '0.7' },
        },
        floatMedium: {
          '0%, 100%': { transform: 'translateY(0px) translateX(0px)', opacity: '0.4' },
          '50%': { transform: 'translateY(-35px) translateX(-15px)', opacity: '0.8' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in': 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
        'float-slow': 'floatSlow 6s ease-in-out infinite',
        'float-medium': 'floatMedium 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
