import Decimal from 'decimal.js';
import { z } from 'zod';
import type { Asset, FinancialEvent, InvestmentDetails, Workspace } from './types';
import { today } from './finance';
import { investmentDetailsSchema } from './validation';

const D = Decimal.clone({ precision: 50, rounding: Decimal.ROUND_HALF_UP });
const rounded = (n: Decimal) => n.toDecimalPlaces(0).toNumber();
const sequence = (w: Workspace, id: string) =>
  1 +
  Math.max(0, ...w.events.filter((e) => e.targetId === id).map((e) => e.investment?.sequence ?? 0));
const snapshot = (a: Asset) => ({
  value: a.value,
  cost: a.cost,
  ...(a.quantity !== undefined ? { quantity: a.quantity } : {}),
});
export const operationLabels = {
  buy: 'Compra',
  sell: 'Venda',
  contribution: 'Aporte',
  redemption: 'Resgate',
  income: 'Rendimento',
  dividend: 'Provento',
  reversal: 'Estorno',
};
export interface InvestmentInput {
  id: string;
  assetId: string;
  accountId: string;
  date: string;
  operation: Exclude<InvestmentDetails['operation'], 'reversal'>;
  amount: number;
  fee: number;
  tax: number;
  quantity?: string;
  unitPrice?: string;
  note: string;
}
export function investmentOperation(w: Workspace, input: InvestmentInput): Workspace {
  if (w.events.some((e) => e.id === input.id)) return w;
  const a = w.assets.find((a) => a.id === input.assetId && a.type === 'investment');
  if (!a?.classification) throw new Error('Classifique o ativo antes de registrar operações.');
  const account = w.accounts.find((a) => a.id === input.accountId);
  if (
    !account ||
    !z.iso.date().safeParse(input.date).success ||
    input.date > today() ||
    input.date < account.openingDate ||
    input.date < a.date
  )
    throw new Error(
      'Use uma data efetiva, a partir do saldo da conta e da última avaliação do ativo.',
    );
  for (const n of [input.amount, input.fee, input.tax])
    if (!Number.isSafeInteger(n) || n < 0 || n > 1e13) throw new Error('Valor monetário inválido.');
  if (!input.amount) throw new Error('Informe um valor positivo.');
  const buying = ['buy', 'contribution'].includes(input.operation);
  const selling = ['sell', 'redemption'].includes(input.operation);
  const proceeds = input.amount - input.fee - input.tax;
  if (!buying && proceeds < 0) throw new Error('Taxas e impostos excedem o valor financeiro.');
  let qty: Decimal | undefined;
  if (input.quantity) {
    if (!/^(0|[1-9]\d{0,12})(\.\d{1,12})?$/.test(input.quantity))
      throw new Error('Quantidade inválida (até 12 casas decimais).');
    qty = new D(input.quantity);
    if (qty.lte(0) || (!buying && !selling))
      throw new Error('Quantidade deve ser positiva e pertence apenas a compra ou venda.');
  }
  if (input.unitPrice) {
    if (
      !qty ||
      !/^(0|[1-9]\d{0,12})(\.\d{1,12})?$/.test(input.unitPrice) ||
      new D(input.unitPrice).lte(0)
    )
      throw new Error('Preço unitário requer quantidade e valor positivo.');
    if (rounded(qty.mul(input.unitPrice).mul(100)) !== input.amount)
      throw new Error('Quantidade × preço unitário não corresponde ao valor financeiro.');
  }
  if ((input.operation === 'buy' || input.operation === 'sell') && !qty)
    throw new Error('Informe a quantidade para compra ou venda.');
  let value = a.value,
    cost = a.cost,
    quantity = a.quantity;
  if (buying) {
    if (qty && a.value > 0 && a.quantity === undefined)
      throw new Error('Informe a quantidade atual na avaliação antes de comprar mais unidades.');
    if (!qty && a.quantity !== undefined)
      throw new Error('Este ativo controla unidades: informe a quantidade adquirida.');
    value += input.amount;
    cost += input.amount + input.fee + input.tax;
    if (qty) quantity = new D(a.quantity ?? 0).add(qty).toFixed();
  }
  if (selling) {
    let fraction: Decimal;
    if (a.quantity !== undefined) {
      if (!qty || qty.gt(a.quantity) || new D(a.quantity).lte(0))
        throw new Error('Quantidade vendida excede a posição.');
      fraction = qty.div(a.quantity);
      quantity = new D(a.quantity).sub(qty).toFixed();
    } else {
      if (qty || input.amount > a.value || !a.value)
        throw new Error('Resgate sem unidades deve respeitar a avaliação atual.');
      fraction = new D(input.amount).div(a.value);
    }
    value -= rounded(new D(a.value).mul(fraction));
    cost -= rounded(new D(a.cost).mul(fraction));
  }
  const before = snapshot(a),
    after = { value, cost, ...(quantity !== undefined ? { quantity } : {}) };
  const investment = investmentDetailsSchema.parse({
    sequence: sequence(w, a.id),
    operation: input.operation,
    quantity: input.quantity || undefined,
    unitPrice: input.unitPrice || undefined,
    tax: input.tax,
    cash: buying ? -input.amount - input.fee - input.tax : proceeds,
    before,
    after,
  });
  const event: FinancialEvent = {
    id: input.id,
    kind: buying
      ? 'investment_contribution'
      : selling
        ? 'investment_redemption'
        : 'investment_income',
    targetId: a.id,
    accountId: input.accountId,
    amount: input.amount,
    fee: input.fee,
    date: input.date,
    note: input.note.trim() || operationLabels[input.operation],
    investment,
  };
  return {
    ...w,
    events: [...w.events, event],
    assets: w.assets.map((x) => (x.id === a.id ? { ...x, ...after, date: input.date } : x)),
  };
}
export function reverseInvestment(
  w: Workspace,
  eventId: string,
  id: string,
  date: string,
): Workspace {
  if (w.events.some((e) => e.id === id)) return w;
  const e = w.events.find((e) => e.id === eventId);
  if (
    !e?.investment ||
    e.investment.operation === 'reversal' ||
    w.events.some((x) => x.investment?.reversalOf === eventId)
  )
    throw new Error('Esta operação não pode ser estornada.');
  const a = w.assets.find((a) => a.id === e.targetId);
  const last = w.events
    .filter(
      (x) =>
        x.targetId === e.targetId &&
        x.kind.startsWith('investment_') &&
        x.investment?.operation !== 'reversal' &&
        !w.events.some((r) => r.investment?.reversalOf === x.id),
    )
    .sort((a, b) => (a.investment?.sequence ?? 0) - (b.investment?.sequence ?? 0))
    .at(-1);
  if (
    !a ||
    last?.id !== eventId ||
    JSON.stringify(snapshot(a)) !== JSON.stringify(e.investment.after)
  )
    throw new Error('Reverta as operações posteriores e avaliações primeiro.');
  if (!z.iso.date().safeParse(date).success || date < e.date || date < a.date || date > today())
    throw new Error('Data de estorno inválida.');
  const inv: InvestmentDetails = {
    sequence: sequence(w, a.id),
    operation: 'reversal',
    tax: e.investment.tax,
    cash: -e.investment.cash,
    before: e.investment.after,
    after: e.investment.before,
    reversalOf: e.id,
  };
  return {
    ...w,
    assets: w.assets.map((x) => {
      if (x.id !== a.id) return x;
      const restored = { ...x, ...inv.after, date };
      if (inv.after.quantity === undefined) delete restored.quantity;
      return restored;
    }),
    events: [
      ...w.events,
      {
        ...e,
        id,
        date,
        kind:
          e.kind === 'investment_contribution'
            ? 'investment_redemption'
            : 'investment_contribution',
        investment: inv,
        note: `Estorno de ${e.id}`,
      },
    ],
  };
}
export function portfolio(w: Workspace) {
  const assets = w.assets.filter((a) => a.type === 'investment');
  const cost = assets.reduce((s, a) => s + a.cost, 0),
    value = assets.reduce((s, a) => s + a.value, 0);
  const groups = new Map<string, number>();
  for (const a of assets)
    groups.set(
      a.classification ?? 'Não classificado',
      (groups.get(a.classification ?? 'Não classificado') ?? 0) + a.value,
    );
  return {
    assets,
    cost,
    value,
    returnPercent: cost
      ? new D(value - cost).div(cost).mul(100).toDecimalPlaces(2).toNumber()
      : null,
    distribution: [...groups].map(([name, value]) => ({ name, value })),
  };
}

export function portfolioEvolution(w: Workspace) {
  const positions = new Map(
    w.assets.filter((a) => a.type === 'investment').map((a) => [a.id, a.value]),
  );
  const history = w.audit.filter((a) =>
    a.changes?.some(
      (c) =>
        c.entity === 'assets' &&
        (c.before?.type === 'investment' || c.after?.type === 'investment'),
    ),
  );
  for (const a of history.slice().reverse())
    for (const c of a.changes ?? [])
      if (c.entity === 'assets') {
        if (c.before?.type === 'investment') positions.set(c.id, Number(c.before.value));
        else positions.delete(c.id);
      }
  const result: { name: string; income: number; expense: number; balance: number }[] = [];
  for (const a of history) {
    for (const c of a.changes ?? [])
      if (c.entity === 'assets') {
        if (c.after?.type === 'investment') positions.set(c.id, Number(c.after.value));
        else positions.delete(c.id);
      }
    result.push({
      name: new Date(a.at).toLocaleDateString('pt-BR'),
      income: 0,
      expense: 0,
      balance: [...positions.values()].reduce((s, n) => s + n, 0),
    });
  }
  return result;
}
