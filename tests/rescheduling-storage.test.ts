import { beforeEach, expect, it } from 'vitest';
import { cloudMock, cloudUserId, resetCloud } from './helpers/cloud';
import { loadWorkspace, saveWorkspace } from '../src/lib/storage';
import { editOccurrence } from '../src/domain/operations';
import { status } from '../src/domain/finance';
import { rescheduledId, reschedulingWorkspace } from './fixtures/rescheduling';
beforeEach(resetCloud);
it('envia a nova data da parcela ao RPC e recupera dezembro em uma leitura independente', async () => {
  const original = reschedulingWorkspace();
  await saveWorkspace(original, 0, cloudUserId);
  const firstDevice = await loadWorkspace(cloudUserId),
    o = firstDevice.data.obligations.find((o) => o.id === rescheduledId)!;
  const updated = editOccurrence(firstDevice.data, o.id, {
    name: o.name,
    amount: o.amount,
    date: '2026-12-05',
  });
  await saveWorkspace(updated, firstDevice.revision, cloudUserId);
  const secondDevice = await loadWorkspace(cloudUserId),
    saved = secondDevice.data.obligations.find((o) => o.id === rescheduledId)!;
  expect(saved.date).toBe('2026-12-05');
  expect(status(secondDevice.data, saved, '2026-11-22')).toBe('pending');
  expect(secondDevice.revision).toBe(2);
  expect(secondDevice.data.payments).toEqual(original.payments);
  expect(secondDevice.data.plans).toEqual(original.plans);
  expect(cloudMock.rpc).toHaveBeenCalledWith(
    'gevyro_save_workspace',
    expect.objectContaining({
      p_revision: 1,
      p_workspace: expect.objectContaining({
        obligations: expect.arrayContaining([
          expect.objectContaining({ id: rescheduledId, date: '2026-12-05' }),
        ]),
      }),
    }),
  );
});
