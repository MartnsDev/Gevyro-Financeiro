import { describe, expect, it } from 'vitest';
import { addPayment, balance, metrics, occurrences, projection } from '../src/domain/finance';
import {
  cancelFuture,
  editOccurrence,
  extendRecurrences,
  revisePlan,
  reverseImport,
  reversePayment,
} from '../src/domain/operations';
import { emptyWorkspace, type Plan } from '../src/domain/types';
function setup(mode: Plan['mode'] = 'recurring') {
  const w = emptyWorkspace();
  w.accounts = [
    {
      id: 'a',
      name: 'Conta',
      institution: '',
      type: 'digital',
      opening: 100000,
      openingDate: '2020-01-01',
      color: '#059669',
    },
  ];
  const p: Plan = {
    id: 'p',
    name: 'Internet',
    amount: 10000,
    kind: 'expense',
    category: 'Serviços',
    accountId: 'a',
    cardId: '',
    date: '2024-01-31',
    mode,
    count: 12,
    interval: 1,
    unit: 'month',
    end: '',
    notes: '',
    subscription: true,
  };
  w.plans = [p];
  w.obligations = occurrences(p);
  return w;
}
describe('Histórico e alterações', () => {
  it('edita uma ocorrência sem modificar as seguintes', () => {
    const w = setup();
    const changed = editOccurrence(w, 'p:2', {
      name: 'Valor efetivo',
      amount: 12000,
      date: '2024-02-28',
    });
    expect(changed.obligations[1].amount).toBe(12000);
    expect(changed.obligations[2].amount).toBe(10000);
    expect(w.obligations[1].amount).toBe(10000);
  });
  it('pagamento impede edição silenciosa mesmo após estorno', () => {
    let w = setup();
    w = addPayment(w, 'p:1', 'a', 10000, '2024-01-31', 'pay');
    w = reversePayment(w, 'pay');
    expect(() =>
      editOccurrence(w, 'p:1', { name: 'Outro', amount: 15000, date: '2024-02-01' }),
    ).toThrow();
    expect(w.payments).toHaveLength(1);
  });
  it('alterações futuras preservam parcelas liquidadas e total contratado', () => {
    let w = setup('installment');
    w.plans[0].amount = 120000;
    w.obligations = occurrences(w.plans[0]);
    w = addPayment(w, 'p:1', 'a', 10000, '2024-01-31', 'pay');
    const next = revisePlan(w, { ...w.plans[0], amount: 144000 }, '2024-02-01');
    expect(next.obligations.find((o) => o.id === 'p:1')?.amount).toBe(10000);
    expect(next.obligations.reduce((s, o) => s + o.amount, 0)).toBe(144000);
    expect(next.payments).toEqual(w.payments);
  });
  it('estorno é idempotente e recompõe o saldo real', () => {
    let w = setup();
    w = addPayment(w, 'p:1', 'a', 10000, '2024-01-31', 'pay');
    const next = reversePayment(w, 'pay');
    expect(balance(next, next.accounts[0])).toBe(100000);
    expect(reversePayment(next, 'pay')).toBe(next);
  });
  it('cancelamento preserva histórico anterior e não afeta parcelas parciais', () => {
    let w = setup();
    w = addPayment(w, 'p:3', 'a', 5000, '2024-01-31', 'partial');
    const next = cancelFuture(w, 'p', '2024-03-01');
    expect(next.obligations[0].cancelled).toBe(false);
    expect(next.obligations[2].cancelled).toBe(false);
    expect(next.obligations[3].cancelled).toBe(true);
  });
  it('reverte importação sem apagar obrigações ou pagamentos', () => {
    let w = setup('once');
    w.plans[0].notes = 'Lote de importação: hash';
    w = addPayment(w, 'p:1', 'a', 10000, '2024-01-31', 'pay');
    const next = reverseImport(w, 'hash');
    expect(next.payments[0].reversed).toBe(true);
    expect(next.obligations[0].cancelled).toBe(true);
    expect(next.plans).toHaveLength(1);
  });
});
describe('Projeção e renovação do horizonte', () => {
  it('estende recorrências antigas até 60 meses futuros sem duplicar IDs', () => {
    const w = setup();
    const extended = extendRecurrences(w, '2030-01-01');
    expect(extended.obligations.at(-1)?.date.slice(0, 7)).toBe('2035-01');
    expect(new Set(extended.obligations.map((o) => o.id)).size).toBe(extended.obligations.length);
    expect(extendRecurrences(extended, '2030-01-01')).toBe(extended);
  });
  it('inclui atrasos anteriores no dinheiro livre e na projeção', () => {
    const w = setup('once');
    expect(metrics(w, '2024-02').free).toBe(90000);
    expect(projection(w, 1, '2024-02-01')[0].balance).toBe(90000);
  });
  it('saldo de referência futuro não é dinheiro disponível hoje', () => {
    const w = setup('once');
    w.accounts[0].openingDate = '2099-01-01';
    expect(balance(w, w.accounts[0], '2026-01-01')).toBe(0);
  });
});
