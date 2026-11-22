'use client';
import type { FormEvent } from 'react';
import type { Workspace } from '@/domain/types';
import { Button } from './ui/button';
import { today } from '@/domain/finance';
export type ResourceKind =
  | 'account'
  | 'card'
  | 'goal'
  | 'budget'
  | 'asset'
  | 'debt'
  | 'investment'
  | 'transfer'
  | 'scenario'
  | 'category';
export function ResourceForm({
  kind,
  w,
  onSubmit,
  busy,
  initial,
}: {
  kind: ResourceKind;
  w: Workspace;
  onSubmit: (values: Record<string, string>) => Promise<void>;
  busy: boolean;
  initial?: Record<string, string | number>;
}) {
  const input = (name: string, label: string, type = 'text', value?: string | number) => (
    <label>
      {label}
      <input
        name={name}
        type={type}
        defaultValue={initial?.[name] ?? value}
        required={name !== 'notes' && name !== 'institution' && name !== 'last4'}
        min={type === 'number' ? 0 : undefined}
        step={type === 'number' ? '0.01' : undefined}
      />
    </label>
  );
  const select = (name: string, label: string, items: { value: string; label: string }[]) => (
    <label>
      {label}
      <select name={name} defaultValue={initial?.[name]}>
        {items.map((x) => (
          <option value={x.value} key={x.value}>
            {x.label}
          </option>
        ))}
      </select>
    </label>
  );
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await onSubmit(
      Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>,
    );
  }
  return (
    <form className="form" onSubmit={submit}>
      {kind !== 'transfer' &&
        kind !== 'budget' &&
        input('name', kind === 'category' ? 'Nome da categoria' : 'Nome')}
      {kind === 'account' && (
        <>
          {input('institution', 'Instituição (opcional)')}
          {select('type', 'Tipo', [
            { value: 'digital', label: 'Conta digital' },
            { value: 'checking', label: 'Conta corrente' },
            { value: 'savings', label: 'Poupança' },
            { value: 'cash', label: 'Carteira em dinheiro' },
          ])}
          <div className="form-grid">
            {input('opening', 'Saldo inicial (R$)', 'number', 0)}
            {input('openingDate', 'Data do saldo', 'date', today())}
          </div>
          <div className="notice">
            O saldo inicial é uma referência. Após o primeiro lançamento, ele não pode ser alterado
            silenciosamente.
          </div>
        </>
      )}
      {kind === 'card' && (
        <>
          {input('limit', 'Limite total (R$)', 'number', 0)}
          <div className="form-grid">
            {input('closing', 'Dia de fechamento', 'number', 5)}
            {input('due', 'Dia do vencimento', 'number', 12)}
          </div>
          {select(
            'accountId',
            'Conta de pagamento',
            w.accounts.map((a) => ({ value: a.id, label: a.name })),
          )}
          {input('last4', 'Últimos 4 dígitos (opcional)')}
        </>
      )}
      {kind === 'goal' && (
        <>
          <div className="form-grid">
            {input('target', 'Valor alvo (R$)', 'number')}
            {input('reserved', 'Valor reservado (R$)', 'number', 0)}
          </div>
          {input('monthly', 'Contribuição mensal planejada (R$)', 'number', 0)}
          {input('date', 'Data alvo', 'date', today())}
          <div className="notice">
            A reserva reduz o dinheiro livre, sem gerar uma despesa nem alterar o saldo bancário.
          </div>
        </>
      )}
      {kind === 'budget' && (
        <>
          {select(
            'category',
            'Categoria',
            w.categories
              .filter(
                (c) => !w.preferences.archivedCategories?.includes(c) || c === initial?.category,
              )
              .map((c) => ({ value: c, label: c })),
          )}
          {select('perspective', 'Perspectiva', [
            { value: 'accrual', label: 'Competência (vencimentos)' },
            { value: 'cash', label: 'Caixa (pagamentos)' },
          ])}
          {input('amount', 'Limite mensal (R$)', 'number')}
          {input('month', 'Mês de competência', 'month', today().slice(0, 7))}
        </>
      )}
      {['asset', 'debt', 'investment'].includes(kind) && (
        <>
          <div className="form-grid">
            {input(
              'value',
              kind === 'debt' ? 'Saldo devedor (R$)' : 'Avaliação atual (R$)',
              'number',
            )}
            {input(
              'cost',
              kind === 'debt' ? 'Principal contratado (R$)' : 'Custo de aquisição (R$)',
              'number',
              0,
            )}
          </div>
          {input('date', 'Data da avaliação', 'date', today())}
          {input('notes', 'Observações (opcional)')}
          <div className="notice">
            Registro patrimonial manual. A avaliação não movimenta suas contas. Registre os
            movimentos de caixa separadamente.
          </div>
        </>
      )}
      {kind === 'transfer' && (
        <>
          {select(
            'from',
            'Conta de origem',
            w.accounts.map((a) => ({ value: a.id, label: a.name })),
          )}
          {select(
            'to',
            'Conta de destino',
            w.accounts.map((a) => ({ value: a.id, label: a.name })),
          )}
          <div className="form-grid">
            {input('amount', 'Valor (R$)', 'number')}
            {input('fee', 'Tarifa (R$)', 'number', 0)}
          </div>
          {input('date', 'Data efetiva', 'date', today())}
          <div className="notice">
            A transferência preserva seu saldo consolidado. Somente a tarifa representa despesa.
          </div>
        </>
      )}
      {kind === 'scenario' && (
        <>
          {input('incomeDelta', 'Renda adicional por mês (R$)', 'number', 0)}
          {input('expenseReduction', 'Redução de gastos por mês (R$)', 'number', 0)}
          {select(
            'months',
            'Horizonte',
            [1, 3, 6, 12, 24, 60].map((n) => ({ value: String(n), label: `${n} meses` })),
          )}
          <div className="notice">
            Simulação: não altera seus lançamentos, pagamentos ou saldos reais.
          </div>
        </>
      )}
      <Button type="submit" disabled={busy} className="full">
        {busy ? 'Salvando…' : 'Salvar'}
      </Button>
    </form>
  );
}
