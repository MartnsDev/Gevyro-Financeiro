// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CostSafetyPanel } from '../src/components/cost-safety-panel';
import { emptyWorkspace } from '../src/domain/types';
afterEach(cleanup);
it('oferece backups explícitos e não solicita persistência financeira no navegador', () => {
  const backup = vi.fn();
  render(<CostSafetyPanel workspace={emptyWorkspace()} onBackup={backup} />);
  fireEvent.click(screen.getByRole('button', { name: 'Backup completo JSON' }));
  fireEvent.click(screen.getByRole('button', { name: 'Backup completo CSV' }));
  expect(backup.mock.calls).toEqual([['json'], ['csv']]);
  expect(screen.getByText('Somente Supabase')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Solicitar persistência no navegador' })).toBeNull();
  expect(screen.getByText(/Sem conexão, não há fila ou gravação local/)).toBeTruthy();
});
