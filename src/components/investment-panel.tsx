'use client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { Asset, Workspace } from '@/domain/types';
import {
  investmentOperation,
  operationLabels,
  portfolio,
  portfolioEvolution,
  reverseInvestment,
  type InvestmentInput,
} from '@/domain/investments';
import { cents, money, today } from '@/domain/finance';
import { Modal } from './ui/dialog';
import { Button } from './ui/button';
import { CategoryChart, FlowChart } from './charts';
import { RecordHistory } from './record-history';
export function InvestmentPanel({
  w,
  busy,
  hidden,
  commit,
  onEdit,
  onNew,
  onEditingChange,
}: {
  w: Workspace;
  busy: boolean;
  hidden: boolean;
  commit: (w: Workspace, action: string) => Promise<void>;
  onEdit: (a: Asset) => void;
  onNew: () => void;
  onEditingChange?: (editing: boolean) => void;
}) {
  const p = portfolio(w),
    f = (n: number) => money(n, hidden);
  const [selected, setSelected] = useState('');
  const [history, setHistory] = useState('');
  const [correction, setCorrection] = useState('');
  const [reversing, setReversing] = useState('');
  useEffect(() => {
    onEditingChange?.(!!(selected || correction || reversing));
    return () => onEditingChange?.(false);
  }, [selected, correction, reversing, onEditingChange]);
  const old = w.events.find((e) => e.id === correction);
  const a = w.assets.find((a) => a.id === selected);
  const events = w.events.filter((e) => e.kind.startsWith('investment_'));
  return (
    <div className="investment-module stack">
      <div className="stats-grid three">
        <div className="panel">
          <small>Total aplicado na posição</small>
          <h2>{f(p.cost)}</h2>
        </div>
        <div className="panel">
          <small>Valor atual informado</small>
          <h2>{f(p.value)}</h2>
        </div>
        <div className="panel">
          <small>Variação nominal da posição</small>
          <h2>
            {p.returnPercent === null ? 'Não calculável' : hidden ? '•••' : `${p.returnPercent}%`}
          </h2>
          <small>Valor atual menos custo; sem rendimento futuro presumido.</small>
        </div>
      </div>
      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Carteira de investimentos</h2>
            <p className="muted">
              Avaliações manuais. Compras e aportes movimentam caixa sem criar consumo.
            </p>
          </div>
          <Button onClick={onNew}>Novo investimento</Button>
        </div>
        {p.assets.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Ativo</th>
                  <th>Classe / instituição</th>
                  <th>Quantidade</th>
                  <th>Aplicado</th>
                  <th>Atual</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {p.assets.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <strong>{a.name}</strong>
                      <small>
                        {a.ticker} · Avaliação em {a.date}
                      </small>
                    </td>
                    <td>
                      {a.classification ?? 'Classifique este ativo'}
                      <small>
                        {a.subcategory} · {a.institution}
                      </small>
                    </td>
                    <td>{hidden ? '•••' : (a.quantity ?? 'Não informada')}</td>
                    <td>{f(a.cost)}</td>
                    <td>{f(a.value)}</td>
                    <td>
                      <div className="filter-inline">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelected(a.id);
                            setCorrection('');
                          }}
                        >
                          Operação
                        </Button>
                        <button className="text-button" onClick={() => onEdit(a)}>
                          Editar / avaliar
                        </button>
                        <button className="text-button" onClick={() => setHistory(a.id)}>
                          Histórico
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">
            Cadastre um ativo e sua classe para começar. Para novos aportes, crie a posição com
            valor zero e registre a operação.
          </p>
        )}
      </section>
      <section className="panel">
        <h2>Distribuição por classe</h2>
        <CategoryChart data={p.distribution} hidden={hidden} centerLabel="Carteira atual" />
      </section>
      <section className="panel">
        <h2>Histórico de operações</h2>
        <p className="muted">
          As avaliações alteram a posição. Operações registram o caixa efetivo. Correções preservam
          o registro original.
        </p>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Ativo / operação</th>
                <th>Valor financeiro</th>
                <th>Taxas / impostos</th>
                <th>Caixa</th>
                <th>Posição após operação</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {events
                .slice()
                .reverse()
                .map((e) => (
                  <tr key={e.id}>
                    <td>{e.date}</td>
                    <td>
                      {w.assets.find((a) => a.id === e.targetId)?.name}
                      <small>
                        {e.investment
                          ? operationLabels[e.investment.operation]
                          : e.kind === 'investment_contribution'
                            ? 'Aporte'
                            : e.kind === 'investment_redemption'
                              ? 'Resgate'
                              : 'Rendimento'}{' '}
                        · {e.note}
                      </small>
                      {e.investment?.quantity && (
                        <small>
                          {e.investment.quantity} unidades · preço{' '}
                          {e.investment.unitPrice ?? 'não informado'}
                        </small>
                      )}
                    </td>
                    <td>{f(e.amount)}</td>
                    <td>
                      {f(e.fee)} / {f(e.investment?.tax ?? 0)}
                    </td>
                    <td>
                      {f(
                        e.investment?.cash ??
                          (e.kind === 'investment_contribution' ? -e.amount : e.amount),
                      )}
                    </td>
                    <td>{e.investment ? f(e.investment.after.value) : 'Sem posição histórica'}</td>
                    <td>
                      {e.investment &&
                        e.investment.operation !== 'reversal' &&
                        !events.some((x) => x.investment?.reversalOf === e.id) && (
                          <div className="filter-inline">
                            <button
                              className="text-button"
                              onClick={() => {
                                setSelected(e.targetId);
                                setCorrection(e.id);
                              }}
                            >
                              Corrigir
                            </button>
                            <button className="text-button" onClick={() => setReversing(e.id)}>
                              Estornar
                            </button>
                          </div>
                        )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {!events.length && <p className="muted">Nenhuma operação registrada.</p>}
      </section>
      <section className="panel">
        <h2>Evolução das avaliações</h2>
        {portfolioEvolution(w).length > 1 && (
          <FlowChart
            data={portfolioEvolution(w)}
            hidden={hidden}
            projection
            lineLabel="Carteira informada"
          />
        )}
        <p className="muted">
          Histórico dos valores informados por ativo; não representa rentabilidade de mercado.
        </p>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Data de registro</th>
                <th>Ativo</th>
                <th>Valor anterior</th>
                <th>Valor informado</th>
              </tr>
            </thead>
            <tbody>
              {w.audit.flatMap((a) =>
                (a.changes ?? [])
                  .filter((c) => c.entity === 'assets' && c.after?.type === 'investment')
                  .map((c) => (
                    <tr key={`${a.id}:${c.id}`}>
                      <td>{new Date(a.at).toLocaleString('pt-BR')}</td>
                      <td>{String(c.after?.name)}</td>
                      <td>{c.before ? f(Number(c.before.value)) : '—'}</td>
                      <td>{f(Number(c.after?.value))}</td>
                    </tr>
                  )),
              )}
            </tbody>
          </table>
        </div>
      </section>
      <Modal
        open={!!a}
        onOpenChange={(open) => {
          if (!open) {
            setSelected('');
            setCorrection('');
          }
        }}
        title={correction ? 'Corrigir operação' : `Operação · ${a?.name ?? ''}`}
        description="Valor em reais; quantidade e preço unitário opcionais em aportes e resgates."
      >
        {a && (
          <form
            className="form"
            key={`${selected}:${correction}`}
            onSubmit={async (ev) => {
              ev.preventDefault();
              const data = new FormData(ev.currentTarget);
              try {
                let next = correction
                  ? reverseInvestment(w, correction, crypto.randomUUID(), String(data.get('date')))
                  : w;
                next = investmentOperation(next, {
                  id: crypto.randomUUID(),
                  assetId: a.id,
                  accountId: String(data.get('accountId')),
                  operation: String(data.get('operation')) as InvestmentInput['operation'],
                  amount: cents(String(data.get('amount'))),
                  fee: cents(String(data.get('fee'))),
                  tax: cents(String(data.get('tax'))),
                  quantity: String(data.get('quantity') ?? '').replace(',', '.'),
                  unitPrice: String(data.get('unitPrice') ?? '').replace(',', '.'),
                  date: String(data.get('date')),
                  note: String(data.get('note')),
                });
                await commit(
                  next,
                  correction
                    ? 'Operação corrigida com estorno do original'
                    : 'Operação de investimento registrada',
                );
                setSelected('');
                setCorrection('');
              } catch (e) {
                toast.error(e instanceof Error ? e.message : 'Não foi possível registrar.');
              }
            }}
          >
            <div className="notice">
              {correction
                ? 'O original será estornado e a nova operação salva na mesma transação. Apenas a última operação pode ser corrigida.'
                : 'Confirme os valores antes de salvar. A operação movimentará a conta selecionada e atualizará a posição.'}
            </div>
            <label>
              Operação
              <select name="operation" defaultValue={old?.investment?.operation ?? 'contribution'}>
                {Object.entries(operationLabels)
                  .filter(([key]) => key !== 'reversal')
                  .map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Conta de movimentação
              <select name="accountId" defaultValue={old?.accountId}>
                {w.accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-grid">
              <label>
                Data da operação
                <input type="date" name="date" defaultValue={today()} max={today()} required />
              </label>
              <label>
                Valor financeiro (R$)
                <input
                  type="number"
                  name="amount"
                  step="0.01"
                  min="0.01"
                  defaultValue={old ? old.amount / 100 : undefined}
                  required
                />
              </label>
            </div>
            <div className="form-grid">
              <label>
                Quantidade
                <input
                  name="quantity"
                  inputMode="decimal"
                  defaultValue={old?.investment?.quantity}
                />
              </label>
              <label>
                Preço unitário (R$)
                <input
                  name="unitPrice"
                  inputMode="decimal"
                  defaultValue={old?.investment?.unitPrice}
                />
              </label>
            </div>
            <div className="form-grid">
              <label>
                Taxas (R$)
                <input
                  name="fee"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={(old?.fee ?? 0) / 100}
                  required
                />
              </label>
              <label>
                Impostos (R$)
                <input
                  name="tax"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={(old?.investment?.tax ?? 0) / 100}
                  required
                />
              </label>
            </div>
            <label>
              Observações
              <textarea name="note" maxLength={2000} defaultValue={old?.note} />
            </label>
            <Button disabled={busy || !w.accounts.length} type="submit">
              Confirmar operação
            </Button>
          </form>
        )}
      </Modal>
      <Modal
        open={!!history}
        onOpenChange={(open) => {
          if (!open) setHistory('');
        }}
        title="Histórico do investimento"
      >
        <RecordHistory w={w} targetId={history} />
      </Modal>
      <Modal
        open={!!reversing}
        onOpenChange={(open) => {
          if (!open) setReversing('');
        }}
        title="Estornar operação?"
        description="O movimento inverso será registrado hoje. O original continuará no histórico."
      >
        <Button
          disabled={busy}
          onClick={async () => {
            try {
              await commit(
                reverseInvestment(w, reversing, crypto.randomUUID(), today()),
                'Investimento estornado',
              );
              setReversing('');
            } catch (e) {
              toast.error(e instanceof Error ? e.message : 'Falha no estorno.');
            }
          }}
        >
          Confirmar estorno
        </Button>
      </Modal>
    </div>
  );
}
