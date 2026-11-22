import type { FinancialEvent } from './types';
export function eventCash(e: FinancialEvent): number {
  switch (e.kind) {
    case 'balance_adjustment':
    case 'investment_redemption':
    case 'investment_income':
    case 'debt_drawdown':
    case 'purchase_refund':
      return e.amount;
    case 'investment_contribution':
      return -e.amount;
    case 'debt_payment':
      return -e.amount - e.fee;
    default:
      return 0;
  }
}
