export const SHARED_SUPABASE = Object.freeze({
  projectRef: 'bcfjhwcsulylodayczkr',
  hostname: 'bcfjhwcsulylodayczkr.supabase.co',
  schema: 'gevyro_finance',
  loadRpc: 'gevyro_load_workspace',
  saveRpc: 'gevyro_save_workspace',
  storageKey: 'gevyro-financas-auth-v1',
  // Turn on only after inspecting the actual Free plan and applying the isolated migration.
  deploymentVerified: false,
});
export function isAuthorizedSharedSupabase(url?: string, enabled?: string): boolean {
  if (!url || enabled !== 'true' || !SHARED_SUPABASE.deploymentVerified) return false;
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname === SHARED_SUPABASE.hostname &&
      parsed.pathname === '/' &&
      !parsed.username &&
      !parsed.password &&
      !parsed.port &&
      !parsed.search &&
      !parsed.hash
    );
  } catch {
    return false;
  }
}
export function sharedSupabaseState(): 'unconfigured' | 'pending' | 'ready' {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return 'unconfigured';
  return isAuthorizedSharedSupabase(url, process.env.NEXT_PUBLIC_SUPABASE_SHARED_PROJECT_ENABLED)
    ? 'ready'
    : 'pending';
}
