import type { Obligation, Plan, Workspace } from './types';
import { addPayment, occurrences, splitInstallments, today } from './finance';
import { z } from 'zod';

export function extendRecurrences(w: Workspace, now = today()): Workspace {
  const ids = new Set(w.obligations.map((o) => o.id));
  const extra: Obligation[] = [];
  for (const p of w.plans.filter(
    (p) => p.mode === 'recurring' && !p.cancelledFrom && !p.pausedFrom,
  )) {
    const elapsed = Math.max(
      0,
      (Number(now.slice(0, 4)) - Number(p.date.slice(0, 4))) * 12 +
        Number(now.slice(5, 7)) -
        Number(p.date.slice(5, 7)),
    );
    for (const o of occurrences(
      p,
      w.cards.find((c) => c.id === p.cardId),
      elapsed + 61,
    )) {
      if (!ids.has(o.id)) {
        ids.add(o.id);
        extra.push(o);
      }
    }
  }
  return extra.length ? { ...w, obligations: [...w.obligations, ...extra] } : w;
}
export function revisePlan(w: Workspace, plan: Plan, now = today()): Workspace {
  const existing = w.plans.find((p) => p.id === plan.id);
  if (plan.end && plan.end < plan.date)
    throw new Error('A data final deve ser posterior ao início.');
  if (!existing)
    return extendRecurrences(
      {
        ...w,
        plans: [...w.plans, plan],
        obligations: [
          ...w.obligations,
          ...occurrences(
            plan,
            w.cards.find((c) => c.id === plan.cardId),
          ),
        ],
      },
      now,
    );
  const protectedRows = w.obligations.filter(
    (o) =>
      o.planId === plan.id &&
      (w.payments.some((p) => p.obligationId === o.id) ||
        w.events.some((e) => e.targetId === o.id) ||
        o.date < now ||
        o.originalDate !== undefined ||
        o.originalAmount !== undefined ||
        o.notes !== undefined),
  );
  if (
    protectedRows.length &&
    (plan.kind !== existing.kind ||
      plan.mode !== existing.mode ||
      plan.cardId !== existing.cardId ||
      plan.accountId !== existing.accountId)
  )
    throw new Error('Com histórico existente, mantenha natureza, conta, cartão e tipo da série.');
  const protectedIds = new Set(protectedRows.map((o) => o.id));
  let future = occurrences(
    plan,
    w.cards.find((c) => c.id === plan.cardId),
  ).filter((o) => !protectedIds.has(o.id) && o.date >= now);
  if (plan.mode === 'installment' && protectedRows.length) {
    const rest = plan.amount - protectedRows.reduce((s, o) => s + o.amount, 0);
    if (rest < 0 || (!future.length && rest !== 0))
      throw new Error('O total não pode invalidar as parcelas preservadas.');
    if (future.length && rest < future.length)
      throw new Error('Valor restante insuficiente para as parcelas futuras.');
    const values = future.length ? splitInstallments(rest, future.length) : [];
    future = future.map((o, i) => ({ ...o, amount: values[i] }));
  }
  return extendRecurrences(
    {
      ...w,
      plans: w.plans.map((p) => (p.id === plan.id ? plan : p)),
      obligations: [
        ...w.obligations.filter((o) => o.planId !== plan.id),
        ...protectedRows,
        ...future,
      ],
    },
    now,
  );
}
export function editOccurrence(
  w: Workspace,
  id: string,
  changes: Pick<Obligation, 'name' | 'amount' | 'date'> &
    Partial<Pick<Obligation, 'notes' | 'cancelled' | 'category'>>,
): Workspace {
  const o = w.obligations.find((o) => o.id === id);
  if (!o) throw new Error('Ocorrência não encontrada.');
  const parsed = z
    .object({
      name: z.string().trim().min(1).max(2000),
      amount: z.number().int().positive().max(1e13),
      date: z.iso.date(),
      notes: z.string().max(2000).optional(),
      cancelled: z.boolean().optional(),
      category: z.string().min(1).max(2000).optional(),
    })
    .parse(changes);
  const paidTotal = w.payments
    .filter((p) => p.obligationId === id && !p.reversed)
    .reduce((sum, p) => sum + p.amount, 0);
  const adjustment = w.events
    .filter((e) => e.kind === 'obligation_adjustment' && e.targetId === id)
    .reduce((sum, e) => sum + e.amount, 0);
  if (parsed.amount + adjustment < paidTotal)
    throw new Error('O valor não pode ser inferior ao já pago. Corrija o pagamento primeiro.');
  if (parsed.cancelled && paidTotal) throw new Error('Estorne os pagamentos antes de cancelar.');
  return {
    ...w,
    obligations: w.obligations.map((row) =>
      row.id === id
        ? {
            ...row,
            ...parsed,
            originalDate: row.originalDate ?? row.date,
            originalAmount: row.originalAmount ?? row.amount,
          }
        : row,
    ),
  };
}
export function correctPayment(
  w: Workspace,
  id: string,
  accountId: string,
  amount: number,
  date: string,
  newId: string,
): Workspace {
  const old = w.payments.find((p) => p.id === id && !p.reversed);
  if (!old) throw new Error('Escolha um pagamento ativo.');
  return addPayment(reversePayment(w, id), old.obligationId, accountId, amount, date, newId);
}
export function settleSelected(
  w: Workspace,
  ids: string[],
  accountId: string,
  date: string,
  key: string,
): Workspace {
  if (!ids.length || new Set(ids).size !== ids.length)
    throw new Error('Selecione parcelas diferentes.');
  if (w.payments.some((p) => p.id.startsWith(`${key}:`))) return w;
  let next = w;
  for (const id of ids) {
    const o = next.obligations.find((o) => o.id === id);
    if (!o || o.cancelled) throw new Error('Parcela indisponível.');
    const paid = next.payments
      .filter((p) => p.obligationId === id && !p.reversed)
      .reduce((s, p) => s + p.amount, 0);
    const adjusted = next.events
      .filter((e) => e.targetId === id && e.kind === 'obligation_adjustment')
      .reduce((s, e) => s + e.amount, 0);
    const amount = o.amount + adjusted - paid;
    if (amount > 0) next = addPayment(next, id, accountId, amount, date, `${key}:${id}`);
  }
  return next;
}

