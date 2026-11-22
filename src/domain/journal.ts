import Decimal from 'decimal.js';
import { investmentOperation } from './investments';
import { z } from 'zod';
import type { FinancialEvent, Workspace } from './types';
import { balance, paid, today, remaining, addPayment } from './finance';
export const eventSchema = z.object({
  id: z.string().min(1).max(100),
  kind: z.enum([
    'balance_adjustment',
    'investment_contribution',
    'investment_redemption',
    'investment_income',
    'debt_drawdown',
    'debt_payment',
    'goal_reserve',
    'goal_withdrawal',
    'obligation_adjustment',
    'purchase_refund',
    'purchase_refund_reversal',
  ]),
  targetId: z.string().min(1),
  accountId: z.string(),
  amount: z
    .number()
    .int()
    .min(-1e13)
    .max(1e13)
    .refine((x) => x !== 0),
  fee: z.number().int().min(0).max(1e13),
  date: z.iso.date(),
  note: z.string().min(3).max(2000),
  reversalOf: z.string().optional(),
  reversalFeeOf: z.string().optional(),
});
export function addFinancialEvent(w: Workspace, input: FinancialEvent): Workspace {
  const e = eventSchema.parse(input);
  if (w.events.some((x) => x.id === e.id)) return w;
  if (e.kind.startsWith('investment_'))
    return investmentOperation(w, {
      id: e.id,
      assetId: e.targetId,
      accountId: e.accountId,
      date: e.date,
      operation:
        e.kind === 'investment_contribution'
          ? 'contribution'
          : e.kind === 'investment_redemption'
            ? 'redemption'
            : 'income',
      amount: e.amount,
      fee: e.fee,
      tax: 0,
      note: e.note,
    });
  if (e.date > today()) throw new Error('O evento precisa ter data efetiva, até hoje.');
  if (!['obligation_adjustment', 'balance_adjustment'].includes(e.kind) && e.amount <= 0)
    throw new Error('Informe um valor positivo.');
  if (e.kind !== 'debt_payment' && e.fee)
    throw new Error('Juros separados são permitidos somente na amortização.');
  const account = w.accounts.find((a) => a.id === e.accountId);
  if (
    !['goal_reserve', 'goal_withdrawal', 'obligation_adjustment'].includes(e.kind) &&
    (!account || e.date < account.openingDate)
  )
    throw new Error('Selecione uma conta e uma data posterior ao seu saldo inicial.');
  let next: Workspace = { ...w, events: [...w.events, e] };
  if (e.kind.startsWith('investment_') || e.kind.startsWith('debt_')) {
    const a = w.assets.find((a) => a.id === e.targetId);
    if (!a || (e.kind.startsWith('investment_') ? a.type !== 'investment' : a.type !== 'debt'))
      throw new Error('Posição não encontrada.');
    let value = a.value,
      cost = a.cost;
    if (['investment_contribution', 'debt_drawdown'].includes(e.kind)) {
      value += e.amount;
      cost += e.amount;
    }
    if (['investment_redemption', 'debt_payment'].includes(e.kind)) {
      if (e.amount > value) throw new Error('O principal excede a posição ou saldo devedor.');
      if (e.kind === 'investment_redemption')
        cost -= new Decimal(a.cost)
          .mul(e.amount)
          .div(a.value)
          .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
          .toNumber();
      value -= e.amount;
    }
    next = {
      ...next,
      assets: w.assets.map((x) => (x.id === a.id ? { ...x, value, cost, date: e.date } : x)),
    };
  }
  if (e.kind.startsWith('goal_')) {
    const g = w.goals.find((g) => g.id === e.targetId);
    if (!g) throw new Error('Meta não encontrada.');
    const reserved = g.reserved + (e.kind === 'goal_reserve' ? e.amount : -e.amount);
    if (reserved < 0) throw new Error('A retirada excede a reserva.');
    if (
      w.goals.filter((x) => x.id !== g.id).reduce((s, x) => s + x.reserved, 0) + reserved >
      w.accounts.reduce((s, a) => s + balance(w, a), 0)
    )
      throw new Error('As reservas excedem seu dinheiro disponível.');
    next = { ...next, goals: w.goals.map((x) => (x.id === g.id ? { ...x, reserved } : x)) };
  }
  if (['obligation_adjustment', 'purchase_refund', 'purchase_refund_reversal'].includes(e.kind)) {
    const o = w.obligations.find((o) => o.id === e.targetId);
    if (!o || o.cancelled || o.kind !== 'expense') throw new Error('Escolha uma despesa ativa.');
    if (e.kind === 'purchase_refund_reversal' && !e.reversalOf)
      throw new Error('Use o estorno vinculado ao reembolso original.');
    if (e.kind === 'purchase_refund' && e.amount > paid(w, o.id))
      throw new Error('O reembolso excede o que foi efetivamente pago.');
    const due =
      o.amount +
      next.events
        .filter((x) => x.kind === 'obligation_adjustment' && x.targetId === o.id)
        .reduce((s, x) => s + x.amount, 0);
    const raw = w.payments
      .filter((p) => p.obligationId === o.id && !p.reversed)
      .reduce((s, p) => s + p.amount, 0);
    if (due < raw || due < 0)
      throw new Error(
        'Use reembolso para devolver valores já pagos; o ajuste não pode apagar uma liquidação.',
      );
  }
  if (e.kind === 'balance_adjustment' && e.targetId !== e.accountId)
    throw new Error('O ajuste deve pertencer à mesma conta.');
  return next;
}

