'use client';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { entryFormSchema, type EntryForm, type EntryInput } from '@/domain/validation';
import { cents, today } from '@/domain/finance';
import type { Plan, Workspace } from '@/domain/types';
import { Button } from './ui/button';
import { CircleAlert, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
export function EntryEditor({
  workspace,
  onSave,
  initial,
  subscription = false,
  busy,
}: {
  workspace: Workspace;
  onSave: (p: Plan, settled: boolean) => Promise<void>;
  initial?: Plan;
  subscription?: boolean;
  busy: boolean;
}) {
  const {
    register,
    control,
    setValue,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<EntryInput, unknown, EntryForm>({
    resolver: zodResolver(entryFormSchema),
    defaultValues: initial
      ? {
          ...initial,
          tags: initial.tags?.join(', ') || '',
          amount: (initial.amount / 100).toFixed(2),
          settled: false,
        }
      : {
          name: '',
          amount: '',
          kind: 'expense',
          category: subscription ? 'Assinaturas' : 'Outros',
          accountId: workspace.accounts[0]?.id || '',
          cardId: '',
          date: today(),
          mode: subscription ? 'recurring' : 'once',
          count: 2,
          interval: 1,
          unit: 'month',
          end: '',
          notes: '',
          subscription,
          settled: false,
          tags: '',
          incomeType: 'fixed',
          confirmed: false,
          beneficiary: '',
          subcategory: '',
        },
  });
  const mode = useWatch({ control, name: 'mode' });
  const cardId = useWatch({ control, name: 'cardId' });
  const kind = useWatch({ control, name: 'kind' });
  return (
    <form
      className="form"
      onSubmit={handleSubmit(async (v) => {
        try {
          const amount = cents(v.amount);
          if (amount <= 0) throw new Error('Informe um valor maior que zero.');
          if (!v.cardId && !v.accountId) throw new Error('Cadastre ou selecione uma conta.');
          await onSave(
            {
              ...v,
              tags: v.tags
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean),
              amount,
              id: initial?.id || crypto.randomUUID(),
              ...(initial?.cancelledFrom ? { cancelledFrom: initial.cancelledFrom } : {}),
              ...(initial?.pausedFrom ? { pausedFrom: initial.pausedFrom } : {}),
            },
            v.settled,
          );
        } catch (e) {
          setError('root', {
            message: e instanceof Error ? e.message : 'Não foi possível salvar.',
          });
        }
      })}
    >
      <div className="segmented">
        <button
          type="button"
          className={kind === 'expense' ? 'active' : ''}
          onClick={() => setValue('kind', 'expense')}
        >
          <ArrowUpRight size={16} /> Despesa
        </button>
        <button
          type="button"
          className={kind === 'income' ? 'active' : ''}
          onClick={() => {
            setValue('kind', 'income');
            setValue('cardId', '');
          }}
        >
          <ArrowDownLeft size={16} /> Receita
        </button>
      </div>
      {kind === 'income' && (
        <div className="form-grid">
          <label>
            Natureza da renda
            <select {...register('incomeType')}>
              <option value="fixed">Fixa</option>
              <option value="variable">Variável</option>
            </select>
          </label>
          <label className="checkbox">
            <input type="checkbox" {...register('confirmed')} />
            Receita confirmada para planejamento conservador
          </label>
        </div>
      )}
      <label>
        Descrição
        <input autoFocus placeholder="Ex.: Supermercado, salário, internet" {...register('name')} />
        {errors.name && <small className="error">{errors.name.message}</small>}
      </label>
      <div className="form-grid">
        <label>
          Valor {mode === 'installment' ? 'total' : '(R$)'}
          <input inputMode="decimal" placeholder="0,00" {...register('amount')} />
        </label>
        <label>
          Categoria
          <select {...register('category')}>
            {workspace.categories
              .filter(
                (c) =>
                  !workspace.preferences.archivedCategories?.includes(c) || c === initial?.category,
              )
              .map((c) => (
                <option key={c}>{c}</option>
              ))}
          </select>
        </label>
      </div>
      <div className="form-grid">
        <label>
          Conta
          <select {...register('accountId')}>
            <option value="">Selecione uma conta</option>
            {workspace.accounts.map((a) => (
              <option value={a.id} key={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        {kind === 'expense' && (
          <label>
            Cartão (opcional)
            <select {...register('cardId')}>
              <option value="">Sem cartão</option>
              {workspace.cards.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="form-grid">
        <label>
          {cardId ? 'Data da compra' : 'Primeiro vencimento'}
          <input type="date" {...register('date')} />
        </label>
        <label>
          Tipo de lançamento
          <select {...register('mode')}>
            <option value="once">Único</option>
            <option value="installment">Parcelado</option>
            <option value="recurring">Recorrente</option>
          </select>
        </label>
      </div>
      {mode === 'installment' && (
        <label>
          Quantidade de parcelas
          <input type="number" min="1" max="600" {...register('count')} />
          <small>O valor total será dividido sem perda de centavos.</small>
        </label>
      )}
      {mode === 'recurring' && (
        <>
          <div className="form-grid">
            <label>
              A cada
              <input type="number" min="1" max="365" {...register('interval')} />
            </label>
            <label>
              Período
              <select {...register('unit')}>
                <option value="month">Mês(es)</option>
                <option value="day">Dia(s)</option>
              </select>
            </label>
          </div>
          <label>
            Data final (opcional)
            <input type="date" {...register('end')} />
          </label>
          <label className="checkbox">
            <input type="checkbox" {...register('subscription')} /> Identificar como assinatura
          </label>
        </>
      )}
      <div className="form-grid">
        <label>
          Estabelecimento ou origem
          <input {...register('beneficiary')} placeholder="Opcional" />
        </label>
        <label>
          Subcategoria
          <input {...register('subcategory')} placeholder="Opcional" />
        </label>
      </div>
      <label>
        Tags, separadas por vírgula
        <input {...register('tags')} placeholder="Ex.: casa, essencial" />
      </label>
      <label>
        Observações
        <textarea rows={2} placeholder="Detalhes opcionais" {...register('notes')} />
      </label>
      {!initial && !cardId && (
        <label className="checkbox">
          <input type="checkbox" {...register('settled')} />{' '}
          {kind === 'income' ? 'Recebido' : 'Pago'} hoje (somente a primeira ocorrência)
        </label>
      )}
      {initial && (
        <div className="notice">
          <CircleAlert size={16} /> A edição aplica-se às ocorrências futuras ainda não pagas. O
          histórico liquidado é preservado.
        </div>
      )}
      {errors.root && (
        <p className="error" role="alert">
          {errors.root.message}
        </p>
      )}
      {Object.entries(errors)
        .filter(([key]) => !['root', 'name'].includes(key))
        .map(([key, e]) => (
          <p className="error" key={key}>
            {key}: {e?.message}
          </p>
        ))}
      <Button disabled={busy} type="submit" className="full">
        {busy ? 'Salvando…' : initial ? 'Salvar alterações' : 'Adicionar movimentação'}
      </Button>
    </form>
  );
}
