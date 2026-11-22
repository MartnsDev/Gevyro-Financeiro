// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { emptyWorkspace } from '../src/domain/types';
const mock = vi.hoisted(() => ({
  load: vi.fn(),
  save: vi.fn(),
  listener: null as null | ((event: string, session: unknown) => void),
}));
const google = {
  id: 'google-a',
  email: 'test@example.test',
  app_metadata: { provider: 'google', providers: ['google'] },
};
vi.mock('../src/lib/storage', () => ({ loadWorkspace: mock.load, saveWorkspace: mock.save }));
vi.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: { user: google } }, error: null }),
      getUser: async () => ({ data: { user: google }, error: null }),
      onAuthStateChange: (listener: typeof mock.listener) => {
        mock.listener = (event, session) => listener!(event, session);
        return { data: { subscription: { unsubscribe() {} } } };
      },
    },
  },
}));
vi.mock('../src/components/charts', () => ({
  FlowChart: () => <div />,
  CategoryChart: () => <div />,
}));
import FinanceApp from '../src/components/finance-app';
afterEach(cleanup);
it('uma gravação iniciada antes do logout não recoloca dados da conta anterior na tela', async () => {
  const cloud = emptyWorkspace();
  cloud.preferences.name = 'Espaço da conta A';
  cloud.preferences.onboarding = true;
  const local = emptyWorkspace();
  local.preferences.name = 'Espaço local';
  local.preferences.onboarding = true;
  mock.load.mockImplementation(async (id?: string) => ({ data: id ? cloud : local, revision: 0 }));
  let finish!: (revision: number) => void;
  mock.save.mockImplementation(
    () =>
      new Promise<number>((resolve) => {
        finish = resolve;
      }),
  );
  render(<FinanceApp />);
  await screen.findByRole('button', { name: /Espaço da conta A Conta sincronizada/ });
  fireEvent.click(screen.getByRole('button', { name: 'Contas e carteiras' }));
  fireEvent.click(screen.getByRole('button', { name: 'Nova conta' }));
  const dialog = screen.getByRole('dialog');
  fireEvent.change(within(dialog).getByLabelText('Nome'), { target: { value: 'Conta privada A' } });
  fireEvent.change(within(dialog).getByLabelText('Saldo inicial (R$)'), {
    target: { value: '100' },
  });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }));
  await waitFor(() => expect(mock.save).toHaveBeenCalledOnce());
  act(() => mock.listener!('SIGNED_OUT', null));
  await screen.findByRole('button', { name: 'Entrar com Google' });
  await act(async () => finish(1));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(screen.queryByText('Conta privada A')).toBeNull();
  expect(screen.queryByRole('button', { name: /Espaço da conta A/ })).toBeNull();
  expect(screen.getByRole('button', { name: 'Entrar com Google' })).toBeTruthy();
});
