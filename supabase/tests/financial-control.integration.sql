-- Disposable test user, transaction always rolled back. Never run fixtures in production.
begin;
insert into auth.users(id) values('77777777-7777-4777-8777-777777777777');
set local role authenticated;
set local request.jwt.claim.sub='77777777-7777-4777-8777-777777777777';
set local request.jwt.claims='{"app_metadata":{"provider":"google","providers":["google"]},"amr":[{"method":"oauth"}]}';
select public.gevyro_save_workspace($fixture${"schema": 1, "preferences": {"name": "Test", "currency": "BRL", "payday": 5, "reminderDays": 7, "estimatedIncome": 0, "onboarding": true}, "categories": ["Compras"], "imports": [], "audit": [], "accounts": [{"id": "a", "name": "Conta", "institution": "", "type": "digital", "opening": 100000, "openingDate": "2020-01-01", "color": "#059669"}], "cards": [], "plans": [{"id": "p", "name": "Compra", "amount": 204123, "kind": "expense", "category": "Compras", "accountId": "a", "cardId": "", "date": "2024-01-01", "mode": "installment", "count": 10, "interval": 1, "unit": "month", "end": "", "notes": "", "subscription": false}], "obligations": [{"id": "p:1", "planId": "p", "name": "Compra", "amount": 20413, "kind": "expense", "category": "Compras", "accountId": "a", "cardId": "", "date": "2024-01-01", "purchaseDate": "2024-01-01", "installment": 1, "total": 10, "subscription": false, "cancelled": false}], "payments": [{"id": "pay", "obligationId": "p:1", "accountId": "a", "amount": 20413, "date": "2023-12-20"}], "transfers": [], "goals": [], "budgets": [], "assets": [{"id": "stock", "name": "Ativo", "type": "investment", "classification": "A\u00e7\u00f5es", "value": 0, "cost": 0, "date": "2020-01-01", "notes": ""}], "scenarios": [], "events": [], "notifications": []}$fixture$::jsonb,0);

