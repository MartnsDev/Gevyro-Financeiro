-- Additive events and notification history. Existing MCell tables and prior migrations stay intact.
begin;
create table gevyro_finance.events(
 user_id uuid not null references auth.users(id) on delete cascade,
 document jsonb not null,
 id text generated always as (document->>'id') stored not null,
 kind text generated always as (document->>'kind') stored not null,
 target_id text generated always as (document->>'targetId') stored not null,
 account_id text generated always as (nullif(document->>'accountId','')) stored,
 amount bigint generated always as ((document->>'amount')::bigint) stored not null,
 fee bigint generated always as ((document->>'fee')::bigint) stored not null,
 effective_date date not null,
 created_at timestamptz not null default now(),
 primary key(user_id,id),
 foreign key(user_id,account_id) references gevyro_finance.accounts(user_id,id) deferrable initially deferred,
 check(length(id) between 1 and 100),
 check(kind in ('balance_adjustment','investment_contribution','investment_redemption','investment_income','debt_drawdown','debt_payment','goal_reserve','goal_withdrawal','obligation_adjustment','purchase_refund')),
 check(amount<>0 and abs(amount)<=10000000000000 and fee>=0),
 check(kind='debt_payment' or fee=0),
 check(kind in ('obligation_adjustment','balance_adjustment') or amount>0),
 check(kind in ('goal_reserve','goal_withdrawal','obligation_adjustment') or account_id is not null),
 check(length(document->>'note') between 3 and 2000)
);
create table gevyro_finance.notifications(
 user_id uuid not null references auth.users(id) on delete cascade,
 document jsonb not null,
 id text generated always as (document->>'id') stored not null,
 created_at timestamptz not null default now(),
 primary key(user_id,id),
 check(length(id) between 1 and 100),
 check(jsonb_typeof(document->'read')='boolean')
);
alter table gevyro_finance.events enable row level security;
alter table gevyro_finance.notifications enable row level security;
create policy owner_read on gevyro_finance.events for select to authenticated using ((select auth.uid())=user_id);
create policy owner_read on gevyro_finance.notifications for select to authenticated using ((select auth.uid())=user_id);
revoke all on gevyro_finance.events, gevyro_finance.notifications from anon,authenticated;
grant select on gevyro_finance.events,gevyro_finance.notifications to authenticated;
create index events_target on gevyro_finance.events(user_id,target_id,kind);
create index events_date on gevyro_finance.events(user_id,effective_date);
create or replace function public.gevyro_load_workspace() returns jsonb
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
 result:=result||jsonb_build_object('events',coalesce((select jsonb_agg(document order by created_at,id) from gevyro_finance.events where user_id=u),'[]'::jsonb),'notifications',coalesce((select jsonb_agg(document order by created_at,id) from gevyro_finance.notifications where user_id=u),'[]'::jsonb));
 return jsonb_build_object('workspace',result,'revision',meta.revision);
end $$;

