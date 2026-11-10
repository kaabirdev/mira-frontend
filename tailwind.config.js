/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.html', './src/js/**/*.js'],
  theme: {
    extend: {
      colors: {
        canvas: 'rgb(var(--c-canvas) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        sunken: 'rgb(var(--c-sunken) / <alpha-value>)',
        line: {
          DEFAULT: 'rgb(var(--c-line) / <alpha-value>)',
          strong: 'rgb(var(--c-line-strong) / <alpha-value>)',
        },
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        sub: 'rgb(var(--c-sub) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        primary: {
          DEFAULT: 'rgb(var(--c-primary) / <alpha-value>)',
          hover: 'rgb(var(--c-primary-hover) / <alpha-value>)',
          soft: 'rgb(var(--c-primary-soft) / <alpha-value>)',
        },
        onPrimary: 'rgb(var(--c-on-primary) / <alpha-value>)',
        link: 'rgb(var(--c-link) / <alpha-value>)',
        accent: 'rgb(var(--c-accent) / <alpha-value>)',
        success: {
          DEFAULT: 'rgb(var(--c-success) / <alpha-value>)',
          soft: 'rgb(var(--c-success-soft) / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'rgb(var(--c-warning) / <alpha-value>)',
          soft: 'rgb(var(--c-warning-soft) / <alpha-value>)',
        },
        danger: {
          DEFAULT: 'rgb(var(--c-danger) / <alpha-value>)',
          soft: 'rgb(var(--c-danger-soft) / <alpha-value>)',
        },
        info: {
          DEFAULT: 'rgb(var(--c-info) / <alpha-value>)',
          soft: 'rgb(var(--c-info-soft) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(15 23 42 / 0.04)',
        pop: '0 12px 32px -8px rgb(15 23 42 / 0.16), 0 2px 8px -2px rgb(15 23 42 / 0.08)',
      },
      maxWidth: {
        page: '1440px',
      },
      spacing: {
        4.5: '1.125rem',
      },
    },
  },
  plugins: [],
};
