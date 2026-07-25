import { PrismaPg } from '@prisma/adapter-pg';

import { config } from '../config.js';
import { PrismaClient } from '../generated/prisma/client.js';

/**
 * One Prisma Client for the whole server. Prisma 7 talks to PostgreSQL through
 * a driver adapter, so the pg connection pool is created once here too.
 *
 * In development `tsx watch` reloads this module on every file change, which
 * would otherwise open a new pool each time, so the instance is cached on
 * globalThis.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: config.databaseUrl });

  return new PrismaClient({
    adapter,
    log: config.nodeEnv === 'development' ? ['warn', 'error'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (config.nodeEnv !== 'production') {
  globalForPrisma.prisma = prisma;
}
