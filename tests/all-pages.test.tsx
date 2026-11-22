// @vitest-environment jsdom
import { cloudUserId } from './helpers/cloud';
import React from 'react';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import FinanceApp from '../src/components/finance-app';
import { emptyWorkspace } from '../src/domain/types';
import { occurrences, today } from '../src/domain/finance';
import { loadWorkspace, saveWorkspace } from '../src/lib/storage';
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
it('abre todos os módulos com registros reais de teste e persiste movimento, pausa e leitura', async () => {
  const w = emptyWorkspace();
  w.preferences.onboarding = true;
  w.accounts = [
    {
      id: 'a',
      name: 'Conta de teste',
      institution: '',
      type: 'digital',
      opening: 100000,
      openingDate: '2020-01-01',
      color: '#059669',
    },
  ];
  w.cards = [
    {
      id: 'c',
      name: 'Cartão de teste',
      limit: 100000,
      closing: 5,
      due: 12,
      accountId: 'a',
      last4: '1234',
    },
  ];
  w.plans = [
    {
      id: 'p',
      name: 'Internet de teste',
      amount: 10000,
      kind: 'expense',
      category: 'Assinaturas',
      accountId: 'a',
      cardId: '',
      date: today(),
      mode: 'recurring',
      count: 1,
      interval: 1,
      unit: 'month',
      end: '',
      notes: '',
      subscription: true,
    },
  ];
  w.obligations = occurrences(w.plans[0]);
  w.goals = [
    {
      id: 'g',
      name: 'Reserva de teste',
      target: 100000,
      reserved: 10000,
      monthly: 1000,
      date: '2028-01-01',
    },
  ];
  w.assets = [
    {
      id: 'i',
      name: 'Investimento de teste',
      type: 'investment',
      cost: 20000,
      value: 21000,
      date: today(),
      notes: '',
    },
  ];
  w.budgets = [{ id: 'b', category: 'Assinaturas', amount: 20000, month: today().slice(0, 7) }];
  await saveWorkspace(w, 0, cloudUserId);
  render(<FinanceApp />);
  await waitFor(() =>
    expect(
      (screen.getByRole('button', { name: 'Nova movimentação' }) as HTMLButtonElement).disabled,
    ).toBe(false),
  );
  for (const label of [
    'Movimentações',
    'Contas e carteiras',
    'Cartões de crédito',
    'Parcelamentos',
    'Assinaturas',
    'Calendário',
    'Planejamento',
    'Orçamentos',
    'Metas financeiras',
    'Investimentos',
    'Patrimônio e dívidas',
    'Relatórios',
    'Importar e exportar',
    'Central de ajuda',
    'Configurações',
    'Aportes e ajustes',
  ]) {
    fireEvent.click(screen.getByRole('button', { name: label }));
    expect(document.querySelector('main h1')?.textContent).toBeTruthy();
  }
  fireEvent.click(screen.getAllByRole('button', { name: 'Registrar movimento' })[0]);
  let dialog = screen.getByRole('dialog');
  fireEvent.change(within(dialog).getByLabelText('Valor (R$)'), { target: { value: '123.45' } });
  fireEvent.change(within(dialog).getByLabelText('Motivo ou comprovante textual'), {
    target: { value: 'Conciliação conferida' },
  });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar movimento' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect((await loadWorkspace(cloudUserId)).data.events[0].amount).toBe(12345);
  fireEvent.click(screen.getByRole('button', { name: 'Assinaturas' }));
  fireEvent.click(screen.getByRole('button', { name: 'Pausar' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Retomar' })).toBeTruthy());
  expect((await loadWorkspace(cloudUserId)).data.plans[0].pausedFrom).toBe(today());
  fireEvent.click(screen.getByRole('button', { name: 'Retomar' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Pausar' })).toBeTruthy());
  fireEvent.click(screen.getByRole('button', { name: 'Notificações' }));
  dialog = screen.getByRole('dialog');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Marcar como lida' }));
  await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Lida' })).toBeTruthy());
  expect((await loadWorkspace(cloudUserId)).data.notifications.some((n) => n.read)).toBe(true);
  fireEvent.click(within(dialog).getByRole('button', { name: 'Fechar' }));
  fireEvent.click(screen.getByRole('button', { name: 'Configurações' }));
  fireEvent.click(screen.getByRole('button', { name: 'Arquivar categoria Assinaturas' }));
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Reativar categoria Assinaturas' })).toBeTruthy(),
  );
  const archived = await loadWorkspace(cloudUserId);
  expect(archived.data.preferences.archivedCategories).toContain('Assinaturas');
  expect(archived.data.obligations.some((o) => o.category === 'Assinaturas')).toBe(true);
}, 20000);
