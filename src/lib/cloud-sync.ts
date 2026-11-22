import { loadWorkspace, type Stored } from './storage';
export const CLOUD_SYNC_INTERVAL_MS = 30_000;
export function startCloudSync({
  userId,
  revision,
  canApply,
  onData,
  onError,
}: {
  userId: string;
  revision: number;
  canApply: () => boolean;
  onData: (stored: Stored) => void;
  onError: (message: string) => void;
}) {
  let closed = false;
  let inFlight = false;
  async function check() {
    if (closed || inFlight || document.visibilityState === 'hidden' || !canApply()) return;
    inFlight = true;
    try {
      const data = await loadWorkspace(userId);
      if (closed || !canApply()) return;
      if (data.revision > revision) onData(data);
      onError('');
    } catch {
      if (!closed && canApply())
        onError(
          'Não foi possível atualizar a conta. Verifique sua conexão. Nenhum registro será salvo neste dispositivo.',
        );
    } finally {
      inFlight = false;
    }
  }
  const trigger = () => {
    void check();
  };
  const interval = window.setInterval(trigger, CLOUD_SYNC_INTERVAL_MS);
  window.addEventListener('focus', trigger);
  window.addEventListener('online', trigger);
  document.addEventListener('visibilitychange', trigger);
  return () => {
    closed = true;
    window.clearInterval(interval);
    window.removeEventListener('focus', trigger);
    window.removeEventListener('online', trigger);
    document.removeEventListener('visibilitychange', trigger);
  };
}
