/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                slate: {
                    750: '#2d3748',
                    850: '#1a202c',
                    950: '#0f172a',
                },
                diff: {
                    add: 'rgba(16, 185, 129, 0.15)',
                    addText: '#6ee7b7',
                    addHighlight: 'rgba(16, 185, 129, 0.4)',
                    del: 'rgba(239, 68, 68, 0.15)',
                    delText: '#fca5a5',
                    delHighlight: 'rgba(239, 68, 68, 0.4)',
                }
            },
        },
    },
    plugins: [],
}
