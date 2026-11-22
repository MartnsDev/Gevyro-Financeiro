import { emptyWorkspace, type Workspace } from '../../src/domain/types';
import { occurrences } from '../../src/domain/finance';
export const rescheduledId = 'purchase:4';
export function reschedulingWorkspace(): Workspace {
  const w = emptyWorkspace();
  w.preferences.onboarding = true;
  w.accounts = [
    {
      id: 'bank',
      name: 'Conta de teste',
      institution: '',
      type: 'digital',
      opening: 1000000,
      openingDate: '2020-01-01',
      color: '#059669',
    },
  ];
  w.plans = [
    {
      id: 'purchase',
      name: 'Cama Queen Ortobom',
      amount: 204123,
      kind: 'expense',
      category: 'Compras',
      accountId: 'bank',
      cardId: '',
      date: '2026-08-05',
      mode: 'installment',
      count: 10,
      interval: 1,
      unit: 'month',
      end: '',
      notes: '',
      subscription: false,
    },
  ];
  w.obligations = occurrences(w.plans[0]);
  w.payments = w.obligations.slice(0, 3).map((o, i) => ({
    id: `paid:${i + 1}`,
    obligationId: o.id,
    accountId: 'bank',
    amount: o.amount,
    date: o.date,
  }));
  return w;
}
