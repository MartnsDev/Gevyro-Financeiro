'use client';
import { ArrowDownLeft, ArrowUpRight, Check, Eye, Pencil } from 'lucide-react';
import type { Obligation, Workspace } from '@/domain/types';
import { due, money, remaining, status } from '@/domain/finance';
const labels = {
  paid: 'Pago',
  partial: 'Parcial',
  overdue: 'Atrasado',
  pending: 'Pendente',
  cancelled: 'Cancelado',
};
export function TransactionCards({
  rows,
  w,
  hidden,
  onDetail,
  onPay,
}: {
  rows: Obligation[];
  w: Workspace;
  hidden: boolean;
  onDetail: (o: Obligation) => void;
  onPay: (o: Obligation) => void;
}) {
  return (
    <div className="mobile-transactions" aria-label="Lista de movimentações">
      {rows.map((o) => {
        const s = status(w, o);
        return (
          <article key={o.id} className="transaction-card">
            <button
              className="transaction-card-main"
              onClick={() => onDetail(o)}
              aria-label={`Detalhes de ${o.name}, ${o.installment}/${o.total}`}
            >
              <span className={`transaction-icon ${o.kind}`}>
                {o.kind === 'income' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
              </span>
              <span className="transaction-card-title">
                <strong>{o.name}</strong>
                <small>
                  {o.category} ·{' '}
                  {o.total > 1
                    ? `Parcela ${o.installment}/${o.total}`
                    : o.kind === 'income'
                      ? 'Receita'
                      : 'Despesa'}
                </small>
              </span>
              <strong
                className={`transaction-card-amount ${o.kind === 'income' ? 'positive' : ''}`}
              >
                {o.kind === 'income' ? '+' : '−'} {money(due(w, o), hidden)}
              </strong>
            </button>
            <div className="transaction-card-meta">
              <span>
                Vencimento <time dateTime={o.date}>{o.date.split('-').reverse().join('/')}</time>
              </span>
              <span className={`badge ${s}`}>
                {o.kind === 'income' && s === 'paid' ? 'Recebido' : labels[s]}
              </span>
            </div>
            <small className="transaction-card-account">
              {o.cardId
                ? w.cards.find((c) => c.id === o.cardId)?.name
                : w.accounts.find((a) => a.id === o.accountId)?.name}
            </small>
            <div className="transaction-card-actions">
              <button
                onClick={() => onDetail(o)}
                aria-label={`Editar ${o.name}, parcela ${o.installment}`}
              >
                <Pencil size={17} />
                Editar
              </button>
              {remaining(w, o) > 0 && (
                <button onClick={() => onPay(o)}>
                  <Check size={17} />
                  {o.cardId ? 'Pagar fatura' : 'Pagar'}
                </button>
              )}
              <button onClick={() => onDetail(o)}>
                <Eye size={17} />
                Detalhes
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
