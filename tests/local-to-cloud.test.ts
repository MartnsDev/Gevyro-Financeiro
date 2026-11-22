import { beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyWorkspace } from '../src/domain/types';
const mocks = vi.hoisted(() => ({ read: vi.fn(), remove: vi.fn(), load: vi.fn(), save: vi.fn() }));
vi.mock('../src/lib/storage', () => ({ loadWorkspace: mocks.load, saveWorkspace: mocks.save }));
vi.mock('../src/lib/legacy-storage', async (original) => ({
  ...(await original<typeof import('../src/lib/legacy-storage')>()),
  readLegacyWorkspace: mocks.read,
  removeVerifiedLegacy: mocks.remove,
}));
import { copyLocalWorkspaceToCloud } from '../src/lib/local-to-cloud';
function previous() {
  const w = emptyWorkspace();
  w.accounts = [
    {
      id: 'a',
      name: 'Histórico anterior',
      institution: '',
      type: 'digital',
      opening: 10000,
      openingDate: '2020-01-01',
      color: '#059669',
    },
  ];
  return w;
}
beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
});
describe('Migração verificada do histórico antigo', () => {
  it('remove a cópia antiga somente após gravar e reler a mesma conta', async () => {
    const source = previous();
    const before = JSON.stringify(source);
    mocks.read.mockResolvedValue({ data: source, revision: 3 });
    mocks.load
      .mockResolvedValueOnce({ data: emptyWorkspace(), revision: 0 })
      .mockImplementation(async () => ({ data: mocks.save.mock.calls[0][0], revision: 1 }));
    mocks.save.mockResolvedValue(1);
    await copyLocalWorkspaceToCloud('user');
    expect(mocks.remove).toHaveBeenCalledWith({ data: source, revision: 3 });
    expect(mocks.load.mock.calls).toEqual([['user'], ['user']]);
    expect(JSON.stringify(source)).toBe(before);
  });
  it('preserva ambos os históricos quando a conta já tem dados', async () => {
    mocks.read.mockResolvedValue({ data: previous(), revision: 1 });
    mocks.load.mockResolvedValue({ data: previous(), revision: 1 });
    await expect(copyLocalWorkspaceToCloud('user')).rejects.toThrow('preservar');
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it('não remove dados quando há erro de rede ou divergência na conferência', async () => {
    mocks.read.mockResolvedValue({ data: previous(), revision: 1 });
    mocks.load.mockResolvedValue({ data: emptyWorkspace(), revision: 0 });
    mocks.save.mockRejectedValueOnce(new Error('network'));
    await expect(copyLocalWorkspaceToCloud('user')).rejects.toThrow('network');
    expect(mocks.remove).not.toHaveBeenCalled();
    mocks.save.mockResolvedValue(1);
    await expect(copyLocalWorkspaceToCloud('user')).rejects.toThrow('conferir');
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it('exige conta e histórico anterior sem criar base local nova', async () => {
    await expect(copyLocalWorkspaceToCloud('')).rejects.toThrow('Entre');
    expect(mocks.read).not.toHaveBeenCalled();
    mocks.read.mockResolvedValue(null);
    await expect(copyLocalWorkspaceToCloud('user')).rejects.toThrow('Não há');
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
