import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { loadWorkspace, saveWorkspace } from '../src/lib/storage';
import { emptyWorkspace } from '../src/domain/types';
describe('Persistência local atômica', () => {
  it('persiste uma gravação e recupera em uma nova leitura', async () => {
    const initial = await loadWorkspace();
    expect(initial.revision).toBe(0);
    const w = emptyWorkspace();
    w.preferences.name = 'Matheus';
    const revision = await saveWorkspace(w, 0);
    expect(revision).toBe(1);
    const reloaded = await loadWorkspace();
    expect(reloaded.data.preferences.name).toBe('Matheus');
    expect(reloaded.revision).toBe(1);
  });
  it('rejeita revisão antiga e preserva o dado já gravado', async () => {
    const stale = emptyWorkspace();
    stale.preferences.name = 'Sobrescrito';
    await expect(saveWorkspace(stale, 0)).rejects.toThrow('Outra aba');
    const reloaded = await loadWorkspace();
    expect(reloaded.data.preferences.name).toBe('Matheus');
  });
  it('erro de validação não grava um estado inválido', async () => {
    const before = await loadWorkspace();
    const invalid = structuredClone(before.data);
    invalid.preferences.payday = 40;
    await expect(saveWorkspace(invalid, before.revision)).rejects.toThrow();
    expect((await loadWorkspace()).revision).toBe(before.revision);
  });
  it('duas gravações concorrentes permitem apenas um vencedor', async () => {
    const initial = await loadWorkspace();
    const one = structuredClone(initial.data);
    const two = structuredClone(initial.data);
    one.preferences.name = 'A';
    two.preferences.name = 'B';
    const results = await Promise.allSettled([
      saveWorkspace(one, initial.revision),
      saveWorkspace(two, initial.revision),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
    expect((await loadWorkspace()).revision).toBe(initial.revision + 1);
  });
});
