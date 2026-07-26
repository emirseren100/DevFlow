import { loadTestEnv } from '../../prisma/testDbUrl.js';

/**
 * Runs before every test file, so `.env.test` is in place before any module
 * reads `process.env`. Tests that actually touch the database call
 * `requireTestDatabaseUrl()` themselves and fail loudly when it is missing.
 */
loadTestEnv();
