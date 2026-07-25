import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Empty string keeps offline commands (format, validate, generate) working;
    // commands that really need a connection fail with Prisma's own message.
    url: process.env['DATABASE_URL'] ?? '',
    // Optional: only needed when the development database cannot create its own
    // shadow database (for example the local `prisma dev` server).
    shadowDatabaseUrl: process.env['SHADOW_DATABASE_URL'] ?? '',
  },
});
