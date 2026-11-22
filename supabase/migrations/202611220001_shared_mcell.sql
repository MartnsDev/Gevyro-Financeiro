-- Shared MCell instance: additive, isolated Gevyro deployment. Run THIS migration only.
-- Do not run 202611200001 on the MCell database. No mc_*, public.profiles or Auth settings are changed.
-- Preflight deliberately fails on collisions instead of replacing pre-existing objects.
begin;
create schema gevyro_finance;
revoke all on schema gevyro_finance from public, anon;
grant usage on schema gevyro_finance to authenticated;
-- Gevyro Finanças: row-isolated entity documents with generated relational keys.
-- Every write uses a single transaction and optimistic revision lock.
create table gevyro_finance.workspace_meta (
 user_id uuid primary key references auth.users(id) on delete cascade,
 revision bigint not null default 0,
 preferences jsonb not null,
 categories jsonb not null,
 imports jsonb not null default '[]',
 client_audit jsonb not null default '[]',
 updated_at timestamptz not null default now()
);
create table gevyro_finance.audit_log (
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 revision bigint not null,
 operation text not null,
 before_state jsonb,
 created_at timestamptz not null default now()
);
create table gevyro_finance.accounts (
 user_id uuid not null references auth.users(id) on delete cascade,
 id text generated always as (document->>'id') stored not null,
 document jsonb not null check(jsonb_typeof(document)='object'),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 name text generated always as (document->>'name') stored not null, opening bigint generated always as ((document->>'opening')::bigint) stored not null, opening_date date not null, check (length(name) between 1 and 2000), check(abs(opening)<=10000000000000),
 primary key(user_id,id),
 check(length(id) between 1 and 100)
);
create table gevyro_finance.cards (
 user_id uuid not null references auth.users(id) on delete cascade,
 id text generated always as (document->>'id') stored not null,
 document jsonb not null check(jsonb_typeof(document)='object'),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 account_id text generated always as (document->>'accountId') stored not null, card_limit bigint generated always as ((document->>'limit')::bigint) stored not null, check(card_limit>=0), check ((document->>'closing')::int between 1 and 31), check((document->>'due')::int between 1 and 31), check(document->>'last4' ~ '^([0-9]{4})?$'),
 primary key(user_id,id),
 check(length(id) between 1 and 100)
);
create table gevyro_finance.plans (
 user_id uuid not null references auth.users(id) on delete cascade,
 id text generated always as (document->>'id') stored not null,
 document jsonb not null check(jsonb_typeof(document)='object'),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 account_id text generated always as (nullif(document->>'accountId','')) stored, card_id text generated always as (nullif(document->>'cardId','')) stored, amount bigint generated always as ((document->>'amount')::bigint) stored not null, check(amount>0 and amount<=10000000000000), check(document->>'kind' in ('income','expense')), check(document->>'mode' in ('once','installment','recurring')), check ((document->>'count')::int between 1 and 600), check ((document->>'interval')::int between 1 and 365), check (account_id is not null or card_id is not null),
 primary key(user_id,id),
 check(length(id) between 1 and 100)
);
create table gevyro_finance.obligations (
 user_id uuid not null references auth.users(id) on delete cascade,
 id text generated always as (document->>'id') stored not null,
 document jsonb not null check(jsonb_typeof(document)='object'),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 plan_id text generated always as (document->>'planId') stored not null, account_id text generated always as (nullif(document->>'accountId','')) stored, card_id text generated always as (nullif(document->>'cardId','')) stored, amount bigint generated always as ((document->>'amount')::bigint) stored not null, kind text generated always as (document->>'kind') stored not null, due_date date not null, check(amount>0 and amount<=10000000000000), check(kind in ('income','expense')), check(account_id is not null or card_id is not null),
 primary key(user_id,id),
 check(length(id) between 1 and 100)
);
create table gevyro_finance.payments (
 user_id uuid not null references auth.users(id) on delete cascade,
 id text generated always as (document->>'id') stored not null,
 document jsonb not null check(jsonb_typeof(document)='object'),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 obligation_id text generated always as (document->>'obligationId') stored not null, account_id text generated always as (document->>'accountId') stored not null, amount bigint generated always as ((document->>'amount')::bigint) stored not null, effective_date date not null, reversed boolean generated always as (coalesce((document->>'reversed')::boolean,false)) stored not null, check(amount>0 and amount<=10000000000000),
 primary key(user_id,id),
 check(length(id) between 1 and 100)
);
create table gevyro_finance.transfers (
 user_id uuid not null references auth.users(id) on delete cascade,
 id text generated always as (document->>'id') stored not null,
 document jsonb not null check(jsonb_typeof(document)='object'),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 from_id text generated always as (document->>'from') stored not null, to_id text generated always as (document->>'to') stored not null, amount bigint generated always as ((document->>'amount')::bigint) stored not null, fee bigint generated always as ((document->>'fee')::bigint) stored not null, effective_date date not null, check(from_id<>to_id), check(amount>0 and fee>=0),
 primary key(user_id,id),
 check(length(id) between 1 and 100)
);
create table gevyro_finance.goals (
 user_id uuid not null references auth.users(id) on delete cascade,
 id text generated always as (document->>'id') stored not null,
 document jsonb not null check(jsonb_typeof(document)='object'),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 target bigint generated always as ((document->>'target')::bigint) stored not null, reserved bigint generated always as ((document->>'reserved')::bigint) stored not null, check(target>0 and reserved>=0), check((document->>'monthly')::bigint>=0),
 primary key(user_id,id),
 check(length(id) between 1 and 100)
);
create table gevyro_finance.budgets (
 user_id uuid not null references auth.users(id) on delete cascade,
 id text generated always as (document->>'id') stored not null,
 document jsonb not null check(jsonb_typeof(document)='object'),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 category text generated always as (document->>'category') stored not null, month text generated always as (document->>'month') stored not null, amount bigint generated always as ((document->>'amount')::bigint) stored not null, check(amount>0), check(month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'), unique(user_id,category,month),
 primary key(user_id,id),
 check(length(id) between 1 and 100)
);
create table gevyro_finance.assets (
 user_id uuid not null references auth.users(id) on delete cascade,
 id text generated always as (document->>'id') stored not null,
 document jsonb not null check(jsonb_typeof(document)='object'),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 value bigint generated always as ((document->>'value')::bigint) stored not null, check(value>=0), check((document->>'cost')::bigint>=0), check(document->>'type' in ('investment','asset','debt')),
 primary key(user_id,id),
 check(length(id) between 1 and 100)
);
create table gevyro_finance.scenarios (
 user_id uuid not null references auth.users(id) on delete cascade,
 id text generated always as (document->>'id') stored not null,
 document jsonb not null check(jsonb_typeof(document)='object'),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check((document->>'months')::int between 1 and 60), check((document->>'expenseReduction')::bigint>=0),
 primary key(user_id,id),
 check(length(id) between 1 and 100)
);
alter table gevyro_finance.cards add foreign key (user_id,account_id) references gevyro_finance.accounts(user_id,id) deferrable initially deferred;
alter table gevyro_finance.plans add foreign key (user_id,account_id) references gevyro_finance.accounts(user_id,id) deferrable initially deferred;
alter table gevyro_finance.plans add foreign key (user_id,card_id) references gevyro_finance.cards(user_id,id) deferrable initially deferred;
alter table gevyro_finance.obligations add foreign key (user_id,plan_id) references gevyro_finance.plans(user_id,id) deferrable initially deferred;
alter table gevyro_finance.obligations add foreign key (user_id,account_id) references gevyro_finance.accounts(user_id,id) deferrable initially deferred;
alter table gevyro_finance.obligations add foreign key (user_id,card_id) references gevyro_finance.cards(user_id,id) deferrable initially deferred;
alter table gevyro_finance.payments add foreign key (user_id,obligation_id) references gevyro_finance.obligations(user_id,id) deferrable initially deferred;
alter table gevyro_finance.payments add foreign key (user_id,account_id) references gevyro_finance.accounts(user_id,id) deferrable initially deferred;
alter table gevyro_finance.transfers add foreign key (user_id,from_id) references gevyro_finance.accounts(user_id,id) deferrable initially deferred;
alter table gevyro_finance.transfers add foreign key (user_id,to_id) references gevyro_finance.accounts(user_id,id) deferrable initially deferred;
create index obligations_due on gevyro_finance.obligations(user_id,due_date);
create index payments_effective on gevyro_finance.payments(user_id,effective_date);
create index payments_obligation on gevyro_finance.payments(user_id,obligation_id);
create index obligations_card on gevyro_finance.obligations(user_id,card_id,due_date);
alter table gevyro_finance.workspace_meta enable row level security;
create policy owner_read on gevyro_finance.workspace_meta for select to authenticated using ((select auth.uid())=user_id);
revoke all on gevyro_finance.workspace_meta from anon, authenticated;
grant select on gevyro_finance.workspace_meta to authenticated;
alter table gevyro_finance.audit_log enable row level security;
create policy owner_read on gevyro_finance.audit_log for select to authenticated using ((select auth.uid())=user_id);
revoke all on gevyro_finance.audit_log from anon, authenticated;
grant select on gevyro_finance.audit_log to authenticated;
alter table gevyro_finance.accounts enable row level security;
create policy owner_read on gevyro_finance.accounts for select to authenticated using ((select auth.uid())=user_id);
revoke all on gevyro_finance.accounts from anon, authenticated;
grant select on gevyro_finance.accounts to authenticated;
alter table gevyro_finance.cards enable row level security;
create policy owner_read on gevyro_finance.cards for select to authenticated using ((select auth.uid())=user_id);
revoke all on gevyro_finance.cards from anon, authenticated;
grant select on gevyro_finance.cards to authenticated;
alter table gevyro_finance.plans enable row level security;
create policy owner_read on gevyro_finance.plans for select to authenticated using ((select auth.uid())=user_id);
revoke all on gevyro_finance.plans from anon, authenticated;
grant select on gevyro_finance.plans to authenticated;
alter table gevyro_finance.obligations enable row level security;
create policy owner_read on gevyro_finance.obligations for select to authenticated using ((select auth.uid())=user_id);
revoke all on gevyro_finance.obligations from anon, authenticated;
grant select on gevyro_finance.obligations to authenticated;
alter table gevyro_finance.payments enable row level security;
create policy owner_read on gevyro_finance.payments for select to authenticated using ((select auth.uid())=user_id);
revoke all on gevyro_finance.payments from anon, authenticated;
grant select on gevyro_finance.payments to authenticated;
alter table gevyro_finance.transfers enable row level security;
create policy owner_read on gevyro_finance.transfers for select to authenticated using ((select auth.uid())=user_id);
revoke all on gevyro_finance.transfers from anon, authenticated;
grant select on gevyro_finance.transfers to authenticated;
alter table gevyro_finance.goals enable row level security;
create policy owner_read on gevyro_finance.goals for select to authenticated using ((select auth.uid())=user_id);
revoke all on gevyro_finance.goals from anon, authenticated;
grant select on gevyro_finance.goals to authenticated;
alter table gevyro_finance.budgets enable row level security;
create policy owner_read on gevyro_finance.budgets for select to authenticated using ((select auth.uid())=user_id);
revoke all on gevyro_finance.budgets from anon, authenticated;
grant select on gevyro_finance.budgets to authenticated;
alter table gevyro_finance.assets enable row level security;
create policy owner_read on gevyro_finance.assets for select to authenticated using ((select auth.uid())=user_id);
revoke all on gevyro_finance.assets from anon, authenticated;
grant select on gevyro_finance.assets to authenticated;
alter table gevyro_finance.scenarios enable row level security;
create policy owner_read on gevyro_finance.scenarios for select to authenticated using ((select auth.uid())=user_id);
revoke all on gevyro_finance.scenarios from anon, authenticated;
grant select on gevyro_finance.scenarios to authenticated;

create function public.gevyro_load_workspace() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid:=auth.uid(); meta gevyro_finance.workspace_meta; result jsonb; entity text;
begin
 if u is null then raise exception 'authentication_required'; end if;
 select * into meta from gevyro_finance.workspace_meta where user_id=u;
 if not found then return null; end if;
 result:=jsonb_build_object('schema',1,'preferences',meta.preferences,'categories',meta.categories,'imports',meta.imports,'audit',meta.client_audit);
 result:=result || jsonb_build_object('accounts',coalesce((select jsonb_agg(document order by created_at,id) from gevyro_finance.accounts where user_id=u),'[]'::jsonb));
 result:=result || jsonb_build_object('cards',coalesce((select jsonb_agg(document order by created_at,id) from gevyro_finance.cards where user_id=u),'[]'::jsonb));
 result:=result || jsonb_build_object('plans',coalesce((select jsonb_agg(document order by created_at,id) from gevyro_finance.plans where user_id=u),'[]'::jsonb));
 result:=result || jsonb_build_object('obligations',coalesce((select jsonb_agg(document order by created_at,id) from gevyro_finance.obligations where user_id=u),'[]'::jsonb));
 result:=result || jsonb_build_object('payments',coalesce((select jsonb_agg(document order by created_at,id) from gevyro_finance.payments where user_id=u),'[]'::jsonb));
 result:=result || jsonb_build_object('transfers',coalesce((select jsonb_agg(document order by created_at,id) from gevyro_finance.transfers where user_id=u),'[]'::jsonb));
 result:=result || jsonb_build_object('goals',coalesce((select jsonb_agg(document order by created_at,id) from gevyro_finance.goals where user_id=u),'[]'::jsonb));
 result:=result || jsonb_build_object('budgets',coalesce((select jsonb_agg(document order by created_at,id) from gevyro_finance.budgets where user_id=u),'[]'::jsonb));
 result:=result || jsonb_build_object('assets',coalesce((select jsonb_agg(document order by created_at,id) from gevyro_finance.assets where user_id=u),'[]'::jsonb));
 result:=result || jsonb_build_object('scenarios',coalesce((select jsonb_agg(document order by created_at,id) from gevyro_finance.scenarios where user_id=u),'[]'::jsonb));
 return jsonb_build_object('workspace',result,'revision',meta.revision);
end $$;

create function public.gevyro_save_workspace(p_workspace jsonb,p_revision bigint) returns bigint
language plpgsql security definer set search_path = '' as $$
declare u uuid:=auth.uid(); current_revision bigint; before_data jsonb; entity text; row_data jsonb; audit_changes jsonb:='{}'; changed_rows jsonb;
begin
 if u is null then raise exception 'authentication_required'; end if;
 if octet_length(p_workspace::text)>12582912 or p_workspace->>'schema'<>'1' then raise exception 'invalid_workspace'; end if;
 if p_workspace->'preferences'->>'currency'<>'BRL' or (p_workspace->'preferences'->>'payday')::int not between 1 and 31 or (p_workspace->'preferences'->>'reminderDays')::int not between 0 and 90 then raise exception 'invalid_preferences'; end if;
 perform pg_advisory_xact_lock(hashtextextended('gevyro_finance:'||u::text,0));
 select revision into current_revision from gevyro_finance.workspace_meta where user_id=u for update;
 current_revision:=coalesce(current_revision,0);
 if current_revision<>p_revision then raise exception 'revision_conflict'; end if;
 before_data:=public.gevyro_load_workspace();
 if before_data is not null then
  foreach entity in array array['accounts','cards','plans','obligations','payments','transfers','goals','budgets','assets','scenarios'] loop
   select jsonb_agg(old_doc) into changed_rows
   from jsonb_array_elements(before_data->'workspace'->entity) old_doc
   where not exists(select 1 from jsonb_array_elements(p_workspace->entity) new_doc where new_doc->>'id'=old_doc->>'id' and new_doc=old_doc);
   if changed_rows is not null then audit_changes:=audit_changes||jsonb_build_object(entity,changed_rows); end if;
  end loop;
  if before_data->'workspace'->'preferences' is distinct from p_workspace->'preferences' then audit_changes:=audit_changes||jsonb_build_object('preferences',before_data->'workspace'->'preferences'); end if;
  if before_data->'workspace'->'categories' is distinct from p_workspace->'categories' then audit_changes:=audit_changes||jsonb_build_object('categories',before_data->'workspace'->'categories'); end if;
 end if;
 foreach entity in array array['accounts','cards','plans','obligations','payments','transfers','goals','budgets','assets','scenarios','categories','imports','audit'] loop
  if jsonb_typeof(p_workspace->entity) is distinct from 'array' then raise exception 'invalid_collection: %',entity; end if;
 end loop;
 if exists(select 1 from gevyro_finance.accounts old join jsonb_array_elements(p_workspace->'accounts') d on d->>'id'=old.id where old.user_id=u and ((d->>'opening')::bigint<>old.opening or (d->>'openingDate')::date<>old.opening_date) and (exists(select 1 from gevyro_finance.payments p where p.user_id=u and p.account_id=old.id) or exists(select 1 from gevyro_finance.transfers t where t.user_id=u and old.id in (t.from_id,t.to_id)))) then raise exception 'immutable_opening_balance'; end if;
 if exists(select 1 from gevyro_finance.obligations old join gevyro_finance.payments p on p.user_id=old.user_id and p.obligation_id=old.id join jsonb_array_elements(p_workspace->'obligations') d on d->>'id'=old.id where old.user_id=u and ((old.document-'cancelled')<>(d-'cancelled') or (coalesce((d->>'cancelled')::boolean,false) and exists(select 1 from jsonb_array_elements(p_workspace->'payments') newp where newp->>'obligationId'=old.id and not coalesce((newp->>'reversed')::boolean,false))))) then raise exception 'immutable_paid_obligation'; end if;
 -- Historical payments may only be reversed, never replaced or deleted.
 if exists(select 1 from gevyro_finance.payments old where old.user_id=u and not exists(select 1 from jsonb_array_elements(p_workspace->'payments') p where p->>'id'=old.id and (p-'reversed')=(old.document-'reversed') and (not old.reversed or coalesce((p->>'reversed')::boolean,false)))) then raise exception 'immutable_payment_history'; end if;
 delete from gevyro_finance.scenarios t where user_id=u and not exists(select 1 from jsonb_array_elements(p_workspace->'scenarios') d where d->>'id'=t.id);
 delete from gevyro_finance.assets t where user_id=u and not exists(select 1 from jsonb_array_elements(p_workspace->'assets') d where d->>'id'=t.id);
 delete from gevyro_finance.budgets t where user_id=u and not exists(select 1 from jsonb_array_elements(p_workspace->'budgets') d where d->>'id'=t.id);
 delete from gevyro_finance.goals t where user_id=u and not exists(select 1 from jsonb_array_elements(p_workspace->'goals') d where d->>'id'=t.id);
 delete from gevyro_finance.transfers t where user_id=u and not exists(select 1 from jsonb_array_elements(p_workspace->'transfers') d where d->>'id'=t.id);
 delete from gevyro_finance.payments t where user_id=u and not exists(select 1 from jsonb_array_elements(p_workspace->'payments') d where d->>'id'=t.id);
 delete from gevyro_finance.obligations t where user_id=u and not exists(select 1 from jsonb_array_elements(p_workspace->'obligations') d where d->>'id'=t.id);
 delete from gevyro_finance.plans t where user_id=u and not exists(select 1 from jsonb_array_elements(p_workspace->'plans') d where d->>'id'=t.id);
 delete from gevyro_finance.cards t where user_id=u and not exists(select 1 from jsonb_array_elements(p_workspace->'cards') d where d->>'id'=t.id);
 delete from gevyro_finance.accounts t where user_id=u and not exists(select 1 from jsonb_array_elements(p_workspace->'accounts') d where d->>'id'=t.id);
 insert into gevyro_finance.accounts(user_id,document, opening_date) select u,d, (d->>'openingDate')::date from jsonb_array_elements(p_workspace->'accounts') d on conflict(user_id,id) do update set document=excluded.document,updated_at=now(), opening_date=excluded.opening_date where accounts.document is distinct from excluded.document;
 insert into gevyro_finance.cards(user_id,document) select u,d from jsonb_array_elements(p_workspace->'cards') d on conflict(user_id,id) do update set document=excluded.document,updated_at=now() where cards.document is distinct from excluded.document;
 insert into gevyro_finance.plans(user_id,document) select u,d from jsonb_array_elements(p_workspace->'plans') d on conflict(user_id,id) do update set document=excluded.document,updated_at=now() where plans.document is distinct from excluded.document;
 insert into gevyro_finance.obligations(user_id,document, due_date) select u,d, (d->>'date')::date from jsonb_array_elements(p_workspace->'obligations') d on conflict(user_id,id) do update set document=excluded.document,updated_at=now(), due_date=excluded.due_date where obligations.document is distinct from excluded.document;
 insert into gevyro_finance.payments(user_id,document, effective_date) select u,d, (d->>'date')::date from jsonb_array_elements(p_workspace->'payments') d on conflict(user_id,id) do update set document=excluded.document,updated_at=now(), effective_date=excluded.effective_date where payments.document is distinct from excluded.document;
 insert into gevyro_finance.transfers(user_id,document, effective_date) select u,d, (d->>'date')::date from jsonb_array_elements(p_workspace->'transfers') d on conflict(user_id,id) do update set document=excluded.document,updated_at=now(), effective_date=excluded.effective_date where transfers.document is distinct from excluded.document;
 insert into gevyro_finance.goals(user_id,document) select u,d from jsonb_array_elements(p_workspace->'goals') d on conflict(user_id,id) do update set document=excluded.document,updated_at=now() where goals.document is distinct from excluded.document;
 insert into gevyro_finance.budgets(user_id,document) select u,d from jsonb_array_elements(p_workspace->'budgets') d on conflict(user_id,id) do update set document=excluded.document,updated_at=now() where budgets.document is distinct from excluded.document;
 insert into gevyro_finance.assets(user_id,document) select u,d from jsonb_array_elements(p_workspace->'assets') d on conflict(user_id,id) do update set document=excluded.document,updated_at=now() where assets.document is distinct from excluded.document;
 insert into gevyro_finance.scenarios(user_id,document) select u,d from jsonb_array_elements(p_workspace->'scenarios') d on conflict(user_id,id) do update set document=excluded.document,updated_at=now() where scenarios.document is distinct from excluded.document;

 if exists(select 1 from gevyro_finance.obligations o join gevyro_finance.payments p on (p.user_id=o.user_id and p.obligation_id=o.id) where o.user_id=u and not p.reversed group by o.id,o.amount having sum(p.amount)>o.amount) then raise exception 'overpayment'; end if;
 if exists(select 1 from gevyro_finance.payments p join gevyro_finance.accounts a on (a.user_id=p.user_id and a.id=p.account_id) where p.user_id=u and (p.effective_date>(now() at time zone 'America/Sao_Paulo')::date or p.effective_date<a.opening_date)) then raise exception 'invalid_payment_date'; end if;
 if exists(select 1 from gevyro_finance.transfers t join gevyro_finance.accounts a on (a.user_id=t.user_id and a.id in (t.from_id,t.to_id)) where t.user_id=u and (t.effective_date>(now() at time zone 'America/Sao_Paulo')::date or t.effective_date<a.opening_date)) then raise exception 'invalid_transfer_date'; end if;
 insert into gevyro_finance.workspace_meta(user_id,revision,preferences,categories,imports,client_audit) values(u,current_revision+1,p_workspace->'preferences',p_workspace->'categories',p_workspace->'imports',p_workspace->'audit') on conflict(user_id) do update set revision=excluded.revision,preferences=excluded.preferences,categories=excluded.categories,imports=excluded.imports,client_audit=excluded.client_audit,updated_at=now();
 insert into gevyro_finance.audit_log(user_id,revision,operation,before_state) values(u,current_revision+1,'save_workspace',jsonb_build_object('previous_revision',current_revision,'changes',audit_changes));

 if (select coalesce(sum(octet_length(before_state::text)),0) from gevyro_finance.audit_log where user_id=u)>33554432 then raise exception 'gevyro_history_limit: backup required; existing data preserved'; end if;
 return current_revision+1;
end $$;
revoke all on function public.gevyro_load_workspace() from public, anon;
revoke all on function public.gevyro_save_workspace(jsonb,bigint) from public, anon;
grant execute on function public.gevyro_load_workspace() to authenticated;
grant execute on function public.gevyro_save_workspace(jsonb,bigint) to authenticated;
-- No storage bucket is exposed: attachments remain disabled until private upload policies and validation are implemented.

notify pgrst, 'reload schema';
commit;
