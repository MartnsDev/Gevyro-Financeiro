#!/usr/bin/env bash
# Self-contained disposable cluster. Never connects to an existing database.
set -euo pipefail
gevyro_root=$(cd "$(dirname "$0")/.." && pwd)
gevyro_bin=$(pg_config --bindir)
gevyro_tmp=$(mktemp -d /tmp/gevyro-rls-db.XXXXXX)
cleanup(){ "$gevyro_bin/pg_ctl" -D "$gevyro_tmp/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$gevyro_tmp"; }
trap cleanup EXIT INT TERM
"$gevyro_bin/initdb" -D "$gevyro_tmp/data" --auth=trust --no-instructions >"$gevyro_tmp/init.log"
"$gevyro_bin/pg_ctl" -D "$gevyro_tmp/data" -l "$gevyro_tmp/server.log" -o "-k $gevyro_tmp -p 55438 -h ''" -w start >/dev/null
python3 - "$gevyro_root" "$gevyro_tmp" <<'PY'
from pathlib import Path
import sys
root,tmp=map(Path,sys.argv[1:])
s=(root/'supabase/tests/rls.integration.sql').read_text().replace('public.load_workspace','public.gevyro_load_workspace').replace('public.save_workspace','public.gevyro_save_workspace')
for e in ['workspace_meta','audit_log','accounts','cards','plans','obligations','payments','transfers','goals','budgets','assets','scenarios']:s=s.replace('public.'+e,'gevyro_finance.'+e)
(tmp/'rls.sql').write_text(s)
(tmp/'jwt.sql').write_text("create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$; grant execute on function auth.jwt() to authenticated;")
PY
if ! "$gevyro_bin/psql" -h "$gevyro_tmp" -p 55438 -d postgres -v ON_ERROR_STOP=1 \
 -f "$gevyro_root/supabase/tests/bootstrap.sql" -f "$gevyro_tmp/jwt.sql" \
 -f "$gevyro_root/supabase/migrations/202611220001_shared_mcell.sql" \
 -f "$gevyro_root/supabase/migrations/202611220002_financial_events.sql" \
 -f "$gevyro_tmp/rls.sql" -f "$gevyro_root/supabase/tests/events.integration.sql" \
 -f "$gevyro_root/supabase/migrations/202611220003_google_access.sql" \
 -f "$gevyro_root/supabase/migrations/20261122180826_gevyro_private_rpc.sql" \
 -f "$gevyro_root/supabase/migrations/20261122185409_gevyro_linked_google_sessions.sql" -f "$gevyro_root/supabase/tests/google.integration.sql" >"$gevyro_tmp/results.log" 2>&1; then tail -80 "$gevyro_tmp/results.log"; exit 1; fi
sed -n '/PASS:/p' "$gevyro_tmp/results.log"
echo 'PASS: isolated Gevyro migrations, atomicity, history, Google-only authorization and RLS.'
