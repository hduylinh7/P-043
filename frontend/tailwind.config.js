/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        pixel: ["'Pixelify Sans'", "'Press Start 2P'", "cursive", "sans-serif"],
        sans: ["'Plus Jakarta Sans'", "'Inter'", "sans-serif"],
      },
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#59B335',
          600: '#469627',
          700: '#34721c',
          900: '#14360a',
        },
        minecraft: {
          grass: '#59B335',
          grassDark: '#3B8721',
          grassBorder: '#2B6617',
          gold: '#FFA800',
          goldDark: '#D68900',
          goldBorder: '#B85C00',
          sky: '#3EA6E9',
          skyDark: '#2185C5',
          skyBorder: '#166193',
          cream: '#FDFBF7',
          creamDark: '#F2EDE4',
          obsidian: '#0F1710',
          obsidianCard: '#162218',
          obsidianBorder: '#233526',
        },
      },
      boxShadow: {
        'voxel-sm': '0 3px 0 0 var(--tw-shadow-color, #2B6617)',
        'voxel': '0 5px 0 0 var(--tw-shadow-color, #2B6617)',
        'voxel-lg': '0 8px 0 0 var(--tw-shadow-color, #2B6617)',
        'voxel-gold': '0 5px 0 0 #B85C00',
        'voxel-sky': '0 5px 0 0 #166193',
      },
    },
  },
  plugins: [],
};
