import { workspaceSchema } from '@/domain/validation';
import type { Workspace } from '@/domain/types';
import { loadWorkspace, saveWorkspace } from './storage';
export function hasFinancialRecords(w: Workspace): boolean {
  return [
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
  ].some((key) => (w[key as keyof Workspace] as unknown[]).length > 0);
}
/** Explicit copy, never a destructive move. No merge or overwrite of an existing cloud ledger. */
export async function copyLocalWorkspaceToCloud(userId: string): Promise<void> {
  if (!userId) throw new Error('Entre na sua conta antes de copiar os dados.');
  const [local, remote] = await Promise.all([loadWorkspace(), loadWorkspace(userId)]);
  if (!hasFinancialRecords(local.data))
    throw new Error('Não há registros financeiros locais para copiar.');
  if (hasFinancialRecords(remote.data) || remote.revision !== 0)
    throw new Error(
      'Esta conta já possui um espaço na nuvem. A cópia foi interrompida para preservar os dois históricos.',
    );
  const candidate = workspaceSchema.parse({
    ...local.data,
    audit: [
      ...local.data.audit,
      {
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        action: 'Dados locais copiados para a conta; original local preservado',
      },
    ],
  });
  await saveWorkspace(candidate, remote.revision, userId);
}
