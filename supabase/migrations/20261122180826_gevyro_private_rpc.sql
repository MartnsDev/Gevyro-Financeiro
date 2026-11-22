-- Preserve endpoint names while keeping privileged implementations outside exposed schemas.
-- No MCell tables, routines, providers or records are changed.
begin;
alter function public.gevyro_load_workspace() set schema gevyro_finance;
alter function public.gevyro_save_workspace(jsonb,bigint) set schema gevyro_finance;
revoke all on function gevyro_finance.gevyro_load_workspace() from public,anon;
revoke all on function gevyro_finance.gevyro_save_workspace(jsonb,bigint) from public,anon;
grant execute on function gevyro_finance.gevyro_load_workspace() to authenticated;
grant execute on function gevyro_finance.gevyro_save_workspace(jsonb,bigint) to authenticated;
create function public.gevyro_load_workspace() returns jsonb
language sql security invoker set search_path = '' as $$
 select gevyro_finance.gevyro_load_workspace();
$$;
create function public.gevyro_save_workspace(p_workspace jsonb,p_revision bigint) returns bigint
language sql security invoker set search_path = '' as $$
 select gevyro_finance.gevyro_save_workspace(p_workspace,p_revision);
$$;
revoke all on function public.gevyro_load_workspace() from public,anon;
revoke all on function public.gevyro_save_workspace(jsonb,bigint) from public,anon;
grant execute on function public.gevyro_load_workspace() to authenticated;
grant execute on function public.gevyro_save_workspace(jsonb,bigint) to authenticated;
notify pgrst, 'reload schema';
commit;
