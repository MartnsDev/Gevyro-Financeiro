export type Kind = 'income' | 'expense';
export interface Account {
  id: string;
  name: string;
  institution: string;
  type: string;
  opening: number;
  openingDate: string;
  color: string;
}
export interface Card {
  id: string;
  name: string;
  limit: number;
  closing: number;
  due: number;
  accountId: string;
  last4: string;
}
export interface Plan {
  id: string;
  name: string;
  amount: number;
  kind: Kind;
  category: string;
  accountId: string;
  cardId: string;
  date: string;
  mode: 'once' | 'installment' | 'recurring';
  count: number;
  interval: number;
  unit: 'month' | 'day';
  end: string;
  notes: string;
  subscription: boolean;
  cancelledFrom?: string;
  pausedFrom?: string;
  beneficiary?: string;
  subcategory?: string;
  tags?: string[];
  externalId?: string;
  incomeType?: 'fixed' | 'variable';
  confirmed?: boolean;
}
export interface Obligation {
  id: string;
  planId: string;
  name: string;
  amount: number;
  kind: Kind;
  category: string;
  accountId: string;
  cardId: string;
  date: string;
  purchaseDate: string;
  installment: number;
  total: number;
  subscription: boolean;
  cancelled: boolean;
  paused?: boolean;
  originalDate?: string;
  originalAmount?: number;
  notes?: string;
}
export interface Payment {
  id: string;
  obligationId: string;
  accountId: string;
  amount: number;
  date: string;
  reversed?: boolean;
}
export interface Transfer {
  id: string;
  from: string;
  to: string;
  amount: number;
  fee: number;
  date: string;
}
export interface Goal {
  id: string;
  name: string;
  target: number;
  reserved: number;
  monthly: number;
  date: string;
}
export interface Budget {
  perspective?: 'cash' | 'accrual';
  id: string;
  category: string;
  amount: number;
  month: string;
}
export const investmentClasses = [
  'Renda fixa',
  'Ações',
  'Fundos imobiliários',
  'ETFs',
  'Tesouro Direto',
  'Fundos de investimento',
  'Criptomoedas',
  'Outros investimentos',
] as const;
export type InvestmentClass = (typeof investmentClasses)[number];
export interface InvestmentDetails {
  sequence: number;
  operation: 'buy' | 'sell' | 'contribution' | 'redemption' | 'income' | 'dividend' | 'reversal';
  quantity?: string;
  unitPrice?: string;
  tax: number;
  cash: number;
  before: { value: number; cost: number; quantity?: string };
  after: { value: number; cost: number; quantity?: string };
  reversalOf?: string;
}
export interface Asset {
  id: string;
  name: string;
  type: 'investment' | 'asset' | 'debt';
  classification?: InvestmentClass;
  ticker?: string;
  subcategory?: string;
  institution?: string;
  quantity?: string;
  value: number;
  cost: number;
  date: string;
  notes: string;
}
export interface Scenario {
  cancelledPlanIds?: string[];
  id: string;
  name: string;
  incomeDelta: number;
  expenseReduction: number;
  months: number;
}
export type HistoryEntity =
  | 'accounts'
  | 'cards'
  | 'plans'
  | 'obligations'
  | 'payments'
  | 'transfers'
  | 'goals'
  | 'budgets'
  | 'assets'
  | 'scenarios'
  | 'events';
export interface RecordChange {
  entity: HistoryEntity;
  id: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}
export interface Audit {
  id: string;
  at: string;
  action: string;
  changes?: RecordChange[];
  undoOf?: string;
}
export interface Preferences {
  archivedCategories?: string[];
  name: string;
  currency: string;
  payday: number;
  estimatedIncome: number;
  reminderDays: number;
  onboarding: boolean;
  theme?: 'light' | 'dark';
}
export interface Workspace {
  schema: 1;
  events: FinancialEvent[];
  notifications: FinancialNotification[];
  accounts: Account[];
  cards: Card[];
  plans: Plan[];
  obligations: Obligation[];
  payments: Payment[];
  transfers: Transfer[];
  goals: Goal[];
  budgets: Budget[];
  assets: Asset[];
  scenarios: Scenario[];
  categories: string[];
  audit: Audit[];
  imports: string[];
  preferences: Preferences;
}
export const categories = [
  'Moradia',
  'Alimentação',
  'Transporte',
  'Saúde',
  'Educação',
  'Lazer',
  'Compras',
  'Serviços',
  'Assinaturas',
  'Investimentos',
  'Impostos',
  'Tarifas',
  'Salário',
  'Freelance',
  'Outros',
];
export function emptyWorkspace(): Workspace {
  return {
    schema: 1,
    events: [],
    notifications: [],
    accounts: [],
    cards: [],
    plans: [],
    obligations: [],
    payments: [],
    transfers: [],
    goals: [],
    budgets: [],
    assets: [],
    scenarios: [],
    categories: [...categories],
    audit: [],
    imports: [],
    preferences: {
      name: '',
      currency: 'BRL',
      payday: 5,
      estimatedIncome: 0,
      reminderDays: 7,
      onboarding: false,
    },
  };
}

export type EventKind =
  | 'balance_adjustment'
  | 'investment_contribution'
  | 'investment_redemption'
  | 'investment_income'
  | 'debt_drawdown'
  | 'debt_payment'
  | 'goal_reserve'
  | 'goal_withdrawal'
  | 'obligation_adjustment'
  | 'purchase_refund'
  | 'purchase_refund_reversal';
export interface FinancialEvent {
  id: string;
  kind: EventKind;
  targetId: string;
  accountId: string;
  amount: number;
  fee: number;
  date: string;
  note: string;
  investment?: InvestmentDetails;
  reversalOf?: string;
  reversalFeeOf?: string;
}
export interface FinancialNotification {
  id: string;
  title: string;
  description: string;
  targetId: string;
  date: string;
  read: boolean;
}