do $test$
declare w jsonb; bad jsonb; old_payment jsonb; inv jsonb; e jsonb;
begin
 w:=public.gevyro_load_workspace()->'workspace'; old_payment:=w->'payments';
 w:=jsonb_set(w,'{obligations,0,date}','"2024-02-15"');
 w:=jsonb_set(w,'{obligations,0,originalDate}','"2024-01-01"');
 w:=jsonb_set(w,'{obligations,0,originalAmount}','20413');
 w:=jsonb_set(w,'{obligations,0,notes}','"Correção individual"');
 perform public.gevyro_save_workspace(w,1);
 if public.gevyro_load_workspace()->'workspace'->'payments'<>old_payment then raise exception 'FAIL payment rewrite';end if;
 bad:=jsonb_set(w,'{obligations}',w->'obligations'||jsonb_build_array((w->'obligations'->0)||'{"id":"duplicate"}'));
 begin perform public.gevyro_save_workspace(bad,2);raise exception 'FAIL duplicate accepted';exception when raise_exception then if SQLERRM<>'duplicate_installment' then raise;end if;end;
 bad:=jsonb_set(w,'{obligations,0,originalDate}','"2024-02-15"');
 begin perform public.gevyro_save_workspace(bad,2);raise exception 'FAIL original due overwritten';exception when raise_exception then if SQLERRM<>'immutable_original_due' then raise;end if;end;
 inv:='{"sequence":1,"operation":"buy","quantity":"10","unitPrice":"35","tax":100,"cash":-35200,"before":{"value":0,"cost":0},"after":{"value":35000,"cost":35200,"quantity":"10"}}';
 e:=jsonb_build_object('id','buy','kind','investment_contribution','targetId','stock','accountId','a','amount',35000,'fee',100,'date','2024-03-01','note','Compra real teste','investment',inv);
 w:=jsonb_set(w,'{events}',jsonb_build_array(e));
 w:=jsonb_set(w,'{assets,0}',(w->'assets'->0)||'{"value":35000,"cost":35200,"quantity":"10","date":"2024-03-01"}');
 bad:=jsonb_set(w,'{events,0,investment,cash}','-35000');
 begin perform public.gevyro_save_workspace(bad,2);raise exception 'FAIL wrong cash accepted';exception when raise_exception then if SQLERRM<>'invalid_investment_cash' then raise;end if;end;
 if (public.gevyro_load_workspace()->>'revision')::int<>2 then raise exception 'FAIL atomic rollback';end if;
 perform public.gevyro_save_workspace(w,2);
 if (public.gevyro_load_workspace()->'workspace'->'assets'->0->>'cost')::int<>35200 then raise exception 'FAIL position cost';end if;
 bad:=jsonb_set(w,'{assets,0,cost}','1');
 begin perform public.gevyro_save_workspace(bad,3);raise exception 'FAIL silent cost rewrite';exception when raise_exception then if SQLERRM<>'investment_cost_requires_reversal' then raise;end if;end;
 -- A compensating event restores cash/position; original is immutable.
 inv:='{"sequence":2,"operation":"reversal","tax":100,"cash":35200,"before":{"value":35000,"cost":35200,"quantity":"10"},"after":{"value":0,"cost":0},"reversalOf":"buy"}';
 e:=jsonb_build_object('id','undo-buy','kind','investment_redemption','targetId','stock','accountId','a','amount',35000,'fee',100,'date','2024-03-02','note','Estorno de buy','investment',inv);
 w:=jsonb_set(w,'{events}',w->'events'||jsonb_build_array(e));
 w:=jsonb_set(w,'{assets,0}',((w->'assets'->0)-'quantity')||'{"value":0,"cost":0,"date":"2024-03-02"}');
 perform public.gevyro_save_workspace(w,3);
 if jsonb_array_length(public.gevyro_load_workspace()->'workspace'->'events')<>2 then raise exception 'FAIL reversal history';end if;
 if (select count(*) from gevyro_finance.audit_log)<>4 then raise exception 'FAIL server audit';end if;
 -- Reimbursements can be compensated once and then corrected, without deleting originals.
 e:='{"id":"refund","kind":"purchase_refund","targetId":"p:1","accountId":"a","amount":5000,"fee":0,"date":"2024-03-03","note":"Reembolso recebido"}';
 w:=jsonb_set(w,'{events}',w->'events'||jsonb_build_array(e));
 perform public.gevyro_save_workspace(w,4);
 e:='{"id":"refund-undo","kind":"purchase_refund_reversal","targetId":"p:1","accountId":"a","amount":5000,"fee":0,"date":"2024-03-04","note":"Estorno do reembolso","reversalOf":"refund"}';
 bad:=jsonb_set(w,'{events}',w->'events'||jsonb_build_array(e||'{"amount":6000}'));
 begin perform public.gevyro_save_workspace(bad,5);raise exception 'FAIL forged refund reversal';exception when raise_exception then if SQLERRM<>'invalid_event_reversal' then raise;end if;end;
 w:=jsonb_set(w,'{events}',w->'events'||jsonb_build_array(e));
 perform public.gevyro_save_workspace(w,5);
 bad:=jsonb_set(w,'{events}',w->'events'||jsonb_build_array(e||'{"id":"duplicate-reversal"}'));
 begin perform public.gevyro_save_workspace(bad,6);raise exception 'FAIL duplicate reversal';exception when raise_exception then if SQLERRM<>'duplicate_event_reversal' then raise;end if;end;
 -- The immutable prefix remains intact, and payment correction is atomic.
 w:=jsonb_set(w,'{payments,0,reversed}','true');
 w:=jsonb_set(w,'{payments}',w->'payments'||'[{"id":"pay-corrected","obligationId":"p:1","accountId":"a","amount":20413,"date":"2023-12-21"}]');
 w:=jsonb_set(w,'{audit}','[{"id":"correction","at":"2024-03-04T12:00:00.000Z","action":"Correção de pagamento"}]');
 perform public.gevyro_save_workspace(w,6);
 bad:=jsonb_set(w,'{audit}','[]');
 begin perform public.gevyro_save_workspace(bad,7);raise exception 'FAIL audit deletion';exception when raise_exception then if SQLERRM<>'immutable_audit_history' then raise;end if;end;
 bad:=jsonb_set(w,'{payments,0,date}','"2023-12-22"');
 begin perform public.gevyro_save_workspace(bad,7);raise exception 'FAIL historical payment rewrite';exception when raise_exception then if SQLERRM<>'immutable_payment_history' then raise;end if;end;
 -- Sale proceeds can exceed book value while units/cost are reduced proportionally.
 inv:='{"sequence":3,"operation":"buy","quantity":"10","unitPrice":"35","tax":0,"cash":-35000,"before":{"value":0,"cost":0},"after":{"value":35000,"cost":35000,"quantity":"10"}}';
 e:=jsonb_build_object('id','buy-again','kind','investment_contribution','targetId','stock','accountId','a','amount',35000,'fee',0,'date','2024-03-05','note','Nova compra','investment',inv);
 w:=jsonb_set(w,'{events}',w->'events'||jsonb_build_array(e));
 w:=jsonb_set(w,'{assets,0}',(w->'assets'->0)||'{"value":35000,"cost":35000,"quantity":"10","date":"2024-03-05"}');
 perform public.gevyro_save_workspace(w,7);
 inv:='{"sequence":4,"operation":"sell","quantity":"5","unitPrice":"42","tax":25,"cash":20925,"before":{"value":35000,"cost":35000,"quantity":"10"},"after":{"value":17500,"cost":17500,"quantity":"5"}}';
 e:=jsonb_build_object('id','sell','kind','investment_redemption','targetId','stock','accountId','a','amount',21000,'fee',50,'date','2024-03-06','note','Venda parcial','investment',inv);
 w:=jsonb_set(w,'{events}',w->'events'||jsonb_build_array(e));
 w:=jsonb_set(w,'{assets,0}',(w->'assets'->0)||'{"value":17500,"cost":17500,"quantity":"5","date":"2024-03-06"}');
 perform public.gevyro_save_workspace(w,8);
 inv:='{"sequence":5,"operation":"reversal","tax":25,"cash":-20925,"before":{"value":17500,"cost":17500,"quantity":"5"},"after":{"value":35000,"cost":35000,"quantity":"10"},"reversalOf":"sell"}';
 e:=jsonb_build_object('id','undo-sell','kind','investment_contribution','targetId','stock','accountId','a','amount',21000,'fee',50,'date','2024-03-07','note','Estorno da venda','investment',inv);
 w:=jsonb_set(w,'{events}',w->'events'||jsonb_build_array(e));
 w:=jsonb_set(w,'{assets,0}',(w->'assets'->0)||'{"value":35000,"cost":35000,"quantity":"10","date":"2024-03-07"}');
 perform public.gevyro_save_workspace(w,9);
 inv:='{"sequence":6,"operation":"reversal","tax":0,"cash":35000,"before":{"value":35000,"cost":35000,"quantity":"10"},"after":{"value":0,"cost":0},"reversalOf":"buy-again"}';
 e:=jsonb_build_object('id','undo-buy-again','kind','investment_redemption','targetId','stock','accountId','a','amount',35000,'fee',0,'date','2024-03-08','note','Estorno da compra','investment',inv);
 w:=jsonb_set(w,'{events}',w->'events'||jsonb_build_array(e));
 w:=jsonb_set(w,'{assets,0}',((w->'assets'->0)-'quantity')||'{"value":0,"cost":0,"date":"2024-03-08"}');
 perform public.gevyro_save_workspace(w,10);
 if (public.gevyro_load_workspace()->'workspace'->'assets'->0->>'value')::bigint<>0 then raise exception 'FAIL reverse operation stack'; end if;


end $test$;
reset role;
rollback;
select 'PASS: paid installment edits, original due preservation, duplicate rejection, atomic investment math, reversals and server audit' as result;
