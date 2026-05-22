/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Background layers — Dracula Neon palette
        bg: {
          base:     '#161B22',
          app:      '#161B22',
          surface:  '#1E2430',
          elevated: '#202938',
          overlay:  '#243042'
        },
        // Border
        border: {
          subtle:  '#1D2635',
          DEFAULT: '#253043',
          strong:  '#2E3D55'
        },
        // Text — Dracula Neon
        text: {
          primary:   '#E6EDF3',
          secondary: '#9BA7B4',
          muted:     '#6B7C8E',
          disabled:  '#435060',
          inverse:   '#161B22'
        },
        // Accent — neon blue
        accent: {
          50:      '#e0faff',
          100:     '#b3f4ff',
          200:     '#80edff',
          300:     '#4de7ff',
          400:     '#26e1ff',
          DEFAULT: '#00D8FF',
          600:     '#00C3E6',
          700:     '#00AACC',
          800:     '#0090B3',
          900:     '#007799'
        },
        // Neon family (use for glow effects, highlights)
        neon: {
          blue:   '#00D8FF',
          purple: '#BD93F9',
          green:  '#50FA7B',
          pink:   '#FF79C6',
          orange: '#FFB86C',
          red:    '#FF5555',
          yellow: '#F1FA8C'
        },
        // Semantic state colors
        success: {
          light:   '#b9f2cc',
          DEFAULT: '#50FA7B',
          dark:    '#22c55e',
          bg:      '#0d2318'
        },
        error: {
          light:   '#fecdd3',
          DEFAULT: '#FF5555',
          dark:    '#dc2626',
          bg:      '#2d0a0a'
        },
        warning: {
          light:   '#fef3c7',
          DEFAULT: '#FFB86C',
          dark:    '#d97706',
          bg:      '#2d1a02'
        },
        info: {
          light:   '#b3f4ff',
          DEFAULT: '#00D8FF',
          dark:    '#0891b2',
          bg:      '#061e24'
        },
        // PHP framework badges
        framework: {
          laravel:   '#ff2d20',
          symfony:   '#6C6EDE',
          wordpress: '#21759b',
          plain:     '#BD93F9'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', 'monospace']
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }],
        xs:    ['11px', { lineHeight: '16px' }],
        sm:    ['12px', { lineHeight: '18px' }],
        base:  ['13px', { lineHeight: '20px' }],
        md:    ['14px', { lineHeight: '22px' }],
        lg:    ['16px', { lineHeight: '24px' }],
        xl:    ['18px', { lineHeight: '28px' }],
        '2xl': ['22px', { lineHeight: '32px' }]
      },
      spacing: {
        px:  '1px',
        0.5: '2px',
        1:   '4px',
        1.5: '6px',
        2:   '8px',
        2.5: '10px',
        3:   '12px',
        3.5: '14px',
        4:   '16px',
        5:   '20px',
        6:   '24px',
        7:   '28px',
        8:   '32px',
        9:   '36px',
        10:  '40px',
        11:  '44px',
        12:  '48px'
      },
      borderRadius: {
        none: '0',
        sm:   '4px',
        DEFAULT: '6px',
        md:   '8px',
        lg:   '10px',
        xl:   '12px',
        '2xl': '14px',
        full: '9999px'
      },
      boxShadow: {
        sm:         '0 1px 2px 0 rgb(0 0 0 / 0.4)',
        DEFAULT:    '0 2px 4px 0 rgb(0 0 0 / 0.5)',
        md:         '0 4px 8px 0 rgb(0 0 0 / 0.5)',
        lg:         '0 8px 16px 0 rgb(0 0 0 / 0.6)',
        xl:         '0 12px 24px 0 rgb(0 0 0 / 0.7)',
        inner:      'inset 0 1px 2px 0 rgb(0 0 0 / 0.5)',
        'neon-blue':   '0 0 0 1px rgba(0,216,255,0.15), 0 0 12px rgba(0,216,255,0.08)',
        'neon-purple': '0 0 0 1px rgba(189,147,249,0.15), 0 0 12px rgba(189,147,249,0.08)',
        'neon-green':  '0 0 0 1px rgba(80,250,123,0.15), 0 0 12px rgba(80,250,123,0.08)',
        glow:       '0 0 0 1px #00D8FF, 0 0 12px rgba(0,216,255,0.3)'
      },
      animation: {
        'spin-slow':    'spin 1.5s linear infinite',
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in':      'fadeIn 0.15s ease-out',
        'slide-up':     'slideUp 0.2s ease-out',
        'neon-pulse':   'neonPulse 3s ease-in-out infinite'
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        neonPulse: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.65' }
        }
      },
      transitionDuration: {
        fast:    '100ms',
        DEFAULT: '150ms',
        slow:    '250ms'
      }
    }
  },
  plugins: []
}
