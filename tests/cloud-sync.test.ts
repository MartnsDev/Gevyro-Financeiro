// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyWorkspace } from '../src/domain/types';
const load = vi.hoisted(() => vi.fn());
vi.mock('../src/lib/storage', () => ({ loadWorkspace: load }));
import { startCloudSync, CLOUD_SYNC_INTERVAL_MS } from '../src/lib/cloud-sync';
let stop: () => void;
beforeEach(() => {
  vi.useFakeTimers();
  load.mockReset();
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
});
afterEach(() => {
  stop?.();
  vi.useRealTimers();
});
function watch(revision = 1) {
  const onData = vi.fn(),
    onError = vi.fn();
  let allowed = true;
  stop = startCloudSync({ userId: 'user', revision, canApply: () => allowed, onData, onError });
  return {
    onData,
    onError,
    pause: () => {
      allowed = false;
    },
  };
}
describe('Atualização entre dispositivos sem cache financeiro', () => {
  it('busca a conta a cada 30 s e aplica revisão mais nova', async () => {
    const data = { data: emptyWorkspace(), revision: 2 };
    load.mockResolvedValue(data);
    const hooks = watch();
    await vi.advanceTimersByTimeAsync(CLOUD_SYNC_INTERVAL_MS);
    expect(load).toHaveBeenCalledWith('user');
    expect(hooks.onData).toHaveBeenCalledWith(data);
  });
  it('atualiza ao retornar à tela ou recuperar conexão', async () => {
    load.mockResolvedValue({ data: emptyWorkspace(), revision: 2 });
    watch();
    window.dispatchEvent(new Event('focus'));
    await vi.runAllTicks();
    await Promise.resolve();
    window.dispatchEvent(new Event('online'));
    await Promise.resolve();
    expect(load).toHaveBeenCalledTimes(2);
  });
  it('não consulta em segundo plano ou durante edição', async () => {
    const hooks = watch();
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    await vi.advanceTimersByTimeAsync(CLOUD_SYNC_INTERVAL_MS);
    expect(load).not.toHaveBeenCalled();
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    hooks.pause();
    window.dispatchEvent(new Event('focus'));
    expect(load).not.toHaveBeenCalled();
  });
  it('descarta resultado atrasado após logout/desmontagem e protege formulário', async () => {
    let finish!: (data: unknown) => void;
    load.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const hooks = watch();
    window.dispatchEvent(new Event('focus'));
    stop();
    finish({ data: emptyWorkspace(), revision: 2 });
    await Promise.resolve();
    expect(hooks.onData).not.toHaveBeenCalled();
  });
  it('descarta resposta iniciada antes de abrir um formulário', async () => {
    let finish!: (data: unknown) => void;
    load.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const hooks = watch();
    window.dispatchEvent(new Event('focus'));
    hooks.pause();
    finish({ data: emptyWorkspace(), revision: 2 });
    await Promise.resolve();
    expect(hooks.onData).not.toHaveBeenCalled();
  });
  it('não substitui uma revisão por outra antiga e informa falha sem salvar localmente', async () => {
    load
      .mockResolvedValueOnce({ data: emptyWorkspace(), revision: 1 })
      .mockRejectedValueOnce(new Error('offline'));
    const hooks = watch();
    await vi.advanceTimersByTimeAsync(CLOUD_SYNC_INTERVAL_MS * 2);
    expect(hooks.onData).not.toHaveBeenCalled();
    expect(hooks.onError).toHaveBeenLastCalledWith(expect.stringContaining('Nenhum registro'));
  });
});
