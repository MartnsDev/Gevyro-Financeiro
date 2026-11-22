import { describe, it, expect } from 'vitest';
import { emptyWorkspace, type Plan, type Workspace } from '../src/domain/types';
import {
  addPayment,
  balance,
  cashFlow,
  metrics,
  occurrences,
  paid,
  payInvoice,
  remaining,
  status,
  totalBalance,
} from '../src/domain/finance';
import { correctPayment, editOccurrence, settleSelected } from '../src/domain/operations';
import {
  investmentOperation,
  portfolio,
  reverseInvestment,
  type InvestmentInput,
} from '../src/domain/investments';
import { mergeAudit, recordChanges, undoChange } from '../src/domain/history';
import { workspaceSchema } from '../src/domain/validation';
import { reportRows } from '../src/domain/reports';
function setup(): Workspace {
  const w = emptyWorkspace();
  w.accounts = [
    {
      id: 'a',
      name: 'Conta',
      type: 'digital',
      institution: '',
      opening: 100000,
      openingDate: '2020-01-01',
      color: '#059669',
    },
  ];
  const p: Plan = {
    id: 'p',
    name: 'Cama Queen Ortobom',
    amount: 204123,
    kind: 'expense',
    category: 'Compras',
    accountId: 'a',
    cardId: '',
    date: '2024-01-10',
    mode: 'installment',
    count: 10,
    interval: 1,
    unit: 'month',
    end: '',
    notes: '',
    subscription: false,
  };
  w.plans = [p];
  w.obligations = occurrences(p);
  w.assets = [
    {
      id: 'stock',
      name: 'Ações',
      type: 'investment',
      classification: 'Ações',
      value: 0,
      cost: 0,
      date: '2020-01-01',
      notes: '',
    },
  ];
  return w;
}
const operation = (changes: Partial<InvestmentInput> = {}): InvestmentInput => ({
  id: 'buy',
  assetId: 'stock',
  accountId: 'a',
  date: '2024-01-01',
  operation: 'buy',
  amount: 35000,
  fee: 0,
  tax: 0,
  quantity: '10',
  unitPrice: '35',
  note: 'Compra de ações',
  ...changes,
});
describe('Controle financeiro individual', () => {
  it('exemplo de dez parcelas: três pagas, sete restantes, sem alterar outras datas', () => {
    let w = setup();
    w = settleSelected(w, ['p:1', 'p:2', 'p:3'], 'a', '2023-12-20', 'three');
    expect(w.obligations.filter((o) => status(w, o, '2024-01-01') === 'paid')).toHaveLength(3);
    expect(w.obligations.filter((o) => remaining(w, o) > 0)).toHaveLength(7);
    expect(w.obligations.reduce((s, o) => s + o.amount, 0)).toBe(204123);
    const next = editOccurrence(w, 'p:4', {
      name: w.obligations[3].name,
      amount: w.obligations[3].amount,
      date: '2025-04-10',
      notes: 'Corrigida',
    });
    expect(next.obligations[3].originalDate).toBe('2024-04-10');
    expect(status(next, next.obligations[3], '2024-05-01')).toBe('pending');
    expect(next.obligations[4]).toEqual(w.obligations[4]);
    expect(next.payments).toEqual(w.payments);
  });
  it('pagamento antecipado mantém vencimento e não fica vencido depois', () => {
    const w = settleSelected(setup(), ['p:8', 'p:9'], 'a', '2024-01-01', 'early');
    expect(w.obligations[7].date).toBe('2024-08-10');
    expect(w.payments[0].date).toBe('2024-01-01');
    expect(status(w, w.obligations[7], '2025-01-01')).toBe('paid');
    expect(settleSelected(w, ['p:8', 'p:9'], 'a', '2024-01-01', 'early')).toBe(w);
  });
  it('corrige pagamento por estorno + substituição e rejeita valor inferior ao pago', () => {
    let w = addPayment(setup(), 'p:1', 'a', 10000, '2024-01-02', 'old');
    w = correctPayment(w, 'old', 'a', 12000, '2024-01-03', 'new');
    expect(w.payments[0].reversed).toBe(true);
    expect(w.payments[1].date).toBe('2024-01-03');
    expect(paid(w, 'p:1')).toBe(12000);
    expect(() =>
      editOccurrence(w, 'p:1', { name: 'Cama', amount: 11999, date: '2024-01-10' }),
    ).toThrow();
  });
  it('rejeita datas inexistentes e parcela lógica duplicada', () => {
    const w = setup();
    expect(() =>
      editOccurrence(w, 'p:1', { name: 'Cama', amount: 20000, date: '2024-02-30' }),
    ).toThrow();
    expect(() => addPayment(w, 'p:1', 'a', 100, '2024-02-30', 'bad')).toThrow();
    w.obligations.push({ ...w.obligations[0], id: 'duplicate' });
    expect(workspaceSchema.safeParse(w).success).toBe(false);
  });
  it('desfaz edição isolada preservando pagamentos e bloqueia alterações posteriores', () => {
    const w = setup();
    const next = editOccurrence(w, 'p:4', { name: 'Corrigida', amount: 20000, date: '2024-04-11' });
    const audit = {
      id: 'edit',
      at: '2024-04-01T12:00:00.000Z',
      action: 'Editar',
      changes: recordChanges(w, next),
    };
    next.audit = [audit];
    expect(undoChange(next, audit).obligations.find((o) => o.id === 'p:4')).toMatchObject(
      w.obligations[3],
    );
    next.audit.push({ ...audit, id: 'later' });
    expect(() => undoChange(next, audit)).toThrow();
  });
});
describe('Investimentos com centavos e unidades precisas', () => {
  it('aporte350 reduz caixa e eleva carteira sem criar consumo nem perda patrimonial', () => {
    const initial = setup();
    const w = investmentOperation(initial, operation());
    expect(totalBalance(w)).toBe(65000);
    expect(w.assets[0].value).toBe(35000);
    expect(metrics(w, '2024-01').net).toBe(metrics(initial, '2024-01').net);
    expect(cashFlow(w, '2024-01').expense).toBe(0);
    expect(reportRows(w, '2024-01-01', '2024-01-31', 'cash')).toHaveLength(0);
    expect(workspaceSchema.safeParse(w).success).toBe(true);
    expect(investmentOperation(w, operation())).toBe(w);
  });
  it('compra com taxas/impostos e venda com lucro não confundem principal e rendimento', () => {
    let w = investmentOperation(setup(), operation({ fee: 100, tax: 50 }));
    expect(w.assets[0].cost).toBe(35150);
    w = investmentOperation(
      w,
      operation({
        id: 'sell',
        operation: 'sell',
        amount: 21000,
        quantity: '5',
        unitPrice: '42',
        fee: 50,
        tax: 25,
        date: '2024-01-02',
      }),
    );
    expect(w.assets[0]).toMatchObject({ value: 17500, cost: 17575, quantity: '5' });
    expect(totalBalance(w)).toBe(85775);
    expect(cashFlow(w, '2024-01').income).toBe(0);
  });
  it('proventos líquidos movimentam caixa sem alterar principal; estorno corrige receita', () => {
    let w = investmentOperation(setup(), operation());
    w = investmentOperation(
      w,
      operation({
        id: 'div',
        operation: 'dividend',
        amount: 1000,
        quantity: undefined,
        unitPrice: undefined,
        fee: 25,
        tax: 100,
        date: '2024-01-02',
      }),
    );
    expect(w.assets[0].value).toBe(35000);
    expect(cashFlow(w, '2024-01').income).toBe(875);
    w = reverseInvestment(w, 'div', 'undo', '2024-01-03');
    expect(cashFlow(w, '2024-01').income).toBe(0);
    expect(
      reportRows(w, '2024-01-01', '2024-01-31', 'cash').reduce((s, r) => s + r.amount, 0),
    ).toBe(0);
  });
  it('estorno recompõe posição e caixa mantendo eventos originais', () => {
    const initial = setup();
    const w = reverseInvestment(
      investmentOperation(initial, operation()),
      'buy',
      'reverse',
      '2024-01-02',
    );
    expect(w.assets[0].value).toBe(0);
    expect(w.assets[0].quantity).toBeUndefined();
    expect(totalBalance(w)).toBe(100000);
    expect(w.events).toHaveLength(2);
    expect(() => reverseInvestment(w, 'buy', 'again', '2024-01-03')).toThrow();
  });
  it('fracionário: 0.00000001 unidades e preço preciso; diferença monetária é rejeitada', () => {
    const w = investmentOperation(
      setup(),
      operation({ amount: 1, quantity: '0.00000001', unitPrice: '1000000' }),
    );
    expect(w.assets[0].quantity).toBe('0.00000001');
    expect(() =>
      investmentOperation(
        w,
        operation({ id: 'bad', amount: 2, quantity: '0.00000001', unitPrice: '1000000' }),
      ),
    ).toThrow();
    expect(portfolio(w).returnPercent).toBe(0);
  });
  it('não calcula retorno sem custo e exige classificação sem alterar legado', () => {
    const w = setup();
    delete w.assets[0].classification;
    expect(portfolio(w).returnPercent).toBeNull();
    expect(() => investmentOperation(w, operation())).toThrow();
    expect(workspaceSchema.safeParse(w).success).toBe(true);
  });
  it('impede venda excessiva, data anterior à avaliação e estorno com avaliação posterior', () => {
    let w = investmentOperation(setup(), operation());
    expect(() =>
      investmentOperation(
        w,
        operation({
          id: 'sell',
          operation: 'sell',
          quantity: '11',
          unitPrice: '35',
          amount: 38500,
        }),
      ),
    ).toThrow();
    w = { ...w, assets: w.assets.map((a) => ({ ...a, date: '2024-02-01', value: 36000 })) };
    expect(() => investmentOperation(w, operation({ id: 'older' }))).toThrow();
    expect(() => reverseInvestment(w, 'buy', 'undo', '2024-02-01')).toThrow();
  });
});
describe('Cartão e transferências', () => {
  it('compra cria consumo uma vez, fatura parcial/antecipada reduz caixa e dívida', () => {
    let w = setup();
    w.cards = [
      {
        id: 'card',
        name: 'Cartão',
        accountId: 'a',
        limit: 1000000,
        closing: 5,
        due: 12,
        last4: '',
      },
    ];
    w.plans[0] = { ...w.plans[0], cardId: 'card', accountId: '', date: '2024-01-01' };
    w.obligations = occurrences(w.plans[0], w.cards[0]);
    const consumption = reportRows(w, '2024-01-01', '2024-12-31', 'purchase').reduce(
      (s, r) => s + r.amount,
      0,
    );
    const first = w.obligations[0];
    w = payInvoice(w, 'card', first.date.slice(0, 7), 'a', 10000, '2024-01-02', 'invoice');
    expect(totalBalance(w)).toBe(90000);
    expect(remaining(w, w.obligations[0])).toBe(first.amount - 10000);
    expect(
      reportRows(w, '2024-01-01', '2024-12-31', 'purchase').reduce((s, r) => s + r.amount, 0),
    ).toBe(consumption);
    expect(w.obligations).toHaveLength(10);
  });
  it('transferência própria preserva principal consolidado e só tarifa é despesa', () => {
    const w = setup();
    w.accounts.push({ ...w.accounts[0], id: 'b', opening: 0 });
    w.transfers = [{ id: 't', from: 'a', to: 'b', amount: 35000, fee: 125, date: '2024-01-01' }];
    expect(balance(w, w.accounts[0])).toBe(64875);
    expect(balance(w, w.accounts[1])).toBe(35000);
    expect(totalBalance(w)).toBe(99875);
    expect(cashFlow(w, '2024-01').expense).toBe(125);
  });
});

