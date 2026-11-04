// Applies Drizzle SQL migrations to Neon. Runs as part of `npm run vercel-build`,
// so every production deployment is guaranteed to have an up-to-date schema.
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';

const url = process.env.DATABASE_URL;
if (!url) {
  console.warn('[migrate] DATABASE_URL is not set — skipping migrations.');
  process.exit(0);
}

try {
  await migrate(drizzle(neon(url)), { migrationsFolder: './drizzle' });
  console.log('[migrate] Database is up to date.');
} catch (err) {
  console.error('[migrate] Migration failed:', err);
  process.exit(1);
}
