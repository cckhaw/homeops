// Resets the e2e database: drops/creates it, applies every migration, and (with --seed) adds the shared test users.
//   node e2e/setup.js [--seed]
const { Client } = require('pg');
const { readdirSync, readFileSync } = require('fs');
const { scryptSync, randomBytes } = require('crypto');
const path = require('path');

const ADMIN_URL = process.env.E2E_ADMIN_URL || 'postgresql://postgres@localhost:5544/postgres';
const DB_URL = process.env.E2E_DB_URL || 'postgresql://postgres@localhost:5544/homeops';
const dbName = new URL(DB_URL).pathname.slice(1);

/** Same format as src/lib/security.ts hashPassword (scrypt N=16384 r=8 p=1). Every seeded user's password is below. */
const PASSWORD = 'correct horse battery staple';
function hash(pw) {
  const salt = randomBytes(16);
  const h = scryptSync(pw.normalize('NFKC'), salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$16384$8$1$${salt.toString('base64')}$${h.toString('base64')}`;
}

(async () => {
  const admin = new Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await admin.query('select pg_terminate_backend(pid) from pg_stat_activity where datname=$1 and pid<>pg_backend_pid()', [dbName]);
  await admin.query(`drop database if exists "${dbName}"`);
  await admin.query(`create database "${dbName}"`);
  await admin.end();

  const db = new Client({ connectionString: DB_URL });
  await db.connect();
  const dir = path.join(__dirname, '..', 'drizzle');
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    await db.query(readFileSync(path.join(dir, f), 'utf8').replace(/--> statement-breakpoint/g, ''));
  }
  if (process.argv.includes('--seed')) {
    await db.query(
      `insert into profiles(id,email,full_name,is_admin,email_verified_at,password_hash) values
       (gen_random_uuid(),'admin@test.dev','Ada Admin',true,now(),$1),
       (gen_random_uuid(),'una@test.dev','Una User',false,now(),$1),
       (gen_random_uuid(),'vic@test.dev','Vic Victim',false,now(),$1)`,
      [hash(PASSWORD)],
    );
  }
  await db.end();
  console.log(`database "${dbName}" ready${process.argv.includes('--seed') ? ' (seeded: admin/una/vic @test.dev)' : ''}`);
})().catch((e) => { console.error(e); process.exit(1); });
