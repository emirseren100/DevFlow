import { existsSync } from 'node:fs';
import path from 'node:path';

import dotenv from 'dotenv';

/**
 * Safety guard shared by the test setup and by `db:test:prepare`.
 *
 * The tests delete rows, so they must never be pointed at the development
 * database by accident. The only accepted database is one whose URL clearly
 * names `devflow_test`.
 */
export const TEST_DATABASE_MARKER = 'devflow_test';

const envTestPath = path.resolve(process.cwd(), '.env.test');

export function loadTestEnv(): void {
  if (!existsSync(envTestPath)) {
    return;
  }

  // override: the test database URL must win over any value from `.env`.
  dotenv.config({ path: envTestPath, override: true, quiet: true });
}

export function requireTestDatabaseUrl(): string {
  loadTestEnv();

  const url = process.env.DATABASE_URL ?? '';

  if (!url) {
    throw new Error(
      'No DATABASE_URL for tests. Copy server/.env.test.example to server/.env.test first.',
    );
  }

  if (!url.includes(TEST_DATABASE_MARKER)) {
    throw new Error(
      `Refusing to run against "${url.replace(/:\/\/[^@]*@/, '://***@')}": the test ` +
        `database URL must contain "${TEST_DATABASE_MARKER}". The development database is ` +
        'never used or cleaned by tests.',
    );
  }

  return url;
}
