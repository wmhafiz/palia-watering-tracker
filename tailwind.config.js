/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
        "./public/index.html"
    ],
    theme: {
        extend: {
            colors: {
                'palia-morning': '#fbbf24', // amber-400
                'palia-day': '#7dd3fc', // sky-300
                'palia-evening': '#f97316', // orange-500
                'palia-night': '#312e81', // indigo-900
            },
            animation: {
                'spin-slow': 'spin 60s linear infinite',
            }
        },
    },
    plugins: [],
}