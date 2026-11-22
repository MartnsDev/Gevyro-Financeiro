// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
vi.mock('../src/lib/supabase', () => ({ supabase: null }));
import FinanceApp from '../src/components/finance-app';
afterEach(cleanup);
it('sem nuvem configurada bloqueia os controles financeiros sem abrir armazenamento local', () => {
  const open = vi.spyOn(indexedDB, 'open');
  render(<FinanceApp />);
  expect(screen.getByText(/Novos registros estão indisponíveis/)).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Nova movimentação' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Continuar no modo local' })).toBeNull();
  expect(open).not.toHaveBeenCalled();
  open.mockRestore();
});
