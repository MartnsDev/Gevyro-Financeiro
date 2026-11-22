import { beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyWorkspace } from '../src/domain/types';
const { load, save } = vi.hoisted(() => ({ load: vi.fn(), save: vi.fn() }));
vi.mock('../src/lib/storage', () => ({ loadWorkspace: load, saveWorkspace: save }));
import { copyLocalWorkspaceToCloud } from '../src/lib/local-to-cloud';
function local() {
  const w = emptyWorkspace();
  w.accounts = [
    {
      id: 'a',
      name: 'Conta local',
      institution: '',
      type: 'digital',
      opening: 100000,
      openingDate: '2020-01-01',
      color: '#059669',
    },
  ];
  return w;
}
beforeEach(() => {
  load.mockReset();
  save.mockReset();
});
describe('Cópia explícita e preservação dos dados locais', () => {
  it('copia para uma conta nova sem apagar o original', async () => {
    const source = local();
    const before = JSON.stringify(source);
    load.mockImplementation(async (user?: string) =>
      user ? { data: emptyWorkspace(), revision: 0 } : { data: source, revision: 3 },
    );
    save.mockResolvedValue(1);
    await copyLocalWorkspaceToCloud('user');
    expect(save).toHaveBeenCalledOnce();
    expect(save.mock.calls[0][0].accounts).toEqual(source.accounts);
    expect(save.mock.calls[0][1]).toBe(0);
    expect(save.mock.calls[0][2]).toBe('user');
    expect(JSON.stringify(source)).toBe(before);
  });
  it('recusa sobrescrever um espaço remoto existente', async () => {
    load.mockImplementation(async () => ({ data: local(), revision: 1 }));
    await expect(copyLocalWorkspaceToCloud('user')).rejects.toThrow('preservar');
    expect(save).not.toHaveBeenCalled();
  });
  it('erro de rede ou conflito não apaga nem altera registros locais', async () => {
    const source = local();
    const before = JSON.stringify(source);
    load.mockImplementation(async (user?: string) =>
      user ? { data: emptyWorkspace(), revision: 0 } : { data: source, revision: 3 },
    );
    save.mockRejectedValue(new Error('revision_conflict'));
    await expect(copyLocalWorkspaceToCloud('user')).rejects.toThrow('revision_conflict');
    expect(JSON.stringify(source)).toBe(before);
    expect(save).toHaveBeenCalledOnce();
  });
  it('exige sessão e não inicia cópias vazias', async () => {
    await expect(copyLocalWorkspaceToCloud('')).rejects.toThrow('Entre');
    expect(load).not.toHaveBeenCalled();
    load.mockResolvedValue({ data: emptyWorkspace(), revision: 0 });
    await expect(copyLocalWorkspaceToCloud('user')).rejects.toThrow('Não há');
    expect(save).not.toHaveBeenCalled();
  });
});
