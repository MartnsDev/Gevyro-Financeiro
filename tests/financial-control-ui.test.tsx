// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { InvestmentPanel } from '../src/components/investment-panel';
import { OccurrenceControl, PurchaseDialog } from '../src/components/installment-control';
import { emptyWorkspace, type Workspace } from '../src/domain/types';
import { occurrences, today } from '../src/domain/finance';
vi.mock('../src/components/charts', () => ({
  FlowChart: () => <div>Gráfico de evolução</div>,
  CategoryChart: () => <div>Gráfico por classe</div>,
}));
const commit = vi
  .fn<(w: Workspace, action: string) => Promise<void>>()
  .mockResolvedValue(undefined);
beforeAll(() => {
  HTMLElement.prototype.scrollIntoView = () => {};
});
afterEach(() => {
  cleanup();
  commit.mockClear();
});
function setup() {
  const w = emptyWorkspace();
  w.accounts = [
    {
      id: 'a',
      name: 'Conta teste',
      institution: '',
      opening: 100000,
      openingDate: '2020-01-01',
      type: 'digital',
      color: '#059669',
    },
  ];
  w.assets = [
    {
      id: 'i',
      name: 'Ação teste',
      classification: 'Ações',
      type: 'investment',
      value: 0,
      cost: 0,
      date: '2020-01-01',
      notes: '',
    },
  ];
  w.plans = [
    {
      id: 'p',
      name: 'Compra teste',
      amount: 10000,
      kind: 'expense',
      category: 'Compras',
      accountId: 'a',
      cardId: '',
      date: '2024-01-10',
      mode: 'installment',
      count: 10,
      interval: 1,
      unit: 'month',
      end: '',
      notes: '',
      subscription: false,
    },
  ];
  w.obligations = occurrences(w.plans[0]);
  return w;
}
it('formulário registra compra com unidades, taxas e impostos sem despesa', async () => {
  const w = setup();
  render(
    <InvestmentPanel
      w={w}
      busy={false}
      hidden={false}
      commit={commit}
      onEdit={() => {}}
      onNew={() => {}}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Operação' }));
  const d = within(screen.getByRole('dialog'));
  fireEvent.change(d.getByLabelText('Operação'), { target: { value: 'buy' } });
  fireEvent.change(d.getByLabelText('Valor financeiro (R$)'), { target: { value: '350' } });
  fireEvent.change(d.getByLabelText('Quantidade'), { target: { value: '10' } });
  fireEvent.change(d.getByLabelText('Preço unitário (R$)'), { target: { value: '35' } });
  fireEvent.change(d.getByLabelText('Taxas (R$)'), { target: { value: '1' } });
  fireEvent.click(d.getByRole('button', { name: 'Confirmar operação' }));
  await waitFor(() => expect(commit).toHaveBeenCalledTimes(1));
  const saved = commit.mock.calls[0][0];
  expect(saved.assets[0]).toMatchObject({ value: 35000, cost: 35100, quantity: '10' });
  expect(saved.events[0].investment?.cash).toBe(-35100);
  expect(saved.payments).toHaveLength(0);
});
it('edita só um vencimento e observações na interface', async () => {
  const w = setup();
  render(
    <OccurrenceControl
      w={w}
      o={w.obligations[3]}
      busy={false}
      commit={commit}
      onClose={() => {}}
    />,
  );
  fireEvent.change(screen.getByLabelText('Vencimento'), { target: { value: '2027-03-15' } });
  fireEvent.change(screen.getByLabelText('Observações'), { target: { value: 'Data corrigida' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar edição desta parcela' }));
  await waitFor(() => expect(commit).toHaveBeenCalledTimes(1));
  const saved = commit.mock.calls[0][0];
  expect(saved.obligations[3]).toMatchObject({
    date: '2027-03-15',
    originalDate: '2024-04-10',
    notes: 'Data corrigida',
  });
  expect(saved.obligations[4]).toEqual(w.obligations[4]);
});
it('seleção múltipla paga apenas parcelas escolhidas', async () => {
  const w = setup();
  render(
    <PurchaseDialog
      w={w}
      planId="p"
      busy={false}
      hidden={false}
      commit={commit}
      onClose={() => {}}
      onDetail={() => {}}
    />,
  );
  const d = within(screen.getByRole('dialog'));
  fireEvent.click(d.getByLabelText('Selecionar parcela 8'));
  fireEvent.click(d.getByLabelText('Selecionar parcela 9'));
  fireEvent.click(d.getByRole('button', { name: 'Confirmar pagamento das selecionadas' }));
  await waitFor(() => expect(commit).toHaveBeenCalledTimes(1));
  expect(commit.mock.calls[0][0].payments.map((p) => p.obligationId)).toEqual(['p:8', 'p:9']);
  expect(commit.mock.calls[0][0].payments[0].date).toBe(today());
});

import { JournalHistory } from '../src/components/journal-dialog';
import { addFinancialEvent } from '../src/domain/journal';
it('corrige ajuste pela interface com estorno vinculado e novo movimento', async () => {
  const w = addFinancialEvent(setup(), {
    id: 'adjust',
    kind: 'balance_adjustment',
    targetId: 'a',
    accountId: 'a',
    amount: 1000,
    fee: 0,
    date: '2024-01-01',
    note: 'Conciliação de saldo',
  });
  render(<JournalHistory w={w} commit={commit} />);
  fireEvent.click(screen.getByRole('button', { name: 'Corrigir movimento' }));
  const d = within(screen.getByRole('dialog'));
  fireEvent.change(d.getByLabelText('Valor corrigido (R$)'), { target: { value: '20' } });
  fireEvent.click(d.getByRole('button', { name: 'Confirmar correção' }));
  await waitFor(() => expect(commit).toHaveBeenCalledTimes(1));
  const saved = commit.mock.calls[0][0];
  expect(saved.events).toHaveLength(3);
  expect(saved.events[1]).toMatchObject({ amount: -1000, reversalOf: 'adjust' });
  expect(saved.events[2].amount).toBe(2000);
});
