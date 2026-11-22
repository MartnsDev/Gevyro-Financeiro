import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  SHARED_SUPABASE,
  isAuthorizedSharedSupabase,
  sharedSupabaseState,
} from '../src/lib/shared-supabase';
afterEach(() => vi.unstubAllEnvs());
describe('Supabase MCell com autorização restrita', () => {
  it('identifica somente o projeto e o schema autorizados', () => {
    expect(SHARED_SUPABASE.projectRef).toBe('bcfjhwcsulylodayczkr');
    expect(SHARED_SUPABASE.schema).toBe('gevyro_finance');
    expect(SHARED_SUPABASE.loadRpc).toBe('gevyro_load_workspace');
    expect(SHARED_SUPABASE.saveRpc).toBe('gevyro_save_workspace');
    expect(SHARED_SUPABASE.storageKey).toBe('gevyro-financas-auth-v1');
  });
  it('mantém rede bloqueada até validar plano e migração, mesmo com opt-in', () => {
    expect(SHARED_SUPABASE.deploymentVerified).toBe(false);
    expect(isAuthorizedSharedSupabase('https://bcfjhwcsulylodayczkr.supabase.co', 'true')).toBe(
      false,
    );
  });
  it('informa pendência sem simular uma conexão ativa', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://bcfjhwcsulylodayczkr.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_SHARED_PROJECT_ENABLED', 'false');
    expect(sharedSupabaseState()).toBe('pending');
  });
  it('nenhuma URL desconhecida pode remover o bloqueio', () => {
    for (const url of [
      'http://bcfjhwcsulylodayczkr.supabase.co',
      'https://other.supabase.co',
      'https://bcfjhwcsulylodayczkr.supabase.co.evil.test',
      'https://name:pass@bcfjhwcsulylodayczkr.supabase.co',
    ])
      expect(isAuthorizedSharedSupabase(url, 'true')).toBe(false);
  });
});
