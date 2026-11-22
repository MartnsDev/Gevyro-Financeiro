import { openDB } from 'idb';
import type { Workspace } from '@/domain/types';
import { emptyWorkspace } from '@/domain/types';
import { workspaceSchema } from '@/domain/validation';
import { extendRecurrences } from '@/domain/operations';
import { assertRemoteAllowed, assertWorkspaceWithinLimit } from './cost-policy';
import { supabase } from './supabase';
import { SHARED_SUPABASE } from './shared-supabase';
const db = () =>
  openDB('gevyro-financas-v1', 1, {
    upgrade(db) {
      db.createObjectStore('workspaces');
    },
  });
export interface Stored {
  data: Workspace;
  revision: number;
}
export async function loadWorkspace(userId?: string): Promise<Stored> {
  if (userId) {
    assertRemoteAllowed(process.env.NEXT_PUBLIC_SUPABASE_URL);
    if (!supabase)
      throw new Error('A conexão remota não está disponível. Não houve gravação local substituta.');
    const { data, error } = await supabase.rpc(SHARED_SUPABASE.loadRpc);
    if (error) throw error;
    return data
      ? { data: extendRecurrences(workspaceSchema.parse(data.workspace)), revision: data.revision }
      : { data: emptyWorkspace(), revision: 0 };
  }
  const store = await db();
  try {
    const stored = await store.get('workspaces', 'local');
    return stored
      ? { data: extendRecurrences(workspaceSchema.parse(stored.data)), revision: stored.revision }
      : { data: emptyWorkspace(), revision: 0 };
  } finally {
    store.close();
  }
}
export async function saveWorkspace(
  data: Workspace,
  revision: number,
  userId?: string,
): Promise<number> {
  assertWorkspaceWithinLimit(data);
  workspaceSchema.parse(data);
  if (userId) {
    assertRemoteAllowed(process.env.NEXT_PUBLIC_SUPABASE_URL);
    if (!supabase)
      throw new Error('A conexão remota não está disponível. Não houve gravação local substituta.');
    const { data: next, error } = await supabase.rpc(SHARED_SUPABASE.saveRpc, {
      p_workspace: data,
      p_revision: revision,
    });
    if (error)
      throw new Error(
        error.message.includes('revision_conflict')
          ? 'Os dados foram alterados em outra sessão. Recarregue para evitar sobrescrever alterações.'
          : error.message,
      );
    return next as number;
  }
  const store = await db();
  const tx = store.transaction('workspaces', 'readwrite');
  const completion = tx.done;
  // Attach rejection handling immediately, including quota errors and explicit aborts.
  void completion.catch(() => undefined);
  try {
    const current = await tx.store.get('local');
    if ((current?.revision ?? 0) !== revision) {
      tx.abort();
      await completion.catch(() => undefined);
      throw new Error('Outra aba alterou os dados. Recarregue a página.');
    }
    await tx.store.put({ data, revision: revision + 1 }, 'local');
    await completion;
    return revision + 1;
  } finally {
    store.close();
  }
}
