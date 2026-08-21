import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['functions/**', 'test/rules/**', 'node_modules/**', 'dist/**'],
    restoreMocks: true,
    clearMocks: true,
    maxWorkers: 1,
    pool: 'threads',
  },
});
