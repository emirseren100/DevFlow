import { spawnSync } from 'node:child_process';

import { requireTestDatabaseUrl } from './testDbUrl.js';

/**
 * Applies the existing migrations to the dedicated test database.
 *
 * `migrate deploy` only replays committed migrations; it never resets or
 * rewrites anything, and it can only reach the test database because the URL is
 * checked first.
 */
const databaseUrl = requireTestDatabaseUrl();

const result = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
  stdio: 'inherit',
  // shell: true keeps `npx` resolvable on Windows, where it is a .cmd file.
  shell: true,
  env: { ...process.env, DATABASE_URL: databaseUrl },
});

process.exit(result.status ?? 1);