it('permite desfazer em ordem inversa sem perder sequência nem caixa', () => {
  let w = investmentOperation(setup(), operation());
  w = investmentOperation(
    w,
    operation({
      id: 'sell',
      operation: 'sell',
      amount: 21000,
      quantity: '5',
      unitPrice: '42',
      date: '2024-01-02',
    }),
  );
  w = reverseInvestment(w, 'sell', 'undo-sell', '2024-01-03');
  w = reverseInvestment(w, 'buy', 'undo-buy', '2024-01-04');
  expect(totalBalance(w)).toBe(100000);
  expect(w.assets[0].value).toBe(0);
  expect(w.events.map((e) => e.investment?.sequence)).toEqual([1, 2, 3, 4]);
});

import { addFinancialEvent, reverseFinancialEvent } from '../src/domain/journal';
it('estorno de reembolso recompõe consumo líquido e mantém parcelas liquidadas', () => {
  let w = settleSelected(setup(), ['p:1'], 'a', '2024-01-01', 'pay');
  const before = totalBalance(w);
  w = addFinancialEvent(w, {
    id: 'refund',
    kind: 'purchase_refund',
    targetId: 'p:1',
    accountId: 'a',
    amount: 5000,
    fee: 0,
    date: '2024-01-02',
    note: 'Reembolso recebido',
  });
  expect(totalBalance(w)).toBe(before + 5000);
  w = reverseFinancialEvent(w, 'refund', 'undo-refund', '2024-01-03');
  expect(totalBalance(w)).toBe(before);
  expect(status(w, w.obligations[0])).toBe('paid');
  expect(cashFlow(w, '2024-01').expense).toBe(w.obligations[0].amount);
  expect(reportRows(w, '2024-01-01', '2024-01-31', 'cash').reduce((s, r) => s + r.amount, 0)).toBe(
    w.obligations[0].amount,
  );
  expect(workspaceSchema.safeParse(w).success).toBe(true);
  expect(() => reverseFinancialEvent(w, 'refund', 'again', '2024-01-04')).toThrow();
});
it('estorno de amortização devolve juros e principal sem inflar custo da dívida', () => {
  let w = setup();
  w.assets.push({
    id: 'debt',
    name: 'Dívida',
    type: 'debt',
    value: 50000,
    cost: 50000,
    date: '2024-01-01',
    notes: '',
  });
  w = addFinancialEvent(w, {
    id: 'debtpay',
    kind: 'debt_payment',
    targetId: 'debt',
    accountId: 'a',
    amount: 10000,
    fee: 200,
    date: '2024-01-02',
    note: 'Amortização com juros',
  });
  expect(totalBalance(w)).toBe(89800);
  expect(cashFlow(w, '2024-01').expense).toBe(200);
  w = reverseFinancialEvent(w, 'debtpay', 'undo-debt', '2024-01-03');
  expect(totalBalance(w)).toBe(100000);
  expect(w.assets[1]).toMatchObject({ value: 50000, cost: 50000 });
  expect(cashFlow(w, '2024-01').expense).toBe(0);
  expect(reportRows(w, '2024-01-01', '2024-01-31', 'cash').reduce((s, r) => s + r.amount, 0)).toBe(
    0,
  );
});
it('estorno de reserva e ajuste recompõe saldo e dinheiro livre', () => {
  let w = setup();
  w.goals = [{ id: 'g', name: 'Meta', target: 50000, reserved: 0, monthly: 0, date: '2030-01-01' }];
  w = addFinancialEvent(w, {
    id: 'reserve',
    kind: 'goal_reserve',
    targetId: 'g',
    accountId: '',
    amount: 5000,
    fee: 0,
    date: '2024-01-01',
    note: 'Reserva mensal',
  });
  w = reverseFinancialEvent(w, 'reserve', 'undo-reserve', '2024-01-02');
  expect(w.goals[0].reserved).toBe(0);
  w = addFinancialEvent(w, {
    id: 'adjust',
    kind: 'balance_adjustment',
    targetId: 'a',
    accountId: 'a',
    amount: -1000,
    fee: 0,
    date: '2024-01-01',
    note: 'Ajuste da conta',
  });
  w = reverseFinancialEvent(w, 'adjust', 'undo-adjust', '2024-01-02');
  expect(totalBalance(w)).toBe(100000);
});

it('restauração preserva prefixo auditado e acrescenta histórico exclusivo do backup', () => {
  const current = [{ id: 'old', at: '2024-01-01T12:00:00.000Z', action: 'Original' }];
  const incoming = [
    { ...current[0], action: 'Diferente no backup' },
    { id: 'imported', at: '2023-12-01T12:00:00.000Z', action: 'Registro antigo' },
  ];
  const result = mergeAudit(current, incoming);
  expect(result).toEqual([current[0], incoming[1]]);
  expect(mergeAudit(result, incoming)).toEqual(result);
  expect(current).toHaveLength(1);
});