export function reversePayment(w: Workspace, id: string): Workspace {
  const p = w.payments.find((p) => p.id === id);
  if (!p) throw new Error('Pagamento não encontrado.');
  if (p.reversed) return w;
  return { ...w, payments: w.payments.map((p) => (p.id === id ? { ...p, reversed: true } : p)) };
}
export function cancelFuture(w: Workspace, id: string, cutoff = today()): Workspace {
  return {
    ...w,
    plans: w.plans.map((p) => (p.id === id ? { ...p, cancelledFrom: cutoff } : p)),
    obligations: w.obligations.map((o) =>
      o.planId === id && o.date >= cutoff && !w.payments.some((p) => p.obligationId === o.id)
        ? { ...o, cancelled: true }
        : o,
    ),
  };
}
export function reverseImport(w: Workspace, hash: string): Workspace {
  const plans = w.plans.filter((p) => p.notes === `Lote de importação: ${hash}`);
  if (!plans.length) throw new Error('Nenhum registro desse lote foi encontrado.');
  const ids = new Set(plans.map((p) => p.id));
  const obs = new Set(w.obligations.filter((o) => ids.has(o.planId)).map((o) => o.id));
  if (w.events.some((e) => obs.has(e.targetId)))
    throw new Error(
      'O lote possui ajustes ou reembolsos posteriores. A reversão automática foi bloqueada para preservar o histórico.',
    );
  return {
    ...w,
    payments: w.payments.map((p) => (obs.has(p.obligationId) ? { ...p, reversed: true } : p)),
    obligations: w.obligations.map((o) => (obs.has(o.id) ? { ...o, cancelled: true } : o)),
    plans: w.plans.map((p) => (ids.has(p.id) ? { ...p, cancelledFrom: today() } : p)),
  };
}

export function pauseSubscription(w: Workspace, id: string, now = today()): Workspace {
  const plan = w.plans.find((p) => p.id === id);
  if (!plan?.subscription || plan.cancelledFrom) throw new Error('Escolha uma assinatura ativa.');
  return {
    ...w,
    plans: w.plans.map((p) => (p.id === id ? { ...p, pausedFrom: now } : p)),
    obligations: w.obligations.map((o) =>
      o.planId === id && o.date >= now && !w.payments.some((p) => p.obligationId === o.id)
        ? { ...o, cancelled: true, paused: true }
        : o,
    ),
  };
}
export function resumeSubscription(w: Workspace, id: string, now = today()): Workspace {
  const plan = w.plans.find((p) => p.id === id);
  if (!plan?.pausedFrom || plan.cancelledFrom) throw new Error('Escolha uma assinatura pausada.');
  return extendRecurrences(
    {
      ...w,
      plans: w.plans.map((p) => {
        if (p.id !== id) return p;
        const rest = { ...p };
        delete rest.pausedFrom;
        return rest;
      }),
      obligations: w.obligations.map((o) =>
        o.planId === id && o.paused && o.date >= now
          ? { ...o, cancelled: false, paused: false }
          : o,
      ),
    },
    now,
  );
}
