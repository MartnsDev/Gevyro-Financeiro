// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { emptyWorkspace } from '../src/domain/types';
import { CostSafetyPanel } from '../src/components/cost-safety-panel';
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  Object.defineProperty(navigator, 'storage', { configurable: true, value: undefined });
});
it('oferece os dois backups completos e não inventa consumo de hospedagem', () => {
  const backup = vi.fn();
  render(<CostSafetyPanel workspace={emptyWorkspace()} onBackup={backup} />);
  fireEvent.click(screen.getByRole('button', { name: 'Backup completo JSON' }));
  fireEvent.click(screen.getByRole('button', { name: 'Backup completo CSV' }));
  expect(backup.mock.calls).toEqual([['json'], ['csv']]);
  expect(screen.getByText('Não disponíveis')).toBeTruthy();
  expect(screen.getByText('Serviços externos bloqueados')).toBeTruthy();
});
it('consulta medidas reais do navegador somente após ação do usuário', async () => {
  const estimate = vi.fn().mockResolvedValue({ usage: 1024, quota: 10485760 });
  const persisted = vi.fn().mockResolvedValue(false);
  Object.defineProperty(navigator, 'storage', {
    configurable: true,
    value: { estimate, persisted },
  });
  render(<CostSafetyPanel workspace={emptyWorkspace()} onBackup={vi.fn()} />);
  expect(estimate).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Verificar armazenamento local' }));
  await screen.findByText('Uso estimado da origem inteira');
  expect(estimate).toHaveBeenCalledOnce();
  expect(screen.getByText('Não concedida')).toBeTruthy();
});
it('recusa de persistência gera informação honesta e preserva os dados', async () => {
  Object.defineProperty(navigator, 'storage', {
    configurable: true,
    value: {
      estimate: vi.fn().mockResolvedValue({ usage: 100 }),
      persist: vi.fn().mockResolvedValue(false),
    },
  });
  const w = emptyWorkspace();
  const before = JSON.stringify(w);
  render(<CostSafetyPanel workspace={w} onBackup={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Solicitar persistência no navegador' }));
  await screen.findByText(/não concedeu persistência/);
  expect(JSON.stringify(w)).toBe(before);
});
