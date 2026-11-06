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
  local res code; res=$(timeout 600 node e2e/suites/$name.js "$OUT" 2>&1); code=$?
  echo "$res" > "$OUT/$name.log"
  local ok fail; ok=$(echo "$res" | grep -c '^ok'); fail=$(echo "$res" | grep -c '^FAIL')
  printf '%-12s passed %-3s failed %s%s\n' "$name" "$ok" "$fail" "$([ $code != 0 ] && echo "  (exit $code)")"
  if [ "$fail" != 0 ] || [ "$ok" = 0 ] || [ $code != 0 ]; then FAILED=1; echo "$res" | grep -v '^ok' | head -8 | sed 's/^/    /'; fi
}

# Phase 1 - no e-mail service: accounts are created directly (auth1), starting from an empty database.
node e2e/setup.js >/dev/null && start && run auth1 && run legal
# Phase 2 - e-mail configured: confirmation links, resets, 2FA (auth2/auth3 build on each other), starting empty.
node e2e/setup.js >/dev/null && start $MAIL && run auth2 && run auth3
# Phase 3 - seeded users (admin/una/vic), mail on.
node e2e/setup.js --seed >/dev/null && start $MAIL && mark_seen
for s in brands e2e2 e2e3 side formkeep features adminfeat; do run $s; done
# rel1 exercises the welcome tour, so its users must not be pre-dismissed.
node e2e/setup.js --seed >/dev/null && start $MAIL
run rel1
# rel3 counts money and labels, so it also needs a database no other suite has touched.
node e2e/setup.js --seed >/dev/null && start $MAIL && mark_seen
run rel3
node e2e/setup.js --seed >/dev/null && start $MAIL && mark_seen
run rel4
node e2e/setup.js --seed >/dev/null && start $MAIL && mark_seen
run rel5
# Push + WhatsApp: mock Meta API and an HTTPS push service (self-signed, so TLS verification is relaxed for this phase only).
VAPID=$(node -e "const k=require('web-push').generateVAPIDKeys();console.log(k.publicKey+' '+k.privateKey)")
node e2e/setup.js --seed >/dev/null && start $MAIL WHATSAPP_ENABLED=1 WHATSAPP_TOKEN=wa_test WHATSAPP_PHONE_ID=123456 WHATSAPP_API_URL=http://localhost:4040 VAPID_PUBLIC_KEY=${VAPID% *} VAPID_PRIVATE_KEY=${VAPID#* } VAPID_SUBJECT=mailto:t@test.dev NODE_TLS_REJECT_UNAUTHORIZED=0 && mark_seen
run rel6
node e2e/setup.js --seed >/dev/null && start $MAIL && mark_seen
run layout
node e2e/setup.js --seed >/dev/null && start $MAIL && mark_seen
run rel7
run landing
node e2e/setup.js --seed >/dev/null && start $MAIL && mark_seen
run rel8
node e2e/setup.js --seed >/dev/null && start $MAIL && mark_seen
run rel9
APPLE_KEY=$(node -e "const c=require('crypto');console.log(c.generateKeyPairSync('ec',{namedCurve:'P-256'}).privateKey.export({type:'pkcs8',format:'pem'}).replace(/\n/g,'\\\\n'))")
node e2e/setup.js --seed >/dev/null && start $MAIL TURNSTILE_SITE_KEY=1x00000000000000000000AA TURNSTILE_SECRET_KEY=secret TURNSTILE_VERIFY_URL=http://localhost:4030/ APPLE_ID=cc.test.web APPLE_TEAM_ID=TEAM123456 APPLE_KEY_ID=KEY1234567 "APPLE_PRIVATE_KEY=$APPLE_KEY" APPLE_DOMAIN_ASSOCIATION=hello-apple
mark_seen; run rel2
echo; [ $FAILED = 0 ] && echo "ALL SUITES PASSED" || echo "SOME SUITES FAILED"
exit $FAILED
