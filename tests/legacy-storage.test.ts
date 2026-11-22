import 'fake-indexeddb/auto';
import { afterEach, expect, it } from 'vitest';
import { deleteDB, openDB } from 'idb';
import { emptyWorkspace } from '../src/domain/types';
import {
  readLegacyWorkspace,
  removeVerifiedLegacy,
  sameWorkspace,
} from '../src/lib/legacy-storage';
afterEach(() => deleteDB('gevyro-financas-v1'));
it('recuperação não cria banco financeiro quando não existe histórico', async () => {
  expect(await readLegacyWorkspace()).toBeNull();
  expect((await indexedDB.databases()).some((d) => d.name === 'gevyro-financas-v1')).toBe(false);
});
it('remove somente a cópia exata conferida e preserva alterações feitas em outra aba', async () => {
  const db = await openDB('gevyro-financas-v1', 1, {
    upgrade(db) {
      db.createObjectStore('workspaces');
    },
  });
  const data = emptyWorkspace();
  data.preferences.name = 'Histórico anterior';
  await db.put('workspaces', { data, revision: 1 }, 'local');
  const snapshot = (await readLegacyWorkspace())!;
  await db.put(
    'workspaces',
    {
      data: { ...data, preferences: { ...data.preferences, name: 'Alterado em outra aba' } },
      revision: 2,
    },
    'local',
  );
  await expect(removeVerifiedLegacy(snapshot)).rejects.toThrow('preservado');
  expect((await readLegacyWorkspace())!.revision).toBe(2);
  const current = (await readLegacyWorkspace())!;
  await removeVerifiedLegacy(current);
  expect(await readLegacyWorkspace()).toBeNull();
  db.close();
});
it('conferência tolera ordem de objetos e registros, mas identifica divergência de valores', () => {
  expect(
    sameWorkspace(
      {
        accounts: [
          { id: 'a', opening: 10 },
          { id: 'b', opening: 20 },
        ],
      },
      {
        accounts: [
          { opening: 20, id: 'b' },
          { opening: 10, id: 'a' },
        ],
      },
    ),
  ).toBe(true);
  expect(sameWorkspace({ opening: 10 }, { opening: 11 })).toBe(false);
});
