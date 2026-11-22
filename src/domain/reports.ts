import type { Workspace } from './types';
import { due, remaining } from './finance';
export interface ReportRow {
  id: string;
  targetId: string;
  name: string;
  date: string;
  category: string;
  accountId: string;
  cardId: string;
  kind: 'income' | 'expense';
  amount: number;
  source: 'obligation' | 'event' | 'transfer';
}
export type Perspective = 'cash' | 'accrual' | 'purchase';
export function reportRows(
  w: Workspace,
  from: string,
  to: string,
  perspective: Perspective,
): ReportRow[] {
  const rows: ReportRow[] = [];
  if (perspective === 'cash') {
    for (const p of w.payments.filter((p) => !p.reversed)) {
      const o = w.obligations.find((o) => o.id === p.obligationId);
      if (o)
        rows.push({
          id: p.id,
          targetId: o.id,
          name: o.name,
          date: p.date,
          category: o.category,
          accountId: p.accountId,
          cardId: o.cardId,
          kind: o.kind,
          amount: p.amount,
          source: 'obligation',
        });
    }
    for (const t of w.transfers.filter((t) => t.fee > 0))
      rows.push({
        id: t.id,
        targetId: t.id,
        name: 'Tarifa de transferência',
        date: t.date,
        category: 'Tarifas',
        accountId: t.from,
        cardId: '',
        kind: 'expense',
        amount: t.fee,
        source: 'transfer',
      });
    for (const e of w.events) {
      const o = w.obligations.find((o) => o.id === e.targetId);
      if (e.kind === 'purchase_refund')
        rows.push({
          id: e.id,
          targetId: e.targetId,
          name: `Reembolso · ${o?.name || e.note}`,
          date: e.date,
          category: o?.category || 'Outros',
          accountId: e.accountId,
          cardId: o?.cardId || '',
          kind: 'expense',
          amount: -e.amount,
          source: 'event',
        });
      if (e.kind === 'investment_income' || (e.kind === 'debt_payment' && e.fee))
        rows.push({
          id: e.id,
          targetId: e.targetId,
          name: e.kind === 'investment_income' ? 'Rendimento recebido' : 'Juros de dívida',
          date: e.date,
          category: e.kind === 'investment_income' ? 'Investimentos' : 'Tarifas',
          accountId: e.accountId,
          cardId: '',
          kind: e.kind === 'investment_income' ? 'income' : 'expense',
          amount: e.kind === 'investment_income' ? e.amount : e.fee,
          source: 'event',
        });
    }
  } else
    for (const o of w.obligations.filter((o) => !o.cancelled))
      rows.push({
        id: o.id,
        targetId: o.id,
        name: o.name,
        date: perspective === 'purchase' ? o.purchaseDate : o.date,
        category: o.category,
        accountId: o.accountId,
        cardId: o.cardId,
        kind: o.kind,
        amount: due(w, o),
        source: 'obligation',
      });
  return rows
    .filter((r) => r.date >= from && r.date <= to)
    .sort((a, b) => b.date.localeCompare(a.date));
}
export function budgetUsage(
  w: Workspace,
  category: string,
  month: string,
  perspective: Perspective = 'accrual',
) {
  const rows = reportRows(w, `${month}-01`, `${month}-31`, perspective).filter(
    (r) => r.kind === 'expense' && r.category === category,
  );
  const used = rows.reduce((s, r) => s + r.amount, 0);
  const pending = w.obligations
    .filter((o) => o.kind === 'expense' && o.category === category && o.date.startsWith(month))
    .reduce((s, o) => s + remaining(w, o), 0);
  return perspective === 'cash'
    ? { used, committed: pending, total: used + pending }
    : { used: used - pending, committed: pending, total: used };
}
