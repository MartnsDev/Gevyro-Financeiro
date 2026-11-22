import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import { emptyWorkspace } from '../src/domain/types';
import {
  assertRemoteAllowed,
  assertWorkspaceWithinLimit,
  COST_POLICY,
  jsonBytes,
} from '../src/lib/cost-policy';
import { loadWorkspace, saveWorkspace } from '../src/lib/storage';
describe('Proteção de orçamento zero', () => {
  it('bloqueia conexões externas mesmo com credenciais presentes', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-public-key');
    vi.resetModules();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { supabase } = await import('../src/lib/supabase');
    expect(supabase).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
    vi.unstubAllEnvs();
  });
  it('não permite contratar serviços ou anexos pela política', () => {
    expect(COST_POLICY.additionalInfrastructureBudgetBRL).toBe(0);
    expect(COST_POLICY.allowRemoteServices).toBe(false);
    expect(COST_POLICY.allowAttachments).toBe(false);
    expect(() => assertRemoteAllowed()).toThrow('bloqueadas');
  });
  it('mede bytes UTF-8 e interrompe novas gravações excessivas', () => {
    expect(jsonBytes({ name: 'ç' })).toBe(
      new TextEncoder().encode(JSON.stringify({ name: 'ç' })).byteLength,
    );
    expect(() =>
      assertWorkspaceWithinLimit({ text: 'a'.repeat(COST_POLICY.maxWorkspaceBytes) }),
    ).toThrow('preservados');
  });
  it('preserva histórico e revisão quando o limite é ultrapassado', async () => {
    const w = emptyWorkspace();
    w.preferences.name = 'Histórico preservado';
    await saveWorkspace(w, 0);
    const oversized = { ...w, extra: 'a'.repeat(COST_POLICY.maxWorkspaceBytes) };
    await expect(saveWorkspace(oversized, 1)).rejects.toThrow('12 MiB');
    const loaded = await loadWorkspace();
    expect(loaded.revision).toBe(1);
    expect(loaded.data.preferences.name).toBe('Histórico preservado');
  });
  it('não usa IndexedDB como substituto silencioso de uma operação remota bloqueada', async () => {
    const initial = await loadWorkspace();
    await expect(saveWorkspace(emptyWorkspace(), 0, 'remote-user')).rejects.toThrow('bloqueadas');
    await expect(loadWorkspace('remote-user')).rejects.toThrow('bloqueadas');
    expect((await loadWorkspace()).revision).toBe(initial.revision);
  });
});
