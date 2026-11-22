#!/usr/bin/env bash
# Uses a temporary PostgreSQL cluster only. Never connects to Supabase or existing databases.
set -euo pipefail
gevyro_root=$(cd "$(dirname "$0")/.." && pwd)
mcell_root=${MCELL_SOURCE_DIR:-"$(dirname "$gevyro_root")/Martins Cell"}
gevyro_bin=$(pg_config --bindir)
gevyro_tmp=$(mktemp -d /tmp/gevyro-mcell-db.XXXXXX)
cleanup(){ "$gevyro_bin/pg_ctl" -D "$gevyro_tmp/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$gevyro_tmp"; }
trap cleanup EXIT INT TERM
"$gevyro_bin/initdb" -D "$gevyro_tmp/data" --auth=trust --no-instructions >"$gevyro_tmp/init.log"
"$gevyro_bin/pg_ctl" -D "$gevyro_tmp/data" -l "$gevyro_tmp/server.log" -o "-k $gevyro_tmp -p 55439 -h ''" -w start >/dev/null
python3 - "$mcell_root" "$gevyro_root" "$gevyro_tmp" <<'PY'
from pathlib import Path
import sys
mc,gf,tmp=map(Path,sys.argv[1:])
source=(mc/'scripts/test-commerce-db.sh').read_text()
bootstrap=source.split('cat > "$mc_dir/bootstrap.sql" <<\'SQL\'\n',1)[1].split('\nSQL',1)[0]
(tmp/'bootstrap.sql').write_text(bootstrap + "\ncreate or replace function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;\ngrant execute on function auth.jwt() to authenticated;\n")
s=(gf/'supabase/tests/rls.integration.sql').read_text().replace('public.load_workspace','public.gevyro_load_workspace').replace('public.save_workspace','public.gevyro_save_workspace')
for e in ['workspace_meta','audit_log','accounts','cards','plans','obligations','payments','transfers','goals','budgets','assets','scenarios']:s=s.replace('public.'+e,'gevyro_finance.'+e)
(tmp/'gevyro-tests.sql').write_text(s)
PY
cat > "$gevyro_tmp/before.sql" <<'SQL'
create temp table mcell_baseline(relation text primary key,fingerprint text);
do $$ declare t record; value text; begin
 for t in select schemaname,tablename from pg_tables where schemaname='public' loop
  execute format('select md5(coalesce(string_agg(to_jsonb(r)::text,'''' order by to_jsonb(r)::text),'''')) from %I.%I r',t.schemaname,t.tablename) into value;
  insert into mcell_baseline values(t.tablename,value);
 end loop;
end $$;
create temp table mcell_functions as select oid,prosrc from pg_proc where pronamespace='public'::regnamespace;
SQL
cat > "$gevyro_tmp/after.sql" <<'SQL'
do $$ declare t record; actual text; begin
 for t in select * from mcell_baseline loop
  execute format('select md5(coalesce(string_agg(to_jsonb(r)::text,'''' order by to_jsonb(r)::text),'''')) from public.%I r',t.relation) into actual;
  if actual<>t.fingerprint then raise exception 'MCell data changed: %',t.relation; end if;
 end loop;
 if exists(select 1 from mcell_functions old left join pg_proc p on p.oid=old.oid where p.oid is null or old.prosrc<>p.prosrc) then raise exception 'Existing public routine changed'; end if;
 if exists(select 1 from pg_tables where schemaname='public' and tablename not in (select relation from mcell_baseline)) then raise exception 'Gevyro table leaked into public'; end if;
 if not exists(select 1 from pg_tables where schemaname='gevyro_finance' and tablename='accounts') then raise exception 'Missing isolated schema'; end if;
end $$;
select 'PASS: MCell table contents and existing public routines preserved, Gevyro isolated' as result;
SQL
args=(-f "$gevyro_tmp/bootstrap.sql")
for migration in "$mcell_root"/supabase/migrations/*.sql; do args+=(-f "$migration"); done
args+=(-f "$gevyro_tmp/before.sql" -f "$gevyro_root/supabase/migrations/202611220001_shared_mcell.sql" -f "$gevyro_root/supabase/migrations/202611220002_financial_events.sql" -f "$gevyro_tmp/gevyro-tests.sql" -f "$gevyro_root/supabase/tests/events.integration.sql" -f "$gevyro_root/supabase/migrations/202611220003_google_access.sql" -f "$gevyro_root/supabase/migrations/20261122180826_gevyro_private_rpc.sql" -f "$gevyro_root/supabase/migrations/20261122185409_gevyro_linked_google_sessions.sql" -f "$gevyro_root/supabase/migrations/20261122195625_gevyro_financial_control.sql" -f "$gevyro_root/supabase/tests/google.integration.sql" -f "$gevyro_root/supabase/tests/financial-control.integration.sql" -f "$gevyro_root/supabase/tests/rescheduling.integration.sql" -f "$gevyro_tmp/after.sql" -f "$mcell_root/supabase/tests/commerce.sql")
if ! "$gevyro_bin/psql" -h "$gevyro_tmp" -p 55439 -d postgres -v ON_ERROR_STOP=1 "${args[@]}" >"$gevyro_tmp/results.log" 2>&1; then tail -80 "$gevyro_tmp/results.log"; exit 1; fi
tail -25 "$gevyro_tmp/results.log"
echo 'PASS: shared migration, Gevyro RLS/atomicity/history and MCell commerce regression in isolated PostgreSQL.'
