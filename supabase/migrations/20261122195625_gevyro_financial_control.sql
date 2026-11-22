-- Additive Gevyro-only validation. No historical record is rewritten or backfilled.
-- Keep both public RPCs as invokers, all owner checks, RLS and revision locking.
begin;
-- Rich investment operations use the existing immutable event ledger.
do $migration$
declare constraint_name text;
begin
 select conname into constraint_name from pg_constraint
 where conrelid='gevyro_finance.events'::regclass and contype='c'
 and pg_get_constraintdef(oid) like '%debt_payment%fee%';
 if constraint_name is not null then execute format('alter table gevyro_finance.events drop constraint %I',constraint_name); end if;
end $migration$;
alter table gevyro_finance.events add constraint gevyro_event_fees check (kind='debt_payment' or fee=0 or (kind like 'investment_%' and jsonb_typeof(document->'investment')='object'));

do $migration$
declare constraint_name text;
begin
 select conname into constraint_name from pg_constraint where conrelid='gevyro_finance.events'::regclass and contype='c' and pg_get_constraintdef(oid) like '%balance_adjustment%investment_contribution%';
 if constraint_name is null then raise exception 'unexpected_event_kind_constraint'; end if;
 execute format('alter table gevyro_finance.events drop constraint %I',constraint_name);
end $migration$;
alter table gevyro_finance.events add constraint gevyro_event_kind check(kind in ('balance_adjustment','investment_contribution','investment_redemption','investment_income','debt_drawdown','debt_payment','goal_reserve','goal_withdrawal','obligation_adjustment','purchase_refund','purchase_refund_reversal'));

create function gevyro_finance.validate_financial_update(w jsonb) returns void
language plpgsql security invoker set search_path='' as $function$
declare
 u uuid:=auth.uid(); old_audit jsonb; d jsonb; old_doc jsonb; inv jsonb; state jsonb:='{}'; a jsonb; before_position jsonb; after_position jsonb;
 original jsonb; original_inv jsonb; previous_event jsonb; amt numeric; fee numeric; tax numeric; qty numeric; unit_price numeric; fraction numeric;
 value_before numeric; cost_before numeric; value_after numeric; cost_after numeric; cash_delta numeric; qty_after numeric; operation text; asset_id text;
 magnitude numeric; reversed_ids text[]:=array[]::text[]; last_event jsonb:='{}';
