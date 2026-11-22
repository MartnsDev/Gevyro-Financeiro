import type { FinancialEvent } from './types';
export function eventCash(e: FinancialEvent): number {
  if (e.investment) return e.investment.cash;
  switch (e.kind) {
    case 'balance_adjustment':
    case 'investment_redemption':
    case 'investment_income':
    case 'debt_drawdown':
    case 'purchase_refund':
      return e.amount;
    case 'purchase_refund_reversal':
    case 'investment_contribution':
      return -e.amount;
    case 'debt_payment':
      return -e.amount - e.fee;
    default:
      return 0;
  }
}
export function investmentIncomeCash(events: FinancialEvent[], e: FinancialEvent): number {
  const original = e.investment?.reversalOf
    ? events.find((x) => x.id === e.investment?.reversalOf)
    : e;
  return original?.kind === 'investment_income' ? eventCash(e) : 0;
}
