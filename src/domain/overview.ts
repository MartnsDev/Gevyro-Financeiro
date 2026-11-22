import type { Workspace } from './types';
import { cashFlow, due, remaining, today, totalBalance } from './finance';
import { eventCash } from './event-cash';
export function financialOverview(w: Workspace, month: string) {
  const events = w.events.filter((e) => e.date.startsWith(month));
  const consumption = w.obligations
    .filter((o) => o.kind === 'expense' && !o.cancelled && o.purchaseDate.startsWith(month))
    .reduce((s, o) => s + due(w, o), 0);
  const expenses = w.obligations.filter((o) => o.kind === 'expense');
  const cash = totalBalance(w);
  const investments = w.assets
    .filter((a) => a.type === 'investment')
    .reduce((s, a) => s + a.value, 0);
  const debt =
    w.assets.filter((a) => a.type === 'debt').reduce((s, a) => s + a.value, 0) +
    expenses.filter((o) => o.cardId || o.total > 1).reduce((s, o) => s + remaining(w, o), 0);
  return {
    'Consumo nas compras do mês': consumption,
    'Despesas pagas no mês': cashFlow(w, month).expense,
    'Despesas pendentes no mês': expenses
      .filter((o) => o.date.startsWith(month))
      .reduce((s, o) => s + remaining(w, o), 0),
    'Contas vencidas': expenses
      .filter((o) => o.date < today())
      .reduce((s, o) => s + remaining(w, o), 0),
    'Parcelas futuras': expenses
      .filter((o) => o.total > 1 && o.date > today())
      .reduce((s, o) => s + remaining(w, o), 0),
    'Investimentos realizados no mês': events
      .filter(
        (e) =>
          (e.investment?.reversalOf
            ? w.events.find((x) => x.id === e.investment?.reversalOf)?.kind
            : e.kind) === 'investment_contribution',
      )
      .reduce((s, e) => s - eventCash(e), 0),
    'Transferências próprias no mês': w.transfers
      .filter((t) => t.date.startsWith(month))
      .reduce((s, t) => s + t.amount, 0),
    'Dívidas e faturas pagas no mês':
      events.reduce(
        (s, e) =>
          s +
          (e.kind === 'debt_payment'
            ? e.amount + e.fee
            : e.reversalFeeOf
              ? -e.amount
              : e.reversalOf && w.events.find((x) => x.id === e.reversalOf)?.kind === 'debt_payment'
                ? -e.amount
                : 0),
        0,
      ) +
      w.payments
        .filter(
          (p) =>
            !p.reversed &&
            p.date.startsWith(month) &&
            w.obligations.some((o) => o.id === p.obligationId && o.cardId),
        )
        .reduce((s, p) => s + p.amount, 0),
    'Saldo em contas': cash,
    'Carteira de investimentos': investments,
    'Patrimônio financeiro líquido': cash + investments - debt,
  };
}
