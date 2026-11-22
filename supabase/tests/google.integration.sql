begin;
do $$ begin
 if exists(select 1 from pg_proc where oid in ('public.gevyro_load_workspace()'::regprocedure,'public.gevyro_save_workspace(jsonb,bigint)'::regprocedure) and prosecdef) then raise exception 'FAIL exposed privileged RPC';end if;
 if (select count(*) from pg_proc where oid in ('gevyro_finance.gevyro_load_workspace()'::regprocedure,'gevyro_finance.gevyro_save_workspace(jsonb,bigint)'::regprocedure) and prosecdef)<>2 then raise exception 'FAIL private RPC implementations';end if;
 if has_function_privilege('anon','gevyro_finance.gevyro_load_workspace()','execute') then raise exception 'FAIL anonymous private RPC';end if;
end $$;
insert into auth.users(id) values('55555555-5555-4555-8555-555555555555'),('66666666-6666-4666-8666-666666666666');
set local role authenticated;
set local request.jwt.claim.sub='55555555-5555-4555-8555-555555555555';
set local request.jwt.claims='{"app_metadata":{"provider":"google","providers":["google"]},"amr":[{"method":"oauth"}]}';
select public.gevyro_save_workspace('{"schema":1,"preferences":{"name":"Google test","currency":"BRL","payday":5,"reminderDays":7},"categories":[],"imports":[],"audit":[],"accounts":[],"cards":[],"plans":[],"obligations":[],"payments":[],"transfers":[],"goals":[],"budgets":[],"assets":[],"scenarios":[],"events":[],"notifications":[]}'::jsonb,0);
do $$ begin
 if (public.gevyro_load_workspace()->>'revision')::int<>1 then raise exception 'FAIL Google owner';end if;
 if (select count(*) from gevyro_finance.workspace_meta)<>1 then raise exception 'FAIL owner RLS';end if;
end $$;
set local request.jwt.claim.sub='66666666-6666-4666-8666-666666666666';
do $$ begin
 if public.gevyro_load_workspace() is not null or exists(select 1 from gevyro_finance.workspace_meta) then raise exception 'FAIL cross-user leak';end if;
end $$;
set local request.jwt.claim.sub='55555555-5555-4555-8555-555555555555';
do $$ declare claims jsonb; begin
 foreach claims in array array[
  '{"app_metadata":{"provider":"email","providers":["email"]},"amr":[{"method":"password"}]}'::jsonb,
  '{"app_metadata":{"provider":"google","providers":["google"]},"amr":[{"method":"password"}]}'::jsonb,
  '{"app_metadata":{"provider":"google","providers":["google","github"]},"amr":[{"method":"oauth"}]}'::jsonb,
  '{"app_metadata":{"provider":"google","providers":["google"]}}'::jsonb,
  '{"user_metadata":{"provider":"google","providers":["google"]},"amr":[{"method":"oauth"}]}'::jsonb,
  '{"app_metadata":{"provider":"google","providers":["google"]},"amr":[{"method":"oauth"},{"method":"password"}]}'::jsonb
 ] loop
  perform set_config('request.jwt.claims',claims::text,true);
  if exists(select 1 from gevyro_finance.workspace_meta) then raise exception 'FAIL non-Google RLS';end if;
  begin perform public.gevyro_load_workspace();raise exception 'FAIL non-Google load';exception when insufficient_privilege then null;end;
  begin perform public.gevyro_save_workspace('{}',1);raise exception 'FAIL non-Google save';exception when insufficient_privilege then null;end;
 end loop;
end $$;
set local request.jwt.claims='{"app_metadata":{"provider":"google","providers":["google"]},"amr":[{"method":"oauth"},{"method":"totp"},{"method":"token_refresh"}]}';
do $$ begin if not gevyro_finance.google_session_allowed() then raise exception 'FAIL refreshed Google MFA';end if;end $$;
reset role;
set local role anon;
do $$ begin
 begin perform public.gevyro_load_workspace();raise exception 'FAIL anonymous RPC';exception when insufficient_privilege then null;end;
 begin perform * from gevyro_finance.workspace_meta;raise exception 'FAIL anonymous table';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
select 'PASS: Google-only RPC, restrictive RLS, cross-user isolation, metadata spoofing, anonymous denial and MFA' as result;
