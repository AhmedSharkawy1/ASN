/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            colors: {
                dark: { 900: '#060810', 800: '#0a0e1a', 700: '#0d1117', 600: '#161b22', 500: '#1c2333' },
                brand: { 400: '#34d399', 500: '#10b981', 600: '#059669' },
            },
            fontFamily: {
                sans: ['Inter', 'Segoe UI', 'sans-serif'],
                mono: ['JetBrains Mono', 'Courier New', 'monospace'],
            },
        },
    },
    plugins: [],
};
