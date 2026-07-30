import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': 'http://localhost:8787',
      '/tickets': 'http://localhost:8787',
      '/documents': 'http://localhost:8787',
      '/agent': 'http://localhost:8787',
      '/health': 'http://localhost:8787',
      '/uploads': 'http://localhost:8787',
    },
  },
})
