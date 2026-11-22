import Papa from 'papaparse';
import { describe, expect, it } from 'vitest';
import { emptyWorkspace } from '../src/domain/types';
import { backupCSV, backupJSON } from '../src/lib/backup';
import { COST_POLICY, jsonBytes } from '../src/lib/cost-policy';
import { occurrences } from '../src/domain/finance';
function fixture() {
  const w = emptyWorkspace();
  w.accounts = [
    {
      id: 'a',
      name: 'Minha conta',
      institution: 'Banco',
      type: 'digital',
      opening: 12345,
      openingDate: '2020-01-01',
      color: '#059669',
    },
  ];
  w.plans = [
    {
      id: 'p',
      name: 'Compra, com "aspas"',
      amount: 100,
      kind: 'expense',
      category: 'Outros',
      accountId: 'a',
      cardId: '',
      date: '2024-01-01',
      mode: 'once',
      count: 1,
      interval: 1,
      unit: 'month',
      end: '',
      notes: 'Linha 1\nLinha 2',
      subscription: false,
    },
  ];
  w.obligations = occurrences(w.plans[0]);
  w.payments = [
    {
      id: 'pay',
      obligationId: 'p:1',
      accountId: 'a',
      amount: 100,
      date: '2024-01-01',
      reversed: true,
    },
  ];
  w.audit = [{ id: 'audit', at: '2024-01-01T00:00:00Z', action: 'Pagamento estornado' }];
  w.imports = ['hash'];
  return w;
}
describe('Backup completo e independente do período', () => {
  it('JSON preserva centavos, histórico e preferências', () => {
    const w = fixture();
    expect(JSON.parse(backupJSON(w))).toEqual(w);
  });
  it('CSV inclui todas as entidades, inclusive escalares, cancelamentos e estornos', () => {
    const w = fixture();
    const parsed = Papa.parse<{ entity: string; id: string; record_json: string }>(backupCSV(w), {
      header: true,
    });
    expect(parsed.errors).toHaveLength(0);
    const rebuilt = Object.fromEntries(
      Object.entries(w).map(([entity, value]) => [
        entity,
        Array.isArray(value)
          ? parsed.data.filter((r) => r.entity === entity).map((r) => JSON.parse(r.record_json))
          : JSON.parse(parsed.data.find((r) => r.entity === entity)!.record_json),
      ]),
    );
    expect(rebuilt).toEqual(w);
    expect(rebuilt.payments[0].reversed).toBe(true);
  });
  it('backup JSON permanece disponível acima do limite de novas gravações', () => {
    const w = fixture();
    w.audit = Array.from({ length: 7000 }, (_, i) => ({
      id: `audit-${i}`,
      at: '2026-11-20T12:00:00Z',
      action: 'a'.repeat(1800),
    }));
    expect(jsonBytes(w)).toBeGreaterThan(COST_POLICY.maxWorkspaceBytes);
    expect(JSON.parse(backupJSON(w)).audit).toHaveLength(7000);
  });
  it('exportação não altera dados', () => {
    const w = fixture();
    const before = JSON.stringify(w);
    backupJSON(w);
    backupCSV(w);
    expect(JSON.stringify(w)).toBe(before);
  });
});
