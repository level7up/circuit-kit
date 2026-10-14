import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: './',
  build: {
    outDir: 'firmware/tempra_diag/data',
    emptyOutDir: true,
    assetsInlineLimit: 0,
    rollupOptions: { input: 'device.html' }
  }
})
