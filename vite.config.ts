import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5787,
    host: true,
    hmr: false,
    proxy: {
      '/api': {
        target: 'http://localhost:5788',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:5788',
        ws: true,
      },
    },
    allowedHosts: ['.yue.center']
  },
  build: {
    outDir: 'dist/client',
    emptyOutDir: true,
  },
})