create or replace function public.gevyro_save_workspace(p_workspace jsonb,p_revision bigint) returns bigint
language plpgsql security definer set search_path = '' as $$
declare u uuid:=auth.uid(); current_revision bigint; before_data jsonb; entity text; row_data jsonb; audit_changes jsonb:='{}'; changed_rows jsonb;
begin
 if u is null then raise exception 'authentication_required'; end if;
 p_workspace:=p_workspace||jsonb_build_object('events',coalesce(p_workspace->'events','[]'::jsonb),'notifications',coalesce(p_workspace->'notifications','[]'::jsonb));
 if octet_length(p_workspace::text)>12582912 or p_workspace->>'schema'<>'1' then raise exception 'invalid_workspace'; end if;
 if p_workspace->'preferences'->>'currency'<>'BRL' or (p_workspace->'preferences'->>'payday')::int not between 1 and 31 or (p_workspace->'preferences'->>'reminderDays')::int not between 0 and 90 then raise exception 'invalid_preferences'; end if;
 perform pg_advisory_xact_lock(hashtextextended('gevyro_finance:'||u::text,0));
 select revision into current_revision from gevyro_finance.workspace_meta where user_id=u for update;
 current_revision:=coalesce(current_revision,0);
 if current_revision<>p_revision then raise exception 'revision_conflict'; end if;
 before_data:=public.gevyro_load_workspace();
 if before_data is not null then
  foreach entity in array array['accounts','cards','plans','obligations','payments','transfers','goals','budgets','assets','scenarios','events','notifications'] loop
   select jsonb_agg(old_doc) into changed_rows
   from jsonb_array_elements(before_data->'workspace'->entity) old_doc
   where not exists(select 1 from jsonb_array_elements(p_workspace->entity) new_doc where new_doc->>'id'=old_doc->>'id' and new_doc=old_doc);
   if changed_rows is not null then audit_changes:=audit_changes||jsonb_build_object(entity,changed_rows); end if;
  end loop;
  if before_data->'workspace'->'preferences' is distinct from p_workspace->'preferences' then audit_changes:=audit_changes||jsonb_build_object('preferences',before_data->'workspace'->'preferences'); end if;
  if before_data->'workspace'->'categories' is distinct from p_workspace->'categories' then audit_changes:=audit_changes||jsonb_build_object('categories',before_data->'workspace'->'categories'); end if;
 end if;
 foreach entity in array array['accounts','cards','plans','obligations','payments','transfers','goals','budgets','assets','scenarios','events','notifications','categories','imports','audit'] loop
  if jsonb_typeof(p_workspace->entity) is distinct from 'array' then raise exception 'invalid_collection: %',entity; end if;
 end loop;
 if exists(select 1 from gevyro_finance.accounts old join jsonb_array_elements(p_workspace->'accounts') d on d->>'id'=old.id where old.user_id=u and ((d->>'opening')::bigint<>old.opening or (d->>'openingDate')::date<>old.opening_date) and (exists(select 1 from gevyro_finance.payments p where p.user_id=u and p.account_id=old.id) or exists(select 1 from gevyro_finance.transfers t where t.user_id=u and old.id in (t.from_id,t.to_id)))) then raise exception 'immutable_opening_balance'; end if;
 if exists(select 1 from gevyro_finance.obligations old join gevyro_finance.payments p on p.user_id=old.user_id and p.obligation_id=old.id join jsonb_array_elements(p_workspace->'obligations') d on d->>'id'=old.id where old.user_id=u and ((old.document-'cancelled')<>(d-'cancelled') or (coalesce((d->>'cancelled')::boolean,false) and exists(select 1 from jsonb_array_elements(p_workspace->'payments') newp where newp->>'obligationId'=old.id and not coalesce((newp->>'reversed')::boolean,false))))) then raise exception 'immutable_paid_obligation'; end if;
 if exists(select 1 from gevyro_finance.events old where old.user_id=u and not exists(select 1 from jsonb_array_elements(p_workspace->'events') d where d=old.document)) then raise exception 'immutable_financial_events'; end if;
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

 insert into gevyro_finance.events(user_id,document,effective_date) select u,d,(d->>'date')::date from jsonb_array_elements(p_workspace->'events') d on conflict(user_id,id) do nothing;
 delete from gevyro_finance.notifications n where user_id=u and not exists(select 1 from jsonb_array_elements(p_workspace->'notifications') d where d->>'id'=n.id);
 insert into gevyro_finance.notifications(user_id,document) select u,d from jsonb_array_elements(p_workspace->'notifications') d on conflict(user_id,id) do update set document=excluded.document where notifications.document is distinct from excluded.document;
 if exists(select 1 from gevyro_finance.events e where user_id=u and effective_date>(now() at time zone 'America/Sao_Paulo')::date) then raise exception 'invalid_event_date'; end if;
 if exists(select 1 from gevyro_finance.events e where user_id=u and not (case
 when kind in ('goal_reserve','goal_withdrawal') then exists(select 1 from gevyro_finance.goals g where g.user_id=u and g.id=e.target_id)
 when kind like 'investment_%' then exists(select 1 from gevyro_finance.assets a where a.user_id=u and a.id=e.target_id and a.document->>'type'='investment')
 when kind like 'debt_%' then exists(select 1 from gevyro_finance.assets a where a.user_id=u and a.id=e.target_id and a.document->>'type'='debt')
 when kind='balance_adjustment' then target_id=account_id
 else exists(select 1 from gevyro_finance.obligations o where o.user_id=u and o.id=e.target_id and o.kind='expense' and not (o.document->>'cancelled')::boolean)
 end)) then raise exception 'invalid_event_target'; end if;
 if exists(select 1 from gevyro_finance.events e join gevyro_finance.accounts a on a.user_id=e.user_id and a.id=e.account_id where e.user_id=u and e.effective_date<a.opening_date) then raise exception 'invalid_event_date'; end if;
 if exists(select 1 from gevyro_finance.obligations o where o.user_id=u and (select coalesce(sum(e.amount),0) from gevyro_finance.events e where e.user_id=u and e.target_id=o.id and e.kind='purchase_refund')>(select coalesce(sum(p.amount),0) from gevyro_finance.payments p where p.user_id=u and p.obligation_id=o.id and not p.reversed)) then raise exception 'excess_refund'; end if;
 if exists(select 1 from gevyro_finance.obligations o where o.user_id=u and o.amount+(select coalesce(sum(e.amount),0) from gevyro_finance.events e where e.user_id=u and e.target_id=o.id and e.kind='obligation_adjustment')<0) then raise exception 'negative_obligation_due'; end if;
 if exists(select 1 from gevyro_finance.obligations o join gevyro_finance.payments p on (p.user_id=o.user_id and p.obligation_id=o.id) where o.user_id=u and not p.reversed group by o.id,o.amount having sum(p.amount)>o.amount+(select coalesce(sum(e.amount),0) from gevyro_finance.events e where e.user_id=u and e.target_id=o.id and e.kind='obligation_adjustment')) then raise exception 'overpayment'; end if;
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

notify pgrst,'reload schema';
commit;
