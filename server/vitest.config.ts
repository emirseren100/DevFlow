import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./src/test/setup.ts'],
    // Database tests share one test database, so files must not run in parallel.
    fileParallelism: false,
    // An unhandled rejection must fail the run instead of passing quietly.
    dangerouslyIgnoreUnhandledErrors: false,
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      // Coverage says which lines a test executed. It does not say the
      // behaviour is correct, so there is no threshold to game here.
      include: ['src/**/*.ts'],
      exclude: [
        'src/generated/**', // Prisma Client, generated on every schema change.
        'src/test/**',
        'src/**/*.types.ts', // Type-only modules compile to nothing.
        'src/server.ts', // Only opens the port; the app itself is tested.
      ],
    },
  },
});
