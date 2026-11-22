import { describe, expect, it } from 'vitest';
import { emptyWorkspace, type FinancialEvent } from '../src/domain/types';
import { addFinancialEvent } from '../src/domain/journal';
import {
  addPayment,
  balance,
  cashFlow,
  due,
  metrics,
  occurrences,
  remaining,
} from '../src/domain/finance';
import { workspaceSchema } from '../src/domain/validation';
import { pauseSubscription, resumeSubscription } from '../src/domain/operations';
import { financialNotifications, persistNotifications } from '../src/domain/notifications';
function fixture() {
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
  w.assets = [
    {
      id: 'i',
      name: 'CDB',
      type: 'investment',
      value: 20000,
      cost: 16000,
      date: '2024-01-01',
      notes: '',
    },
    {
      id: 'd',
      name: 'Dívida',
      type: 'debt',
      value: 50000,
      cost: 50000,
      date: '2024-01-01',
      notes: '',
    },
  ];
  w.goals = [
    { id: 'g', name: 'Meta', target: 100000, reserved: 0, monthly: 1000, date: '2028-01-01' },
  ];
  w.plans = [
    {
      id: 'p',
      name: 'Compra',
      amount: 10000,
      kind: 'expense',
      category: 'Outros',
      accountId: 'a',
      cardId: '',
      date: '2024-01-01',
      mode: 'once',
      count: 1,
      interval: 1,
      unit: 'month',
      end: '',
      notes: '',
      subscription: false,
    },
  ];
  w.obligations = occurrences(w.plans[0]);
  return w;
}
function event(kind: FinancialEvent['kind'], amount = 5000, targetId = 'a'): FinancialEvent {
  return {
    id: 'event',
    kind,
    targetId,
    accountId: 'a',
    amount,
    fee: 0,
    date: '2024-01-01',
    note: 'Operação registrada',
  };
}
describe('Movimentos patrimoniais e correções', () => {
  it('conciliação altera caixa sem inventar receita ou consumo', () => {
    const w = addFinancialEvent(fixture(), event('balance_adjustment', -123));
    expect(balance(w, w.accounts[0])).toBe(99877);
    expect(cashFlow(w, '2024-01')).toEqual({ income: 0, expense: 0 });
  });
  it('aporte transfere dinheiro da conta para posição sem reduzir patrimônio', () => {
    const initial = fixture();
    const w = addFinancialEvent(initial, event('investment_contribution', 5000, 'i'));
    expect(balance(w, w.accounts[0])).toBe(95000);
    expect(w.assets[0].value).toBe(25000);
    expect(metrics(w, '2024-01').net).toBe(metrics(initial, '2024-01').net);
    expect(cashFlow(w, '2024-01').expense).toBe(0);
  });
  it('resgate recompõe caixa, reduz posição e custo proporcional sem receita fictícia', () => {
    const w = addFinancialEvent(fixture(), event('investment_redemption', 5000, 'i'));
    expect(balance(w, w.accounts[0])).toBe(105000);
    expect(w.assets[0].value).toBe(15000);
    expect(w.assets[0].cost).toBe(12000);
    expect(cashFlow(w, '2024-01').income).toBe(0);
  });
  it('rendimento recebido é renda efetiva sem alterar cotação', () => {
    const w = addFinancialEvent(fixture(), event('investment_income', 500, 'i'));
    expect(cashFlow(w, '2024-01').income).toBe(500);
    expect(w.assets[0].value).toBe(20000);
  });
  it('empréstimo aumenta caixa e passivo, sem ser receita', () => {
    const initial = fixture();
    const w = addFinancialEvent(initial, event('debt_drawdown', 10000, 'd'));
    expect(balance(w, w.accounts[0])).toBe(110000);
    expect(w.assets[1].value).toBe(60000);
    expect(cashFlow(w, '2024-01').income).toBe(0);
    expect(metrics(w, '2024-01').net).toBe(metrics(initial, '2024-01').net);
  });
  it('amortização separa principal e juros', () => {
    const initial = fixture();
    const w = addFinancialEvent(initial, { ...event('debt_payment', 10000, 'd'), fee: 1200 });
    expect(balance(w, w.accounts[0])).toBe(88800);
    expect(w.assets[1].value).toBe(40000);
    expect(cashFlow(w, '2024-01').expense).toBe(1200);
    expect(metrics(w, '2024-01').net).toBe(metrics(initial, '2024-01').net - 1200);
  });
  it('reserva e retirada de meta não alteram caixa ou consumo', () => {
    let w = addFinancialEvent(fixture(), event('goal_reserve', 10000, 'g'));
    expect(w.goals[0].reserved).toBe(10000);
    w = addFinancialEvent(w, { ...event('goal_withdrawal', 5000, 'g'), id: 'withdraw' });
    expect(w.goals[0].reserved).toBe(5000);
    expect(balance(w, w.accounts[0])).toBe(100000);
  });
  it('juros e desconto mudam obrigação sem apagar o original', () => {
    let w = addFinancialEvent(fixture(), event('obligation_adjustment', 1000, 'p:1'));
    w = addFinancialEvent(w, { ...event('obligation_adjustment', -500, 'p:1'), id: 'discount' });
    expect(w.obligations[0].amount).toBe(10000);
    expect(due(w, w.obligations[0])).toBe(10500);
    w = addPayment(w, 'p:1', 'a', 10500, '2024-01-01', 'pay');
    expect(remaining(w, w.obligations[0])).toBe(0);
    expect(workspaceSchema.safeParse(w).success).toBe(true);
  });
  it('reembolso devolve dinheiro e reduz consumo sem reabrir compra quitada', () => {
    let w = fixture();
    w = addPayment(w, 'p:1', 'a', 10000, '2024-01-01', 'pay');
    w = addFinancialEvent(w, event('purchase_refund', 4000, 'p:1'));
    expect(balance(w, w.accounts[0])).toBe(94000);
    expect(cashFlow(w, '2024-01').expense).toBe(6000);
    expect(remaining(w, w.obligations[0])).toBe(0);
    expect(due(w, w.obligations[0])).toBe(6000);
  });
  it('impede reembolso excessivo, desconto sobre pago, saque excessivo e data futura', () => {
    const w = fixture();
    expect(() => addFinancialEvent(w, event('purchase_refund', 1, 'p:1'))).toThrow();
    expect(() => addFinancialEvent(w, event('investment_redemption', 30000, 'i'))).toThrow();
    expect(() =>
      addFinancialEvent(w, { ...event('balance_adjustment'), date: '2099-01-01' }),
    ).toThrow();
    const paid = addPayment(w, 'p:1', 'a', 10000, '2024-01-01', 'p');
    expect(() => addFinancialEvent(paid, event('obligation_adjustment', -1, 'p:1'))).toThrow();
  });
  it('repetição é idempotente e entrada inválida não altera o estado original', () => {
    const original = fixture();
    const before = JSON.stringify(original);
    const e = event('balance_adjustment');
    const w = addFinancialEvent(original, e);
    expect(addFinancialEvent(w, e)).toBe(w);
    expect(JSON.stringify(original)).toBe(before);
  });
  it('backup antigo recebe novas coleções vazias sem perda', () => {
    const old = JSON.parse(JSON.stringify(fixture()));
    delete old.events;
    delete old.notifications;
    const parsed = workspaceSchema.parse(old);
    expect(parsed.events).toEqual([]);
    expect(parsed.accounts[0].opening).toBe(100000);
  });
});
describe('Assinaturas e alertas', () => {
  it('pausa somente futuras não pagas, retoma futuras e mantém meses pausados', () => {
    const w = fixture();
    w.plans[0] = { ...w.plans[0], mode: 'recurring', subscription: true };
    w.obligations = occurrences(w.plans[0]);
    const paused = pauseSubscription(w, 'p', '2024-02-01');
    expect(paused.obligations[0].cancelled).toBe(false);
    expect(paused.obligations[1].cancelled).toBe(true);
    const resumed = resumeSubscription(paused, 'p', '2024-04-01');
    expect(resumed.obligations[1].cancelled).toBe(true);
    expect(resumed.obligations[3].cancelled).toBe(false);
  });
  it('alertas incluem receitas pendentes e mantêm leitura após sincronização', () => {
    const w = fixture();
    w.obligations[0].kind = 'income';
    let next = persistNotifications(w, '2024-01-02');
    expect(financialNotifications(next, '2024-01-02')[0].description).toContain('Receita');
    next.notifications[0].read = true;
    next = persistNotifications(next, '2024-01-02');
    expect(next.notifications[0].read).toBe(true);
  });
});
