import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Publicado no GitHub Pages em /missao/
export default defineConfig({
  base: '/missao/',
  plugins: [react()],
  test: { environment: 'jsdom' },
})
