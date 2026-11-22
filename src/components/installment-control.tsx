'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import type { Obligation, Workspace } from '@/domain/types';
import { cents, money, paid, remaining, status, today } from '@/domain/finance';
import {
  correctPayment,
  editOccurrence,
  reversePayment,
  settleSelected,
} from '@/domain/operations';
import { Modal } from './ui/dialog';
import { Button } from './ui/button';
import { RecordHistory } from './record-history';
const labels = {
  paid: 'Paga',
  pending: 'Pendente',
  overdue: 'Vencida',
  partial: 'Parcial',
  cancelled: 'Cancelada',
};
export function OccurrenceControl({
  w,
  o,
  busy,
  commit,
  onClose,
}: {
  w: Workspace;
  o: Obligation;
  busy: boolean;
  commit: (w: Workspace, action: string) => Promise<void>;
  onClose: () => void;
}) {
  const payments = w.payments.filter((p) => p.obligationId === o.id && !p.reversed);
  const [correction, setCorrection] = useState('');
  const payment = payments.find((p) => p.id === correction);
  return (
    <div className="stack">
      <div className="notice">
        {labels[status(w, o)]} · Vencimento original: {o.originalDate ?? o.date} · Valor original:{' '}
        {money(o.originalAmount ?? o.amount)}. Antecipação é o pagamento anterior ao vencimento, sem
        mudar a situação financeira.
      </div>
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          try {
            const state = String(data.get('state'));
            let base = w;
            if (state === 'pending' || state === 'cancelled')
              for (const p of payments) base = reversePayment(base, p.id);
            let next = editOccurrence(base, o.id, {
              name: String(data.get('name')),
              amount: cents(String(data.get('amount'))),
              date: String(data.get('date')),
              notes: String(data.get('notes')),
              category: String(data.get('category')),
            });
            if (state === 'pending') for (const p of payments) next = reversePayment(next, p.id);
            if (state === 'cancelled') {
              for (const p of payments) next = reversePayment(next, p.id);
              next = editOccurrence(next, o.id, {
                name: String(data.get('name')),
                amount: cents(String(data.get('amount'))),
                date: String(data.get('date')),
                notes: String(data.get('notes')),
                category: String(data.get('category')),
                cancelled: true,
              });
            } else {
              next = {
                ...next,
                obligations: next.obligations.map((row) =>
                  row.id === o.id && ['paid', 'pending'].includes(state)
                    ? { ...row, cancelled: false }
                    : row,
                ),
              };
              if (state === 'paid')
                next = settleSelected(
                  next,
                  [o.id],
                  String(data.get('accountId')),
                  String(data.get('paymentDate')),
                  crypto.randomUUID(),
                );
            }
            await commit(next, 'Parcela individual atualizada');
            onClose();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Falha ao editar.');
          }
        }}
      >
        <label>
          Descrição
          <input name="name" defaultValue={o.name} required maxLength={2000} />
        </label>
        <div className="form-grid">
          <label>
            Valor (R$)
            <input
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              defaultValue={o.amount / 100}
              required
            />
          </label>
          <label>
            Vencimento
            <input name="date" type="date" defaultValue={o.date} required />
          </label>
        </div>
        <label>
          Categoria
          <select name="category" defaultValue={o.category}>
            {[...new Set([...w.categories, o.category])].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label>
          Observações
          <textarea name="notes" maxLength={2000} defaultValue={o.notes ?? ''} />
        </label>
        <label>
          Situação
          <select name="state" defaultValue="keep">
            <option value="keep">Manter situação atual</option>
            <option value="paid">Pagar saldo / antecipar</option>
            <option value="pending">Tornar pendente (estornar pagamentos)</option>
            <option value="cancelled">Cancelar (estornar pagamentos)</option>
          </select>
        </label>
        <p className="muted">
          Vencida é uma situação calculada: saldo em aberto e vencimento anterior a hoje. Tornar
          pendente ou cancelar estorna os pagamentos ativos e recompõe o caixa.
        </p>
        <div className="form-grid">
          <label>
            Data efetiva do novo pagamento
            <input name="paymentDate" type="date" max={today()} defaultValue={today()} />
          </label>
          <label>
            Conta do novo pagamento
            <select
              name="accountId"
              defaultValue={o.accountId || w.cards.find((c) => c.id === o.cardId)?.accountId}
            >
              {w.accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <Button disabled={busy} type="submit" variant="outline">
          Confirmar edição desta parcela
        </Button>
      </form>
      {payments.map((p) => (
        <div className="detail-row" key={p.id}>
          <span>
            {p.date} · {money(p.amount)} ·{' '}
            {p.date < (o.originalDate ?? o.date) ? 'Pagamento antecipado' : 'Pagamento efetivo'}
          </span>
          <button className="text-button" onClick={() => setCorrection(p.id)}>
            Corrigir data / valor / conta
          </button>
        </div>
      ))}
      {payment && (
        <form
          className="form"
          key={payment.id}
          onSubmit={async (e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            try {
              await commit(
                correctPayment(
                  w,
                  payment.id,
                  String(data.get('accountId')),
                  cents(String(data.get('amount'))),
                  String(data.get('date')),
                  crypto.randomUUID(),
                ),
                'Pagamento corrigido com estorno do original',
              );
              setCorrection('');
              onClose();
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'Falha ao corrigir.');
            }
          }}
        >
          <h3>Corrigir pagamento</h3>
          <div className="notice">
            O pagamento original será estornado e o substituto registrado na mesma operação.
          </div>
          <label>
            Valor pago (R$)
            <input
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              defaultValue={payment.amount / 100}
              required
            />
          </label>
          <label>
            Data real
            <input name="date" type="date" max={today()} defaultValue={payment.date} required />
          </label>
          <label>
            Conta
            <select name="accountId" defaultValue={payment.accountId}>
              {w.accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" disabled={busy}>
            Confirmar correção do pagamento
          </Button>
        </form>
      )}
      <h3>Histórico deste lançamento</h3>
      <RecordHistory w={w} targetId={o.id} />
    </div>
  );
}
export function PurchaseDialog({
  w,
  planId,
  busy,
  hidden,
  commit,
  onClose,
  onDetail,
}: {
  w: Workspace;
  planId: string;
  busy: boolean;
  hidden: boolean;
  commit: (w: Workspace, action: string) => Promise<void>;
  onClose: () => void;
  onDetail: (o: Obligation) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const rows = w.obligations
    .filter((o) => o.planId === planId)
    .sort((a, b) => a.installment - b.installment);
  const plan = w.plans.find((p) => p.id === planId);
  const done = rows.filter((o) => !o.cancelled && status(w, o) === 'paid').length,
    left = rows.reduce((s, o) => s + remaining(w, o), 0),
    totalPaid = rows.reduce((s, o) => s + paid(w, o.id), 0);
  const f = (n: number) => money(n, hidden);
  const sum = rows.filter((o) => selected.includes(o.id)).reduce((s, o) => s + remaining(w, o), 0);
  return (
    <Modal
      open={!!plan}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={plan?.name ?? 'Parcelas'}
      description="Cada edição afeta somente a parcela escolhida."
    >
      <div className="stack">
        <p>
          {done} pagas · {rows.filter((o) => !o.cancelled && remaining(w, o) > 0).length} restantes
          · {rows.filter((o) => o.cancelled).length} canceladas
        </p>
        <progress value={done} max={plan?.count ?? 1} />
        <div className="detail-row">
          <span>
            Total original {f(plan?.amount ?? 0)} · Pago {f(totalPaid)}
          </span>
          <strong>Saldo {f(left)}</strong>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Selecionar</th>
                <th>Parcela</th>
                <th>Vencimento</th>
                <th>Valor / saldo</th>
                <th>Situação</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Selecionar parcela ${o.installment}`}
                      disabled={!remaining(w, o)}
                      checked={selected.includes(o.id)}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? [...selected, o.id]
                            : selected.filter((id) => id !== o.id),
                        )
                      }
                    />
                  </td>
                  <td>
                    {o.installment}/{o.total}
                  </td>
                  <td>
                    {o.date}
                    <small>Original: {o.originalDate ?? o.date}</small>
                  </td>
                  <td>
                    {f(o.amount)}
                    <small>Em aberto: {f(remaining(w, o))}</small>
                  </td>
                  <td>
                    {labels[status(w, o)]}
                    {w.payments.some(
                      (p) =>
                        p.obligationId === o.id &&
                        !p.reversed &&
                        p.date < (o.originalDate ?? o.date),
                    ) && <small>Pagamento antecipado</small>}
                  </td>
                  <td>
                    <button
                      className="text-button"
                      onClick={() => {
                        onClose();
                        onDetail(o);
                      }}
                    >
                      Editar / detalhes
                    </button>
                    <button
                      className="text-button"
                      disabled={!remaining(w, o)}
                      onClick={() => setSelected([o.id])}
                    >
                      Antecipar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button
          variant="outline"
          onClick={() => setSelected(rows.filter((o) => remaining(w, o) > 0).map((o) => o.id))}
        >
          Selecionar saldo para quitar
        </Button>
        {!!selected.length && (
          <form
            className="form"
            onSubmit={async (e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              try {
                await commit(
                  settleSelected(
                    w,
                    selected,
                    String(d.get('accountId')),
                    String(d.get('date')),
                    crypto.randomUUID(),
                  ),
                  'Parcelas selecionadas pagas',
                );
                setSelected([]);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Falha ao pagar.');
              }
            }}
          >
            <div className="notice">
              Confirmar pagamento de {selected.length} parcela(s), total {f(sum)}. Os vencimentos
              originais serão preservados.
            </div>
            <label>
              Conta
              <select name="accountId">
                {w.accounts.map((a) => (
                  <option value={a.id} key={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Data real do pagamento
              <input type="date" name="date" defaultValue={today()} max={today()} required />
            </label>
            <Button type="submit" disabled={busy || !w.accounts.length}>
              Confirmar pagamento das selecionadas
            </Button>
          </form>
        )}
      </div>
    </Modal>
  );
}
