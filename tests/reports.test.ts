import { expect, it } from 'vitest';
import { emptyWorkspace, type Plan } from '../src/domain/types';
import { addPayment, occurrences } from '../src/domain/finance';
import { reportRows, budgetUsage } from '../src/domain/reports';
import { addFinancialEvent, settleInstallment } from '../src/domain/journal';
function setup() {
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
    name: 'Compra',
    amount: 12000,
    kind: 'expense',
    category: 'Compras',
    accountId: 'a',
    cardId: '',
    date: '2024-01-01',
    mode: 'installment',
    count: 3,
    interval: 1,
    unit: 'month',
    end: '',
    notes: '',
    subscription: false,
  };
  w.plans = [p];
  w.obligations = occurrences(p);
  return w;
}
it('perspectivas separam compra, competência e caixa em meses distintos', () => {
  let w = setup();
  w = addPayment(w, 'p:1', 'a', 4000, '2024-02-05', 'payment');
  expect(
    reportRows(w, '2024-01-01', '2024-01-31', 'purchase').reduce((s, r) => s + r.amount, 0),
  ).toBe(12000);
  expect(
    reportRows(w, '2024-01-01', '2024-01-31', 'accrual').reduce((s, r) => s + r.amount, 0),
  ).toBe(4000);
  expect(reportRows(w, '2024-02-01', '2024-02-29', 'cash').reduce((s, r) => s + r.amount, 0)).toBe(
    4000,
  );
});
it('orçamento por caixa inclui o efetivo do mês e separa pendências', () => {
  let w = setup();
  w = addPayment(w, 'p:1', 'a', 4000, '2024-02-05', 'payment');
  expect(budgetUsage(w, 'Compras', '2024-02', 'cash')).toEqual({
    used: 4000,
    committed: 4000,
    total: 8000,
  });
  expect(budgetUsage(w, 'Compras', '2024-02', 'accrual')).toEqual({
    used: 0,
    committed: 4000,
    total: 4000,
  });
});
it('reembolso aparece no período em que o dinheiro voltou', () => {
  let w = setup();
  w = addPayment(w, 'p:1', 'a', 4000, '2024-01-01', 'payment');
  w = addFinancialEvent(w, {
    id: 'refund',
    kind: 'purchase_refund',
    targetId: 'p:1',
    accountId: 'a',
    amount: 1000,
    fee: 0,
    date: '2024-03-01',
    note: 'Reembolso recebido',
  });
  expect(reportRows(w, '2024-03-01', '2024-03-31', 'cash').reduce((s, r) => s + r.amount, 0)).toBe(
    -1000,
  );
});
it('quitação antecipa pagamentos, distribui desconto e preserva todas as parcelas', () => {
  const original = setup();
  const w = settleInstallment(original, 'p', 'a', '2024-01-10', 1000, 'settlement');
  expect(w.obligations).toHaveLength(3);
  expect(w.obligations.reduce((s, o) => s + o.amount, 0)).toBe(12000);
  expect(w.payments.reduce((s, p) => s + p.amount, 0)).toBe(11000);
  expect(w.events.reduce((s, e) => s + e.amount, 0)).toBe(-1000);
  expect(settleInstallment(w, 'p', 'a', '2024-01-10', 1000, 'settlement')).toBe(w);
  expect(original.payments).toHaveLength(0);
});
