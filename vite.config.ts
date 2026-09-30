import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: './',
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.spec.ts'],
    coverage: { provider: 'v8', include: ['src/**/*.{ts,vue}'] }
  }
})
