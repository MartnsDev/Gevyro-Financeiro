import { expect, it } from 'vitest';
import { emptyWorkspace, type Plan } from '../src/domain/types';
import { occurrences } from '../src/domain/finance';
import {
  dailyAllowance,
  dailyForecast,
  endingInstallments,
  forecast,
  scenarioWorkspace,
} from '../src/domain/planning';
function fixture() {
  const w = emptyWorkspace();
  w.accounts = [
    {
      id: 'a',
      name: 'Conta',
      institution: '',
      type: 'digital',
      opening: 100000,
      openingDate: '2020-01-01',
      color: '#059669',
    },
  ];
  const p: Plan = {
    id: 'p',
    name: 'Salário',
    amount: 10000,
    kind: 'income',
    incomeType: 'fixed',
    category: 'Salário',
    accountId: 'a',
    cardId: '',
    date: '2024-02-01',
    mode: 'recurring',
    count: 1,
    interval: 1,
    unit: 'month',
    end: '',
    notes: '',
    subscription: false,
  };
  w.plans = [p];
  w.obligations = occurrences(p);
  return w;
}
it('projeção conservadora descarta renda variável não confirmada', () => {
  const w = fixture();
  w.plans[0].incomeType = 'variable';
  expect(forecast(w, 1, 'conservative', '2024-02-01')[0].income).toBe(0);
  w.plans[0].confirmed = true;
  expect(forecast(w, 1, 'conservative', '2024-02-01')[0].income).toBe(10000);
});
it('renda adicional só é aplicada como hipótese otimista', () => {
  const w = fixture();
  expect(forecast(w, 1, 'standard', '2024-02-01', 5000)[0].income).toBe(10000);
  expect(forecast(w, 1, 'optimistic', '2024-02-01', 5000)[0].income).toBe(15000);
});
it('saldo diário respeita datas civis e não altera o livro', () => {
  const w = fixture();
  const before = JSON.stringify(w);
  const rows = dailyForecast(w, 3, '2024-01-31');
  expect(rows.map((d) => d.date)).toEqual(['2024-01-31', '2024-02-01', '2024-02-02']);
  expect(rows[1].balance).toBe(110000);
  expect(JSON.stringify(w)).toBe(before);
  expect(dailyAllowance(10000, '2024-02-28')).toBe(5000);
});
it('cancelamento simulado exclui cobranças exatas sem cancelar os serviços reais', () => {
  const w = fixture();
  const simulated = scenarioWorkspace(w, ['p']);
  expect(simulated.obligations.filter((o) => !o.cancelled)).toHaveLength(0);
  expect(w.obligations.length).toBeGreaterThan(0);
  expect(w.plans[0].cancelledFrom).toBeUndefined();
});
it('liberação de parcelas começa no mês seguinte ao encerramento', () => {
  const w = fixture();
  w.plans[0] = {
    ...w.plans[0],
    mode: 'installment',
    kind: 'expense',
    count: 3,
    date: '2024-01-31',
    amount: 30000,
  };
  w.obligations = occurrences(w.plans[0]);
  expect(endingInstallments(w)[0]).toMatchObject({
    end: '2024-03-31',
    releaseMonth: '2024-04',
    monthly: 10000,
    remaining: 30000,
  });
});

it('média variável não duplica o que já foi recebido no mês atual', () => {
  const w = fixture();
  w.plans[0] = { ...w.plans[0], incomeType: 'variable', date: '2023-08-01' };
  w.obligations = occurrences(w.plans[0]);
  w.payments = w.obligations.slice(0, 7).map((o, i) => ({
    id: `received-${i}`,
    obligationId: o.id,
    accountId: 'a',
    amount: o.amount,
    date: o.date,
  }));
  const row = forecast(w, 1, 'standard', '2024-02-01')[0];
  expect(row.income).toBe(0);
  expect(row.estimate).toBe(0);
  expect(row.balance).toBe(170000);
  expect(forecast(w, 1, 'conservative', '2024-02-01')[0].balance).toBe(170000);
  expect(forecast(scenarioWorkspace(w, ['p']), 1, 'standard', '2024-02-01')[0].balance).toBe(
    170000,
  );
});
