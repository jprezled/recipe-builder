import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  server: {
    // Anything starting with /api is forwarded to the Java backend on 8080.
    //
    // This is why our code always writes fetch('/api/...') and never
    // fetch('http://localhost:8080/api/...'). The browser only ever talks to
    // 5173, so it sees a single origin and CORS never applies. Hardcoding the
    // full URL bypasses this proxy and breaks deployment later.
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },

  test: {
    // jsdom gives the tests a fake DOM, so components can be rendered and
    // queried without a real browser.
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.js',
  },
})
