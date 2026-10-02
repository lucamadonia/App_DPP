/// <reference types="vitest/config" />
import path from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    globals: true,
    // jsdom + lazy route imports are slow on cold Windows runs; 5s default flakes.
    testTimeout: 15000,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/test/**',
        'src/**/*.d.ts',
        'src/vite-env.d.ts',
        'src/main.tsx',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
