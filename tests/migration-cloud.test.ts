import 'fake-indexeddb/auto';
import { deleteDB, openDB } from 'idb';
import { afterEach, expect, it } from 'vitest';
import { cloudUserId, resetCloud } from './helpers/cloud';
import { emptyWorkspace } from '../src/domain/types';
import { copyLocalWorkspaceToCloud } from '../src/lib/local-to-cloud';
import { readLegacyWorkspace } from '../src/lib/legacy-storage';
import { loadWorkspace } from '../src/lib/storage';
afterEach(() => deleteDB('gevyro-financas-v1'));
it('migra o histórico antigo por RPC e só então remove a cópia do navegador', async () => {
  resetCloud();
  const old = emptyWorkspace();
  old.preferences.name = 'Histórico preservado';
  old.accounts = [
    {
      id: 'account',
      name: 'Conta anterior',
      institution: '',
      opening: 12345,
      openingDate: '2020-01-01',
      type: 'digital',
      color: '#059669',
    },
  ];
  const db = await openDB('gevyro-financas-v1', 1, {
    upgrade(db) {
      db.createObjectStore('workspaces');
    },
  });
  await db.put('workspaces', { data: old, revision: 3 }, 'local');
  db.close();
  await copyLocalWorkspaceToCloud(cloudUserId);
  const anotherDevice = await loadWorkspace(cloudUserId);
  expect(anotherDevice.data.accounts).toEqual(old.accounts);
  expect(anotherDevice.data.preferences.name).toBe('Histórico preservado');
  expect(anotherDevice.revision).toBe(1);
  expect(await readLegacyWorkspace()).toBeNull();
});
