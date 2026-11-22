import { addDays, getDaysInMonth, parseISO } from 'date-fns';
import Decimal from 'decimal.js';
import type { Workspace } from './types';
import { civil, monthOf, projection, remaining, shiftMonth, today, totalBalance } from './finance';
export type Strategy = 'conservative' | 'standard' | 'optimistic';
export function scenarioWorkspace(w: Workspace, cancelledPlanIds: string[] = []): Workspace {
  return {
    ...w,
    plans: w.plans.map((p) =>
      cancelledPlanIds.includes(p.id) ? { ...p, cancelledFrom: today() } : p,
    ),
    obligations: w.obligations.map((o) =>
      cancelledPlanIds.includes(o.planId) ? { ...o, cancelled: true } : o,
    ),
  };
}
export function forecast(
  w: Workspace,
  months: number,
  strategy: Strategy,
  now = today(),
  incomeDelta = 0,
  reduction = 0,
) {
  const fixed = new Set(
    w.plans
      .filter((p) => p.kind === 'income' && (p.incomeType === 'fixed' || p.confirmed))
      .map((p) => p.id),
  );
  const projected =
    strategy === 'conservative'
      ? {
          ...w,
          obligations: w.obligations.map((o) =>
            o.kind === 'income' && !fixed.has(o.planId) ? { ...o, cancelled: true } : o,
          ),
        }
      : w;
  const variableIds = new Set(
    w.plans
      .filter(
        (p) =>
          p.kind === 'income' && p.incomeType === 'variable' && !p.cancelledFrom && !p.pausedFrom,
      )
      .map((p) => p.id),
  );
  const monthsBack = Array.from({ length: 6 }, (_, i) => monthOf(shiftMonth(now, -i - 1)));
  const received = w.payments
    .filter(
      (p) =>
        !p.reversed &&
        monthsBack.includes(monthOf(p.date)) &&
        w.obligations.some((o) => o.id === p.obligationId && variableIds.has(o.planId)),
    )
    .reduce((s, p) => s + p.amount, 0);
  const average = new Decimal(received).div(6).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
  const rows = projection(
    projected,
    months,
    now,
    strategy === 'optimistic' ? incomeDelta : 0,
    reduction,
  );
  let accumulated = 0;
  return rows.map((row) => {
    const variablePlanned = projected.obligations
      .filter(
        (o) => o.kind === 'income' && variableIds.has(o.planId) && monthOf(o.date) === row.month,
      )
      .reduce((s, o) => s + remaining(w, o), 0);
    const receivedInMonth = w.payments
      .filter(
        (p) =>
          !p.reversed &&
          monthOf(p.date) === row.month &&
          w.obligations.some((o) => o.id === p.obligationId && variableIds.has(o.planId)),
      )
      .reduce((s, p) => s + p.amount, 0);
    const estimate =
      strategy === 'standard' ? Math.max(0, average - variablePlanned - receivedInMonth) : 0;
    accumulated += estimate;
    return {
      ...row,
      income: row.income + estimate,
      balance: row.balance + accumulated,
      available: row.available + accumulated,
      estimate,
    };
  });
}
export function dailyForecast(w: Workspace, days = 31, now = today()) {
  if (!Number.isInteger(days) || days < 1 || days > 366)
    throw new Error('Horizonte diário inválido.');
  let balance =
    totalBalance(w) -
    w.obligations
      .filter((o) => o.kind === 'expense' && o.date < now)
      .reduce((s, o) => s + remaining(w, o), 0);
  return Array.from({ length: days }, (_, i) => {
    const date = civil(addDays(parseISO(now), i));
    const rows = w.obligations.filter((o) => o.date === date);
    const income = rows.filter((o) => o.kind === 'income').reduce((s, o) => s + remaining(w, o), 0);
    const expense = rows
      .filter((o) => o.kind === 'expense')
      .reduce((s, o) => s + remaining(w, o), 0);
    balance += income - expense;
    return { date, income, expense, balance };
  });
}
export function dailyAllowance(free: number, now = today()) {
  const date = parseISO(now);
  return Math.max(0, Math.floor(free / (getDaysInMonth(date) - date.getDate() + 1)));
}
export function endingInstallments(w: Workspace) {
  return w.plans
    .filter((p) => p.mode === 'installment' && p.kind === 'expense')
    .flatMap((p) => {
      const rows = w.obligations
        .filter((o) => o.planId === p.id && !o.cancelled)
        .sort((a, b) => a.date.localeCompare(b.date));
      const last = rows.at(-1);
      const left = rows.reduce((s, o) => s + remaining(w, o), 0);
      return last && left
        ? [
            {
              id: p.id,
              name: p.name,
              end: last.date,
              releaseMonth: monthOf(shiftMonth(last.date, 1)),
              monthly: last.amount,
              remaining: left,
            },
          ]
        : [];
    })
    .sort((a, b) => a.end.localeCompare(b.end));
}
