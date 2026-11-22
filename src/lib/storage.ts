import type { Workspace } from '@/domain/types';
import { emptyWorkspace } from '@/domain/types';
import { workspaceSchema } from '@/domain/validation';
import { extendRecurrences } from '@/domain/operations';
import { assertRemoteAllowed, assertWorkspaceWithinLimit } from './cost-policy';
import { supabase } from './supabase';
import { SHARED_SUPABASE } from './shared-supabase';
export interface Stored {
  data: Workspace;
  revision: number;
}
async function cloudClient(userId?: string) {
  if (!userId) throw new Error('Entre com sua conta Google para acessar seus dados.');
  assertRemoteAllowed(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!supabase)
    throw new Error(
      'A conexão com o Supabase ainda não está disponível. Nenhum dado foi salvo neste dispositivo.',
    );
  const { data, error } = await supabase.auth.getUser();
  if (error || data.user?.id !== userId)
    throw new Error('Sua sessão expirou ou mudou. Entre novamente antes de continuar.');
  return supabase;
}
export async function loadWorkspace(userId?: string): Promise<Stored> {
  const client = await cloudClient(userId);
  const { data, error } = await client.rpc(SHARED_SUPABASE.loadRpc);
  if (error) throw new Error('Não foi possível carregar os dados do Supabase. Tente novamente.');
  if (data === null) return { data: emptyWorkspace(), revision: 0 };
  if (!data || !Number.isSafeInteger(data.revision) || data.revision < 1)
    throw new Error('Resposta inválida do Supabase. Os dados não foram substituídos.');
  return {
    data: extendRecurrences(workspaceSchema.parse(data.workspace)),
    revision: data.revision,
  };
}
export async function saveWorkspace(
  data: Workspace,
  revision: number,
  userId?: string,
): Promise<number> {
  if (!userId) throw new Error('Entre com sua conta Google antes de salvar.');
  assertWorkspaceWithinLimit(data);
  const valid = workspaceSchema.parse(data);
  if (!Number.isSafeInteger(revision) || revision < 0) throw new Error('Revisão inválida.');
  const client = await cloudClient(userId);
  const { data: next, error } = await client.rpc(SHARED_SUPABASE.saveRpc, {
    p_workspace: valid,
    p_revision: revision,
  });
  if (error)
    throw new Error(
      error.message.includes('revision_conflict')
        ? 'Outro dispositivo alterou os dados. Feche o formulário e atualize antes de tentar novamente.'
        : 'O Supabase não confirmou a gravação. Verifique a conexão e tente novamente. Nenhuma cópia foi salva no dispositivo.',
    );
  if (!Number.isSafeInteger(next) || next !== revision + 1)
    throw new Error('A gravação não pôde ser confirmada. Atualize antes de tentar novamente.');
  return next as number;
}
