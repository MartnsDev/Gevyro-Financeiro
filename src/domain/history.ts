import type { Audit, HistoryEntity, RecordChange, Workspace } from './types';
import { workspaceSchema } from './validation';
export const historyEntities: HistoryEntity[] = [
  'accounts',
  'cards',
  'plans',
  'obligations',
  'payments',
  'transfers',
  'goals',
  'budgets',
  'assets',
  'scenarios',
  'events',
];
const stable = (v: unknown): unknown =>
  Array.isArray(v)
    ? v.map(stable)
    : v && typeof v === 'object'
      ? Object.fromEntries(
          Object.entries(v)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, x]) => [k, stable(x)]),
        )
      : v;
const equal = (a: unknown, b: unknown) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));
export function recordChanges(before: Workspace, after: Workspace): RecordChange[] {
  const changes: RecordChange[] = [];
  for (const entity of historyEntities) {
    const old = new Map(before[entity].map((x) => [x.id, x]));
    const next = new Map(after[entity].map((x) => [x.id, x]));
    for (const id of new Set([...old.keys(), ...next.keys()])) {
      const a = old.get(id) ?? null,
        b = next.get(id) ?? null;
      if (!equal(a, b))
        changes.push({
          entity,
          id,
          before: a as unknown as Record<string, unknown> | null,
          after: b as unknown as Record<string, unknown> | null,
        });
    }
  }
  return changes;
}
export function undoChange(w: Workspace, audit: Audit): Workspace {
  const changes = audit.changes;
  if (!changes?.length || w.audit.some((a) => a.undoOf === audit.id))
    throw new Error('Esta alteração não permite desfazer.');
  if (changes.some((c) => ['events', 'payments', 'transfers'].includes(c.entity)))
    throw new Error('Movimentos financeiros devem ser corrigidos por estorno identificado.');
  const later = w.audit.slice(w.audit.findIndex((a) => a.id === audit.id) + 1);
  if (
    later.some((a) =>
      a.changes?.some((c) => changes.some((x) => c.id === x.id && c.entity === x.entity)),
    )
  )
    throw new Error('Há alterações posteriores neste registro.');
  const next = { ...w };
  for (const c of changes) {
    const rows = w[c.entity] as unknown as Record<string, unknown>[];
    if (!equal(rows.find((r) => r.id === c.id) ?? null, c.after))
      throw new Error('O registro mudou depois desta edição.');
    if (
      c.entity === 'assets' &&
      w.events.some((e) => e.targetId === c.id && e.kind.startsWith('investment_')) &&
      (c.before?.cost !== c.after?.cost || c.before?.quantity !== c.after?.quantity)
    )
      throw new Error('Posição com operações: use o estorno de investimento.');
    if (c.entity === 'obligations' && w.payments.some((p) => p.obligationId === c.id) && !c.before)
      throw new Error('Há pagamentos vinculados.');
    Object.assign(next, {
      [c.entity]: [
        ...rows.filter((r) => r.id !== c.id),
        ...(c.before
          ? [
              c.entity === 'obligations'
                ? {
                    ...c.before,
                    ...(c.after?.originalDate ? { originalDate: c.after.originalDate } : {}),
                    ...(c.after?.originalAmount ? { originalAmount: c.after.originalAmount } : {}),
                  }
                : c.before,
            ]
          : []),
      ],
    });
  }
  return workspaceSchema.parse(next);
}

export function mergeAudit(current: Audit[], incoming: Audit[]): Audit[] {
  const ids = new Set(current.map((a) => a.id));
  const extra = incoming.filter((a) => {
    if (ids.has(a.id)) return false;
    ids.add(a.id);
    return true;
  });
  return [...current, ...extra];
}
