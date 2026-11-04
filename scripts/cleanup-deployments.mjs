// Deletes every Vercel deployment of the project except the newest READY production one.
// Only run AFTER that deployment is live. Set DRY_RUN=1 to list without deleting.
const { VERCEL_TOKEN, VERCEL_PROJECT_ID } = process.env;
const TEAM = process.env.VERCEL_TEAM_ID || process.env.VERCEL_ORG_ID;
const KEEP = process.argv[2] || process.env.KEEP_DEPLOYMENT_ID; // optional explicit deployment id/url to keep
const DRY = process.env.DRY_RUN === '1';

if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
  console.error('VERCEL_TOKEN and VERCEL_PROJECT_ID are required');
  process.exit(1);
}

const api = async (path, init = {}) => {
  const sep = path.includes('?') ? '&' : '?';
  const res = await fetch(`https://api.vercel.com${path}${TEAM ? `${sep}teamId=${TEAM}` : ''}`, {
    ...init,
    headers: { Authorization: `Bearer ${VERCEL_TOKEN}`, ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${path} -> ${res.status} ${await res.text()}`);
  return res.json();
};

const all = [];
let until;
for (;;) {
  const page = await api(`/v6/deployments?projectId=${VERCEL_PROJECT_ID}&limit=100${until ? `&until=${until}` : ''}`);
  all.push(...page.deployments);
  if (!page.pagination?.next) break;
  until = page.pagination.next;
}
all.sort((a, b) => b.created - a.created);

const matchesKeep = (d) => KEEP && (d.uid === KEEP || d.url === KEEP.replace(/^https?:\/\//, ''));
const keep = KEEP ? all.find(matchesKeep) : all.find((d) => d.target === 'production' && d.state === 'READY');
if (!keep) {
  console.error('No live production deployment found — refusing to delete anything.');
  process.exit(1);
}
if (keep.state !== 'READY') {
  console.error(`Deployment ${keep.uid} is ${keep.state}, not READY — refusing to delete anything.`);
  process.exit(1);
}
console.log(`Keeping ${keep.uid} (${keep.url}) created ${new Date(keep.created).toISOString()}`);

const doomed = all.filter((d) => d.uid !== keep.uid);
console.log(`${doomed.length} deployment(s) to delete${DRY ? ' (dry run)' : ''}.`);
let failed = 0;
for (const d of doomed) {
  if (DRY) {
    console.log(`  would delete ${d.uid} ${d.url} [${d.target ?? 'preview'}/${d.state}]`);
    continue;
  }
  try {
    await api(`/v13/deployments/${d.uid}`, { method: 'DELETE' });
    console.log(`  deleted ${d.uid} ${d.url}`);
  } catch (e) {
    failed++;
    console.warn(`  could not delete ${d.uid}: ${e.message}`);
  }
}
process.exit(failed ? 1 : 0);
