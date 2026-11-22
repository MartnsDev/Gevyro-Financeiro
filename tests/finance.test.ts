import { describe, expect, it } from 'vitest';
import {
  addPayment,
  averageIncome,
  balance,
  cashFlow,
  cents,
  invoiceDate,
  metrics,
  monthlySubscription,
  occurrences,
  paid,
  payInvoice,
  projection,
  remaining,
  shiftMonth,
  splitInstallments,
  status,
  totalBalance,
} from '../src/domain/finance';
import { emptyWorkspace, type Plan, type Workspace } from '../src/domain/types';
import { workspaceSchema } from '../src/domain/validation';
function base(): Workspace {
  const w = emptyWorkspace();
  w.accounts = [
    {
      id: 'account',
      name: 'Conta',
      institution: '',
      type: 'digital',
      opening: 100000,
      openingDate: '2020-01-01',
      color: '#059669',
    },
  ];
  return w;
}
function plan(overrides: Partial<Plan> = {}): Plan {
  return {
    id: 'p',
    name: 'Compra',
    amount: 18000,
    kind: 'expense',
    category: 'Outros',
    accountId: 'account',
    cardId: '',
    date: '2024-01-31',
    mode: 'once',
    count: 12,
    interval: 1,
    unit: 'month',
    end: '',
    notes: '',
    subscription: false,
    ...overrides,
  };
}
function withPlan(p: Plan) {
  const w = base();
  w.plans = [p];
  w.obligations = occurrences(p);
  return w;
}
describe('Dinheiro exato', () => {
  it('converte entradas brasileiras sem erro binário', () => {
    expect(cents('R$ 1.234,56')).toBe(123456);
    expect(cents('0.105')).toBe(11);
    expect(cents('-18,90')).toBe(-1890);
  });
  it('distribui centavos nas primeiras parcelas', () => {
    const values = splitInstallments(10000, 3);
    expect(values).toEqual([3334, 3333, 3333]);
    expect(values.reduce((s, v) => s + v, 0)).toBe(10000);
  });
  it('divide 1800 em 12 parcelas exatas', () => {
    expect(splitInstallments(180000, 12)).toEqual(Array(12).fill(15000));
  });
  it('rejeita parcelamentos e entradas inválidas', () => {
    expect(() => splitInstallments(100, 0)).toThrow();
    expect(() => cents('abc')).toThrow();
    expect(() => cents('9999999999999999999')).toThrow();
  });
});
describe('Datas civis e recorrências', () => {
  it('preserva dia 31 sem deriva em meses curtos', () => {
    const rows = occurrences(plan({ mode: 'recurring' }));
    expect(rows.slice(0, 4).map((o) => o.date)).toEqual([
      '2024-01-31',
      '2024-02-29',
      '2024-03-31',
      '2024-04-30',
    ]);
  });
  it('ajusta ano não bissexto', () => {
    expect(shiftMonth('2023-01-31', 1)).toBe('2023-02-28');
  });
  it('gera 12 parcelas com encerramento', () => {
    const rows = occurrences(plan({ mode: 'installment', amount: 180000 }));
    expect(rows).toHaveLength(12);
    expect(rows.at(-1)?.date).toBe('2024-12-31');
    expect(rows.reduce((s, o) => s + o.amount, 0)).toBe(180000);
  });
  it('recorrência quinzenal respeita intervalo e fim', () => {
    const rows = occurrences(
      plan({ mode: 'recurring', unit: 'day', interval: 15, date: '2024-01-01', end: '2024-02-01' }),
    );
    expect(rows.map((o) => o.date)).toEqual(['2024-01-01', '2024-01-16', '2024-01-31']);
  });
  it('cancelamento preserva ocorrências anteriores', () => {
    const rows = occurrences(plan({ mode: 'recurring', cancelledFrom: '2024-03-01' }));
    expect(rows[0].cancelled).toBe(false);
    expect(rows[2].cancelled).toBe(true);
  });
  it('identificadores são estáveis em novas gerações', () => {
    expect(occurrences(plan())).toEqual(occurrences(plan()));
  });
  it('anual tem cobrança anual e equivalente mensal separado', () => {
    const p = plan({ mode: 'recurring', interval: 12, amount: 120000, subscription: true });
    expect(monthlySubscription(p)).toBe(10000);
    expect(occurrences(p)).toHaveLength(5);
  });
});
describe('Caixa e liquidação', () => {
  it('pendência e atraso nunca diminuem saldo real', () => {
    const w = withPlan(plan());
    expect(totalBalance(w)).toBe(100000);
    expect(status(w, w.obligations[0], '2025-01-01')).toBe('overdue');
    expect(status(w, w.obligations[0], '2024-01-01')).toBe('pending');
  });
  it('despesa única paga reduz caixa uma vez', () => {
    let w = withPlan(plan());
    w = addPayment(w, 'p:1', 'account', 18000, '2024-02-01', 'payment');
    expect(totalBalance(w)).toBe(82000);
    expect(status(w, w.obligations[0])).toBe('paid');
    expect(cashFlow(w, '2024-02')).toEqual({ income: 0, expense: 18000 });
  });
  it('pagamento parcial e antecipação preservam restante', () => {
    let w = withPlan(plan({ date: '2024-02-01' }));
    w = addPayment(w, 'p:1', 'account', 5000, '2024-01-01', 'partial');
    expect(remaining(w, w.obligations[0])).toBe(13000);
    expect(status(w, w.obligations[0], '2024-01-01')).toBe('partial');
    expect(totalBalance(w)).toBe(95000);
  });
  it('chave idempotente impede pagamento duplicado', () => {
    let w = withPlan(plan());
    w = addPayment(w, 'p:1', 'account', 5000, '2024-01-01', 'key');
    expect(addPayment(w, 'p:1', 'account', 5000, '2024-01-01', 'key')).toBe(w);
  });
  it('rejeita sobrepagamento e data futura', () => {
    const w = withPlan(plan());
    expect(() => addPayment(w, 'p:1', 'account', 18001, '2024-01-01', 'x')).toThrow();
    expect(() => addPayment(w, 'p:1', 'account', 100, '2099-01-01', 'x')).toThrow();
  });
  it('estorno de pagamento reverte caixa preservando histórico', () => {
    let w = withPlan(plan());
    w = addPayment(w, 'p:1', 'account', 18000, '2024-01-01', 'x');
    w.payments[0].reversed = true;
    expect(totalBalance(w)).toBe(100000);
    expect(paid(w, 'p:1')).toBe(0);
  });
  it('receita prevista não aumenta saldo até recebimento', () => {
    let w = withPlan(plan({ kind: 'income' }));
    expect(totalBalance(w)).toBe(100000);
    w = addPayment(w, 'p:1', 'account', 18000, '2024-01-01', 'in');
    expect(totalBalance(w)).toBe(118000);
  });
  it('transferência mantém saldo consolidado, tarifa é despesa', () => {
    const w = base();
    w.accounts.push({ ...w.accounts[0], id: 'b', opening: 0 });
    w.transfers = [
      { id: 't', from: 'account', to: 'b', amount: 50000, fee: 250, date: '2024-01-01' },
    ];
    expect(balance(w, w.accounts[0])).toBe(49750);
    expect(balance(w, w.accounts[1])).toBe(50000);
    expect(totalBalance(w)).toBe(99750);
    expect(cashFlow(w, '2024-01').expense).toBe(250);
  });
  it('projeção é isolada e não duplica liquidações', () => {
    const w = withPlan(
      plan({ mode: 'recurring', kind: 'income', amount: 10000, date: '2024-01-01' }),
    );
    const before = JSON.stringify(w);
    const rows = projection(w, 3, '2024-01-01', 5000, 0);
    expect(rows.map((r) => r.balance)).toEqual([115000, 130000, 145000]);
    expect(JSON.stringify(w)).toBe(before);
  });
  it('reservas reduzem livre mas não saldo bancário', () => {
    const w = base();
    w.goals = [
      {
        id: 'g',
        name: 'Meta',
        target: 100000,
        reserved: 30000,
        monthly: 10000,
        date: '2028-01-01',
      },
    ];
    const m = metrics(w, '2024-01');
    expect(m.real).toBe(100000);
    expect(m.free).toBe(70000);
  });
  it('média usa meses completos incluindo períodos vazios', () => {
    let w = withPlan(plan({ kind: 'income' }));
    w = addPayment(w, 'p:1', 'account', 18000, '2024-01-01', 'p');
    expect(averageIncome(w, 3, '2024-04-01')).toBe(6000);
  });
  it('avaliação de investimento não movimenta caixa', () => {
    const w = base();
    w.assets = [
      {
        id: 'a',
        name: 'CDB',
        type: 'investment',
        value: 50000,
        cost: 48000,
        date: '2024-01-01',
        notes: '',
      },
    ];
    expect(totalBalance(w)).toBe(100000);
    expect(metrics(w, '2024-01').net).toBe(150000);
  });
});
describe('Cartões e faturas', () => {
  const card = {
    id: 'card',
    name: 'Cartão',
    limit: 300000,
    closing: 5,
    due: 12,
    accountId: 'account',
    last4: '1234',
  };
  it('compra antes e depois do fechamento', () => {
    expect(invoiceDate('2024-01-05', card)).toBe('2024-01-12');
    expect(invoiceDate('2024-01-06', card)).toBe('2024-02-12');
  });
  it('virada de ano e vencimento anterior ao fechamento', () => {
    expect(invoiceDate('2024-12-26', { closing: 25, due: 5 })).toBe('2025-02-05');
    expect(invoiceDate('2024-12-20', { closing: 25, due: 5 })).toBe('2025-01-05');
  });
  it('vencimento 31 usa último dia do mês', () => {
    expect(invoiceDate('2024-02-01', { closing: 5, due: 31 })).toBe('2024-02-29');
  });
  it('compra compromete cartão sem reduzir saldo', () => {
    const w = withPlan(plan({ cardId: 'card' }));
    w.cards = [card];
    expect(totalBalance(w)).toBe(100000);
  });
  it('pagamento integral da fatura sem duplicar consumo', () => {
    let w = withPlan(plan({ cardId: 'card', date: '2024-01-03' }));
    w.cards = [card];
    w.obligations = occurrences(w.plans[0], card);
    w = payInvoice(w, 'card', '2024-01', 'account', 18000, '2024-01-12', 'invoice');
    expect(totalBalance(w)).toBe(82000);
    expect(cashFlow(w, '2024-01').expense).toBe(18000);
    expect(w.obligations).toHaveLength(1);
  });
  it('pagamento parcial aloca itens e repetição é idempotente', () => {
    let w = withPlan(plan({ cardId: 'card', date: '2024-01-03' }));
    w.cards = [card];
    w.obligations = occurrences(w.plans[0], card);
    w = payInvoice(w, 'card', '2024-01', 'account', 5000, '2024-01-12', 'invoice');
    expect(remaining(w, w.obligations[0])).toBe(13000);
    expect(payInvoice(w, 'card', '2024-01', 'account', 5000, '2024-01-12', 'invoice')).toBe(w);
  });
});
describe('Integridade de entrada', () => {
  it('rejeita IDs duplicados e referências cruzadas inexistentes', () => {
    const w = withPlan(plan());
    w.accounts.push({ ...w.accounts[0] });
    expect(workspaceSchema.safeParse(w).success).toBe(false);
    w.accounts = [];
    expect(workspaceSchema.safeParse(w).success).toBe(false);
  });
  it('valida o espaço completo e rejeita liquidações excessivas', () => {
    let w = withPlan(plan());
    expect(workspaceSchema.safeParse(w).success).toBe(true);
    w = addPayment(w, 'p:1', 'account', 18000, '2024-01-01', 'ok');
    w.payments.push({ ...w.payments[0], id: 'another' });
    expect(workspaceSchema.safeParse(w).success).toBe(false);
  });
});
