#!/bin/bash
# Browser end-to-end suites. Needs a local Postgres (see E2E_* in setup.js) and Playwright's Chromium.
#   bash e2e/run.sh            run everything
# The app talks to Neon over HTTP; for the run we temporarily swap src/db/index.ts for a plain `pg` connection
# and restore it afterwards (also on Ctrl-C), so nothing test-only is ever committed.
set -u
cd "$(dirname "$0")/.."
OUT=e2e/out; mkdir -p "$OUT"; OUT=$(cd "$OUT" && pwd)
PORT=3100
DBURL=${E2E_DB_URL:-postgresql://postgres@localhost:5544/homeops}
SECRET=localtestsecretlocaltestsecret1234
MAIL="RESEND_API_KEY=re_test RESEND_API_URL=http://localhost:4020/ EMAIL_FROM=t@test.dev"

cp src/db/index.ts "$OUT/db-index.orig"
cleanup() { pkill -f "next dev" 2>/dev/null; pkill -f e2e/mocks.js 2>/dev/null; cp "$OUT/db-index.orig" src/db/index.ts; : > .env.local; }
trap cleanup EXIT
cat > src/db/index.ts <<'TS'
import * as schema from './schema';
const req = eval('require');
const { Pool } = req('pg');
const { drizzle } = req('drizzle-orm/node-postgres');
export const db = drizzle(new Pool({ connectionString: process.env.DATABASE_URL }), { schema }) as any;
TS
node e2e/mocks.js "$OUT" >/dev/null 2>&1 &

start() { # start <extra env lines...>
  pkill -f "next dev" 2>/dev/null; sleep 1
  printf 'DATABASE_URL=%s\nNEXTAUTH_URL=http://localhost:%s\nNEXTAUTH_SECRET=%s\nADMIN_EMAILS=admin@test.dev\nCRON_SECRET=croncroncron\nHEALTH_KEY=probe-key-123\nSTRIPE_SECRET_KEY=sk_test_dummy\n' "$DBURL" "$PORT" "$SECRET" > .env.local
  for l in "$@"; do echo "$l" >> .env.local; done
  (npx next dev -p $PORT > "$OUT/dev.log" 2>&1 &)
  for i in $(seq 1 60); do curl -s -o /dev/null localhost:$PORT/login && break; sleep 1; done
}
mark_seen() { psql "$DBURL" -q -c "update profiles set welcome_seen_at=now(), checklist_dismissed_at=now()" >/dev/null 2>&1; }

FAILED=0
ONLY=" ${*:-} "
run() { # run <suite>   (bash e2e/run.sh side rel3  runs only those)
  local name=$1
  [ "$ONLY" != "  " ] && [[ "$ONLY" != *" $name "* ]] && return 0
  local res code; res=$(timeout 900 node e2e/suites/$name.js "$OUT" 2>&1); code=$?
  echo "$res" > "$OUT/$name.log"
  local ok fail; ok=$(echo "$res" | grep -c '^ok'); fail=$(echo "$res" | grep -c '^FAIL')
  printf '%-12s passed %-3s failed %s%s\n' "$name" "$ok" "$fail" "$([ $code != 0 ] && echo "  (exit $code)")"
  if [ "$fail" != 0 ] || [ "$ok" = 0 ] || [ $code != 0 ]; then FAILED=1; echo "$res" | grep -v '^ok' | head -8 | sed 's/^/    /'; fi
}

node e2e/setup.js --seed >/dev/null && start $MAIL && mark_seen
run rel17
echo; [ $FAILED = 0 ] && echo SUBSET PASSED || echo SUBSET FAILED
exit $FAILED
