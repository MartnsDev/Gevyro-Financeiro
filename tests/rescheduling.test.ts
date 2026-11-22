import { afterEach, describe, expect, it, vi } from 'vitest';
import { rescheduledId, reschedulingWorkspace } from './fixtures/rescheduling';
import { editOccurrence, extendRecurrences, revisePlan } from '../src/domain/operations';
import { addPayment, metrics, monthOf, status, today, totalBalance } from '../src/domain/finance';
import { financialNotifications } from '../src/domain/notifications';
import { reportRows } from '../src/domain/reports';
afterEach(() => vi.useRealTimers());
const move = (w = reschedulingWorkspace()) => {
  const o = w.obligations.find((o) => o.id === rescheduledId)!;
  return editOccurrence(w, o.id, { name: o.name, amount: o.amount, date: '2026-12-05' });
};
describe('Vencimento individual como fonte da competência e situação', () => {
  it('reproduz o caminho antigo: editar a série preserva a parcela vencida de novembro', () => {
    const w = reschedulingWorkspace();
    const next = revisePlan(w, { ...w.plans[0], date: '2026-09-05' }, '2026-11-22');
    expect(next.plans[0].date).toBe('2026-09-05');
    expect(next.obligations.find((o) => o.id === rescheduledId)?.date).toBe('2026-11-05');
  });
  it('move novembro para dezembro sem alterar contrato, valores, pagamentos ou outras parcelas', () => {
    const w = reschedulingWorkspace(),
      next = move(w),
      o = next.obligations.find((o) => o.id === rescheduledId)!;
    expect(
      status(
        w,
        w.obligations.find((o) => o.id === rescheduledId)!,
        '2026-11-22',
      ),
    ).toBe('overdue');
    expect(o.date).toBe('2026-12-05');
    expect(o.originalDate).toBe('2026-11-05');
    expect(status(next, o, '2026-11-22')).toBe('pending');
    expect(status(next, o, '2026-12-05')).toBe('pending');
    expect(status(next, o, '2026-12-06')).toBe('overdue');
    expect(next.obligations.filter((o) => monthOf(o.date) === '2026-11')).toHaveLength(0);
    expect(next.obligations.filter((o) => monthOf(o.date) === '2026-12')).toHaveLength(2);
    expect(next.plans).toEqual(w.plans);
    expect(next.payments).toEqual(w.payments);
    expect(next.obligations.filter((o) => o.id !== rescheduledId)).toEqual(
      w.obligations.filter((o) => o.id !== rescheduledId),
    );
    expect(totalBalance(next)).toBe(totalBalance(w));
    expect(next.obligations.map((o) => o.amount)).toEqual(w.obligations.map((o) => o.amount));
    expect(metrics(next, '2026-11').pendingExpense).toBe(0);
    expect(reportRows(next, '2026-11-01', '2026-11-30', 'accrual')).toHaveLength(0);
    expect(reportRows(next, '2026-12-01', '2026-12-31', 'accrual').map((r) => r.id)).toContain(
      rescheduledId,
    );
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-22T15:00:00Z'));
    expect(
      financialNotifications(next).some(
        (n) => n.targetId === rescheduledId && n.title.includes('atras'),
      ),
    ).toBe(false);
  });
  it('edição posterior da série e leitura das recorrências não recriam nem sobrescrevem o vencimento individual', () => {
    const w = move();
    const next = revisePlan(w, { ...w.plans[0], name: 'Contrato atualizado' }, '2026-11-22');
    expect(next.obligations.find((o) => o.id === rescheduledId)).toEqual(
      w.obligations.find((o) => o.id === rescheduledId),
    );
    expect(
      extendRecurrences(next, '2026-11-22').obligations.filter((o) => o.id === rescheduledId),
    ).toHaveLength(1);
  });
  it.each(['UTC', 'America/Sao_Paulo', 'Pacific/Kiritimati'])(
    'mantém datas civis e mês sem conversão UTC no fuso %s',
    (timezone) => {
      const previous = process.env.TZ;
      process.env.TZ = timezone;
      try {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-12-01T01:30:00Z'));
        expect(today()).toBe('2026-11-30');
        const w = move(),
          o = w.obligations.find((o) => o.id === rescheduledId)!;
        expect(o.date).toBe('2026-12-05');
        expect(monthOf(o.date)).toBe('2026-12');
        expect(status(w, o)).toBe('pending');
      } finally {
        if (previous === undefined) delete process.env.TZ;
        else process.env.TZ = previous;
      }
    },
  );
});

it('mudança de vencimento preserva pagamento parcial e quitação já existentes', () => {
  const original = reschedulingWorkspace();
  const partial = addPayment(original, rescheduledId, 'bank', 10000, '2026-11-05', 'partial');
  const movedPartial = move(partial),
    o = movedPartial.obligations.find((o) => o.id === rescheduledId)!;
  expect(movedPartial.payments).toEqual(partial.payments);
  expect(status(movedPartial, o, '2026-11-22')).toBe('partial');
  const paid = addPayment(partial, rescheduledId, 'bank', o.amount - 10000, '2026-11-06', 'settle');
  const movedPaid = move(paid);
  expect(movedPaid.payments).toEqual(paid.payments);
  expect(
    status(
      movedPaid,
      movedPaid.obligations.find((o) => o.id === rescheduledId)!,
      '2026-11-22',
    ),
  ).toBe('paid');
});
