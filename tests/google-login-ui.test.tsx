// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
const { oauth } = vi.hoisted(() => ({ oauth: vi.fn().mockResolvedValue({ error: null }) }));
vi.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signInWithOAuth: oauth,
    },
  },
}));
vi.mock('../src/components/charts', () => ({
  FlowChart: () => <div />,
  CategoryChart: () => <div />,
}));
import FinanceApp from '../src/components/finance-app';
afterEach(cleanup);
it('oferece somente Google no modal e inicia OAuth sem pedir senha', async () => {
  render(<FinanceApp />);
  await screen.findByRole('button', { name: 'Entrar com Google' });
  const dialog = screen.getByRole('main');
  expect(screen.queryByRole('button', { name: 'Nova movimentação' })).toBeNull();
  expect(within(dialog).queryByLabelText('Senha')).toBeNull();
  expect(within(dialog).queryByLabelText('Email')).toBeNull();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Entrar com Google' }));
  await waitFor(() => expect(oauth).toHaveBeenCalledOnce());
  expect(oauth.mock.calls[0][0].provider).toBe('google');
});
