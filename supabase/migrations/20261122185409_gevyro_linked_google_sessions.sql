-- Existing MCell email identities may link Google. Require an OAuth session and
-- Google as the only external identity; password sessions and other providers stay denied.
begin;
create or replace function gevyro_finance.google_session_allowed() returns boolean
language sql stable security invoker set search_path = '' as $$
 select coalesce(
  auth.uid() is not null
  and auth.jwt()->'app_metadata'->>'provider' in ('google','email')
  and jsonb_typeof(auth.jwt()->'app_metadata'->'providers')='array'
  and (auth.jwt()->'app_metadata'->'providers') ? 'google'
  and not exists(select 1 from jsonb_array_elements_text(case
    when jsonb_typeof(auth.jwt()->'app_metadata'->'providers')='array'
    then auth.jwt()->'app_metadata'->'providers' else '[]'::jsonb end) p(provider)
    where provider not in ('google','email'))
  and jsonb_typeof(auth.jwt()->'amr')='array'
  and exists(select 1 from jsonb_array_elements(auth.jwt()->'amr') a where a->>'method'='oauth')
  and not exists(select 1 from jsonb_array_elements(auth.jwt()->'amr') a
    where coalesce(a->>'method','') not in ('oauth','totp','mfa/totp','token_refresh')),
 false);
$$;
revoke all on function gevyro_finance.google_session_allowed() from public,anon;
grant execute on function gevyro_finance.google_session_allowed() to authenticated;
notify pgrst, 'reload schema';
commit;
