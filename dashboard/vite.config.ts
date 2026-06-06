import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    proxy: {
      '/api': { target: 'http://161.132.53.226:8001', changeOrigin: true },
    },
  },
  build: { outDir: 'dist', sourcemap: false },
})
