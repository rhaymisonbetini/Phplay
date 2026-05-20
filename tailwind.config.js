/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Background layers — from deepest to shallowest
        bg: {
          base: '#0f0f10',
          app: '#18181b',
          surface: '#1e1e21',
          elevated: '#27272a',
          overlay: '#2d2d30'
        },
        // Border shades
        border: {
          subtle: '#2a2a2d',
          DEFAULT: '#3f3f46',
          strong: '#52525b'
        },
        // Text hierarchy
        text: {
          primary: '#f4f4f5',
          secondary: '#a1a1aa',
          muted: '#71717a',
          disabled: '#52525b',
          inverse: '#09090b'
        },
        // Brand accent — emerald
        accent: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          DEFAULT: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b'
        },
        // Semantic state colors
        success: {
          light: '#bbf7d0',
          DEFAULT: '#22c55e',
          dark: '#15803d',
          bg: '#052e16'
        },
        error: {
          light: '#fecdd3',
          DEFAULT: '#f43f5e',
          dark: '#be123c',
          bg: '#2d0a14'
        },
        warning: {
          light: '#fde68a',
          DEFAULT: '#f59e0b',
          dark: '#b45309',
          bg: '#2d1a02'
        },
        info: {
          light: '#bae6fd',
          DEFAULT: '#0ea5e9',
          dark: '#0369a1',
          bg: '#082032'
        },
        // PHP framework badges
        framework: {
          laravel: '#ff2d20',
          symfony: '#000000',
          wordpress: '#21759b',
          plain: '#8892be'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', 'monospace']
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }],
        xs: ['11px', { lineHeight: '16px' }],
        sm: ['12px', { lineHeight: '18px' }],
        base: ['13px', { lineHeight: '20px' }],
        md: ['14px', { lineHeight: '22px' }],
        lg: ['16px', { lineHeight: '24px' }],
        xl: ['18px', { lineHeight: '28px' }],
        '2xl': ['22px', { lineHeight: '32px' }]
      },
      spacing: {
        px: '1px',
        0.5: '2px',
        1: '4px',
        1.5: '6px',
        2: '8px',
        2.5: '10px',
        3: '12px',
        3.5: '14px',
        4: '16px',
        5: '20px',
        6: '24px',
        7: '28px',
        8: '32px',
        9: '36px',
        10: '40px',
        11: '44px',
        12: '48px'
      },
      borderRadius: {
        none: '0',
        sm: '2px',
        DEFAULT: '4px',
        md: '6px',
        lg: '8px',
        xl: '12px',
        full: '9999px'
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.4)',
        DEFAULT: '0 2px 4px 0 rgb(0 0 0 / 0.5)',
        md: '0 4px 8px 0 rgb(0 0 0 / 0.5)',
        lg: '0 8px 16px 0 rgb(0 0 0 / 0.6)',
        xl: '0 12px 24px 0 rgb(0 0 0 / 0.7)',
        inner: 'inset 0 1px 2px 0 rgb(0 0 0 / 0.5)',
        glow: '0 0 0 1px #10b981, 0 0 8px rgb(16 185 129 / 0.3)'
      },
      animation: {
        'spin-slow': 'spin 1.5s linear infinite',
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.15s ease-out',
        'slide-up': 'slideUp 0.2s ease-out'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      },
      transitionDuration: {
        fast: '100ms',
        DEFAULT: '150ms',
        slow: '250ms'
      }
    }
  },
  plugins: []
}
