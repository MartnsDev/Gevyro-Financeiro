import { z } from 'zod';
import Decimal from 'decimal.js';
const id = z.string().min(1).max(100);
const text = z.string().max(2000);
const amount = z.number().int().min(0).max(1e13);
const signed = z.number().int().min(-1e13).max(1e13);
const date = z.iso.date();
export const accountSchema = z.object({
  id,
  name: text.min(1),
  institution: text,
  type: text,
  opening: signed,
  openingDate: date,
  color: text,
});
export const cardSchema = z.object({
  id,
  name: text.min(1),
  limit: amount,
  closing: z.number().int().min(1).max(31),
  due: z.number().int().min(1).max(31),
  accountId: id,
  last4: z.string().regex(/^\d{0,4}$/),
});
export const planSchema = z.object({
  id,
  name: text.min(1),
  amount: amount.positive(),
  kind: z.enum(['income', 'expense']),
  category: text,
  accountId: z.string(),
  cardId: z.string(),
  date,
  mode: z.enum(['once', 'installment', 'recurring']),
  count: z.number().int().min(1).max(600),
  interval: z.number().int().min(1).max(365),
  unit: z.enum(['month', 'day']),
  end: z.union([date, z.literal('')]),
  notes: text,
  subscription: z.boolean(),
  cancelledFrom: date.optional(),
  pausedFrom: date.optional(),
  beneficiary: text.optional(),
  subcategory: text.optional(),
  tags: z.array(z.string().max(80)).max(30).optional(),
  externalId: z.string().max(200).optional(),
  incomeType: z.enum(['fixed', 'variable']).optional(),
  confirmed: z.boolean().optional(),
});
export const workspaceSchema = z
  .object({
    schema: z.literal(1),
    events: z
      .array(
        z.object({
          id,
          kind: z.enum([
            'balance_adjustment',
            'investment_contribution',
            'investment_redemption',
            'investment_income',
            'debt_drawdown',
            'debt_payment',
            'goal_reserve',
            'goal_withdrawal',
            'obligation_adjustment',
            'purchase_refund',
          ]),
          targetId: id,
          accountId: z.string(),
          amount: signed,
          fee: amount,
          date,
          note: text,
        }),
      )
      .max(50000)
      .default([]),
    notifications: z
      .array(
        z.object({
          id,
          title: text,
          description: text,
          targetId: z.string(),
          date,
          read: z.boolean(),
        }),
      )
      .max(10000)
      .default([]),
    accounts: z.array(accountSchema).max(100),
    cards: z.array(cardSchema).max(100),
    plans: z.array(planSchema).max(10000),
    obligations: z
      .array(
        z.object({
          id,
          planId: id,
          name: text,
          amount: amount.positive(),
          kind: z.enum(['income', 'expense']),
          category: text,
          accountId: z.string(),
          cardId: z.string(),
          date,
          purchaseDate: date,
          installment: z.number().int().positive(),
          total: z.number().int().min(0),
          subscription: z.boolean(),
          cancelled: z.boolean(),
          paused: z.boolean().optional(),
        }),
      )
      .max(200000),
    payments: z
      .array(
        z.object({
          id,
          obligationId: id,
          accountId: id,
          amount: amount.positive(),
          date,
          reversed: z.boolean().optional(),
        }),
      )
      .max(200000),
    transfers: z.array(
      z.object({ id, from: id, to: id, amount: amount.positive(), fee: amount, date }),
    ),
    goals: z.array(
      z.object({
        id,
        name: text.min(1),
        target: amount.positive(),
        reserved: amount,
        monthly: amount,
        date,
      }),
    ),
    budgets: z.array(
      z.object({
        id,
        category: text,
        amount: amount.positive(),
        month: z.string().regex(/^\d{4}-\d{2}$/),
        perspective: z.enum(['cash', 'accrual']).optional(),
      }),
    ),
    assets: z.array(
      z.object({
        id,
        name: text.min(1),
        type: z.enum(['investment', 'asset', 'debt']),
        value: amount,
        cost: amount,
        date,
        notes: text,
      }),
    ),
    scenarios: z.array(
      z.object({
        id,
        name: text.min(1),
        cancelledPlanIds: z.array(id).max(1000).optional(),
        incomeDelta: signed,
        expenseReduction: amount,
        months: z.number().int().min(1).max(60),
      }),
    ),
    categories: z.array(text).max(500),
    audit: z.array(z.object({ id, at: z.string(), action: text })),
    imports: z.array(text),
    preferences: z.object({
      archivedCategories: z.array(text).max(500).optional(),
      name: text,
      currency: z.literal('BRL'),
      payday: z.number().int().min(1).max(31),
      estimatedIncome: amount,
      reminderDays: z.number().int().min(0).max(90),
      onboarding: z.boolean(),
      theme: z.enum(['light', 'dark']).optional(),
    }),
  })
  .superRefine((w, ctx) => {
    let magnitude = new Decimal(0);
    for (const rows of [
      w.accounts,
      w.obligations,
      w.payments,
      w.transfers,
      w.goals,
      w.assets,
      w.events,
    ])
      for (const record of rows)
        for (const key of [
          'opening',
          'amount',
          'fee',
          'value',
          'cost',
          'target',
          'reserved',
          'monthly',
        ]) {
          const value = (record as unknown as Record<string, unknown>)[key];
          if (typeof value === 'number') magnitude = magnitude.add(new Decimal(value).abs());
        }
    if (magnitude.gt(Number.MAX_SAFE_INTEGER))
      ctx.addIssue({
        code: 'custom',
        message: 'O conjunto de valores excede a faixa monetária exata suportada.',
      });
    const accountIds = new Set(w.accounts.map((a) => a.id));
    const cardIds = new Set(w.cards.map((c) => c.id));
    const plans = new Set(w.plans.map((p) => p.id));
    const obs = new Map(w.obligations.map((o) => [o.id, o]));
    const fail = (message: string) => ctx.addIssue({ code: 'custom', message });
    for (const key of [
      'accounts',
      'cards',
      'plans',
      'obligations',
      'payments',
      'transfers',
      'goals',
      'budgets',
      'assets',
      'scenarios',
      'events',
      'notifications',
    ] as const) {
      if (new Set(w[key].map((x) => x.id)).size !== w[key].length)
        fail(`Identificador duplicado: ${key}`);
    }
    for (const c of w.cards)
      if (!accountIds.has(c.accountId)) fail('Conta do cartão não encontrada.');
    for (const p of w.plans)
      if ((p.cardId && !cardIds.has(p.cardId)) || (!p.cardId && !accountIds.has(p.accountId)))
        fail('Conta ou cartão do lançamento não encontrado.');
    for (const o of w.obligations)
      if (
        !plans.has(o.planId) ||
        (o.cardId && !cardIds.has(o.cardId)) ||
        (!o.cardId && !accountIds.has(o.accountId))
      )
        fail('Obrigação com referência inválida.');
    const sums = new Map<string, number>();
    for (const p of w.payments) {
      if (!obs.has(p.obligationId) || !accountIds.has(p.accountId))
        fail('Pagamento com referência inválida.');
      if (!p.reversed) sums.set(p.obligationId, (sums.get(p.obligationId) || 0) + p.amount);
    }
    for (const [key, value] of sums)
      if (
        value >
        (obs.get(key)?.amount ?? 0) +
          w.events
            .filter((e) => e.kind === 'obligation_adjustment' && e.targetId === key)
            .reduce((s, e) => s + e.amount, 0)
      )
        fail('Pagamento excede o valor devido.');
    for (const e of w.events) {
      if (
        !e.amount ||
        (!['obligation_adjustment', 'balance_adjustment'].includes(e.kind) && e.amount < 0)
      )
        fail('Evento com valor inválido.');
      const target = e.kind.startsWith('goal_')
        ? w.goals.some((g) => g.id === e.targetId)
        : e.kind.startsWith('investment_')
          ? w.assets.some((a) => a.id === e.targetId && a.type === 'investment')
          : e.kind.startsWith('debt_')
            ? w.assets.some((a) => a.id === e.targetId && a.type === 'debt')
            : e.kind === 'balance_adjustment'
              ? accountIds.has(e.targetId)
              : obs.has(e.targetId);
      if (!target) fail('Evento com destino inexistente.');
      if (
        !['goal_reserve', 'goal_withdrawal', 'obligation_adjustment'].includes(e.kind) &&
        !accountIds.has(e.accountId)
      )
        fail('Conta do evento não encontrada.');
    }
    for (const o of w.obligations) {
      const adjusted =
        o.amount +
        w.events
          .filter((e) => e.targetId === o.id && e.kind === 'obligation_adjustment')
          .reduce((s, e) => s + e.amount, 0);
      const refunded = w.events
        .filter((e) => e.targetId === o.id && e.kind === 'purchase_refund')
        .reduce((s, e) => s + e.amount, 0);
      if (adjusted < 0 || refunded > (sums.get(o.id) || 0))
        fail('Ajuste ou estorno excede o permitido.');
    }
    for (const t of w.transfers)
      if (t.from === t.to || !accountIds.has(t.from) || !accountIds.has(t.to))
        fail('Transferência inválida.');
  });
export const entryFormSchema = z.object({
  name: z.string().min(2, 'Informe uma descrição.').max(120),
  amount: z.string().min(1, 'Informe o valor.'),
  kind: z.enum(['income', 'expense']),
  category: z.string().min(1),
  accountId: z.string(),
  cardId: z.string(),
  date: z.iso.date(),
  mode: z.enum(['once', 'installment', 'recurring']),
  count: z.coerce.number<number>().int().min(1).max(600),
  interval: z.coerce.number<number>().int().min(1).max(365),
  unit: z.enum(['month', 'day']),
  end: z.string(),
  notes: z.string().max(2000),
  subscription: z.boolean(),
  settled: z.boolean(),
  incomeType: z.enum(['fixed', 'variable']).default('fixed'),
  confirmed: z.boolean().default(false),
  beneficiary: z.string().max(2000).default(''),
  subcategory: z.string().max(2000).default(''),
  tags: z.string().max(2000).default(''),
});
export type EntryForm = z.infer<typeof entryFormSchema>;

export type EntryInput = z.input<typeof entryFormSchema>;
