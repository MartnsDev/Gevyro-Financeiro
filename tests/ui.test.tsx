// @vitest-environment jsdom
import { cloudUserId } from './helpers/cloud';
import React from 'react';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import FinanceApp from '../src/components/finance-app';
import { loadWorkspace } from '../src/lib/storage';
vi.mock('../src/components/charts', () => ({
  FlowChart: () => <div>Gráfico financeiro</div>,
  CategoryChart: () => <div>Gráfico por categoria</div>,
}));
beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  HTMLElement.prototype.scrollIntoView = () => {};
});
afterEach(cleanup);
it('cadastra conta, registra despesa paga e preserva o saldo após remontar', async () => {
  const view = render(<FinanceApp />);
  await screen.findByRole('button', { name: 'Nova movimentação' });
  await waitFor(() =>
    expect(
      (screen.getByRole('button', { name: 'Nova movimentação' }) as HTMLButtonElement).disabled,
    ).toBe(false),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Contas e carteiras' }));
  fireEvent.click(screen.getByRole('button', { name: 'Nova conta' }));
  let dialog = screen.getByRole('dialog');
  fireEvent.change(within(dialog).getByLabelText('Nome'), { target: { value: 'Conta principal' } });
  fireEvent.change(within(dialog).getByLabelText('Saldo inicial (R$)'), {
    target: { value: '1000' },
  });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect((await loadWorkspace(cloudUserId)).data.accounts[0].opening).toBe(100000);
  fireEvent.click(screen.getByRole('button', { name: 'Visão geral' }));
  fireEvent.click(screen.getByRole('button', { name: 'Nova movimentação' }));
  dialog = screen.getByRole('dialog');
  fireEvent.change(within(dialog).getByLabelText('Descrição'), {
    target: { value: 'Mercado da semana' },
  });
  fireEvent.change(within(dialog).getByLabelText(/Valor/), { target: { value: '180,50' } });
  fireEvent.click(within(dialog).getByLabelText(/Pago hoje/));
  fireEvent.click(within(dialog).getByRole('button', { name: 'Adicionar movimentação' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  const saved = await loadWorkspace(cloudUserId);
  expect(saved.data.obligations[0].amount).toBe(18050);
  expect(saved.data.payments).toHaveLength(1);
  view.unmount();
  render(<FinanceApp />);
  await waitFor(() =>
    expect(screen.getByRole('button', { name: /Saldo disponível/ }).textContent).toContain(
      '819,50',
    ),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Usar tema escuro' }));
  await waitFor(() => expect(document.documentElement.classList.contains('dark')).toBe(true));
  fireEvent.click(screen.getByRole('button', { name: 'Ocultar valores' }));
  expect(screen.getByRole('button', { name: /Saldo disponível/ }).textContent).toContain('•••••');
});
