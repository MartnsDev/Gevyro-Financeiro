import { isAuthorizedSharedSupabase } from './shared-supabase';
/** Application policy, not a platform billing limit. Changes require the owner's authorization. */
export const COST_POLICY = Object.freeze({
  additionalInfrastructureBudgetBRL: 0,
  allowRemoteServices: false,
  allowAttachments: false,
  maxWorkspaceBytes: 12 * 1024 * 1024,
  maxImportBytes: 5 * 1024 * 1024,
  maxImportRows: 3000,
  pageSize: 30,
});
export function jsonBytes(data: unknown): number {
  return new TextEncoder().encode(JSON.stringify(data)).byteLength;
}
export function assertWorkspaceWithinLimit(data: unknown): void {
  if (jsonBytes(data) > COST_POLICY.maxWorkspaceBytes) {
    throw new Error(
      'O espaço atingiu o limite de segurança de 12 MiB. A operação não foi gravada e os dados existentes foram preservados. Exporte um backup completo antes de continuar. Nenhum serviço adicional será ativado.',
    );
  }
}
export function assertRemoteAllowed(url?: string): void {
  if (
    !COST_POLICY.allowRemoteServices &&
    !isAuthorizedSharedSupabase(url, process.env.NEXT_PUBLIC_SUPABASE_SHARED_PROJECT_ENABLED)
  )
    throw new Error(
      'Conexões externas bloqueadas até concluir a configuração autorizada do Supabase. Nenhuma cópia financeira é salva no dispositivo.',
    );
}
export function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} MiB`;
}
