/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: process.env.DARK_MODE ? process.env.DARK_MODE : 'media',
  // Adapted from gluestack-ui's template, which defaults to an
  // app/components/utils layout this project doesn't have - actual source
  // lives under src/ and the root App.tsx.
  content: ['./src/**/*.{js,jsx,ts,tsx}', './App.tsx'],
  presets: [require('nativewind/preset')],
  important: 'html',
  safelist: [
    {
      pattern:
        /(bg|border|text|stroke|fill)-(foreground|card|popover|muted|destructive|border|input|ring|white|chart|sidebar|primary|secondary|typography|background|accent)(\/\d+)?$/,
    },
    {
      pattern:
        /(bg|border|text|stroke|fill)-(card|popover|muted|destructive|primary|secondary|accent|sidebar)-(foreground)(\/\d+)?$/,
    },
  ],
  theme: {
    extend: {
      colors: {
        foreground: 'rgb(var(--foreground)/<alpha-value>)',
        card: {
          DEFAULT: 'rgb(var(--card) / <alpha-value>)',
          foreground: 'rgb(var(--card-foreground) / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'rgb(var(--popover) / <alpha-value>)',
          foreground: 'rgb(var(--popover-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'rgb(var(--muted) / <alpha-value>)',
          foreground: 'rgb(var(--muted-foreground) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'rgb(var(--destructive) / <alpha-value>)',
        },
        border: 'rgb(var(--border)/<alpha-value>)',
        input: 'rgb(var(--input)/<alpha-value>)',
        ring: 'rgb(var(--ring) / <alpha-value>)',
        white: 'rgb(255 255 255)',
        chart: {
          1: 'rgb(var(--chart-1) / <alpha-value>)',
          2: 'rgb(var(--chart-2) / <alpha-value>)',
          3: 'rgb(var(--chart-3) / <alpha-value>)',
          4: 'rgb(var(--chart-4) / <alpha-value>)',
          5: 'rgb(var(--chart-5) / <alpha-value>)',
        },
        sidebar: {
          'DEFAULT': 'rgb(var(--sidebar) / <alpha-value>)',
          'foreground': 'rgb(var(--sidebar-foreground) / <alpha-value>)',
          'primary': 'rgb(var(--sidebar-primary) / <alpha-value>)',
          'primary-foreground':
            'rgb(var(--sidebar-primary-foreground) / <alpha-value>)',
          'accent': 'rgb(var(--sidebar-accent) / <alpha-value>)',
          'accent-foreground':
            'rgb(var(--sidebar-accent-foreground) / <alpha-value>)',
          'border': 'rgb(var(--sidebar-border))',
          'ring': 'rgb(var(--sidebar-ring) / <alpha-value>)',
        },
        primary: {
          DEFAULT: 'rgb(var(--primary)/<alpha-value>)',
          foreground: 'rgb(var(--primary-foreground)/<alpha-value>)',
        },
        secondary: {
          DEFAULT: 'rgb(var(--secondary)/<alpha-value>)',
          foreground: 'rgb(var(--secondary-foreground)/<alpha-value>)',
        },
        background: {
          DEFAULT: 'rgb(var(--background)/<alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent)/<alpha-value>)',
          foreground: 'rgb(var(--accent-foreground)/<alpha-value>)',
        },
      },
      boxShadow: {
        'hard-1': '-2px 2px 8px 0px rgba(38, 38, 38, 0.20)',
        'hard-2': '0px 3px 10px 0px rgba(38, 38, 38, 0.20)',
        'hard-3': '2px 2px 8px 0px rgba(38, 38, 38, 0.20)',
        'hard-4': '0px -3px 10px 0px rgba(38, 38, 38, 0.20)',
        'hard-5': '0px 2px 10px 0px rgba(38, 38, 38, 0.10)',
        'soft-1': '0px 0px 10px rgba(38, 38, 38, 0.1)',
        'soft-2': '0px 0px 20px rgba(38, 38, 38, 0.2)',
        'soft-3': '0px 0px 30px rgba(38, 38, 38, 0.1)',
        'soft-4': '0px 0px 40px rgba(38, 38, 38, 0.1)',
      },
    },
  },
};
