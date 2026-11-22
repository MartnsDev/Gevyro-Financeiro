import Decimal from 'decimal.js';
import { addDays, addMonths, format, parseISO } from 'date-fns';
import type { Account, Card, Obligation, Plan, Workspace } from './types';
import { eventCash } from './event-cash';
export function cents(value: string): number {
  const normalized = value
    .trim()
    .replace(/R\$\s?/g, '')
    .replace(/\s/g, '');
  const parsed = normalized.includes(',')
    ? normalized.replace(/\./g, '').replace(',', '.')
    : normalized;
  const amount = new Decimal(parsed || 0)
    .mul(100)
    .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
    .toNumber();
  if (!Number.isSafeInteger(amount) || Math.abs(amount) > 1e13)
    throw new Error('Valor monetário inválido.');
  return amount;
}
export function money(value: number, hidden = false): string {
  return hidden
    ? 'R$ •••••'
    : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);
}
export const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
export const monthOf = (date: string) => date.slice(0, 7);
export const civil = (date: Date) => format(date, 'yyyy-MM-dd');
export const shiftMonth = (date: string, n: number) => civil(addMonths(parseISO(date), n));
export function splitInstallments(total: number, count: number): number[] {
  if (
    !Number.isSafeInteger(total) ||
    total <= 0 ||
    total < count ||
    !Number.isInteger(count) ||
    count < 1 ||
    count > 600
  )
    throw new Error('Parcelamento inválido.');
  const base = Math.floor(total / count);
  return Array.from({ length: count }, (_, i) => base + (i < total % count ? 1 : 0));
}
export function invoiceDate(date: string, card: Pick<Card, 'closing' | 'due'>): string {
  const purchase = parseISO(date);
  const closing = Math.min(
    card.closing,
    new Date(purchase.getFullYear(), purchase.getMonth() + 1, 0).getDate(),
  );
  const after = purchase.getDate() > closing;
  const offset = (after ? 1 : 0) + (card.due <= card.closing ? 1 : 0);
  const target = addMonths(new Date(purchase.getFullYear(), purchase.getMonth(), 1), offset);
  return civil(
    new Date(
      target.getFullYear(),
      target.getMonth(),
      Math.min(card.due, new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()),
    ),
  );
}
export function occurrences(plan: Plan, card?: Card, horizon = 60): Obligation[] {
  const total =
    plan.mode === 'once'
      ? 1
      : plan.mode === 'installment'
        ? plan.count
        : Math.min(
            22000,
            plan.unit === 'day'
              ? Math.ceil((horizon * 31) / plan.interval)
              : Math.ceil(horizon / plan.interval),
          );
  const amounts =
    plan.mode === 'installment'
      ? splitInstallments(plan.amount, total)
      : (Array(total).fill(plan.amount) as number[]);
  return amounts.flatMap((amount, i) => {
    const date =
      plan.unit === 'day' && plan.mode === 'recurring'
        ? civil(addDays(parseISO(plan.date), i * plan.interval))
        : shiftMonth(plan.date, i * (plan.mode === 'recurring' ? plan.interval : 1));
    if (plan.end && date > plan.end) return [];
    return [
      {
        id: `${plan.id}:${i + 1}`,
        planId: plan.id,
        name: plan.name,
        amount,
        kind: plan.kind,
        category: plan.category,
        accountId: plan.accountId,
        cardId: plan.cardId,
        date: card ? invoiceDate(date, card) : date,
        purchaseDate: plan.mode === 'installment' ? plan.date : date,
        installment: i + 1,
        total: plan.mode === 'recurring' ? 0 : total,
        subscription: plan.subscription,
        cancelled:
          (!!plan.cancelledFrom && date >= plan.cancelledFrom) ||
          (!!plan.pausedFrom && date >= plan.pausedFrom),
        ...(plan.pausedFrom && date >= plan.pausedFrom ? { paused: true } : {}),
      },
    ];
  });
}
export function paid(w: Workspace, id: string): number {
  return (
    w.payments
      .filter((p) => p.obligationId === id && !p.reversed)
      .reduce((s, p) => s + p.amount, 0) -
    w.events
      .filter((e) => e.kind === 'purchase_refund' && e.targetId === id)
      .reduce((s, e) => s + e.amount, 0)
  );
}
export function due(w: Workspace, o: Obligation): number {
  return (
    o.amount +
    w.events
      .filter((e) => e.kind === 'obligation_adjustment' && e.targetId === o.id)
      .reduce((s, e) => s + e.amount, 0) -
    w.events
      .filter((e) => e.kind === 'purchase_refund' && e.targetId === o.id)
      .reduce((s, e) => s + e.amount, 0)
  );
}
export function remaining(w: Workspace, o: Obligation): number {
  return o.cancelled ? 0 : Math.max(0, due(w, o) - paid(w, o.id));
}
export function status(
  w: Workspace,
  o: Obligation,
  now = today(),
): 'paid' | 'partial' | 'overdue' | 'pending' | 'cancelled' {
  if (o.cancelled) return 'cancelled';
  if (!remaining(w, o)) return 'paid';
  if (o.date < now) return 'overdue';
  return paid(w, o.id) > 0 ? 'partial' : 'pending';
}
export function balance(w: Workspace, account: Account, until = today()): number {
  if (until < account.openingDate) return 0;
  const moves = w.payments
    .filter(
      (p) =>
        p.accountId === account.id &&
        !p.reversed &&
        p.date <= until &&
        p.date >= account.openingDate,
    )
    .reduce(
      (sum, p) =>
        sum +
        (w.obligations.find((o) => o.id === p.obligationId)?.kind === 'income'
          ? p.amount
          : -p.amount),
      0,
    );
  const transfers = w.transfers
    .filter((t) => t.date <= until && t.date >= account.openingDate)
    .reduce(
      (sum, t) =>
        sum + (t.to === account.id ? t.amount : 0) - (t.from === account.id ? t.amount + t.fee : 0),
      0,
    );
  return (
    account.opening +
    moves +
    transfers +
    w.events
      .filter((e) => e.accountId === account.id && e.date >= account.openingDate && e.date <= until)
      .reduce((s, e) => s + eventCash(e), 0)
  );
}
export const totalBalance = (w: Workspace, until = today()) =>
  w.accounts.reduce((s, a) => s + balance(w, a, until), 0);
