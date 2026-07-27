import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Only needed when the development database cannot create its own shadow
// database (for example the local `prisma dev` server). It is left out
// entirely when unset: an *empty* shadow URL is not the same as no shadow URL,
// and `prisma migrate deploy` refuses to run with one (`P1013`).
const shadowDatabaseUrl = process.env['SHADOW_DATABASE_URL']?.trim();

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
    ...(shadowDatabaseUrl ? { shadowDatabaseUrl } : {}),
  },
});
