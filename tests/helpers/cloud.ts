import { vi } from 'vitest';
import type { User } from '@supabase/supabase-js';
import type { Workspace } from '../../src/domain/types';
const state = vi.hoisted(() => ({
  user: {
    id: 'test-cloud-user',
    email: 'test@example.test',
    app_metadata: { provider: 'google', providers: ['google'] },
  } as User | null,
  rows: new Map<string, { workspace: Workspace; revision: number }>(),
  rpc: vi.fn(),
  listeners: new Set<(event: string, session: unknown) => void>(),
}));
vi.mock('../../src/lib/cost-policy', async (original) => ({
  ...(await original<typeof import('../../src/lib/cost-policy')>()),
  assertRemoteAllowed: vi.fn(),
}));
vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({
        data: { session: state.user ? { user: state.user } : null },
        error: null,
      }),
      getUser: async () => ({ data: { user: state.user }, error: null }),
      onAuthStateChange: (callback: (event: string, session: unknown) => void) => {
        state.listeners.add(callback);
        return {
          data: {
            subscription: {
              unsubscribe() {
                state.listeners.delete(callback);
              },
            },
          },
        };
      },
      signOut: async () => {
        state.user = null;
        for (const cb of state.listeners) cb('SIGNED_OUT', null);
        return { error: null };
      },
    },
    rpc: state.rpc,
  },
}));
export const cloudMock = state;
export const cloudUserId = 'test-cloud-user';
export function resetCloud() {
  state.user = {
    id: cloudUserId,
    email: 'test@example.test',
    app_metadata: { provider: 'google', providers: ['google'] },
  } as User;
  state.rows.clear();
  state.rpc.mockReset();
  state.rpc.mockImplementation(
    async (name: string, args?: { p_workspace: Workspace; p_revision: number }) => {
      if (!state.user) return { data: null, error: { message: 'authentication_required' } };
      const id = state.user.id;
      const row = state.rows.get(id);
      if (name === 'gevyro_load_workspace')
        return { data: row ? structuredClone(row) : null, error: null };
      if (name === 'gevyro_save_workspace' && args) {
        if ((row?.revision ?? 0) !== args.p_revision)
          return { data: null, error: { message: 'revision_conflict' } };
        const revision = args.p_revision + 1;
        state.rows.set(id, { workspace: structuredClone(args.p_workspace), revision });
        return { data: revision, error: null };
      }
      throw new Error('RPC inesperado');
    },
  );
}
resetCloud();