export function cashFlow(w: Workspace, month: string) {
  return w.payments
    .filter((p) => !p.reversed && monthOf(p.date) === month)
    .reduce(
      (s, p) => {
        const kind = w.obligations.find((o) => o.id === p.obligationId)?.kind;
        if (kind === 'income') s.income += p.amount;
        else if (kind === 'expense') s.expense += p.amount;
        return s;
      },
      {
        income: w.events
          .filter((e) => e.kind === 'investment_income' && monthOf(e.date) === month)
          .reduce((s, e) => s + e.amount, 0),
        expense:
          w.events
            .filter((e) => monthOf(e.date) === month)
            .reduce(
              (s, e) =>
                s +
                (e.kind === 'debt_payment' ? e.fee : e.kind === 'purchase_refund' ? -e.amount : 0),
              0,
            ) + w.transfers.filter((t) => monthOf(t.date) === month).reduce((s, t) => s + t.fee, 0),
      },
    );
}
export function metrics(w: Workspace, month: string) {
  const rows = w.obligations.filter((o) => monthOf(o.date) === month && !o.cancelled);
  const cash = cashFlow(w, month);
  const pendingExpense = rows
    .filter((o) => o.kind === 'expense')
    .reduce((s, o) => s + remaining(w, o), 0);
  const pendingIncome = rows
    .filter((o) => o.kind === 'income')
    .reduce((s, o) => s + remaining(w, o), 0);
  const commitments = w.obligations
    .filter((o) => o.kind === 'expense' && o.date <= `${month}-31`)
    .reduce((s, o) => s + remaining(w, o), 0);
  const real = totalBalance(w);
  const reserves = w.goals.reduce((s, g) => s + g.reserved, 0);
  const investments = w.assets
    .filter((a) => a.type === 'investment')
    .reduce((s, a) => s + a.value, 0);
  const liabilities =
    w.assets.filter((a) => a.type === 'debt').reduce((s, a) => s + a.value, 0) +
    w.obligations.filter((o) => o.cardId || o.total > 1).reduce((s, o) => s + remaining(w, o), 0);
  return {
    ...cash,
    real,
    pendingExpense,
    pendingIncome,
    free: real - commitments - reserves,
    projected: real + pendingIncome - commitments,
    investments,
    net:
      real +
      w.assets.filter((a) => a.type !== 'debt').reduce((s, a) => s + a.value, 0) -
      liabilities,
    reserves,
  };
}
export function projection(
  w: Workspace,
  months: number,
  from = today(),
  incomeDelta = 0,
  expenseReduction = 0,
) {
  let running =
    totalBalance(w) -
    w.obligations
      .filter((o) => o.kind === 'expense' && o.date < `${monthOf(from)}-01`)
      .reduce((s, o) => s + remaining(w, o), 0);
  return Array.from({ length: months }, (_, i) => {
    const date = shiftMonth(from, i);
    const month = monthOf(date);
    const pending = w.obligations.filter((o) => !o.cancelled && monthOf(o.date) === month);
    const income =
      pending.filter((o) => o.kind === 'income').reduce((s, o) => s + remaining(w, o), 0) +
      incomeDelta;
    const expense = Math.max(
      0,
      pending.filter((o) => o.kind === 'expense').reduce((s, o) => s + remaining(w, o), 0) -
        expenseReduction,
    );
    running += income - expense;
    return {
      month,
      income,
      expense,
      balance: running,
      available:
        running -
        w.goals.reduce(
          (s, g) =>
            s + g.reserved + Math.min(Math.max(0, g.target - g.reserved), g.monthly * (i + 1)),
          0,
        ),
    };
  });
}
export function monthlySubscription(p: Plan) {
  if (p.mode !== 'recurring') return 0;
  return new Decimal(p.amount)
    .div(p.unit === 'day' ? new Decimal(p.interval).div('30.4375') : p.interval)
    .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
    .toNumber();
}
export function averageIncome(w: Workspace, months: number, now = today()) {
  const values = Array.from(
    { length: months },
    (_, i) => cashFlow(w, monthOf(shiftMonth(now, -i - 1))).income,
  );
  return new Decimal(values.reduce((a, b) => a + b, 0))
    .div(months)
    .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
    .toNumber();
}
export function addPayment(
  w: Workspace,
  obligationId: string,
  accountId: string,
  amount: number,
  date: string,
  id: string,
): Workspace {
  if (w.payments.some((p) => p.id === id)) return w;
  const o = w.obligations.find((o) => o.id === obligationId);
  const a = w.accounts.find((a) => a.id === accountId);
  if (
    !o ||
    !a ||
    o.cancelled ||
    amount <= 0 ||
    !Number.isSafeInteger(amount) ||
    amount > remaining(w, o) ||
    date > today() ||
    date < a.openingDate
  )
    throw new Error('Pagamento inválido. Verifique valor, data e conta.');
  return { ...w, payments: [...w.payments, { id, obligationId, accountId, amount, date }] };
}
export function payInvoice(
  w: Workspace,
  cardId: string,
  month: string,
  accountId: string,
  amount: number,
  date: string,
  key: string,
): Workspace {
  if (w.payments.some((p) => p.id.startsWith(`${key}:`))) return w;
  const rows = w.obligations
    .filter((o) => o.cardId === cardId && monthOf(o.date) === month && !o.cancelled)
    .sort((a, b) => a.id.localeCompare(b.id));
  if (amount > rows.reduce((s, o) => s + remaining(w, o), 0) || amount <= 0)
    throw new Error('Valor excede o saldo da fatura.');
  let next = w;
  let left = amount;
  for (const o of rows) {
    const portion = Math.min(left, remaining(next, o));
    if (portion > 0) next = addPayment(next, o.id, accountId, portion, date, `${key}:${o.id}`);
    left -= portion;
  }
  return next;
}
