export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        sand: '#f7efe6',
        clay: '#cc785c',
        ember: '#8e3f2b',
        ink: '#1f1d1a',
        moss: '#626f5a',
        cream: '#fff8f1'
      },
      boxShadow: {
        panel: '0 12px 40px rgba(53, 29, 18, 0.12)'
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"IBM Plex Sans"', 'sans-serif']
      }
    }
  },
  plugins: []
};
