import { extendRecurrences } from '@/domain/operations';
import { workspaceSchema } from '@/domain/validation';
import type { Workspace } from '@/domain/types';
import { loadWorkspace, saveWorkspace } from './storage';
import { readLegacyWorkspace, removeVerifiedLegacy, sameWorkspace } from './legacy-storage';
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
    'events',
  ].some((key) => (w[key as keyof Workspace] as unknown[]).length > 0);
}
// The legacy copy is deleted only after a verified round trip to the empty cloud account.
export async function copyLocalWorkspaceToCloud(userId: string): Promise<void> {
  if (!userId) throw new Error('Entre na sua conta antes de migrar os dados.');
  const local = await readLegacyWorkspace();
  if (!local || !hasFinancialRecords(local.data))
    throw new Error('Não há registros anteriores neste navegador para migrar.');
  const remote = await loadWorkspace(userId);
  if (remote.revision !== 0 || hasFinancialRecords(remote.data))
    throw new Error(
      'Esta conta já possui dados. A migração foi interrompida para preservar os dois históricos.',
    );
  const candidate = workspaceSchema.parse({
    ...extendRecurrences(local.data),
    audit: [
      ...local.data.audit,
      {
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        action: 'Histórico anterior migrado para o Supabase',
      },
    ],
  });
  const revision = await saveWorkspace(candidate, 0, userId);
  const confirmed = await loadWorkspace(userId);
  if (confirmed.revision !== revision || !sameWorkspace(candidate, confirmed.data))
    throw new Error(
      'Não foi possível conferir a cópia na nuvem. O histórico antigo foi preservado.',
    );
  await removeVerifiedLegacy(local);
}
