-- Gevyro Finanças: row-isolated entity documents with generated relational keys.
-- Every write uses a single transaction and optimistic revision lock.
create table public.workspace_meta (
 user_id uuid primary key references auth.users(id) on delete cascade,
 revision bigint not null default 0,
 preferences jsonb not null,
 categories jsonb not null,
 imports jsonb not null default '[]',
 client_audit jsonb not null default '[]',
 updated_at timestamptz not null default now()
);
create table public.audit_log (
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 revision bigint not null,
 operation text not null,
 before_state jsonb,
 created_at timestamptz not null default now()
);
create table public.accounts (
 user_id uuid not null references auth.users(id) on delete cascade,
 id text generated always as (document->>'id') stored not null,
 document jsonb not null check(jsonb_typeof(document)='object'),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 name text generated always as (document->>'name') stored not null, opening bigint generated always as ((document->>'opening')::bigint) stored not null, opening_date date not null, check (length(name) between 1 and 2000), check(abs(opening)<=10000000000000),
 primary key(user_id,id),
 check(length(id) between 1 and 100)
);
create table public.cards (
 user_id uuid not null references auth.users(id) on delete cascade,
 id text generated always as (document->>'id') stored not null,
 document jsonb not null check(jsonb_typeof(document)='object'),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 account_id text generated always as (document->>'accountId') stored not null, card_limit bigint generated always as ((document->>'limit')::bigint) stored not null, check(card_limit>=0), check ((document->>'closing')::int between 1 and 31), check((document->>'due')::int between 1 and 31), check(document->>'last4' ~ '^([0-9]{4})?$'),
 primary key(user_id,id),
 check(length(id) between 1 and 100)
);
create table public.plans (
 user_id uuid not null references auth.users(id) on delete cascade,
 id text generated always as (document->>'id') stored not null,
 document jsonb not null check(jsonb_typeof(document)='object'),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 account_id text generated always as (nullif(document->>'accountId','')) stored, card_id text generated always as (nullif(document->>'cardId','')) stored, amount bigint generated always as ((document->>'amount')::bigint) stored not null, check(amount>0 and amount<=10000000000000), check(document->>'kind' in ('income','expense')), check(document->>'mode' in ('once','installment','recurring')), check ((document->>'count')::int between 1 and 600), check ((document->>'interval')::int between 1 and 365), check (account_id is not null or card_id is not null),
 primary key(user_id,id),
 check(length(id) between 1 and 100)
);
create table public.obligations (
 user_id uuid not null references auth.users(id) on delete cascade,
 id text generated always as (document->>'id') stored not null,
 document jsonb not null check(jsonb_typeof(document)='object'),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 plan_id text generated always as (document->>'planId') stored not null, account_id text generated always as (nullif(document->>'accountId','')) stored, card_id text generated always as (nullif(document->>'cardId','')) stored, amount bigint generated always as ((document->>'amount')::bigint) stored not null, kind text generated always as (document->>'kind') stored not null, due_date date not null, check(amount>0 and amount<=10000000000000), check(kind in ('income','expense')), check(account_id is not null or card_id is not null),
 primary key(user_id,id),
 check(length(id) between 1 and 100)
);
create table public.payments (
 user_id uuid not null references auth.users(id) on delete cascade,
 id text generated always as (document->>'id') stored not null,
 document jsonb not null check(jsonb_typeof(document)='object'),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 obligation_id text generated always as (document->>'obligationId') stored not null, account_id text generated always as (document->>'accountId') stored not null, amount bigint generated always as ((document->>'amount')::bigint) stored not null, effective_date date not null, reversed boolean generated always as (coalesce((document->>'reversed')::boolean,false)) stored not null, check(amount>0 and amount<=10000000000000),
 primary key(user_id,id),
 check(length(id) between 1 and 100)
);
create table public.transfers (
 user_id uuid not null references auth.users(id) on delete cascade,
 id text generated always as (document->>'id') stored not null,
 document jsonb not null check(jsonb_typeof(document)='object'),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 from_id text generated always as (document->>'from') stored not null, to_id text generated always as (document->>'to') stored not null, amount bigint generated always as ((document->>'amount')::bigint) stored not null, fee bigint generated always as ((document->>'fee')::bigint) stored not null, effective_date date not null, check(from_id<>to_id), check(amount>0 and fee>=0),
 primary key(user_id,id),
 check(length(id) between 1 and 100)
);
create table public.goals (
 user_id uuid not null references auth.users(id) on delete cascade,
 id text generated always as (document->>'id') stored not null,
 document jsonb not null check(jsonb_typeof(document)='object'),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 target bigint generated always as ((document->>'target')::bigint) stored not null, reserved bigint generated always as ((document->>'reserved')::bigint) stored not null, check(target>0 and reserved>=0), check((document->>'monthly')::bigint>=0),
 primary key(user_id,id),
 check(length(id) between 1 and 100)
);
create table public.budgets (
 user_id uuid not null references auth.users(id) on delete cascade,
 id text generated always as (document->>'id') stored not null,
 document jsonb not null check(jsonb_typeof(document)='object'),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 category text generated always as (document->>'category') stored not null, month text generated always as (document->>'month') stored not null, amount bigint generated always as ((document->>'amount')::bigint) stored not null, check(amount>0), check(month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'), unique(user_id,category,month),
 primary key(user_id,id),
 check(length(id) between 1 and 100)
);
create table public.assets (
 user_id uuid not null references auth.users(id) on delete cascade,
 id text generated always as (document->>'id') stored not null,
 document jsonb not null check(jsonb_typeof(document)='object'),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 value bigint generated always as ((document->>'value')::bigint) stored not null, check(value>=0), check((document->>'cost')::bigint>=0), check(document->>'type' in ('investment','asset','debt')),
 primary key(user_id,id),
 check(length(id) between 1 and 100)
);
create table public.scenarios (
 user_id uuid not null references auth.users(id) on delete cascade,
 id text generated always as (document->>'id') stored not null,
 document jsonb not null check(jsonb_typeof(document)='object'),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check((document->>'months')::int between 1 and 60), check((document->>'expenseReduction')::bigint>=0),
 primary key(user_id,id),
 check(length(id) between 1 and 100)
);
alter table public.cards add foreign key (user_id,account_id) references public.accounts(user_id,id) deferrable initially deferred;
alter table public.plans add foreign key (user_id,account_id) references public.accounts(user_id,id) deferrable initially deferred;
alter table public.plans add foreign key (user_id,card_id) references public.cards(user_id,id) deferrable initially deferred;
alter table public.obligations add foreign key (user_id,plan_id) references public.plans(user_id,id) deferrable initially deferred;
alter table public.obligations add foreign key (user_id,account_id) references public.accounts(user_id,id) deferrable initially deferred;
alter table public.obligations add foreign key (user_id,card_id) references public.cards(user_id,id) deferrable initially deferred;
alter table public.payments add foreign key (user_id,obligation_id) references public.obligations(user_id,id) deferrable initially deferred;
alter table public.payments add foreign key (user_id,account_id) references public.accounts(user_id,id) deferrable initially deferred;
alter table public.transfers add foreign key (user_id,from_id) references public.accounts(user_id,id) deferrable initially deferred;
alter table public.transfers add foreign key (user_id,to_id) references public.accounts(user_id,id) deferrable initially deferred;
create index obligations_due on public.obligations(user_id,due_date);
create index payments_effective on public.payments(user_id,effective_date);
create index payments_obligation on public.payments(user_id,obligation_id);
create index obligations_card on public.obligations(user_id,card_id,due_date);
alter table public.workspace_meta enable row level security;
create policy owner_read on public.workspace_meta for select to authenticated using ((select auth.uid())=user_id);
revoke all on public.workspace_meta from anon, authenticated;
grant select on public.workspace_meta to authenticated;
alter table public.audit_log enable row level security;
create policy owner_read on public.audit_log for select to authenticated using ((select auth.uid())=user_id);
revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;
alter table public.accounts enable row level security;
create policy owner_read on public.accounts for select to authenticated using ((select auth.uid())=user_id);
revoke all on public.accounts from anon, authenticated;
grant select on public.accounts to authenticated;
alter table public.cards enable row level security;
create policy owner_read on public.cards for select to authenticated using ((select auth.uid())=user_id);
revoke all on public.cards from anon, authenticated;
grant select on public.cards to authenticated;
alter table public.plans enable row level security;
create policy owner_read on public.plans for select to authenticated using ((select auth.uid())=user_id);
revoke all on public.plans from anon, authenticated;
grant select on public.plans to authenticated;
alter table public.obligations enable row level security;
create policy owner_read on public.obligations for select to authenticated using ((select auth.uid())=user_id);
revoke all on public.obligations from anon, authenticated;
grant select on public.obligations to authenticated;
alter table public.payments enable row level security;
create policy owner_read on public.payments for select to authenticated using ((select auth.uid())=user_id);
revoke all on public.payments from anon, authenticated;
grant select on public.payments to authenticated;
alter table public.transfers enable row level security;
create policy owner_read on public.transfers for select to authenticated using ((select auth.uid())=user_id);
revoke all on public.transfers from anon, authenticated;
grant select on public.transfers to authenticated;
alter table public.goals enable row level security;
create policy owner_read on public.goals for select to authenticated using ((select auth.uid())=user_id);
revoke all on public.goals from anon, authenticated;
grant select on public.goals to authenticated;
alter table public.budgets enable row level security;
create policy owner_read on public.budgets for select to authenticated using ((select auth.uid())=user_id);
revoke all on public.budgets from anon, authenticated;
grant select on public.budgets to authenticated;
alter table public.assets enable row level security;
create policy owner_read on public.assets for select to authenticated using ((select auth.uid())=user_id);
revoke all on public.assets from anon, authenticated;
grant select on public.assets to authenticated;
alter table public.scenarios enable row level security;
create policy owner_read on public.scenarios for select to authenticated using ((select auth.uid())=user_id);
revoke all on public.scenarios from anon, authenticated;
grant select on public.scenarios to authenticated;

create function public.load_workspace() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid:=auth.uid(); meta public.workspace_meta; result jsonb; entity text;
begin
 if u is null then raise exception 'authentication_required'; end if;
 select * into meta from public.workspace_meta where user_id=u;
 if not found then return null; end if;
 result:=jsonb_build_object('schema',1,'preferences',meta.preferences,'categories',meta.categories,'imports',meta.imports,'audit',meta.client_audit);
 result:=result || jsonb_build_object('accounts',coalesce((select jsonb_agg(document order by created_at,id) from public.accounts where user_id=u),'[]'::jsonb));
 result:=result || jsonb_build_object('cards',coalesce((select jsonb_agg(document order by created_at,id) from public.cards where user_id=u),'[]'::jsonb));
 result:=result || jsonb_build_object('plans',coalesce((select jsonb_agg(document order by created_at,id) from public.plans where user_id=u),'[]'::jsonb));
 result:=result || jsonb_build_object('obligations',coalesce((select jsonb_agg(document order by created_at,id) from public.obligations where user_id=u),'[]'::jsonb));
 result:=result || jsonb_build_object('payments',coalesce((select jsonb_agg(document order by created_at,id) from public.payments where user_id=u),'[]'::jsonb));
 result:=result || jsonb_build_object('transfers',coalesce((select jsonb_agg(document order by created_at,id) from public.transfers where user_id=u),'[]'::jsonb));
 result:=result || jsonb_build_object('goals',coalesce((select jsonb_agg(document order by created_at,id) from public.goals where user_id=u),'[]'::jsonb));
 result:=result || jsonb_build_object('budgets',coalesce((select jsonb_agg(document order by created_at,id) from public.budgets where user_id=u),'[]'::jsonb));
 result:=result || jsonb_build_object('assets',coalesce((select jsonb_agg(document order by created_at,id) from public.assets where user_id=u),'[]'::jsonb));
 result:=result || jsonb_build_object('scenarios',coalesce((select jsonb_agg(document order by created_at,id) from public.scenarios where user_id=u),'[]'::jsonb));
 return jsonb_build_object('workspace',result,'revision',meta.revision);
end $$;

create function public.save_workspace(p_workspace jsonb,p_revision bigint) returns bigint
language plpgsql security definer set search_path = '' as $$
declare u uuid:=auth.uid(); current_revision bigint; before_data jsonb; entity text; row_data jsonb;
begin
 if u is null then raise exception 'authentication_required'; end if;
 if pg_column_size(p_workspace)>15000000 or p_workspace->>'schema'<>'1' then raise exception 'invalid_workspace'; end if;
 if p_workspace->'preferences'->>'currency'<>'BRL' or (p_workspace->'preferences'->>'payday')::int not between 1 and 31 or (p_workspace->'preferences'->>'reminderDays')::int not between 0 and 90 then raise exception 'invalid_preferences'; end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,0));
 select revision into current_revision from public.workspace_meta where user_id=u for update;
 current_revision:=coalesce(current_revision,0);
 if current_revision<>p_revision then raise exception 'revision_conflict'; end if;
 before_data:=public.load_workspace();
 foreach entity in array array['accounts','cards','plans','obligations','payments','transfers','goals','budgets','assets','scenarios','categories','imports','audit'] loop
  if jsonb_typeof(p_workspace->entity) is distinct from 'array' then raise exception 'invalid_collection: %',entity; end if;
 end loop;
 if exists(select 1 from public.accounts old join jsonb_array_elements(p_workspace->'accounts') d on d->>'id'=old.id where old.user_id=u and ((d->>'opening')::bigint<>old.opening or (d->>'openingDate')::date<>old.opening_date) and (exists(select 1 from public.payments p where p.user_id=u and p.account_id=old.id) or exists(select 1 from public.transfers t where t.user_id=u and old.id in (t.from_id,t.to_id)))) then raise exception 'immutable_opening_balance'; end if;
 if exists(select 1 from public.obligations old join public.payments p on p.user_id=old.user_id and p.obligation_id=old.id join jsonb_array_elements(p_workspace->'obligations') d on d->>'id'=old.id where old.user_id=u and ((old.document-'cancelled')<>(d-'cancelled') or (coalesce((d->>'cancelled')::boolean,false) and exists(select 1 from jsonb_array_elements(p_workspace->'payments') newp where newp->>'obligationId'=old.id and not coalesce((newp->>'reversed')::boolean,false))))) then raise exception 'immutable_paid_obligation'; end if;
 -- Historical payments may only be reversed, never replaced or deleted.
 if exists(select 1 from public.payments old where old.user_id=u and not exists(select 1 from jsonb_array_elements(p_workspace->'payments') p where p->>'id'=old.id and (p-'reversed')=(old.document-'reversed') and (not old.reversed or coalesce((p->>'reversed')::boolean,false)))) then raise exception 'immutable_payment_history'; end if;
 delete from public.scenarios t where user_id=u and not exists(select 1 from jsonb_array_elements(p_workspace->'scenarios') d where d->>'id'=t.id);
 delete from public.assets t where user_id=u and not exists(select 1 from jsonb_array_elements(p_workspace->'assets') d where d->>'id'=t.id);
 delete from public.budgets t where user_id=u and not exists(select 1 from jsonb_array_elements(p_workspace->'budgets') d where d->>'id'=t.id);
 delete from public.goals t where user_id=u and not exists(select 1 from jsonb_array_elements(p_workspace->'goals') d where d->>'id'=t.id);
 delete from public.transfers t where user_id=u and not exists(select 1 from jsonb_array_elements(p_workspace->'transfers') d where d->>'id'=t.id);
 delete from public.payments t where user_id=u and not exists(select 1 from jsonb_array_elements(p_workspace->'payments') d where d->>'id'=t.id);
 delete from public.obligations t where user_id=u and not exists(select 1 from jsonb_array_elements(p_workspace->'obligations') d where d->>'id'=t.id);
 delete from public.plans t where user_id=u and not exists(select 1 from jsonb_array_elements(p_workspace->'plans') d where d->>'id'=t.id);
 delete from public.cards t where user_id=u and not exists(select 1 from jsonb_array_elements(p_workspace->'cards') d where d->>'id'=t.id);
 delete from public.accounts t where user_id=u and not exists(select 1 from jsonb_array_elements(p_workspace->'accounts') d where d->>'id'=t.id);
 insert into public.accounts(user_id,document, opening_date) select u,d, (d->>'openingDate')::date from jsonb_array_elements(p_workspace->'accounts') d on conflict(user_id,id) do update set document=excluded.document,updated_at=now(), opening_date=excluded.opening_date;
 insert into public.cards(user_id,document) select u,d from jsonb_array_elements(p_workspace->'cards') d on conflict(user_id,id) do update set document=excluded.document,updated_at=now();
 insert into public.plans(user_id,document) select u,d from jsonb_array_elements(p_workspace->'plans') d on conflict(user_id,id) do update set document=excluded.document,updated_at=now();
 insert into public.obligations(user_id,document, due_date) select u,d, (d->>'date')::date from jsonb_array_elements(p_workspace->'obligations') d on conflict(user_id,id) do update set document=excluded.document,updated_at=now(), due_date=excluded.due_date;
 insert into public.payments(user_id,document, effective_date) select u,d, (d->>'date')::date from jsonb_array_elements(p_workspace->'payments') d on conflict(user_id,id) do update set document=excluded.document,updated_at=now(), effective_date=excluded.effective_date;
 insert into public.transfers(user_id,document, effective_date) select u,d, (d->>'date')::date from jsonb_array_elements(p_workspace->'transfers') d on conflict(user_id,id) do update set document=excluded.document,updated_at=now(), effective_date=excluded.effective_date;
 insert into public.goals(user_id,document) select u,d from jsonb_array_elements(p_workspace->'goals') d on conflict(user_id,id) do update set document=excluded.document,updated_at=now();
 insert into public.budgets(user_id,document) select u,d from jsonb_array_elements(p_workspace->'budgets') d on conflict(user_id,id) do update set document=excluded.document,updated_at=now();
 insert into public.assets(user_id,document) select u,d from jsonb_array_elements(p_workspace->'assets') d on conflict(user_id,id) do update set document=excluded.document,updated_at=now();
 insert into public.scenarios(user_id,document) select u,d from jsonb_array_elements(p_workspace->'scenarios') d on conflict(user_id,id) do update set document=excluded.document,updated_at=now();

 if exists(select 1 from public.obligations o join public.payments p on (p.user_id=o.user_id and p.obligation_id=o.id) where o.user_id=u and not p.reversed group by o.id,o.amount having sum(p.amount)>o.amount) then raise exception 'overpayment'; end if;
 if exists(select 1 from public.payments p join public.accounts a on (a.user_id=p.user_id and a.id=p.account_id) where p.user_id=u and (p.effective_date>(now() at time zone 'America/Sao_Paulo')::date or p.effective_date<a.opening_date)) then raise exception 'invalid_payment_date'; end if;
 if exists(select 1 from public.transfers t join public.accounts a on (a.user_id=t.user_id and a.id in (t.from_id,t.to_id)) where t.user_id=u and (t.effective_date>(now() at time zone 'America/Sao_Paulo')::date or t.effective_date<a.opening_date)) then raise exception 'invalid_transfer_date'; end if;
 insert into public.workspace_meta(user_id,revision,preferences,categories,imports,client_audit) values(u,current_revision+1,p_workspace->'preferences',p_workspace->'categories',p_workspace->'imports',p_workspace->'audit') on conflict(user_id) do update set revision=excluded.revision,preferences=excluded.preferences,categories=excluded.categories,imports=excluded.imports,client_audit=excluded.client_audit,updated_at=now();
 insert into public.audit_log(user_id,revision,operation,before_state) values(u,current_revision+1,'save_workspace',before_data);
 return current_revision+1;
end $$;
revoke all on function public.load_workspace() from public, anon;
revoke all on function public.save_workspace(jsonb,bigint) from public, anon;
grant execute on function public.load_workspace() to authenticated;
grant execute on function public.save_workspace(jsonb,bigint) to authenticated;
-- No storage bucket is exposed: attachments remain disabled until private upload policies and validation are implemented.
