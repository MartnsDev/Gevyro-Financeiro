import { openDB } from 'idb';
import { workspaceSchema } from '@/domain/validation';
import type { Stored } from './storage';
// Recovery only. Never create a database or write a workspace in this browser.
async function openLegacy() {
  return openDB('gevyro-financas-v1', 1, {
    upgrade(_db, _old, _next, tx) {
      void tx.done.catch(() => undefined);
      tx.abort();
    },
  });
}
export async function readLegacyWorkspace(): Promise<Stored | null> {
  if (typeof indexedDB === 'undefined') return null;
  let db;
  try {
    db = await openLegacy();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return null;
    throw error;
  }
  try {
    if (!db.objectStoreNames.contains('workspaces')) return null;
    const stored = await db.get('workspaces', 'local');
    return stored ? { data: workspaceSchema.parse(stored.data), revision: stored.revision } : null;
  } finally {
    db.close();
  }
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) {
    const items = value.every((v) => v && typeof v === 'object' && 'id' in v)
      ? [...value].sort((a, b) => String(a.id).localeCompare(String(b.id)))
      : value;
    return '[' + items.map(canonical).join(',') + ']';
  }
  if (value && typeof value === 'object')
    return (
      '{' +
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => JSON.stringify(k) + ':' + canonical(v))
        .join(',') +
      '}'
    );
  return JSON.stringify(value);
}
export function sameWorkspace(a: unknown, b: unknown) {
  return canonical(a) === canonical(b);
}
export async function removeVerifiedLegacy(snapshot: Stored): Promise<void> {
  const db = await openLegacy();
  const tx = db.transaction('workspaces', 'readwrite');
  try {
    const current = await tx.store.get('local');
    if (
      current &&
      (current.revision !== snapshot.revision ||
        !sameWorkspace(workspaceSchema.parse(current.data), snapshot.data))
    ) {
      throw new Error(
        'A cópia na nuvem foi confirmada, mas outra aba alterou o histórico antigo. Esse histórico foi preservado para recuperação.',
      );
    }
    await tx.store.delete('local');
    await tx.done;
  } finally {
    db.close();
  }
}
