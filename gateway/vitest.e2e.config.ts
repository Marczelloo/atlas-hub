import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/__tests__/**/*.test.ts'],
    testTimeout: 30000, // 30s for e2e tests
    hookTimeout: 30000,
    fileParallelism: false, // Run test files sequentially
    coverage: {
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/db/migrations/**', 'src/__tests__/**'],
    },
  },
});
