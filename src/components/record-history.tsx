'use client';
import type { Audit, Workspace } from '@/domain/types';
import { Button } from './ui/button';
const labels: Record<string, string> = {
  amount: 'Valor (centavos)',
  date: 'Data',
  value: 'Avaliação (centavos)',
  cost: 'Custo (centavos)',
  name: 'Nome',
  notes: 'Observações',
  cancelled: 'Cancelado',
  originalDate: 'Vencimento original',
  quantity: 'Quantidade',
  reversed: 'Estornado',
  accountId: 'Conta',
  classification: 'Classe',
  ticker: 'Ticker',
  institution: 'Instituição',
};
export function RecordHistory({
  w,
  targetId,
  onUndo,
  busy = false,
}: {
  w: Workspace;
  targetId?: string;
  onUndo?: (a: Audit) => void;
  busy?: boolean;
}) {
  const entries = w.audit
    .filter(
      (a) =>
        !targetId ||
        a.changes?.some(
          (c) =>
            c.id === targetId ||
            c.before?.obligationId === targetId ||
            c.after?.obligationId === targetId ||
            c.before?.targetId === targetId ||
            c.after?.targetId === targetId,
        ),
    )
    .slice(-50)
    .reverse();
  return (
    <div className="stack">
      {entries.length ? (
        entries.map((a) => (
          <details key={a.id} className="history-entry">
            <summary>
              {a.action} · {new Date(a.at).toLocaleString('pt-BR')}
            </summary>
            {a.changes
              ?.filter(
                (c) =>
                  !targetId ||
                  c.id === targetId ||
                  c.before?.obligationId === targetId ||
                  c.after?.obligationId === targetId ||
                  c.before?.targetId === targetId ||
                  c.after?.targetId === targetId,
              )
              .map((c) => (
                <div key={`${c.entity}:${c.id}`}>
                  <small>
                    {c.entity} · {c.id}
                  </small>
                  <dl>
                    {[...new Set([...Object.keys(c.before ?? {}), ...Object.keys(c.after ?? {})])]
                      .filter((k) => JSON.stringify(c.before?.[k]) !== JSON.stringify(c.after?.[k]))
                      .map((k) => (
                        <div className="history-value" key={k}>
                          <dt>{labels[k] ?? k}</dt>
                          <dd>
                            {display(c.before?.[k])} → {display(c.after?.[k])}
                          </dd>
                        </div>
                      ))}
                  </dl>
                </div>
              ))}
            {onUndo &&
              a.changes?.length &&
              !a.changes.some((c) => ['events', 'payments', 'transfers'].includes(c.entity)) &&
              !w.audit.some((x) => x.undoOf === a.id) && (
                <Button size="sm" variant="outline" disabled={busy} onClick={() => onUndo(a)}>
                  Desfazer alteração
                </Button>
              )}
          </details>
        ))
      ) : (
        <p className="muted">
          Nenhuma alteração detalhada registrada. O histórico detalhado começa com esta atualização.
        </p>
      )}
    </div>
  );
}
function display(value: unknown) {
  return value === undefined || value === null
    ? '—'
    : typeof value === 'object'
      ? JSON.stringify(value)
      : String(value);
}
