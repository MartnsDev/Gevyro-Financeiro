begin;
insert into auth.users values ('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
set local role authenticated;
set local request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';
select public.save_workspace($fixture${"schema": 1, "preferences": {"name": "Teste", "currency": "BRL", "payday": 5, "reminderDays": 7, "estimatedIncome": 0, "onboarding": true}, "categories": ["Outros"], "imports": [], "audit": [], "accounts": [{"id": "a", "name": "Conta", "institution": "", "type": "digital", "opening": 100000, "openingDate": "2020-01-01", "color": "#059669"}], "cards": [], "plans": [{"id": "p", "name": "Compra", "amount": 18000, "kind": "expense", "category": "Outros", "accountId": "a", "cardId": "", "date": "2024-01-01", "mode": "once", "count": 1, "interval": 1, "unit": "month", "end": "", "notes": "", "subscription": false}], "obligations": [{"id": "p:1", "planId": "p", "name": "Compra", "amount": 18000, "kind": "expense", "category": "Outros", "accountId": "a", "cardId": "", "date": "2024-01-01", "purchaseDate": "2024-01-01", "installment": 1, "total": 1, "subscription": false, "cancelled": false}], "payments": [], "transfers": [], "goals": [], "budgets": [], "assets": [], "scenarios": []}$fixture$::jsonb,0);
do $$ declare data jsonb; r bigint; begin
 select public.load_workspace()->'workspace' into data;
 if jsonb_array_length(data->'accounts')<>1 then raise exception 'FAIL roundtrip'; end if;
 begin perform public.save_workspace(data,0);raise exception 'FAIL stale revision accepted'; exception when others then if sqlerrm not like '%revision_conflict%' then raise; end if;end;
 data:=jsonb_set(data,'{payments}','[{"id":"payment-1","obligationId":"p:1","accountId":"a","amount":5000,"date":"2024-01-01"}]');
 r:=public.save_workspace(data,1);
 if r<>2 then raise exception 'FAIL revision'; end if;
 -- Repeating a snapshot never duplicates a payment.
 r:=public.save_workspace(data,2);
 if (select count(*) from public.payments)<>1 then raise exception 'FAIL idempotency'; end if;
 data:=jsonb_set(data,'{payments}','[]');
 begin perform public.save_workspace(data,3);raise exception 'FAIL history deleted'; exception when others then if sqlerrm not like '%immutable_payment_history%' then raise; end if;end;
 data:=public.load_workspace()->'workspace';
 data:=jsonb_set(data,'{payments}',(data->'payments')||'[{"id":"overpay","obligationId":"p:1","accountId":"a","amount":15000,"date":"2024-01-01"}]');
 begin perform public.save_workspace(data,3);raise exception 'FAIL overpayment accepted'; exception when others then if sqlerrm not like '%overpayment%' then raise; end if;end;
 if (public.load_workspace()->>'revision')::int<>3 then raise exception 'FAIL non-atomic revision'; end if;
 if (select count(*) from public.payments)<>1 then raise exception 'FAIL non-atomic payment'; end if;
 data:=public.load_workspace()->'workspace';
 data:=jsonb_set(data,'{accounts,0,opening}','900000');
 begin perform public.save_workspace(data,3);raise exception 'FAIL opening rewritten'; exception when others then if sqlerrm not like '%immutable_opening_balance%' then raise; end if;end;
 begin delete from public.payments;raise exception 'FAIL direct write allowed'; exception when insufficient_privilege then null;end;
end $$;
do $$ declare data jsonb; begin
 data:=public.load_workspace()->'workspace';
 data:=jsonb_set(data,'{payments,0,reversed}','true');
 data:=jsonb_set(data,'{obligations,0,cancelled}','true');
 perform public.save_workspace(data,3);
 perform set_config('gevyro.test_fixture',data::text,true);
 if not (select reversed from public.payments limit 1) then raise exception 'FAIL payment reversal'; end if;
end $$;
set local request.jwt.claim.sub='22222222-2222-4222-8222-222222222222';
do $$ begin
 if exists(select 1 from public.accounts) then raise exception 'FAIL cross-user account disclosure'; end if;
 if exists(select 1 from public.payments) then raise exception 'FAIL cross-user payment disclosure'; end if;
 if exists(select 1 from public.audit_log) then raise exception 'FAIL cross-user audit disclosure'; end if;
 if public.load_workspace() is not null then raise exception 'FAIL cross-user RPC disclosure'; end if;
end $$;
do $$ declare data jsonb; begin
 data:=current_setting('gevyro.test_fixture')::jsonb;
 data:=jsonb_set(data,'{accounts}','[]');
 data:=jsonb_set(data,'{payments}','[]');
 begin
  perform public.save_workspace(data,0);
  set constraints all immediate;
  raise exception 'FAIL cross-user reference accepted';
 exception when foreign_key_violation then null;
 end;
 if public.load_workspace() is not null then raise exception 'FAIL failed foreign reference persisted'; end if;
end $$;
set local request.jwt.claim.sub='';
do $$ begin
 begin perform public.load_workspace(); raise exception 'FAIL unauthenticated RPC'; exception when others then if sqlerrm not like '%authentication_required%' then raise; end if; end;
end $$;
reset role;
rollback;
select 'PASS: isolation, revision conflicts, immutable history, overpayment, atomic rollback and RPC authorization' as result;
