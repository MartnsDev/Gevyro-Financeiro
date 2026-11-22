import type { Workspace } from './types';
import { investmentIncomeCash } from './event-cash';
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
      if (['purchase_refund', 'purchase_refund_reversal'].includes(e.kind))
        rows.push({
          id: e.id,
          targetId: e.targetId,
          name: `Reembolso · ${o?.name || e.note}`,
          date: e.date,
          category: o?.category || 'Outros',
          accountId: e.accountId,
          cardId: o?.cardId || '',
          kind: 'expense',
          amount: e.kind === 'purchase_refund' ? -e.amount : e.amount,
          source: 'event',
        });
      if (e.reversalFeeOf)
        rows.push({
          id: e.id,
          targetId: e.targetId,
          name: 'Juros devolvidos por estorno',
          date: e.date,
          category: 'Tarifas',
          accountId: e.accountId,
          cardId: '',
          kind: 'expense',
          amount: -e.amount,
          source: 'event',
        });
      if (investmentIncomeCash(w.events, e) || (e.kind === 'debt_payment' && e.fee))
        rows.push({
          id: e.id,
          targetId: e.targetId,
          name: investmentIncomeCash(w.events, e) ? 'Rendimento recebido' : 'Juros de dívida',
          date: e.date,
          category: investmentIncomeCash(w.events, e) ? 'Investimentos' : 'Tarifas',
          accountId: e.accountId,
          cardId: '',
          kind: investmentIncomeCash(w.events, e) ? 'income' : 'expense',
          amount: investmentIncomeCash(w.events, e) ? investmentIncomeCash(w.events, e) : e.fee,
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
