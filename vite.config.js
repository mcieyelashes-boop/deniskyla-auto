import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        // If the local api server isn't running, this fails gracefully —
        // the frontend falls back to simulation.
      },
    },
  },
})
