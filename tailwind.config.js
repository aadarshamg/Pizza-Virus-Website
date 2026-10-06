/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,jsx}'],
    theme: {
        extend: {
            colors: {
                // Brand greens - same values as customer-app / admin-portal
                brand: {
                    DEFAULT: '#22973a',
                    light: '#48d23c',
                    cta: '#00b050',
                    cream: '#f3feb0',
                    50: '#f0fdf4',
                    100: '#dcfce7',
                },
                ink: '#0f172a',
                // Bold theme (matches the hero)
                pv: { ink: '#0f3d1a', yellow: '#FFE14D', cream: '#FFF8EE', spot: '#1e8a34' },
            },
            fontFamily: {
                sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
                display: ['"Bricolage Grotesque"', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
            },
            keyframes: {
                marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
                float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-12px)' } },
                crossfade: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
                sweep: { '0%': { left: '-35%' }, '60%, 100%': { left: '120%' } },
                'sheet-up': { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
                kenburns: { from: { transform: 'scale(1.18)' }, to: { transform: 'scale(1.04)' } },
            },
            animation: {
                marquee: 'marquee 40s linear infinite',
                'spin-slow': 'spin 60s linear infinite',
                float: 'float 5s ease-in-out infinite',
                'float-delayed': 'float 6s ease-in-out 1.5s infinite',
                crossfade: 'crossfade 0.45s ease-out',
                sweep: 'sweep 3.2s ease-in-out infinite',
                'sheet-up': 'sheet-up 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
            },
            boxShadow: {
                card: '5px 5px 0 #0f3d1a',
                brut: '5px 5px 0 #0f3d1a',
                'brut-sm': '3px 3px 0 #0f3d1a',
                'brut-lg': '8px 8px 0 #0f3d1a',
            },
        },
    },
    plugins: [],
}
