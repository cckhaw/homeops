import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Neon's HTTP driver is stateless, which suits Vercel serverless/edge execution.
// The placeholder keeps `next build` working when DATABASE_URL isn't present;
// queries still fail loudly at runtime if it was never configured.
const sql = neon(process.env.DATABASE_URL ?? 'postgresql://user:pass@localhost.invalid/db');
export const db = drizzle(sql, { schema });
