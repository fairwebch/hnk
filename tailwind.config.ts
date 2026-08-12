import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Navy scale (backgrounds)
        ink: {
          900: '#070E1D', // top contact bar / darkest
          800: '#0A1428', // footer / section dark
          700: '#0D1B33', // header
          600: '#0F213F', // cards on dark
        },
        // Croatian red (primary accent)
        croatia: {
          DEFAULT: '#D8232F',
          dark: '#B4121E',
        },
        // Blue (crest / secondary accent)
        royal: {
          DEFAULT: '#29377A',
          light: '#4971C1',
        },
        // Muted text / borders on navy
        slateblue: {
          50: '#C3CBDC',
          100: '#B9C3D9',
          200: '#9AA5BE',
          300: '#93A0BA',
          400: '#7E89A3',
          500: '#68748F',
          600: '#33415F',
          700: '#2C3D60',
          800: '#24365C',
          900: '#18274A',
        },
      },
      fontFamily: {
        sans: ['var(--font-barlow)', 'system-ui', 'sans-serif'],
        display: ['var(--font-barlow-condensed)', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        wider2: '0.12em',
        widest2: '0.22em',
        widest3: '0.32em',
      },
      boxShadow: {
        cta: '0 8px 20px rgba(216,35,47,.3)',
      },
      backgroundImage: {
        // Croatian checkerboard strip
        sahovnica:
          'repeating-conic-gradient(#D8232F 0% 25%, #FFFFFF 0% 50%) 0 0 / 16px 16px',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up .5s ease both',
      },
    },
  },
  plugins: [],
};

export default config;
