import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Allow running the dev server through the Projects/deniskyla-auto junction.
  resolve: { preserveSymlinks: true },
  preview: {
    port: 5180,
  },
  server: {
    port: 5180,
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
