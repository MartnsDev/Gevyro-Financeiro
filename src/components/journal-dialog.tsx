'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import type { EventKind, Workspace } from '@/domain/types';
import { cents, money, today } from '@/domain/finance';
import { addFinancialEvent, settleInstallment } from '@/domain/journal';
import { Modal } from './ui/dialog';
import { Button } from './ui/button';
export const eventLabels: Record<EventKind, string> = {
  balance_adjustment: 'Ajuste de saldo',
  investment_contribution: 'Aporte em investimento',
  investment_redemption: 'Resgate de investimento',
  investment_income: 'Rendimento recebido',
  debt_drawdown: 'Empréstimo recebido',
  debt_payment: 'Amortização de dívida',
  goal_reserve: 'Reservar para meta',
  goal_withdrawal: 'Retirar reserva',
  obligation_adjustment: 'Juros, multa ou desconto',
  purchase_refund: 'Reembolso de compra paga',
};
export function JournalDialog({
  open,
  onClose,
  w,
  commit,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  w: Workspace;
  commit: (next: Workspace, action: string) => Promise<void>;
  busy: boolean;
}) {
  const [kind, setKind] = useState<EventKind | 'settlement'>('balance_adjustment');
  const targets =
    kind === 'settlement'
      ? w.plans.filter((p) => p.mode === 'installment' && p.kind === 'expense')
      : kind.startsWith('investment_')
        ? w.assets.filter((a) => a.type === 'investment')
        : kind.startsWith('debt_')
          ? w.assets.filter((a) => a.type === 'debt')
          : kind.startsWith('goal_')
            ? w.goals
            : kind === 'balance_adjustment'
              ? w.accounts
              : w.obligations.filter((o) => o.kind === 'expense' && !o.cancelled);
  return (
    <Modal
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
      title="Movimento financeiro"
      description="Uma operação efetiva, com conta, data e histórico preservado."
    >
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          try {
            const targetId = String(data.get('target'));
            if (kind === 'settlement') {
              await commit(
                settleInstallment(
                  w,
                  targetId,
                  String(data.get('account')),
                  String(data.get('date')),
                  cents(String(data.get('amount') || '0')),
                  crypto.randomUUID(),
                ),
                'Parcelamento quitado antecipadamente',
              );
              onClose();
              return;
            }
            const event = {
              id: crypto.randomUUID(),
              kind,
              targetId,
              accountId:
                kind === 'balance_adjustment' ? targetId : String(data.get('account') || ''),
              amount: cents(String(data.get('amount'))),
              fee: cents(String(data.get('fee') || '0')),
              date: String(data.get('date')),
              note: String(data.get('note')),
            };
            await commit(addFinancialEvent(w, event), eventLabels[kind]);
            onClose();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Não foi possível registrar.');
          }
        }}
      >
        <label>
          Operação
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as EventKind | 'settlement')}
          >
            {Object.entries({ ...eventLabels, settlement: 'Quitar parcelamento' }).map(
              ([id, label]) => (
                <option value={id} key={id}>
                  {label}
                </option>
              ),
            )}
          </select>
        </label>
        <label>
          Registro relacionado
          <select key={kind} name="target" required>
            {targets.length ? (
              targets.map((t) => (
                <option value={t.id} key={t.id}>
                  {t.name}
                </option>
              ))
            ) : (
              <option value="">Cadastre primeiro o registro correspondente</option>
            )}
          </select>
        </label>
        {![
          'goal_reserve',
          'goal_withdrawal',
          'obligation_adjustment',
          'balance_adjustment',
        ].includes(kind) && (
          <label>
            Conta efetiva
            <select name="account" required>
              {w.accounts.map((a) => (
                <option value={a.id} key={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="form-grid">
          <label>
            {kind === 'settlement'
              ? 'Desconto efetivo na quitação (R$)'
              : kind === 'debt_payment'
                ? 'Principal amortizado (R$)'
                : 'Valor (R$)'}
            <input
              name="amount"
              type="number"
              required
              step="0.01"
              min={
                ['balance_adjustment', 'obligation_adjustment'].includes(kind) ? undefined : '0.01'
              }
            />
          </label>
          <label>
            Data efetiva
            <input name="date" type="date" required max={today()} defaultValue={today()} />
          </label>
        </div>
        {kind === 'debt_payment' && (
          <label>
            Juros pagos (R$)
            <input name="fee" type="number" required min="0" step="0.01" defaultValue="0" />
          </label>
        )}
        {['balance_adjustment', 'obligation_adjustment'].includes(kind) && (
          <div className="notice">
            Use valor positivo para acréscimo ou negativo para redução. Um desconto em obrigação não
            pode apagar pagamentos já efetuados.
          </div>
        )}
        <label>
          Motivo ou comprovante textual
          <textarea name="note" required minLength={3} maxLength={2000} rows={2} />
        </label>
        <Button disabled={busy || !targets.length} type="submit">
          Confirmar movimento
        </Button>
      </form>
    </Modal>
  );
}
export function JournalHistory({ w, hidden = false }: { w: Workspace; hidden?: boolean }) {
  return (
    <div className="audit-list">
      {w.events.length ? (
        w.events
          .slice()
          .reverse()
          .slice(0, 100)
          .map((e) => (
            <div key={e.id}>
              <div>
                <strong>{eventLabels[e.kind]}</strong>
                <p className="muted">
                  {e.note} · {e.date}
                </p>
              </div>
              <strong>
                {money(e.amount, hidden)}
                {e.fee ? ` + ${money(e.fee, hidden)} juros` : ''}
              </strong>
            </div>
          ))
      ) : (
        <p className="muted" style={{ padding: '20px 0' }}>
          Os ajustes, aportes, amortizações, reservas e reembolsos aparecerão aqui.
        </p>
      )}
    </div>
  );
}