export function settleInstallment(
  w: Workspace,
  planId: string,
  accountId: string,
  date: string,
  discount: number,
  key: string,
): Workspace {
  if (
    w.payments.some((p) => p.id.startsWith(`${key}:`)) ||
    w.events.some((e) => e.id.startsWith(`${key}:`))
  )
    return w;
  const plan = w.plans.find((p) => p.id === planId);
  if (!plan || plan.kind !== 'expense' || plan.mode !== 'installment')
    throw new Error('Escolha uma despesa parcelada.');
  const rows = w.obligations
    .filter((o) => o.planId === planId && !o.cancelled)
    .sort((a, b) => a.date.localeCompare(b.date));
  const total = rows.reduce((s, o) => s + remaining(w, o), 0);
  if (!Number.isSafeInteger(discount) || discount < 0 || discount > total || !total)
    throw new Error('Desconto ou saldo inválido.');
  let next = w;
  let leftDiscount = discount;
  for (const o of rows) {
    const cut = Math.min(leftDiscount, remaining(next, o));
    if (cut) {
      next = addFinancialEvent(next, {
        id: `${key}:discount:${o.id}`,
        kind: 'obligation_adjustment',
        targetId: o.id,
        accountId: '',
        amount: -cut,
        fee: 0,
        date,
        note: 'Desconto informado na quitação antecipada',
      });
      leftDiscount -= cut;
    }
    const value = remaining(next, o);
    if (value) next = addPayment(next, o.id, accountId, value, date, `${key}:${o.id}`);
  }
  return next;
}

// Corrections append compensating entries; no financial event is rewritten.
export function reverseFinancialEvent(
  w: Workspace,
  eventId: string,
  key: string,
  date: string,
): Workspace {
  const e = w.events.find((e) => e.id === eventId);
  if (w.events.some((x) => x.id === `${key}:principal`)) return w;
  if (
    !e ||
    e.reversalOf ||
    w.events.some((x) => x.reversalOf === eventId) ||
    e.kind.startsWith('investment_')
  )
    throw new Error('Este evento exige seu fluxo próprio de correção ou já foi estornado.');
  if (date < e.date) throw new Error('O estorno não pode anteceder o movimento original.');
  const opposite: Partial<Record<FinancialEvent['kind'], FinancialEvent['kind']>> = {
    balance_adjustment: 'balance_adjustment',
    obligation_adjustment: 'obligation_adjustment',
    goal_reserve: 'goal_withdrawal',
    goal_withdrawal: 'goal_reserve',
    debt_drawdown: 'debt_payment',
    debt_payment: 'debt_drawdown',
    purchase_refund: 'purchase_refund_reversal',
  };
  const kind = opposite[e.kind];
  if (!kind) throw new Error('Estorno indisponível para este evento.');
  const amount = ['balance_adjustment', 'obligation_adjustment'].includes(e.kind)
    ? -e.amount
    : e.amount;
  let next = addFinancialEvent(w, {
    ...e,
    id: `${key}:principal`,
    kind,
    amount,
    fee: 0,
    date,
    note: `Estorno: ${e.note}`.slice(0, 2000),
    reversalOf: e.id,
  });
  if (e.kind.startsWith('debt_')) {
    const old = w.assets.find((a) => a.id === e.targetId)!;
    const cost = old.cost - (e.kind === 'debt_drawdown' ? e.amount : 0);
    if (cost < 0)
      throw new Error(
        'O custo da dívida foi alterado posteriormente. Confira o histórico antes de estornar.',
      );
    next = { ...next, assets: next.assets.map((a) => (a.id === old.id ? { ...a, cost } : a)) };
  }
  if (e.fee)
    next = addFinancialEvent(next, {
      id: `${key}:fee`,
      kind: 'balance_adjustment',
      targetId: e.accountId,
      accountId: e.accountId,
      amount: e.fee,
      fee: 0,
      date,
      reversalFeeOf: e.id,
      note: `Devolução de juros no estorno de ${e.id}`,
    });
  return next;
}