begin
 if u is null then raise exception 'authentication_required'; end if;
 perform gevyro_finance.require_google_session();
 select coalesce(sum(abs((f.value#>>'{}')::numeric)),0) into magnitude
 from jsonb_each(w) c cross join lateral jsonb_array_elements(case when c.key in ('accounts','obligations','payments','transfers','goals','assets','events') then c.value else '[]'::jsonb end) r
 cross join lateral jsonb_each(r) f
 where c.key in ('accounts','obligations','payments','transfers','goals','assets','events')
 and f.key in ('opening','amount','fee','value','cost','target','reserved','monthly') and jsonb_typeof(f.value)='number';
 select magnitude+coalesce(sum(abs(coalesce((e->'investment'->>'tax')::numeric,0))+abs(coalesce((e->'investment'->>'cash')::numeric,0))),0) into magnitude from jsonb_array_elements(w->'events') e;
 if magnitude>9007199254740991 then raise exception 'unsafe_monetary_magnitude'; end if;

 if exists(select 1 from jsonb_array_elements(w->'obligations') x group by x->>'planId',x->>'installment' having count(*)>1) then raise exception 'duplicate_installment'; end if;
 select client_audit into old_audit from gevyro_finance.workspace_meta where user_id=u;
 if old_audit is not null and (jsonb_array_length(w->'audit')<jsonb_array_length(old_audit) or exists(select 1 from jsonb_array_elements(old_audit) with ordinality x(doc,i) where doc is distinct from (w->'audit')->((i-1)::int))) then raise exception 'immutable_audit_history'; end if;
 for d in select x from jsonb_array_elements(w->'obligations') x loop
  if d->>'date' !~ '^\d{4}-\d{2}-\d{2}$' or (d->>'date')::date::text<>d->>'date' then raise exception 'invalid_due_date'; end if;
  select document into old_doc from gevyro_finance.obligations where user_id=u and id=d->>'id';
  if old_doc is not null then
   if old_doc ? 'originalDate' and d->'originalDate' is distinct from old_doc->'originalDate' then raise exception 'immutable_original_due'; end if;
   if not old_doc ? 'originalDate' and d ? 'originalDate' and d->'originalDate' is distinct from old_doc->'date' then raise exception 'invalid_original_due'; end if;
   if old_doc ? 'originalAmount' and d->'originalAmount' is distinct from old_doc->'originalAmount' then raise exception 'immutable_original_amount'; end if;
   if not old_doc ? 'originalAmount' and d ? 'originalAmount' and d->'originalAmount' is distinct from old_doc->'amount' then raise exception 'invalid_original_amount'; end if;
  end if;
  if length(coalesce(d->>'notes',''))>2000 then raise exception 'invalid_occurrence_notes'; end if;
 end loop;
 -- Linked compensating events cannot be forged, repeated or redirected to another owner/account.
 for d in select x from jsonb_array_elements(w->'events') x where not exists(select 1 from gevyro_finance.events old where old.user_id=u and old.id=x->>'id') loop
  if d->>'kind'='purchase_refund_reversal' and not d ? 'reversalOf' then raise exception 'refund_reversal_requires_original'; end if;
  if d ? 'reversalOf' then
   select document into original from gevyro_finance.events where user_id=u and id=d->>'reversalOf';
   if original is null or original ? 'reversalOf' or original->>'kind' like 'investment_%' then raise exception 'invalid_event_reversal'; end if;
   if (select count(*) from jsonb_array_elements(w->'events') r where r->>'reversalOf'=original->>'id')<>1 then raise exception 'duplicate_event_reversal'; end if;
   operation:=case original->>'kind' when 'balance_adjustment' then 'balance_adjustment' when 'obligation_adjustment' then 'obligation_adjustment' when 'goal_reserve' then 'goal_withdrawal' when 'goal_withdrawal' then 'goal_reserve' when 'debt_drawdown' then 'debt_payment' when 'debt_payment' then 'debt_drawdown' when 'purchase_refund' then 'purchase_refund_reversal' end;
   amt:=(original->>'amount')::numeric * case when original->>'kind' in ('balance_adjustment','obligation_adjustment') then -1 else 1 end;
   if operation is null or d->>'kind' is distinct from operation or (d->>'amount')::numeric is distinct from amt or (d->>'fee')::numeric<>0 or d->>'targetId' is distinct from original->>'targetId' or d->>'accountId' is distinct from original->>'accountId' or (d->>'date')::date<(original->>'date')::date then raise exception 'invalid_event_reversal'; end if;
  end if;
  if d ? 'reversalFeeOf' then
   select document into original from gevyro_finance.events where user_id=u and id=d->>'reversalFeeOf';
   if original is null or original->>'kind'<>'debt_payment' or (original->>'fee')::numeric<=0 or d->>'kind'<>'balance_adjustment' or d->>'targetId' is distinct from original->>'accountId' or d->>'accountId' is distinct from original->>'accountId' or (d->>'amount')::numeric is distinct from (original->>'fee')::numeric or not exists(select 1 from jsonb_array_elements(w->'events') r where r->>'reversalOf'=original->>'id') or (select count(*) from jsonb_array_elements(w->'events') r where r->>'reversalFeeOf'=original->>'id')<>1 then raise exception 'invalid_fee_reversal'; end if;
  end if;
 end loop;
 if exists(select 1 from jsonb_array_elements(w->'obligations') o where (select coalesce(sum(case when e->>'kind'='purchase_refund' then (e->>'amount')::numeric else -(e->>'amount')::numeric end),0) from jsonb_array_elements(w->'events') e where e->>'targetId'=o->>'id' and e->>'kind' in ('purchase_refund','purchase_refund_reversal'))<0) then raise exception 'negative_refund_total'; end if;
 -- Reconstruct positions only for new operations, in supplied ledger order.
 for d in select x from jsonb_array_elements(w->'events') x where not exists(select 1 from gevyro_finance.events old where old.user_id=u and old.id=x->>'id') loop
  if d->>'kind' not like 'investment_%' then continue; end if;
  asset_id:=d->>'targetId'; inv:=d->'investment';
  select x into a from jsonb_array_elements(w->'assets') x where x->>'id'=asset_id;
  if a->>'classification' is null or a->>'classification' not in ('Renda fixa','Ações','Fundos imobiliários','ETFs','Tesouro Direto','Fundos de investimento','Criptomoedas','Outros investimentos') then raise exception 'investment_class_required'; end if;
  if inv is null then raise exception 'investment_operation_details_required'; end if; -- historical events are never revalidated or rewritten
  if not state ? asset_id then
   select document into old_doc from gevyro_finance.assets where user_id=u and id=asset_id;
   if old_doc is null then raise exception 'save_position_before_operation'; end if;
   state:=jsonb_set(state,array[asset_id],old_doc);
  end if;
  old_doc:=state->asset_id;
  before_position:=jsonb_build_object('value',old_doc->'value','cost',old_doc->'cost');
  if old_doc ? 'quantity' then before_position:=before_position||jsonb_build_object('quantity',old_doc->'quantity'); end if;
  if inv->'before' is distinct from before_position then raise exception 'investment_position_conflict'; end if;
  if (d->>'date')::date < (old_doc->>'date')::date then raise exception 'investment_date_order'; end if;
  select document into previous_event from gevyro_finance.events where user_id=u and target_id=asset_id and document ? 'investment' order by ((document->'investment'->>'sequence')::bigint) desc limit 1;
  if last_event ? asset_id then previous_event:=last_event->asset_id; end if;
  if (inv->>'sequence')::bigint is distinct from coalesce((previous_event->'investment'->>'sequence')::bigint,0)+1 then raise exception 'investment_sequence_conflict'; end if;
  amt:=(d->>'amount')::numeric; fee:=(d->>'fee')::numeric; tax:=(inv->>'tax')::numeric; operation:=inv->>'operation';
  if amt<=0 or amt>1e13 or fee<0 or fee>1e13 or tax is null or tax<0 or tax>1e13 or tax<>trunc(tax) then raise exception 'invalid_investment_money'; end if;
  value_before:=(old_doc->>'value')::numeric; cost_before:=(old_doc->>'cost')::numeric; value_after:=value_before; cost_after:=cost_before; qty_after:=null;
  if inv ? 'quantity' and (inv->>'quantity' !~ '^(0|[1-9]\d{0,12})(\.\d{1,12})?$' or (inv->>'quantity')::numeric<=0) then raise exception 'invalid_investment_quantity'; end if;
  qty:=nullif(inv->>'quantity','')::numeric;
  if inv ? 'unitPrice' then
   if qty is null or inv->>'unitPrice' !~ '^(0|[1-9]\d{0,12})(\.\d{1,12})?$' then raise exception 'invalid_unit_price'; end if;
   unit_price:=(inv->>'unitPrice')::numeric;
   if unit_price<=0 or round(qty*unit_price*100)<>amt then raise exception 'investment_price_mismatch'; end if;
  end if;
  if operation in ('buy','sell') and qty is null then raise exception 'investment_quantity_required'; end if;
  if operation in ('buy','contribution') then
   if d->>'kind'<>'investment_contribution' then raise exception 'investment_kind_mismatch'; end if;
   if qty is not null and value_before>0 and not old_doc ? 'quantity' then raise exception 'position_quantity_required'; end if;
   if qty is null and old_doc ? 'quantity' then raise exception 'operation_quantity_required'; end if;
   value_after:=value_before+amt; cost_after:=cost_before+amt+fee+tax; cash_delta:=-amt-fee-tax;
   if qty is not null then qty_after:=coalesce((old_doc->>'quantity')::numeric,0)+qty; end if;
  elsif operation in ('sell','redemption') then
   if d->>'kind'<>'investment_redemption' then raise exception 'investment_kind_mismatch'; end if;
   if old_doc ? 'quantity' then
    if qty is null or qty>(old_doc->>'quantity')::numeric or (old_doc->>'quantity')::numeric<=0 then raise exception 'excess_investment_quantity'; end if;
    fraction:=qty/(old_doc->>'quantity')::numeric; qty_after:=(old_doc->>'quantity')::numeric-qty;
   else
    if qty is not null or amt>value_before or value_before<=0 then raise exception 'excess_redemption'; end if;
    fraction:=amt/value_before;
   end if;
   value_after:=value_before-round(value_before*fraction); cost_after:=cost_before-round(cost_before*fraction); cash_delta:=amt-fee-tax;
  elsif operation in ('income','dividend') then
   if d->>'kind'<>'investment_income' or qty is not null then raise exception 'investment_kind_mismatch'; end if;
   cash_delta:=amt-fee-tax;
   if old_doc ? 'quantity' then qty_after:=(old_doc->>'quantity')::numeric; end if;
  elsif operation='reversal' then
   select document into original from gevyro_finance.events where user_id=u and id=inv->>'reversalOf';
   if original is null then select x into original from jsonb_array_elements(w->'events') x where x->>'id'=inv->>'reversalOf'; end if;
   original_inv:=original->'investment';
   select x into previous_event from jsonb_array_elements(w->'events') x
   where x->>'targetId'=asset_id and x->'investment'->>'operation'<>'reversal'
   and (x->'investment'->>'sequence')::bigint<(inv->>'sequence')::bigint
   and not exists(select 1 from jsonb_array_elements(w->'events') r where r->'investment'->>'reversalOf'=x->>'id' and (r->'investment'->>'sequence')::bigint<(inv->>'sequence')::bigint)
   order by (x->'investment'->>'sequence')::bigint desc limit 1;
   if original_inv is null or original_inv->>'operation'='reversal' or previous_event->>'id' is distinct from original->>'id' or original->>'targetId' is distinct from asset_id or original->>'id'=any(reversed_ids) or exists(select 1 from gevyro_finance.events where user_id=u and document->'investment'->>'reversalOf'=original->>'id') or before_position is distinct from original_inv->'after' then raise exception 'invalid_investment_reversal'; end if;
   if d->>'accountId' is distinct from original->>'accountId' or amt<>(original->>'amount')::numeric or fee<>(original->>'fee')::numeric or tax<>(original_inv->>'tax')::numeric or d->>'kind'<>(case when original->>'kind'='investment_contribution' then 'investment_redemption' else 'investment_contribution' end) then raise exception 'invalid_reversal_amount'; end if;
   value_after:=(original_inv->'before'->>'value')::numeric;cost_after:=(original_inv->'before'->>'cost')::numeric;cash_delta:=-(original_inv->>'cash')::numeric;
   if original_inv->'before' ? 'quantity' then qty_after:=(original_inv->'before'->>'quantity')::numeric; end if;
   reversed_ids:=array_append(reversed_ids,original->>'id');
  else raise exception 'invalid_investment_operation'; end if;
  if cash_delta is null or (operation not in ('buy','contribution','reversal') and cash_delta<0) or (inv->>'cash')::numeric is distinct from cash_delta then raise exception 'invalid_investment_cash'; end if;
  after_position:=inv->'after';
  if (after_position->>'value')::numeric is distinct from value_after or (after_position->>'cost')::numeric is distinct from cost_after or (after_position->>'quantity')::numeric is distinct from qty_after or value_after>1e13 or cost_after>1e13 then raise exception 'invalid_investment_position'; end if;
  state:=jsonb_set(state,array[asset_id],after_position||jsonb_build_object('date',d->'date'));
  last_event:=jsonb_set(last_event,array[asset_id],d);
 end loop;
 for asset_id, old_doc in select key,value from jsonb_each(state) loop
  select x into a from jsonb_array_elements(w->'assets') x where x->>'id'=asset_id;
  if a->'value' is distinct from old_doc->'value' or a->'cost' is distinct from old_doc->'cost' or a->'quantity' is distinct from old_doc->'quantity' or a->'date' is distinct from old_doc->'date' then raise exception 'investment_final_position_mismatch'; end if;
 end loop;
 for a in select x from jsonb_array_elements(w->'assets') x loop
  if a ? 'quantity' and a->>'quantity' !~ '^(0|[1-9]\d{0,12})(\.\d{1,12})?$' then raise exception 'invalid_position_quantity'; end if;
  if a->>'type'='investment' then
   select document into old_doc from gevyro_finance.assets where user_id=u and id=a->>'id';
   if (old_doc is null or a ? 'classification') and (a->>'classification' is null or a->>'classification' not in ('Renda fixa','Ações','Fundos imobiliários','ETFs','Tesouro Direto','Fundos de investimento','Criptomoedas','Outros investimentos')) then raise exception 'investment_class_required'; end if;
   if old_doc is not null and not state ? (a->>'id') and exists(select 1 from gevyro_finance.events where user_id=u and target_id=a->>'id' and kind like 'investment_%') and old_doc->'cost' is distinct from a->'cost' then raise exception 'investment_cost_requires_reversal'; end if;
  end if;
 end loop;
end $function$;
revoke all on function gevyro_finance.validate_financial_update(jsonb) from public,anon,authenticated;
-- Called by the existing private definer only; no new public endpoint or table grants.
do $migration$
declare definition text; old_guard text;
begin
 select pg_get_functiondef('gevyro_finance.gevyro_save_workspace(jsonb,bigint)'::regprocedure) into definition;
 old_guard:=$guard$(old.document-'cancelled')<>(d-'cancelled')$guard$;
 if position(old_guard in definition)=0 then raise exception 'unexpected_gevyro_save_definition'; end if;
 definition:=replace(definition,old_guard,$guard$(old.document-array['cancelled','name','amount','date','notes','category','originalDate','originalAmount'])<>(d-array['cancelled','name','amount','date','notes','category','originalDate','originalAmount'])$guard$);
 definition:=replace(definition,'sum(e.amount),0) from gevyro_finance.events e where e.user_id=u and e.target_id=o.id and e.kind=''purchase_refund''','sum(case when e.kind=''purchase_refund'' then e.amount else -e.amount end),0) from gevyro_finance.events e where e.user_id=u and e.target_id=o.id and e.kind in (''purchase_refund'',''purchase_refund_reversal'')');
 definition:=replace(definition,'before_data:=public.gevyro_load_workspace();','before_data:=public.gevyro_load_workspace(); perform gevyro_finance.validate_financial_update(p_workspace);');
 execute definition;
end $migration$;
notify pgrst,'reload schema';
commit;
