import type { FinancialNotification, Workspace } from './types';
import { civil, remaining, today } from './finance';
import { addDays, parseISO } from 'date-fns';
export function financialNotifications(w: Workspace, now = today()): FinancialNotification[] {
  const limit = civil(addDays(parseISO(now), w.preferences.reminderDays));
  const result = w.obligations
    .filter((o) => remaining(w, o) > 0 && o.date <= limit)
    .map((o) => {
      const overdue = o.date < now;
      const id = `${overdue ? 'late' : 'due'}:${o.id}`;
      return {
        id,
        title: o.name,
        description: `${o.kind === 'income' ? 'Receita prevista' : o.cardId ? 'Fatura / compra' : 'Conta'} ${overdue ? 'atrasada' : 'próxima do vencimento'}`,
        targetId: o.id,
        date: o.date,
        read: w.notifications.find((n) => n.id === id)?.read || false,
      };
    });
  return result.sort((a, b) => a.date.localeCompare(b.date));
}
export function persistNotifications(w: Workspace, now = today()): Workspace {
  const generated = financialNotifications(w, now);
  const map = new Map(w.notifications.map((n) => [n.id, n]));
  for (const n of generated) map.set(n.id, n);
  return { ...w, notifications: [...map.values()] };
}
