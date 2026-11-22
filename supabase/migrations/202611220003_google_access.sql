-- Apply after shared_mcell and financial_events. Does not alter MCell Auth/providers.
begin;
create function gevyro_finance.google_session_allowed() returns boolean
language sql stable security invoker set search_path = '' as $$
 select coalesce(
  auth.uid() is not null
  and auth.jwt()->'app_metadata'->>'provider' = 'google'
  and auth.jwt()->'app_metadata'->'providers' = '["google"]'::jsonb
  and jsonb_typeof(auth.jwt()->'amr')='array'
  and exists(select 1 from jsonb_array_elements(auth.jwt()->'amr') a where a->>'method'='oauth')
  and not exists(select 1 from jsonb_array_elements(auth.jwt()->'amr') a
    where coalesce(a->>'method','') not in ('oauth','totp','mfa/totp','token_refresh')),
 false);
$$;
revoke all on function gevyro_finance.google_session_allowed() from public,anon;
grant execute on function gevyro_finance.google_session_allowed() to authenticated;
create function gevyro_finance.require_google_session() returns void
language plpgsql stable security invoker set search_path = '' as $$
begin
 if not gevyro_finance.google_session_allowed() then
  raise exception 'google_authentication_required' using errcode='42501';
 end if;
end $$;
revoke all on function gevyro_finance.require_google_session() from public,anon;
grant execute on function gevyro_finance.require_google_session() to authenticated;
-- Preserve established validators/history logic. Fail if an unexpected function definition is installed.
do $$ declare sig text; definition text; guarded text; t record; begin
 foreach sig in array array['public.gevyro_load_workspace()','public.gevyro_save_workspace(jsonb,bigint)'] loop
  definition:=pg_get_functiondef(sig::regprocedure);
  guarded:=replace(definition,E'begin\n if u is null',E'begin\n perform gevyro_finance.require_google_session();\n if u is null');
  if guarded=definition then raise exception 'unexpected_gevyro_rpc_definition: %',sig; end if;
  execute guarded;
 end loop;
 for t in select tablename from pg_tables where schemaname='gevyro_finance' loop
  execute format('create policy google_session_only on gevyro_finance.%I as restrictive for all to authenticated using ((select gevyro_finance.google_session_allowed())) with check ((select gevyro_finance.google_session_allowed()))',t.tablename);
 end loop;
end $$;
-- Avoid privileges on future objects silently inherited by browser roles.
alter default privileges in schema gevyro_finance revoke all on tables from anon,authenticated;
alter default privileges in schema gevyro_finance revoke execute on functions from public;
notify pgrst, 'reload schema';
commit;
