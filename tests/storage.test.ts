import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cloudMock, cloudUserId, resetCloud } from './helpers/cloud';
import { loadWorkspace, saveWorkspace } from '../src/lib/storage';
import { emptyWorkspace } from '../src/domain/types';
beforeEach(resetCloud);
describe('Supabase como fonte única dos dados', () => {
  it('exige sessão e não abre o banco do navegador', async () => {
    const open = vi.spyOn(indexedDB, 'open');
    await expect(loadWorkspace()).rejects.toThrow('Entre');
    await expect(saveWorkspace(emptyWorkspace(), 0)).rejects.toThrow('Entre');
    expect(open).not.toHaveBeenCalled();
    expect(cloudMock.rpc).not.toHaveBeenCalled();
    open.mockRestore();
  });
  it('recupera os mesmos dados e revisão em leituras independentes', async () => {
    const w = emptyWorkspace();
    w.preferences.name = 'Conta compartilhada';
    await saveWorkspace(w, 0, cloudUserId);
    const deviceA = await loadWorkspace(cloudUserId);
    const deviceB = await loadWorkspace(cloudUserId);
    expect(deviceA).toEqual(deviceB);
    expect(deviceB.data.preferences.name).toBe('Conta compartilhada');
    expect(deviceB.revision).toBe(1);
  });
  it('duas gravações na mesma revisão não sobrescrevem uma à outra', async () => {
    const a = emptyWorkspace();
    a.preferences.name = 'Dispositivo A';
    const b = emptyWorkspace();
    b.preferences.name = 'Dispositivo B';
    const results = await Promise.allSettled([
      saveWorkspace(a, 0, cloudUserId),
      saveWorkspace(b, 0, cloudUserId),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
    expect((await loadWorkspace(cloudUserId)).data.preferences.name).toBe('Dispositivo A');
  });
  it('não cria cópia nem fila local quando o servidor recusa uma gravação', async () => {
    const open = vi.spyOn(indexedDB, 'open');
    cloudMock.rpc.mockResolvedValue({ data: null, error: { message: 'network failure' } });
    await expect(saveWorkspace(emptyWorkspace(), 0, cloudUserId)).rejects.toThrow('Nenhuma cópia');
    expect(cloudMock.rows.size).toBe(0);
    expect(open).not.toHaveBeenCalled();
    open.mockRestore();
  });
  it('não envia documento inválido e não acessa dados de uma sessão diferente', async () => {
    const invalid = emptyWorkspace();
    invalid.preferences.payday = 40;
    await expect(saveWorkspace(invalid, 0, cloudUserId)).rejects.toThrow();
    await expect(loadWorkspace('outro-usuario')).rejects.toThrow('sessão');
    expect(cloudMock.rpc).not.toHaveBeenCalled();
  });
  it('não anuncia sucesso com resposta sem revisão confirmada', async () => {
    cloudMock.rpc.mockResolvedValue({ data: null, error: null });
    await expect(saveWorkspace(emptyWorkspace(), 0, cloudUserId)).rejects.toThrow('confirmada');
  });
});
