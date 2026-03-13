import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // nrok47.github.io/HosHpc10.github.io/ → base ต้องเป็น /HosHpc10.github.io/
  base: '/HosHpc10.github.io/',
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
