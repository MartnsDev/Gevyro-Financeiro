// @vitest-environment jsdom
import { cloudMock, cloudUserId, resetCloud } from './helpers/cloud';
import React from 'react';
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import FinanceApp from '../src/components/finance-app';
import { loadWorkspace, saveWorkspace } from '../src/lib/storage';
import { rescheduledId, reschedulingWorkspace } from './fixtures/rescheduling';
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
beforeEach(() => {
  resetCloud();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-22T15:00:00Z'));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
async function openTransactions() {
  await screen.findByRole('button', { name: 'Nova movimentação' });
  fireEvent.click(screen.getByRole('button', { name: 'Movimentações' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Buscar movimentações' }), {
    target: { value: 'Cama Queen Ortobom' },
  });
}
function purchaseRows() {
  return screen.queryAllByRole('row', { name: /Cama Queen Ortobom/ });
}
it('lápis edita a parcela vencida; confirma na nuvem e move todas as telas para dezembro sem recarregar', async () => {
  const original = reschedulingWorkspace();
  await saveWorkspace(original, 0, cloudUserId);
  const view = render(<FinanceApp />);
  await openTransactions();
  expect(purchaseRows()).toHaveLength(1);
  expect(within(purchaseRows()[0]).getByText('Atrasado')).toBeTruthy();
  fireEvent.click(within(purchaseRows()[0]).getByRole('button', { name: 'Editar parcela' }));
  const d = within(screen.getByRole('dialog'));
  expect(d.queryByLabelText('Primeiro vencimento')).toBeNull();
  fireEvent.change(d.getByLabelText('Vencimento'), { target: { value: '2026-12-05' } });
  fireEvent.click(d.getByRole('button', { name: 'Confirmar edição desta parcela' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(purchaseRows()).toHaveLength(0); // search continues to respect November
  const saved = await loadWorkspace(cloudUserId),
    changed = saved.data.obligations.find((o) => o.id === rescheduledId)!;
  expect(changed.date).toBe('2026-12-05');
  expect(changed.originalDate).toBe('2026-11-05');
  expect(saved.data.payments).toEqual(original.payments);
  expect(saved.data.plans).toEqual(original.plans);
  expect(saved.data.obligations.map((o) => o.amount)).toEqual(
    original.obligations.map((o) => o.amount),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Visão geral' }));
  expect(screen.getByText('Despesas pendentes no mês').parentElement?.textContent).toContain(
    '0,00',
  );
  fireEvent.click(screen.getByRole('button', { name: 'Calendário' }));
  expect(purchaseRows()).toHaveLength(0);
  fireEvent.change(screen.getByLabelText('Selecionar mês'), { target: { value: '2026-12' } });
  expect(purchaseRows()).toHaveLength(2);
  expect(within(purchaseRows()[0]).getByText('Pendente')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Parcelamentos' }));
  fireEvent.click(screen.getByRole('button', { name: 'Editar parcelas' }));
  const purchase = within(screen.getByRole('dialog'));
  const movedRow = purchase.getByLabelText('Selecionar parcela 4').closest('tr')!;
  expect(within(movedRow).getByText('2026-12-05')).toBeTruthy();
  expect(within(movedRow).getByText('Pendente')).toBeTruthy();
  view.unmount();
  render(<FinanceApp />);
  await openTransactions();
  expect(purchaseRows()).toHaveLength(0);
  fireEvent.change(screen.getByLabelText('Selecionar mês'), { target: { value: '2026-12' } });
  expect(purchaseRows()).toHaveLength(2);
  expect(screen.queryByText('Atrasado')).toBeNull();
}, 20000);
it('recusa do Supabase mantém o formulário aberto e não simula a mudança de vencimento', async () => {
  const original = reschedulingWorkspace();
  await saveWorkspace(original, 0, cloudUserId);
  render(<FinanceApp />);
  await openTransactions();
  fireEvent.click(within(purchaseRows()[0]).getByRole('button', { name: 'Editar parcela' }));
  const d = within(screen.getByRole('dialog'));
  fireEvent.change(d.getByLabelText('Vencimento'), { target: { value: '2026-12-05' } });
  cloudMock.rpc.mockResolvedValueOnce({ data: null, error: { message: 'network failure' } });
  fireEvent.click(d.getByRole('button', { name: 'Confirmar edição desta parcela' }));
  await waitFor(() =>
    expect(
      (d.getByRole('button', { name: 'Confirmar edição desta parcela' }) as HTMLButtonElement)
        .disabled,
    ).toBe(false),
  );
  expect(screen.getByRole('dialog')).toBeTruthy();
  expect(
    cloudMock.rows.get(cloudUserId)?.workspace.obligations.find((o) => o.id === rescheduledId)
      ?.date,
  ).toBe('2026-11-05');
  expect(cloudMock.rows.get(cloudUserId)?.workspace.payments).toEqual(original.payments);
}, 15000);
