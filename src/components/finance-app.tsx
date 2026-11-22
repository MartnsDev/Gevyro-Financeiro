'use client';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Bell,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  CreditCard,
  Download,
  Ellipsis,
  Eye,
  EyeOff,
  FileChartColumn,
  FolderInput,
  Gauge,
  Landmark,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Menu,
  Moon,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  TrendingUp,
  Wallet,
  X,
  CheckCheck,
  Pencil,
  Ban,
  CircleAlert,
  Repeat2,
  Layers,
  PiggyBank,
  Tag,
  Upload,
  LockKeyhole,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import Papa from 'papaparse';
import { parseOFX, normalizeBankDate, type ImportRow } from '@/lib/import-files';
import { toast, Toaster } from 'sonner';
import { addDays, format, getDaysInMonth, parseISO, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { emptyWorkspace, type Obligation, type Plan, type Workspace } from '@/domain/types';
import {
  addPayment,
  averageIncome,
  balance,
  cashFlow,
  due,
  cents,
  civil,
  metrics,
  money,
  monthOf,
  monthlySubscription,
  occurrences,
  paid,
  payInvoice,
  remaining,
  shiftMonth,
  status,
  today,
  totalBalance,
} from '@/domain/finance';
import {
  cancelFuture,
  pauseSubscription,
  resumeSubscription,
  revisePlan,
  reverseImport,
  reversePayment,
} from '@/domain/operations';
import { InvestmentPanel } from './investment-panel';
import { OccurrenceControl, PurchaseDialog } from './installment-control';
import { RecordHistory } from './record-history';
import { mergeAudit, recordChanges, undoChange } from '@/domain/history';
import { financialOverview } from '@/domain/overview';
import { workspaceSchema } from '@/domain/validation';
import { loadWorkspace, saveWorkspace } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { AccountGate } from './account-gate';
import { startCloudSync } from '@/lib/cloud-sync';
import { Button } from './ui/button';
import { Modal } from './ui/dialog';
import { EntryEditor } from './entry-form';
import { ResourceForm, type ResourceKind } from './resource-form';
import { CategoryChart, FlowChart } from './charts';
import { GevyroLogo } from './gevyro-logo';
import { CostSafetyPanel } from './cost-safety-panel';
import { backupCSV, backupJSON } from '@/lib/backup';
import { COST_POLICY } from '@/lib/cost-policy';
import { copyLocalWorkspaceToCloud } from '@/lib/local-to-cloud';
import { JournalDialog, JournalHistory } from './journal-dialog';
import {
  forecast as calculateForecast,
  dailyAllowance,
  dailyForecast,
  endingInstallments,
  scenarioWorkspace,
  type Strategy,
} from '@/domain/planning';
import { budgetUsage, reportRows, type Perspective } from '@/domain/reports';
import { financialNotifications, persistNotifications } from '@/domain/notifications';

const nav: { id: string; label: string; icon: LucideIcon; group: string }[] = [
  { id: 'dashboard', label: 'Visão geral', icon: LayoutDashboard, group: 'PRINCIPAL' },
  { id: 'journal', label: 'Aportes e ajustes', icon: ArrowLeftRight, group: 'PRINCIPAL' },
  { id: 'transactions', label: 'Movimentações', icon: ArrowLeftRight, group: 'PRINCIPAL' },
  { id: 'accounts', label: 'Contas e carteiras', icon: Wallet, group: 'PRINCIPAL' },
  { id: 'cards', label: 'Cartões de crédito', icon: CreditCard, group: 'PRINCIPAL' },
  { id: 'installments', label: 'Parcelamentos', icon: Layers, group: 'PRINCIPAL' },
  { id: 'subscriptions', label: 'Assinaturas', icon: Repeat2, group: 'PRINCIPAL' },
  { id: 'calendar', label: 'Calendário', icon: CalendarDays, group: 'PRINCIPAL' },
  { id: 'planning', label: 'Planejamento', icon: ChartNoAxesCombined, group: 'SEU FUTURO' },
  { id: 'budgets', label: 'Orçamentos', icon: Gauge, group: 'SEU FUTURO' },
  { id: 'goals', label: 'Metas financeiras', icon: Target, group: 'SEU FUTURO' },
  { id: 'investments', label: 'Investimentos', icon: TrendingUp, group: 'SEU FUTURO' },
  { id: 'wealth', label: 'Patrimônio e dívidas', icon: Landmark, group: 'SEU FUTURO' },
  { id: 'reports', label: 'Relatórios', icon: FileChartColumn, group: 'ANÁLISE' },
  { id: 'import', label: 'Importar e exportar', icon: FolderInput, group: 'ANÁLISE' },
];
const titles: Record<string, [string, string]> = {
  journal: [
    'Aportes, reservas e ajustes',
    'Registre movimentos patrimoniais e correções com histórico.',
  ],
  dashboard: [
    'Seu dinheiro, com clareza.',
    'Uma visão completa das suas finanças, em um só lugar.',
  ],
  transactions: ['Movimentações', 'Cada entrada e saída, organizada do seu jeito.'],
  accounts: ['Contas e carteiras', 'Seu dinheiro, distribuído e sempre sob controle.'],
  cards: ['Cartões de crédito', 'Limites, compras e faturas sem perder os detalhes.'],
  installments: ['Parcelamentos', 'Saiba o que falta pagar e quando seu dinheiro fica livre.'],
  subscriptions: ['Assinaturas', 'Pequenos compromissos. Uma visão completa.'],
  calendar: ['Calendário financeiro', 'Antecipe seus compromissos e planeje com tranquilidade.'],
  planning: [
    'Planeje seu próximo passo.',
    'Transforme os compromissos de hoje em clareza para o futuro.',
  ],
  budgets: ['Orçamentos', 'Dê um destino ao seu dinheiro, categoria por categoria.'],
  goals: ['Metas financeiras', 'O que é importante para você merece um plano.'],
  investments: ['Investimentos', 'Acompanhe seu patrimônio com avaliações informadas por você.'],
  wealth: ['Patrimônio e dívidas', 'Tudo o que você tem. Tudo o que você deve.'],
  reports: ['Relatórios', 'Encontre as respostas nos seus próprios números.'],
  import: ['Seus dados, sempre seus.', 'Importe com revisão e exporte quando precisar.'],
  settings: ['Preferências', 'Uma experiência financeira do seu jeito.'],
  help: ['Como o Gevyro calcula', 'Conceitos simples para entender cada número.'],
};
const statusLabels = {
  paid: 'Pago',
  partial: 'Parcial',
  overdue: 'Atrasado',
  pending: 'Pendente',
  cancelled: 'Cancelado',
};
const dateLabel = (date: string) => format(parseISO(date), 'dd MMM', { locale: ptBR });
const monthLabel = (month: string) =>
  format(parseISO(`${month}-01`), 'MMMM yyyy', { locale: ptBR });
const uid = () => crypto.randomUUID();
function Panel({
  title,
  subtitle,
  action,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
function Empty({
  icon: Icon = ReceiptText,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon size={25} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
function Stat({
  label,
  value,
  description,
  icon: Icon,
  tone = 'neutral',
  onClick,
}: {
  label: string;
  value: string;
  description: string;
  icon: LucideIcon;
  tone?: string;
  onClick?: () => void;
}) {
  return (
    <button className={`stat ${tone}`} onClick={onClick}>
      <div className="stat-top">
        <span>{label}</span>
        <span className="stat-icon">
          <Icon size={19} />
        </span>
      </div>
      <strong>{value}</strong>
      <small>{description}</small>
    </button>
  );
}
function download(name: string, content: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function FinanceWorkspace({ accountUser }: { accountUser: User }) {
  const loadAttempt = useRef(0);
  const [w, setW] = useState<Workspace>(emptyWorkspace);
  const [revision, setRevision] = useState(0);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState('');
  const user = accountUser;
  const [syncError, setSyncError] = useState('');
  const [page, setPage] = useState('dashboard');
  const [month, setMonth] = useState(today().slice(0, 7));
  const dark = w.preferences.theme === 'dark';
  const [hidden, setHidden] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [search, setSearch] = useState('');
  const [entryOpen, setEntryOpen] = useState(false);
  const [editing, setEditing] = useState<Plan>();
  const [subscriptionNew, setSubscriptionNew] = useState(false);
  const [resource, setResource] = useState<ResourceKind | null>(null);
  const [editResource, setEditResource] = useState<Record<string, string | number>>();
  const [journalOpen, setJournalOpen] = useState(false);
  const [payment, setPayment] = useState<Obligation | null>(null);
  const [detail, setDetail] = useState<Obligation | null>(null);
  const [purchaseId, setPurchaseId] = useState('');
  const [investmentEditing, setInvestmentEditing] = useState(false);
  const [invoice, setInvoice] = useState<{ card: string; month: string } | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [onboarding, setOnboarding] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [confirm, setConfirm] = useState<{
    title: string;
    description: string;
    run: () => Promise<void>;
  } | null>(null);
  const [filter, setFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState('all');
  const [perspective, setPerspective] = useState<Perspective>('cash');
  const [reportFrom, setReportFrom] = useState('');
  const [reportTo, setReportTo] = useState('');
  const [strategy, setStrategy] = useState<Strategy>('standard');
  const [simulatedSubscriptions, setSimulatedSubscriptions] = useState<string[]>([]);
  const [horizon, setHorizon] = useState(12);
  const [selectedScenario, setSelectedScenario] = useState('');
  const [calendarView, setCalendarView] = useState('month');
  const [selectedDay, setSelectedDay] = useState('');
  const [listLimit, setListLimit] = useState<number>(COST_POLICY.pageSize);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importAccount, setImportAccount] = useState('');
  const [importHash, setImportHash] = useState('');
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [rawImport, setRawImport] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState({
    description: 'description',
    amount: 'amount',
    date: 'date',
  });
  const lock = useRef(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const f = useCallback((n: number) => money(n, hidden), [hidden]);
  const resetWorkspaceView = useCallback(() => {
    setEntryOpen(false);
    setEditing(undefined);
    setSubscriptionNew(false);
    setResource(null);
    setEditResource(undefined);
    setJournalOpen(false);
    setPayment(null);
    setDetail(null);
    setPurchaseId('');
    setInvoice(null);
    setAuthOpen(false);
    setOnboarding(false);
    setNotifications(false);
    setConfirm(null);
    setSearch('');
    setImportRows([]);
    setImportAccount('');
    setImportHash('');
    setImportHeaders([]);
    setRawImport([]);
    setSelectedScenario('');
    setSimulatedSubscriptions([]);
    setAccountFilter('all');
    setCategoryFilter('all');
  }, []);
  const refresh = useCallback(
    async (userId?: string) => {
      const attempt = ++loadAttempt.current;
      resetWorkspaceView();
      setW(emptyWorkspace());
      setRevision(0);
      setReady(false);
      setLoadError('');
      setSyncError('');
      try {
        const data = await loadWorkspace(userId);
        if (attempt !== loadAttempt.current) return;
        setW(data.data);
        setRevision(data.revision);
      } catch (e) {
        if (attempt === loadAttempt.current)
          setLoadError(e instanceof Error ? e.message : 'Não foi possível carregar os dados.');
      } finally {
        if (attempt === loadAttempt.current) setReady(true);
      }
    },
    [resetWorkspaceView],
  );
  useEffect(() => {
    const attempt = loadAttempt;
    const task = window.setTimeout(() => void refresh(user.id), 0);
    return () => {
      window.clearTimeout(task);
      ++attempt.current;
    };
  }, [refresh, user.id]);
  const editingCloudData =
    entryOpen ||
    !!resource ||
    !!detail ||
    !!purchaseId ||
    investmentEditing ||
    journalOpen ||
    !!payment ||
    !!invoice ||
    onboarding ||
    !!confirm ||
    importRows.length > 0;
  useEffect(() => {
    if (!ready || loadError || editingCloudData) return;
    return startCloudSync({
      userId: user.id,
      revision,
      canApply: () => !lock.current,
      onData: (stored) => {
        setW(stored.data);
        setRevision(stored.revision);
      },
      onError: setSyncError,
    });
  }, [user.id, revision, ready, loadError, editingCloudData]);
  useEffect(() => {
    const enabled = w.preferences.theme === 'dark';
    document.documentElement.classList.toggle('dark', enabled);
  }, [w.preferences.theme]);
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (
        e.key === 'n' &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName) &&
        !e.metaKey &&
        !e.ctrlKey
      ) {
        setEditing(undefined);
        setEntryOpen(true);
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);
  useEffect(() => {
    if ('serviceWorker' in navigator)
      void navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);
  async function commit(next: Workspace, action: string, undoOf?: string) {
    if (lock.current) throw new Error('Aguarde a operação atual.');
    if (loadError) throw new Error('Recarregue os dados antes de gravar.');
    const attempt = loadAttempt.current;
    lock.current = true;
    setBusy(true);
    try {
      const updated = persistNotifications({
        ...next,
        audit: [
          ...mergeAudit(w.audit, next.audit),
          {
            id: uid(),
            at: new Date().toISOString(),
            action,
            changes: recordChanges(w, next),
            ...(undoOf ? { undoOf } : {}),
          },
        ],
      });
      const nextRevision = await saveWorkspace(updated, revision, user?.id);
      if (attempt !== loadAttempt.current) return;
      setW(updated);
      setRevision(nextRevision);
      toast.success(action);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'Falha na persistência. Os dados não foram salvos.',
      );
      throw e;
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  function go(id: string) {
    setPage(id);
    setMobile(false);
    setSelectedDay('');
    setListLimit(COST_POLICY.pageSize);
  }
  function newEntry(sub = false) {
    if (!w.accounts.length) {
      toast.info('Cadastre sua primeira conta para registrar movimentações.');
      openResource('account');
      return;
    }
    setEditing(undefined);
    setSubscriptionNew(sub);
    setEntryOpen(true);
  }
  function openResource(kind: ResourceKind, initial?: Record<string, string | number>) {
    if (['card', 'transfer'].includes(kind) && !w.accounts.length) {
      toast.info('Cadastre uma conta primeiro.');
      setResource('account');
    } else {
      setResource(kind);
    }
    setEditResource(initial);
  }
  async function savePlan(plan: Plan, settled: boolean) {
    const previous = w.plans.find((p) => p.id === plan.id);
    let next = revisePlan(w, plan);
    if (settled && !previous) {
      const first = next.obligations.find((o) => o.planId === plan.id);
      if (first) next = addPayment(next, first.id, plan.accountId, first.amount, today(), uid());
    }
    await commit(next, previous ? 'Lançamento atualizado' : 'Movimentação adicionada');
    setEntryOpen(false);
  }
  async function saveResource(v: Record<string, string>) {
    try {
      const id = typeof editResource?.id === 'string' ? editResource.id : uid();
      const next = { ...w };
      const value = (key: string) => cents(v[key] || '0');
      switch (resource) {
        case 'account': {
          const exists = w.accounts.find((a) => a.id === id);
          const a = {
            id,
            name: v.name.trim(),
            institution: v.institution || '',
            type: v.type,
            opening: value('opening'),
            openingDate: v.openingDate,
            color: '#059669',
          };
          if (
            exists &&
            (exists.opening !== a.opening || exists.openingDate !== a.openingDate) &&
            (w.payments.some((p) => p.accountId === id) ||
              w.transfers.some((t) => t.from === id || t.to === id))
          )
            throw new Error(
              'O saldo inicial com histórico não pode ser alterado. Use uma movimentação de ajuste identificada.',
            );
          next.accounts = [...w.accounts.filter((a) => a.id !== id), a];
          break;
        }
        case 'card':
          next.cards = [
            ...w.cards.filter((c) => c.id !== id),
            {
              id,
              name: v.name,
              limit: value('limit'),
              closing: Number(v.closing),
              due: Number(v.due),
              accountId: v.accountId,
              last4: v.last4 || '',
            },
          ];
          break;
        case 'goal': {
          const reserved = value('reserved');
          const others = w.goals.filter((g) => g.id !== id).reduce((s, g) => s + g.reserved, 0);
          if (reserved + others > totalBalance(w))
            throw new Error('As reservas não podem exceder o saldo real disponível.');
          next.goals = [
            ...w.goals.filter((g) => g.id !== id),
            {
              id,
              name: v.name,
              target: value('target'),
              reserved,
              monthly: value('monthly'),
              date: v.date,
            },
          ];
          break;
        }
        case 'budget':
          if (
            w.budgets.some((b) => b.id !== id && b.category === v.category && b.month === v.month)
          )
            throw new Error('Já existe um orçamento para essa categoria e mês.');
          next.budgets = [
            ...w.budgets.filter((b) => b.id !== id),
            {
              id,
              category: v.category,
              amount: value('amount'),
              month: v.month,
              perspective: v.perspective as 'cash' | 'accrual',
            },
          ];
          break;
        case 'investment':
        case 'asset':
        case 'debt':
          if (
            resource === 'investment' &&
            w.events.some((e) => e.targetId === id && e.kind.startsWith('investment_')) &&
            value('cost') !== w.assets.find((a) => a.id === id)?.cost
          )
            throw new Error(
              'Com operações registradas, o custo só pode ser corrigido por estorno da operação.',
            );
          if (v.date > today())
            throw new Error('Avaliações precisam de uma data efetiva, até hoje.');
          next.assets = [
            ...w.assets.filter((a) => a.id !== id),
            {
              id,
              name: v.name,
              type: resource === 'investment' ? 'investment' : resource,
              value: value('value'),
              cost: value('cost'),
              date: v.date,
              notes: v.notes || '',
              ...(resource === 'investment'
                ? {
                    classification: v.classification as import('@/domain/types').InvestmentClass,
                    ticker: v.ticker || '',
                    subcategory: v.subcategory || '',
                    institution: v.institution || '',
                    ...(v.quantity ? { quantity: v.quantity.replace(',', '.') } : {}),
                  }
                : {}),
            },
          ];
          break;
        case 'transfer':
          if (v.from === v.to) throw new Error('Escolha duas contas diferentes.');
          if (v.date > today())
            throw new Error(
              'Transferências representam movimentos efetivos. Não use uma data futura.',
            );
          if (w.accounts.some((a) => [v.from, v.to].includes(a.id) && v.date < a.openingDate))
            throw new Error('A transferência não pode anteceder o saldo inicial das contas.');
          next.transfers = [
            ...w.transfers.filter((t) => t.id !== id),
            {
              id,
              from: v.from,
              to: v.to,
              amount: value('amount'),
              fee: value('fee'),
              date: v.date,
            },
          ];
          break;
        case 'scenario':
          next.scenarios = [
            ...w.scenarios.filter((s) => s.id !== id),
            {
              id,
              name: v.name,
              incomeDelta: value('incomeDelta'),
              expenseReduction: value('expenseReduction'),
              months: Number(v.months),
            },
          ];
          break;
        case 'category':
          if (w.categories.some((c) => c.toLowerCase() === v.name.trim().toLowerCase()))
            throw new Error('Essa categoria já existe.');
          next.categories = [...w.categories, v.name.trim()];
          break;
      }
      if (resource === 'goal' && editResource?.id) {
        const previous = w.goals.find((g) => g.id === editResource.id);
        const updated = next.goals.find((g) => g.id === editResource.id);
        if (previous && updated && previous.reserved !== updated.reserved) {
          const delta = updated.reserved - previous.reserved;
          next.events = [
            ...w.events,
            {
              id: uid(),
              kind: delta > 0 ? 'goal_reserve' : 'goal_withdrawal',
              targetId: previous.id,
              accountId: '',
              amount: Math.abs(delta),
              fee: 0,
              date: today(),
              note: 'Atualização de reserva da meta',
            },
          ];
        }
      }
      workspaceSchema.parse(next);
      await commit(next, 'Dados salvos');
      setResource(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Verifique os campos informados.');
    }
  }
  async function cancelPlan(plan: Plan) {
    await commit(cancelFuture(w, plan.id), 'Compromissos futuros cancelados');
    setConfirm(null);
  }
  function requestCancel(plan: Plan) {
    setConfirm({
      title: 'Cancelar compromissos futuros?',
      description: `Os registros pagos e o histórico de “${plan.name}” serão preservados.`,
      run: () => cancelPlan(plan),
    });
  }
  const m = useMemo(() => metrics(w, month), [w, month]);
  const monthRows = useMemo(
    () => w.obligations.filter((o) => monthOf(o.date) === month),
    [w.obligations, month],
  );
  const alerts = useMemo(
    () =>
      w.obligations
        .filter(
          (o) =>
            o.kind === 'expense' &&
            remaining(w, o) > 0 &&
            o.date <= civil(addDays(parseISO(today()), w.preferences.reminderDays)),
        )
        .sort((a, b) => a.date.localeCompare(b.date)),
    [w],
  );
  const filtered = useMemo(
    () =>
      (search ? w.obligations : monthRows)
        .filter((o) => {
          const q = search.toLowerCase();
          const plan = w.plans.find((p) => p.id === o.planId);
          return (
            (!q ||
              [
                o.name,
                o.category,
                plan?.notes,
                plan?.beneficiary,
                plan?.subcategory,
                plan?.tags?.join(' '),
                (o.amount / 100).toFixed(2),
                w.accounts.find((a) => a.id === o.accountId)?.name,
                w.cards.find((c) => c.id === o.cardId)?.name,
              ].some((t) => t?.toLowerCase().includes(q))) &&
            (filter === 'all' || filter === o.kind || filter === status(w, o)) &&
            (categoryFilter === 'all' || o.category === categoryFilter) &&
            (accountFilter === 'all' || o.accountId === accountFilter || o.cardId === accountFilter)
          );
        })
        .sort((a, b) => b.date.localeCompare(a.date)),
    [monthRows, search, w, filter, categoryFilter, accountFilter],
  );
  const flowData = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => {
        const period = monthOf(shiftMonth(`${month}-01`, i - 5));
        const cash = cashFlow(w, period);
        return { name: format(parseISO(`${period}-01`), 'MMM', { locale: ptBR }), ...cash };
      }),
    [w, month],
  );
  const reportStart = reportFrom || `${month}-01`;
  const reportEnd = reportTo || `${month}-${getDaysInMonth(parseISO(`${month}-01`))}`;
  const selectedReportRows = reportRows(w, reportStart, reportEnd, perspective).filter(
    (r) =>
      (categoryFilter === 'all' || r.category === categoryFilter) &&
      (accountFilter === 'all' || r.accountId === accountFilter || r.cardId === accountFilter),
  );
  const reportIncome = selectedReportRows
    .filter((r) => r.kind === 'income')
    .reduce((s, r) => s + r.amount, 0);
  const reportExpense = selectedReportRows
    .filter((r) => r.kind === 'expense')
    .reduce((s, r) => s + r.amount, 0);
  const categoryMap = new Map<string, number>();
  for (const row of (page === 'reports'
    ? selectedReportRows
    : reportRows(w, `${month}-01`, `${month}-31`, 'cash')
  ).filter((r) => r.kind === 'expense'))
    categoryMap.set(row.category, (categoryMap.get(row.category) || 0) + row.amount);
  const categoryData = [...categoryMap]
    .filter(([, value]) => value > 0)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  const scenario = w.scenarios.find((s) => s.id === selectedScenario);
  const forecast = calculateForecast(
    scenarioWorkspace(w, scenario?.cancelledPlanIds),
    scenario?.months || horizon,
    strategy,
    today(),
    scenario?.incomeDelta || 0,
    scenario?.expenseReduction || 0,
  );
  const pending = monthRows
    .filter((o) => o.kind === 'expense' && remaining(w, o) > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  const resourceTitle: Record<ResourceKind, string> = {
    account: 'Conta financeira',
    card: 'Cartão de crédito',
    goal: 'Meta financeira',
    budget: 'Orçamento mensal',
    asset: 'Bem ou ativo',
    debt: 'Dívida ou empréstimo',
    investment: 'Posição de investimento',
    transfer: 'Transferir entre contas',
    scenario: 'Novo cenário',
    category: 'Nova categoria',
  };
  function editPlan(p: Plan) {
    setEditing(p);
    setSubscriptionNew(p.subscription);
    setEntryOpen(true);
  }
  function transactionTable(rows: Obligation[], compact = false) {
    return rows.length ? (
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Descrição</th>
              {!compact && <th>Categoria</th>}
              <th>Data</th>
              <th>Status</th>
              <th className="right">Valor</th>
              <th>
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, compact ? 5 : listLimit).map((o) => {
              const s = status(w, o);
              return (
                <tr key={o.id}>
                  <td>
                    <div className="transaction-title">
                      <span className={`transaction-icon ${o.kind}`}>
                        {o.kind === 'income' ? (
                          <ArrowDownLeft size={17} />
                        ) : (
                          <ArrowUpRight size={17} />
                        )}
                      </span>
                      <div>
                        <strong>{o.name}</strong>
                        <small>
                          {o.cardId
                            ? w.cards.find((c) => c.id === o.cardId)?.name
                            : w.accounts.find((a) => a.id === o.accountId)?.name}
                          {o.total > 1 ? ` · Parcela ${o.installment}/${o.total}` : ''}
                        </small>
                      </div>
                    </div>
                  </td>
                  {!compact && (
                    <td>
                      <span className="category-pill">{o.category}</span>
                    </td>
                  )}
                  <td className="nowrap muted">{dateLabel(o.date)}</td>
                  <td>
                    <span className={`badge ${s}`}>
                      {s === 'paid' && o.kind === 'income' ? 'Recebido' : statusLabels[s]}
                    </span>
                  </td>
                  <td className={`right nowrap amount ${o.kind === 'income' ? 'positive' : ''}`}>
                    {o.kind === 'income' ? '+' : '−'} {f(due(w, o))}
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="icon-action"
                        title="Detalhes da ocorrência"
                        onClick={() => setDetail(o)}
                      >
                        <Eye size={15} />
                      </button>
                      {remaining(w, o) > 0 && (
                        <button
                          className="icon-action"
                          title={o.cardId ? 'Pagar pela fatura' : 'Registrar pagamento'}
                          onClick={() =>
                            o.cardId
                              ? setInvoice({ card: o.cardId, month: monthOf(o.date) })
                              : setPayment(o)
                          }
                        >
                          <Check size={16} />
                        </button>
                      )}
                      {!compact && (
                        <button
                          className="icon-action"
                          title="Editar série"
                          onClick={() => {
                            const p = w.plans.find((p) => p.id === o.planId);
                            if (p) editPlan(p);
                          }}
                        >
                          <Pencil size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!compact && rows.length > listLimit && (
          <Button
            variant="ghost"
            className="full"
            onClick={() => setListLimit((v) => v + COST_POLICY.pageSize)}
          >
            Carregar mais
          </Button>
        )}
      </div>
    ) : (
      <Empty
        title="Sua organização começa aqui"
        description="Registre uma receita ou despesa. Seus números serão calculados a partir dos seus dados."
        action={
          <Button variant="outline" size="sm" onClick={() => newEntry()}>
            <Plus size={16} /> Primeira movimentação
          </Button>
        }
      />
    );
  }
  function cardList() {
    return (
      <div className="resource-grid">
        {w.cards.map((c) => {
          const used = w.obligations
            .filter((o) => o.cardId === c.id)
            .reduce((s, o) => s + remaining(w, o), 0);
          const invoiceRows = monthRows.filter((o) => o.cardId === c.id);
          const due = invoiceRows.reduce((s, o) => s + remaining(w, o), 0);
          return (
            <Panel
              key={c.id}
              title={c.name}
              subtitle={`•••• ${c.last4 || '—'} · Fecha dia ${c.closing}`}
              action={
                <button
                  className="icon-action"
                  title="Editar cartão"
                  onClick={() => openResource('card', { ...c, limit: c.limit / 100 })}
                >
                  <Pencil size={16} />
                </button>
              }
            >
              <div className="bank-card">
                <span className="card-brand">
                  <GevyroLogo decorative /> GEVYRO <small>FINANÇAS</small>
                </span>
                <CreditCard size={27} />
                <strong>{c.name}</strong>
                <div>•••• &nbsp; •••• &nbsp; •••• &nbsp; {c.last4 || '••••'}</div>
              </div>
              <div className="detail-row">
                <span>Limite disponível</span>
                <strong>{f(c.limit - used)}</strong>
              </div>
              <progress value={used} max={c.limit || 1} />
              <div className="detail-row muted">
                <small>{f(used)} utilizado</small>
                <small>de {f(c.limit)}</small>
              </div>
              <div className="invoice-summary">
                <span>Fatura de {monthLabel(month)}</span>
                <strong>{f(due)}</strong>
                <small>
                  Vencimento dia {c.due} · {invoiceRows.length} itens
                </small>
              </div>
              <Button
                variant="outline"
                className="full"
                onClick={() => setInvoice({ card: c.id, month })}
              >
                Consultar e pagar fatura
              </Button>
            </Panel>
          );
        })}
      </div>
    );
  }
  function renderPage() {
    switch (page) {
      case 'journal':
        return (
          <Panel
            title="Histórico de movimentos financeiros"
            subtitle="Aportes e empréstimos recebidos não são renda de consumo. Reservas não alteram o saldo bancário."
            action={
              <Button onClick={() => setJournalOpen(true)}>
                <Plus size={15} /> Registrar movimento
              </Button>
            }
          >
            <JournalHistory
              w={w}
              hidden={hidden}
              commit={commit}
              busy={busy}
              onEditingChange={setInvestmentEditing}
            />
          </Panel>
        );
      case 'dashboard':
        return (
          <>
            {!w.preferences.onboarding && (
              <div className="welcome-banner">
                <div className="welcome-symbol">
                  <Sparkles size={23} />
                </div>
                <div>
                  <strong>Um novo jeito de cuidar do seu dinheiro.</strong>
                  <p>
                    Configure suas contas e dê o primeiro passo para uma vida financeira mais leve.
                  </p>
                </div>
                <Button onClick={() => setOnboarding(true)}>
                  Vamos começar <Plus size={16} />
                </Button>
                <button
                  className="icon-action"
                  aria-label="Dispensar introdução"
                  onClick={() =>
                    void commit(
                      { ...w, preferences: { ...w.preferences, onboarding: true } },
                      'Introdução dispensada',
                    ).catch(() => {})
                  }
                >
                  <X size={17} />
                </button>
              </div>
            )}
            <div className="stats-grid">
              <Stat
                label="Saldo disponível"
                value={f(m.real)}
                description={`${w.accounts.length} conta${w.accounts.length === 1 ? '' : 's'} cadastrada${w.accounts.length === 1 ? '' : 's'} ao seu controle`}
                icon={Wallet}
                onClick={() => go('accounts')}
              />
              <Stat
                label="Receitas do mês"
                value={f(m.income)}
                description="Valores efetivamente recebidos"
                icon={ArrowDownLeft}
                tone="green"
                onClick={() => {
                  setFilter('income');
                  go('transactions');
                }}
              />
              <Stat
                label="Despesas do mês"
                value={f(m.expense)}
                description="Pagamentos realizados no mês"
                icon={ArrowUpRight}
                tone="red"
                onClick={() => {
                  setFilter('expense');
                  go('transactions');
                }}
              />
              <Stat
                label="Livre após compromissos"
                value={f(m.free)}
                description="Saldo − pendências até o mês − reservas"
                icon={PiggyBank}
                tone="green"
                onClick={() => go('planning')}
              />
            </div>
            <section className="panel financial-overview">
              <h2>Consumo, movimentação e patrimônio</h2>
              <p className="muted">
                Consumo na data da compra; pagamento da fatura liquida a dívida e movimenta o caixa
                uma única vez.
              </p>
              <div className="stats-grid three">
                {Object.entries(financialOverview(w, month)).map(([label, value]) => (
                  <div key={label}>
                    <small>{label}</small>
                    <h3>{f(value)}</h3>
                  </div>
                ))}
              </div>
            </section>
            <div className="dashboard-main">
              <Panel
                title="Seu fluxo financeiro"
                subtitle="Acompanhe suas entradas e saídas ao longo do tempo"
                action={<span className="subtle-pill">Últimos 6 meses</span>}
              >
                <div className="chart-legend">
                  <span>
                    <i className="green-dot" />
                    Receitas
                  </span>
                  <span>
                    <i className="gray-dot" />
                    Despesas
                  </span>
                </div>
                <FlowChart data={flowData} hidden={hidden} />
                <div className="chart-footer">
                  <ShieldCheck size={15} />
                  <span>Uma visão real, calculada com seus pagamentos.</span>
                  <button onClick={() => go('reports')}>
                    Ver relatório <ChevronRight size={14} />
                  </button>
                </div>
              </Panel>
              <Panel
                title="Despesas por categoria"
                subtitle="Entenda para onde seu dinheiro vai"
                action={
                  <button
                    className="icon-action"
                    title="Ver relatório por categoria"
                    onClick={() => go('reports')}
                  >
                    <Ellipsis size={19} />
                  </button>
                }
              >
                <CategoryChart data={categoryData} hidden={hidden} />
              </Panel>
            </div>
            <div className="dashboard-secondary">
              <Panel
                title="Movimentações recentes"
                subtitle="Os últimos registros do período"
                action={
                  <button className="text-button" onClick={() => go('transactions')}>
                    Ver todas <ChevronRight size={15} />
                  </button>
                }
              >
                {transactionTable(filtered, true)}
              </Panel>
              <Panel
                title="Próximos vencimentos"
                subtitle="Seus compromissos no radar"
                action={<span className="count-badge">{pending.length}</span>}
              >
                {pending.length ? (
                  <div className="upcoming-list">
                    {pending.slice(0, 4).map((o) => (
                      <button
                        key={o.id}
                        onClick={() =>
                          o.cardId ? setInvoice({ card: o.cardId, month }) : setPayment(o)
                        }
                      >
                        <span className={`date-square ${o.date < today() ? 'overdue' : ''}`}>
                          <strong>{o.date.slice(8)}</strong>
                          <small>{format(parseISO(o.date), 'MMM', { locale: ptBR })}</small>
                        </span>
                        <span>
                          <strong>{o.name}</strong>
                          <small>{o.category}</small>
                        </span>
                        <b>{f(remaining(w, o))}</b>
                      </button>
                    ))}
                  </div>
                ) : (
                  <Empty
                    icon={CalendarDays}
                    title="Tudo em dia por aqui"
                    description="Seus próximos compromissos aparecerão neste espaço."
                  />
                )}
                <button className="panel-bottom-button" onClick={() => go('calendar')}>
                  Abrir calendário financeiro <ChevronRight size={15} />
                </button>
              </Panel>
            </div>
            <div className="dashboard-bottom">
              <Panel
                title="Suas metas, mais perto"
                subtitle="Cada passo conta para o seu futuro"
                action={
                  <button className="text-button" onClick={() => go('goals')}>
                    Ver metas <ChevronRight size={15} />
                  </button>
                }
              >
                {w.goals.length ? (
                  <div className="mini-goals">
                    {w.goals.slice(0, 3).map((g) => (
                      <button key={g.id} onClick={() => go('goals')}>
                        <span className="goal-icon">
                          <Target size={19} />
                        </span>
                        <div>
                          <strong>{g.name}</strong>
                          <small>
                            {f(g.reserved)} <span>de {f(g.target)}</span>
                          </small>
                          <progress value={g.reserved} max={g.target} />
                        </div>
                        <b>{Math.min(100, Math.round((g.reserved / g.target) * 100))}%</b>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="inline-empty">
                    <span className="goal-icon">
                      <Target size={24} />
                    </span>
                    <div>
                      <strong>Qual é o seu próximo sonho?</strong>
                      <p>Uma viagem, sua reserva ou uma nova conquista.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => openResource('goal')}>
                      <Plus size={15} /> Criar meta
                    </Button>
                  </div>
                )}
              </Panel>
              <div className="future-card">
                <span className="eyebrow">
                  <Sparkles size={15} /> OLHE PARA FRENTE
                </span>
                <h3>
                  Seu futuro começa
                  <br />
                  com um bom plano.
                </h3>
                <p>Veja como suas finanças podem evoluir nos próximos meses.</p>
                <button onClick={() => go('planning')}>
                  Explorar planejamento <ChevronRight size={16} />
                </button>
                <ChartNoAxesCombined className="future-art" size={100} strokeWidth={1} />
              </div>
            </div>
          </>
        );
      case 'transactions':
        return (
          <Panel
            title="Seus lançamentos"
            subtitle={`${filtered.length} registros no período · Vencimento / competência`}
            action={
              <Button variant="outline" size="sm" onClick={() => openResource('transfer')}>
                <ArrowLeftRight size={15} /> Transferir
              </Button>
            }
          >
            <div className="filter-bar">
              <div className="segmented compact">
                {[
                  ['all', 'Todas'],
                  ['income', 'Receitas'],
                  ['expense', 'Despesas'],
                  ['pending', 'Pendentes'],
                  ['overdue', 'Atrasadas'],
                ].map(([value, label]) => (
                  <button
                    className={filter === value ? 'active' : ''}
                    key={value}
                    onClick={() => setFilter(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <select
                aria-label="Filtrar categoria"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">Todas as categorias</option>
                {w.categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <select
                aria-label="Filtrar conta ou cartão"
                value={accountFilter}
                onChange={(e) => setAccountFilter(e.target.value)}
              >
                <option value="all">Todas as contas</option>
                {[...w.accounts, ...w.cards].map((a) => (
                  <option value={a.id} key={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            {transactionTable(filtered)}
            {w.transfers.filter((t) => monthOf(t.date) === month).length > 0 && (
              <div className="transfer-history">
                <h3>Transferências internas</h3>
                {w.transfers
                  .filter((t) => monthOf(t.date) === month)
                  .map((t) => (
                    <div className="detail-row" key={t.id}>
                      <span>
                        {w.accounts.find((a) => a.id === t.from)?.name} →{' '}
                        {w.accounts.find((a) => a.id === t.to)?.name} · {dateLabel(t.date)}
                      </span>
                      <strong>
                        {f(t.amount)} {t.fee ? `(+ ${f(t.fee)} de tarifa)` : ''}
                      </strong>
                      <button
                        className="text-button"
                        onClick={() =>
                          openResource('transfer', {
                            ...t,
                            amount: t.amount / 100,
                            fee: t.fee / 100,
                          })
                        }
                      >
                        Editar transferência
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </Panel>
        );
      case 'accounts':
        return (
          <>
            <div className="stats-grid three">
              <Stat
                label="Saldo consolidado"
                value={f(m.real)}
                description="Somente movimentos efetivados"
                icon={Wallet}
                onClick={() => go('transactions')}
              />
              <Stat
                label="Contas cadastradas"
                value={String(w.accounts.length)}
                description="Contas e carteiras em BRL"
                icon={Landmark}
                onClick={() => openResource('account')}
              />
              <Stat
                label="Valores reservados"
                value={f(m.reserves)}
                description="Alocados para suas metas"
                icon={Target}
                onClick={() => go('goals')}
              />
            </div>
            {w.accounts.length ? (
              <div className="resource-grid">
                {w.accounts.map((a) => (
                  <Panel
                    title={a.name}
                    subtitle={a.institution || 'Conta manual'}
                    key={a.id}
                    action={
                      <button
                        className="icon-action"
                        title="Editar conta"
                        onClick={() => openResource('account', { ...a, opening: a.opening / 100 })}
                      >
                        <Pencil size={16} />
                      </button>
                    }
                  >
                    <div className="account-value">
                      <span className="bank-logo">
                        <Landmark size={25} />
                      </span>
                      <div>
                        <small>Saldo atual</small>
                        <strong>{f(balance(w, a))}</strong>
                      </div>
                    </div>
                    <div className="detail-row muted">
                      <span>Saldo inicial · {dateLabel(a.openingDate)}</span>
                      <span>{f(a.opening)}</span>
                    </div>
                    <Button
                      variant="outline"
                      className="full"
                      onClick={() => {
                        setAccountFilter(a.id);
                        setFilter('all');
                        go('transactions');
                      }}
                    >
                      Ver movimentações
                    </Button>
                  </Panel>
                ))}
              </div>
            ) : (
              <Panel title="Suas contas">
                <Empty
                  icon={Wallet}
                  title="Todo dinheiro tem um lugar"
                  description="Adicione sua conta bancária ou carteira com o saldo inicial correto."
                  action={
                    <Button onClick={() => openResource('account')}>
                      <Plus size={16} /> Adicionar conta
                    </Button>
                  }
                />
              </Panel>
            )}
            <Button variant="outline" onClick={() => openResource('transfer')}>
              <ArrowLeftRight size={16} /> Transferir entre contas
            </Button>
          </>
        );
      case 'cards':
        return w.cards.length ? (
          cardList()
        ) : (
          <Panel title="Seus cartões">
            <Empty
              icon={CreditCard}
              title="Clareza em cada fatura"
              description="Cadastre seu cartão, limite, fechamento e vencimento para organizar as compras."
              action={
                <Button onClick={() => openResource('card')}>
                  <Plus size={16} /> Adicionar cartão
                </Button>
              }
            />
          </Panel>
        );
      case 'installments': {
        const plans = w.plans.filter((p) => p.mode === 'installment');
        return (
          <>
            <div className="stats-grid three">
              <Stat
                label="Comprometido em parcelas"
                value={f(
                  w.obligations
                    .filter((o) => plans.some((p) => p.id === o.planId))
                    .reduce((s, o) => s + remaining(w, o), 0),
                )}
                description="Soma exata das parcelas em aberto"
                icon={Layers}
                onClick={() => go('transactions')}
              />
              <Stat
                label="Parcelas deste mês"
                value={f(
                  monthRows.filter((o) => o.total > 1).reduce((s, o) => s + remaining(w, o), 0),
                )}
                description="Obrigações pendentes no período"
                icon={CalendarDays}
                onClick={() => go('calendar')}
              />
              <Stat
                label="Compras parceladas"
                value={String(plans.length)}
                description="Contratos ativos e concluídos"
                icon={ReceiptText}
                onClick={() => newEntry()}
              />
            </div>
            <Panel
              title="Central de parcelamentos"
              subtitle="O valor restante, a duração e a liberação de cada compromisso"
            >
              {plans.length ? (
                <div className="plan-list">
                  {plans.map((p) => {
                    const rows = w.obligations.filter((o) => o.planId === p.id && !o.cancelled);
                    const left = rows.reduce((s, o) => s + remaining(w, o), 0);
                    const done = rows.filter((o) => remaining(w, o) === 0).length;
                    const end = rows
                      .map((o) => o.date)
                      .sort()
                      .at(-1);
                    return (
                      <div className="plan-item" key={p.id}>
                        <span className="goal-icon">
                          <Layers size={22} />
                        </span>
                        <div className="grow">
                          <h3>{p.name}</h3>
                          <p>
                            {done} de {p.count} parcelas pagas ·{' '}
                            {end
                              ? `Termina em ${dateLabel(end)} / ${end.slice(0, 4)}`
                              : 'Cancelado'}
                          </p>
                          <progress value={done} max={p.count} />
                          <small>
                            Libera aproximadamente{' '}
                            {f(
                              rows
                                .filter((o) => remaining(w, o) > 0)
                                .sort((a, b) => a.date.localeCompare(b.date))
                                .at(-1)?.amount ?? 0,
                            )}
                            /mês após o encerramento.
                          </small>
                        </div>
                        <div className="right">
                          <strong>{f(left)}</strong>
                          <small>saldo restante</small>
                          <button
                            className="text-button"
                            onClick={() => {
                              setPurchaseId(p.id);
                            }}
                          >
                            Consultar parcelas
                          </button>
                        </div>
                        <button
                          className="icon-action"
                          title="Editar parcelamento"
                          onClick={() => editPlan(p)}
                        >
                          <Pencil size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Empty
                  icon={Layers}
                  title="Sem parcelas para acompanhar"
                  description="Ao registrar uma despesa parcelada, o cronograma completo aparecerá aqui."
                  action={
                    <Button variant="outline" onClick={() => newEntry()}>
                      <Plus size={16} /> Nova compra
                    </Button>
                  }
                />
              )}
            </Panel>
          </>
        );
      }
      case 'subscriptions': {
        const subscriptions = w.plans.filter((p) => p.subscription && p.mode === 'recurring');
        const active = subscriptions.filter(
          (p) => !p.cancelledFrom && !p.pausedFrom && (!p.end || p.end >= today()),
        );
        const monthly = active.reduce((s, p) => s + monthlySubscription(p), 0);
        return (
          <>
            <div className="stats-grid three">
              <Stat
                label="Custo mensal equivalente"
                value={f(monthly)}
                description="Equivalência de planejamento, não pagamento"
                icon={Repeat2}
                onClick={() => go('planning')}
              />
              <Stat
                label="Custo anual equivalente"
                value={f(monthly * 12)}
                description="Estimativa mantendo os serviços atuais"
                icon={CalendarDays}
                onClick={() => go('planning')}
              />
              <Stat
                label="Assinaturas ativas"
                value={String(active.length)}
                description={`${subscriptions.length - active.length} canceladas ou encerradas`}
                icon={CheckCheck}
                onClick={() => newEntry(true)}
              />
            </div>
            <Panel
              title="Seus serviços recorrentes"
              subtitle="Cobranças anuais são lançadas apenas no vencimento real"
              action={
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!simulatedSubscriptions.length || busy}
                  onClick={async () => {
                    const id = uid();
                    try {
                      await commit(
                        {
                          ...w,
                          scenarios: [
                            ...w.scenarios,
                            {
                              id,
                              name: 'Economia com assinaturas selecionadas',
                              incomeDelta: 0,
                              expenseReduction: 0,
                              months: 12,
                              cancelledPlanIds: simulatedSubscriptions,
                            },
                          ],
                        },
                        'Cenário de cancelamento salvo',
                      );
                      setSelectedScenario(id);
                      setStrategy('standard');
                      go('planning');
                    } catch {}
                  }}
                >
                  Simular economia das selecionadas
                </Button>
              }
            >
              {subscriptions.length ? (
                <div className="plan-list">
                  {subscriptions.map((p) => (
                    <div className="plan-item" key={p.id}>
                      <input
                        aria-label={`Simular cancelamento de ${p.name}`}
                        type="checkbox"
                        checked={simulatedSubscriptions.includes(p.id)}
                        onChange={(e) =>
                          setSimulatedSubscriptions((ids) =>
                            e.target.checked ? [...ids, p.id] : ids.filter((id) => id !== p.id),
                          )
                        }
                        style={{ width: 16, accentColor: 'var(--primary)' }}
                      />
                      <span className="goal-icon">
                        <Repeat2 size={23} />
                      </span>
                      <div className="grow">
                        <h3>{p.name}</h3>
                        <p>
                          A cada {p.interval} {p.unit === 'month' ? 'mês(es)' : 'dia(s)'} ·{' '}
                          {p.cancelledFrom
                            ? 'Cancelada'
                            : p.pausedFrom
                              ? 'Pausada'
                              : p.end && p.end < today()
                                ? 'Encerrada'
                                : 'Ativa'}
                        </p>
                        <small>{f(monthlySubscription(p))}/mês equivalente</small>
                      </div>
                      <strong>{f(p.amount)}</strong>
                      <button
                        title="Editar cobranças futuras"
                        className="icon-action"
                        onClick={() => editPlan(p)}
                      >
                        <Pencil size={16} />
                      </button>
                      {!p.cancelledFrom && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            void commit(
                              p.pausedFrom
                                ? resumeSubscription(w, p.id)
                                : pauseSubscription(w, p.id),
                              p.pausedFrom ? 'Assinatura retomada' : 'Assinatura pausada',
                            ).catch(() => {})
                          }
                        >
                          {p.pausedFrom ? 'Retomar' : 'Pausar'}
                        </Button>
                      )}
                      {!p.cancelledFrom && (
                        <button
                          title="Cancelar recorrência"
                          className="icon-action"
                          onClick={() => requestCancel(p)}
                        >
                          <Ban size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <Empty
                  icon={Repeat2}
                  title="Assinaturas sem surpresas"
                  description="Centralize seus serviços para entender o custo mensal e as próximas renovações."
                  action={
                    <Button onClick={() => newEntry(true)}>
                      <Plus size={16} /> Adicionar assinatura
                    </Button>
                  }
                />
              )}
            </Panel>
          </>
        );
      }
      case 'calendar': {
        const first = startOfMonth(parseISO(`${month}-01`));
        const days = getDaysInMonth(first);
        const cells = Array.from({ length: Math.ceil((first.getDay() + days) / 7) * 7 }, (_, i) => {
          const day = i - first.getDay() + 1;
          return day > 0 && day <= days ? `${month}-${String(day).padStart(2, '0')}` : '';
        });
        const shown = selectedDay
          ? monthRows.filter((o) => o.date === selectedDay)
          : calendarView === 'week'
            ? monthRows.filter(
                (o) => o.date >= today() && o.date <= civil(addDays(parseISO(today()), 6)),
              )
            : monthRows;
        return (
          <Panel
            title={monthLabel(month)}
            subtitle="Valores previstos. O calendário não altera seu saldo bancário."
            action={
              <div className="segmented compact">
                {[
                  ['month', 'Mês'],
                  ['week', '7 dias'],
                  ['list', 'Lista'],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    className={calendarView === id ? 'active' : ''}
                    onClick={() => {
                      setCalendarView(id);
                      setSelectedDay('');
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            }
          >
            {calendarView === 'month' && (
              <div className="calendar">
                <div className="calendar-weekdays">
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
                    <span key={d}>{d}</span>
                  ))}
                </div>
                <div className="calendar-grid">
                  {cells.map((d, i) => {
                    const rows = monthRows.filter((o) => o.date === d && !o.cancelled);
                    return (
                      <button
                        key={d || `empty${i}`}
                        disabled={!d}
                        className={`${d === today() ? 'today' : ''} ${d === selectedDay ? 'selected' : ''}`}
                        onClick={() => setSelectedDay(d)}
                      >
                        {d && (
                          <>
                            <b>{Number(d.slice(8))}</b>
                            {rows.slice(0, 2).map((o) => (
                              <span key={o.id} className={o.kind}>
                                {o.name}
                              </span>
                            ))}
                            {rows.length > 2 && <small>+{rows.length - 2} compromissos</small>}
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {selectedDay && (
              <div className="filter-bar">
                <strong>{dateLabel(selectedDay)}</strong>
                <button className="text-button" onClick={() => setSelectedDay('')}>
                  Limpar seleção
                </button>
              </div>
            )}
            {transactionTable(shown)}
          </Panel>
        );
      }
      case 'planning':
        return (
          <>
            <div className="notice">
              <Sparkles size={19} />
              <span>
                Projeção estimada, baseada nas obrigações cadastradas até 60 meses após o início de
                cada recorrência. Valores são estimativas, sem cotações ou rendimentos presumidos.
              </span>
            </div>
            <div className="stats-grid three">
              <Stat
                label="Saldo real hoje"
                value={f(m.real)}
                description="Dinheiro efetivamente nas contas"
                icon={Wallet}
                onClick={() => go('accounts')}
              />
              <Stat
                label="Após pendências do período"
                value={f(m.projected)}
                description="Inclui receitas previstas e despesas do mês selecionado"
                icon={CalendarDays}
                onClick={() => go('transactions')}
              />
              <Stat
                label="Renda média recebida"
                value={f(averageIncome(w, 6))}
                description="Média dos últimos 6 meses completos"
                icon={TrendingUp}
                onClick={() => go('reports')}
              />
            </div>
            <Panel
              title="Uma visão do seu futuro"
              subtitle="O saldo livre considera reservas atuais e contribuições planejadas para metas"
              action={
                <div className="filter-inline">
                  <select
                    aria-label="Estratégia de projeção"
                    value={strategy}
                    onChange={(e) => setStrategy(e.target.value as Strategy)}
                  >
                    <option value="conservative">Conservadora · renda fixa/confirmada</option>
                    <option value="standard">Padrão · média variável estimada</option>
                    <option value="optimistic">Otimista · renda adicional do cenário</option>
                  </select>
                  <select
                    aria-label="Horizonte da projeção"
                    value={horizon}
                    onChange={(e) => setHorizon(Number(e.target.value))}
                  >
                    {[1, 3, 6, 12, 24, 60].map((n) => (
                      <option value={n} key={n}>
                        {n} meses
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Cenário"
                    value={selectedScenario}
                    onChange={(e) => {
                      setSelectedScenario(e.target.value);
                      if (w.scenarios.find((s) => s.id === e.target.value)?.incomeDelta)
                        setStrategy('optimistic');
                    }}
                  >
                    <option value="">Compromissos cadastrados</option>
                    {w.scenarios.map((s) => (
                      <option value={s.id} key={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              }
            >
              <FlowChart
                hidden={hidden}
                projection
                data={forecast.map((p) => ({
                  ...p,
                  name: format(parseISO(`${p.month}-01`), 'MMM/yy', { locale: ptBR }),
                }))}
              />
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Mês</th>
                      <th>Receitas previstas</th>
                      <th>Despesas previstas</th>
                      <th>Saldo projetado</th>
                      <th>Livre após metas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecast.map((p) => (
                      <tr key={p.month}>
                        <td className="capitalize">{monthLabel(p.month)}</td>
                        <td className="positive">{f(p.income)}</td>
                        <td>{f(p.expense)}</td>
                        <td>{f(p.balance)}</td>
                        <td className={p.available < 0 ? 'error' : 'positive'}>{f(p.available)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
            <Panel
              title="Dinheiro livre por dia"
              subtitle="Referência conservadora: saldo livre do mês dividido pelos dias restantes, sem presumir receitas futuras."
            >
              <div className="payment-total">
                <strong>{f(dailyAllowance(metrics(w, monthOf(today())).free))} / dia</strong>
              </div>
              <details className="planning-details">
                <summary>Consultar próximos 31 dias</summary>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Receitas previstas</th>
                        <th>Despesas previstas</th>
                        <th>Saldo projetado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyForecast(w).map((d) => (
                        <tr key={d.date}>
                          <td>{d.date}</td>
                          <td>{f(d.income)}</td>
                          <td>{f(d.expense)}</td>
                          <td>{f(d.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </Panel>
            <Panel
              title="Quando as parcelas terminam"
              subtitle="Liberação mensal estimada após o último vencimento, sem novos compromissos."
            >
              <div className="plan-list">
                {endingInstallments(w).length ? (
                  endingInstallments(w).map((p) => (
                    <div className="plan-item" key={p.id}>
                      <div className="grow">
                        <h3>{p.name}</h3>
                        <p>
                          Última parcela: {p.end} · Redução a partir de {p.releaseMonth}
                        </p>
                      </div>
                      <strong>{f(p.monthly)} / mês</strong>
                    </div>
                  ))
                ) : (
                  <Empty
                    icon={Layers}
                    title="Sem parcelas em aberto"
                    description="As datas de liberação aparecerão conforme seus parcelamentos forem cadastrados."
                  />
                )}
              </div>
            </Panel>
            <Panel
              title="Experimente outras possibilidades"
              subtitle="Cenários salvos ficam separados de suas finanças reais"
              action={
                <Button size="sm" onClick={() => openResource('scenario')}>
                  <Plus size={15} /> Novo cenário
                </Button>
              }
            >
              {w.scenarios.length ? (
                <div className="scenario-list">
                  {w.scenarios.map((s) => (
                    <button
                      className={`scenario-item ${selectedScenario === s.id ? 'selected' : ''}`}
                      onClick={() => setSelectedScenario(s.id)}
                      key={s.id}
                    >
                      <Sparkles size={19} />
                      <strong>{s.name}</strong>
                      <span>
                        +{f(s.incomeDelta)} de renda · −{f(s.expenseReduction)} de gastos / mês
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <Empty
                  icon={Sparkles}
                  title="E se você mudasse o plano?"
                  description="Simule uma renda maior ou reduza seus gastos, sem modificar seus registros."
                />
              )}
            </Panel>
          </>
        );
      case 'budgets':
        return (
          <Panel
            title="Orçamentos do mês"
            subtitle="Cada orçamento distingue pagamentos efetivos e compromissos pendentes, pela perspectiva escolhida."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const prev = monthOf(shiftMonth(`${month}-01`, -1));
                  const existing = new Set(
                    w.budgets.filter((b) => b.month === month).map((b) => b.category),
                  );
                  const copy = w.budgets
                    .filter((b) => b.month === prev && !existing.has(b.category))
                    .map((b) => ({ ...b, id: uid(), month }));
                  if (!copy.length) {
                    toast.info('Nenhum orçamento do mês anterior disponível para copiar.');
                    return;
                  }
                  void commit(
                    { ...w, budgets: [...w.budgets, ...copy] },
                    'Orçamentos copiados',
                  ).catch(() => {});
                }}
              >
                Copiar mês anterior
              </Button>
            }
          >
            {w.budgets.filter((b) => b.month === month).length ? (
              <div className="budget-grid">
                {w.budgets
                  .filter((b) => b.month === month)
                  .map((b) => {
                    const usage = budgetUsage(w, b.category, month, b.perspective || 'accrual');
                    const used = usage.total;
                    const paidValue = usage.used;
                    const pct = Math.round((used / b.amount) * 100);
                    return (
                      <div className="budget-item" key={b.id}>
                        <div className="detail-row">
                          <h3>
                            {b.category}{' '}
                            <small className="muted">
                              {b.perspective === 'cash' ? 'Caixa' : 'Competência'}
                            </small>
                          </h3>
                          <button
                            className="icon-action"
                            title="Editar orçamento"
                            onClick={() => openResource('budget', { ...b, amount: b.amount / 100 })}
                          >
                            <Pencil size={16} />
                          </button>
                        </div>
                        <strong className="big-number">
                          {f(used)} <small>/ {f(b.amount)}</small>
                        </strong>
                        <progress
                          className={pct >= 100 ? 'danger' : ''}
                          value={Math.min(used, b.amount)}
                          max={b.amount}
                        />
                        <div className="detail-row">
                          <small>{pct}% comprometido</small>
                          <span className={pct >= 100 ? 'error' : 'positive'}>
                            {f(b.amount - used)} restantes
                          </span>
                        </div>
                        <p className="muted">
                          {f(paidValue)} pagos · {f(used - paidValue)} pendentes
                        </p>
                        {pct >= 50 && (
                          <span className={`badge ${pct >= 100 ? 'overdue' : 'pending'}`}>
                            {pct >= 100
                              ? 'Limite atingido'
                              : pct >= 80
                                ? 'Atenção: acima de 80%'
                                : 'Acima de 50%'}
                          </span>
                        )}
                      </div>
                    );
                  })}
              </div>
            ) : (
              <Empty
                icon={Gauge}
                title="Cada categoria, um plano"
                description="Defina limites mensais e acompanhe o que está pago, comprometido e disponível."
                action={
                  <Button onClick={() => openResource('budget')}>
                    <Plus size={16} /> Criar orçamento
                  </Button>
                }
              />
            )}
          </Panel>
        );
      case 'goals':
        return w.goals.length ? (
          <div className="resource-grid">
            {w.goals.map((g) => {
              const diff = Math.max(0, g.target - g.reserved);
              const months = Math.max(
                1,
                (Number(g.date.slice(0, 4)) - Number(today().slice(0, 4))) * 12 +
                  Number(g.date.slice(5, 7)) -
                  Number(today().slice(5, 7)),
              );
              return (
                <Panel
                  key={g.id}
                  title={g.name}
                  subtitle={`Objetivo: ${dateLabel(g.date)} / ${g.date.slice(0, 4)}`}
                  action={
                    <button
                      className="icon-action"
                      title="Editar meta e reserva"
                      onClick={() =>
                        openResource('goal', {
                          ...g,
                          target: g.target / 100,
                          reserved: g.reserved / 100,
                          monthly: g.monthly / 100,
                        })
                      }
                    >
                      <Pencil size={16} />
                    </button>
                  }
                >
                  <div className="goal-large-icon">
                    <Target size={32} />
                  </div>
                  <strong className="big-number">{f(g.reserved)}</strong>
                  <p className="muted">
                    de {f(g.target)} · {Math.min(100, Math.round((g.reserved / g.target) * 100))}%
                    concluído
                  </p>
                  <progress value={g.reserved} max={g.target} />
                  <div className="detail-row">
                    <span>Falta conquistar</span>
                    <strong>{f(diff)}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Necessário por mês</span>
                    <strong>{f(Math.ceil(diff / months))}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Contribuição planejada</span>
                    <strong>{f(g.monthly)}</strong>
                  </div>
                  <p className="muted">
                    {diff === 0
                      ? 'Meta atingida!'
                      : g.monthly
                        ? `Estimativa no plano atual: ${Math.ceil(diff / g.monthly)} meses.`
                        : 'Defina uma contribuição para calcular a previsão.'}
                  </p>
                  <Button
                    variant="outline"
                    className="full"
                    onClick={() =>
                      openResource('goal', {
                        ...g,
                        target: g.target / 100,
                        reserved: g.reserved / 100,
                        monthly: g.monthly / 100,
                      })
                    }
                  >
                    Atualizar reserva
                  </Button>
                </Panel>
              );
            })}
          </div>
        ) : (
          <Panel title="Suas conquistas começam com um objetivo">
            <Empty
              icon={Target}
              title="Dê um nome ao seu próximo sonho"
              description="Defina um valor, uma data e um plano mensal. O Gevyro acompanha o caminho."
              action={
                <Button onClick={() => openResource('goal')}>
                  <Plus size={16} /> Criar primeira meta
                </Button>
              }
            />
          </Panel>
        );
      case 'investments':
        return (
          <InvestmentPanel
            onEditingChange={setInvestmentEditing}
            w={w}
            busy={busy}
            hidden={hidden}
            commit={commit}
            onNew={() => openResource('investment')}
            onEdit={(a) =>
              openResource('investment', { ...a, value: a.value / 100, cost: a.cost / 100 })
            }
          />
        );
      case 'wealth': {
        const items = w.assets;
        return (
          <>
            <div className="stats-grid three">
              <Stat
                label={page === 'wealth' ? 'Patrimônio líquido estimado' : 'Total investido'}
                value={f(page === 'wealth' ? m.net : m.investments)}
                description="Avaliações manuais, sem cotação automática"
                icon={Landmark}
                onClick={() => go('accounts')}
              />
              <Stat
                label="Bens e investimentos"
                value={f(
                  w.assets.filter((a) => a.type !== 'debt').reduce((s, a) => s + a.value, 0),
                )}
                description="Saldos bancários apresentados separadamente"
                icon={TrendingUp}
                onClick={() => openResource(page === 'wealth' ? 'asset' : 'investment')}
              />
              <Stat
                label="Passivos registrados"
                value={f(
                  w.assets.filter((a) => a.type === 'debt').reduce((s, a) => s + a.value, 0),
                )}
                description="Dívidas manuais; cartões deduzidos no patrimônio"
                icon={ReceiptText}
                onClick={() => openResource('debt')}
              />
            </div>
            <Panel
              title={page === 'wealth' ? 'Ativos e passivos' : 'Posições de investimento'}
              subtitle="Atualize o valor manualmente. Avaliações não geram rendimentos nem movimentos de caixa."
              action={
                page === 'wealth' ? (
                  <div className="filter-inline">
                    <Button variant="outline" size="sm" onClick={() => openResource('debt')}>
                      Adicionar dívida
                    </Button>
                    <Button size="sm" onClick={() => openResource('asset')}>
                      <Plus size={15} /> Novo bem
                    </Button>
                  </div>
                ) : undefined
              }
            >
              {items.length ? (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th>Natureza</th>
                        <th>Avaliação</th>
                        <th>Valor atual</th>
                        <th>Variação nominal</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((a) => (
                        <tr key={a.id}>
                          <td>
                            <strong>{a.name}</strong>
                            <small>{a.notes}</small>
                          </td>
                          <td>
                            {a.type === 'debt'
                              ? 'Passivo'
                              : a.type === 'investment'
                                ? 'Investimento'
                                : 'Bem'}
                          </td>
                          <td>
                            {dateLabel(a.date)} / {a.date.slice(0, 4)}
                          </td>
                          <td>{f(a.value)}</td>
                          <td>{f(a.value - a.cost)}</td>
                          <td>
                            <button
                              className="icon-action"
                              title="Atualizar avaliação"
                              onClick={() =>
                                openResource(a.type, {
                                  ...a,
                                  value: a.value / 100,
                                  cost: a.cost / 100,
                                })
                              }
                            >
                              <Pencil size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty
                  icon={TrendingUp}
                  title="Uma visão do seu patrimônio"
                  description="Registre posições e avaliações reais. O Gevyro não presume rentabilidade nem inventa cotações."
                  action={
                    <Button
                      onClick={() => openResource(page === 'wealth' ? 'asset' : 'investment')}
                    >
                      <Plus size={16} /> Adicionar {page === 'wealth' ? 'bem' : 'investimento'}
                    </Button>
                  }
                />
              )}
            </Panel>
          </>
        );
      }
      case 'reports':
        return (
          <>
            <div className="filter-bar">
              <label className="filter-inline">
                Perspectiva
                <select
                  value={perspective}
                  onChange={(e) => setPerspective(e.target.value as Perspective)}
                >
                  <option value="cash">Caixa · pagamentos efetivos</option>
                  <option value="accrual">Competência · obrigações</option>
                  <option value="purchase">Compra · contratação</option>
                </select>
              </label>
              <label>
                De
                <input
                  type="date"
                  aria-label="Início do relatório"
                  value={reportStart}
                  onChange={(e) => setReportFrom(e.target.value)}
                />
              </label>
              <label>
                Até
                <input
                  type="date"
                  aria-label="Fim do relatório"
                  value={reportEnd}
                  onChange={(e) => setReportTo(e.target.value)}
                />
              </label>
              <select
                aria-label="Categoria do relatório"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">Todas as categorias</option>
                {w.categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <select
                aria-label="Conta ou cartão do relatório"
                value={accountFilter}
                onChange={(e) => setAccountFilter(e.target.value)}
              >
                <option value="all">Todas as contas e cartões</option>
                {[...w.accounts, ...w.cards].map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setReportFrom('');
                  setReportTo('');
                  setCategoryFilter('all');
                  setAccountFilter('all');
                }}
              >
                Limpar filtros
              </Button>
              <Button variant="outline" size="sm" onClick={exportCSV}>
                <Download size={15} /> Exportar CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                Salvar em PDF / imprimir
              </Button>
            </div>
            <div className="stats-grid three">
              <Stat
                label="Receitas"
                value={f(reportIncome)}
                description={
                  perspective === 'cash' ? 'Recebimentos efetivos' : 'Receitas de competência'
                }
                icon={ArrowDownLeft}
                onClick={() => {
                  setFilter('income');
                  go('transactions');
                }}
              />
              <Stat
                label="Despesas"
                value={f(reportExpense)}
                description={
                  perspective === 'cash' ? 'Pagamentos efetivos' : 'Compromissos de competência'
                }
                icon={ArrowUpRight}
                onClick={() => {
                  setFilter('expense');
                  go('transactions');
                }}
              />
              <Stat
                label="Renda média em 12 meses"
                value={f(averageIncome(w, 12))}
                description="Meses completos, incluindo meses sem receita"
                icon={TrendingUp}
                onClick={() => go('planning')}
              />
            </div>
            {reportStart > reportEnd && (
              <p role="alert" className="error">
                A data inicial deve ser anterior à final.
              </p>
            )}
            <Panel
              title="Registros que compõem o relatório"
              subtitle={`${selectedReportRows.length} registros · ${reportStart} até ${reportEnd}`}
            >
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Descrição</th>
                      <th>Data</th>
                      <th>Categoria</th>
                      <th>Valor</th>
                      <th>Detalhes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReportRows.slice(0, listLimit).map((r) => (
                      <tr key={r.id}>
                        <td>{r.name}</td>
                        <td>{r.date}</td>
                        <td>{r.category}</td>
                        <td>{f(r.amount)}</td>
                        <td>
                          <button
                            className="text-button"
                            onClick={() => {
                              const o = w.obligations.find((o) => o.id === r.targetId);
                              if (o) setDetail(o);
                              else go('journal');
                            }}
                          >
                            Consultar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {selectedReportRows.length > listLimit && (
                <Button
                  variant="ghost"
                  onClick={() => setListLimit((v) => v + COST_POLICY.pageSize)}
                >
                  Carregar mais registros
                </Button>
              )}
            </Panel>
            <div className="dashboard-main">
              <Panel
                title="Evolução de caixa"
                subtitle="Perspectiva de pagamentos, independente do vencimento"
              >
                <FlowChart data={flowData} hidden={hidden} />
              </Panel>
              <Panel
                title="Despesas por categoria"
                subtitle={
                  perspective === 'cash' ? 'Pagamentos realizados no mês' : 'Obrigações do mês'
                }
              >
                <CategoryChart data={categoryData} hidden={hidden} />
              </Panel>
            </div>
            <Panel
              title="Detalhamento por categoria"
              subtitle="Clique para consultar os lançamentos"
            >
              <div className="report-categories">
                {categoryData.length ? (
                  categoryData.map((d) => (
                    <button
                      key={d.name}
                      onClick={() => {
                        setCategoryFilter(d.name);
                        setFilter('expense');
                        go('transactions');
                      }}
                    >
                      <span>{d.name}</span>
                      <strong>{f(d.value)}</strong>
                      <ChevronRight size={16} />
                    </button>
                  ))
                ) : (
                  <Empty
                    icon={FileChartColumn}
                    title="Seus dados contam uma história"
                    description="Os relatórios são preenchidos automaticamente com seus registros."
                  />
                )}
              </div>
            </Panel>
          </>
        );
      case 'import':
        return (
          <>
            <div className="two-columns">
              <Panel
                title="Importar movimentações"
                subtitle="CSV com descrição, valor e data. Sempre com revisão antes da gravação."
              >
                <label className="upload-box">
                  <Upload size={28} />
                  <strong>Escolha um arquivo CSV ou OFX</strong>
                  <span>Valores positivos: receitas · negativos: despesas</span>
                  <input
                    type="file"
                    accept=".csv,.ofx"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void readImport(file);
                      e.target.value = '';
                    }}
                  />
                </label>
                <div className="notice">
                  <ShieldCheck size={17} /> A origem e o conteúdo são verificados para evitar a
                  reimportação do mesmo arquivo.
                </div>
              </Panel>
              <Panel
                title="Exportar seus dados"
                subtitle="Tenha uma cópia dos seus registros financeiros."
              >
                <div className="export-options">
                  <button onClick={() => exportFullBackup('json')}>
                    <FolderInput size={24} />
                    <span>
                      <strong>Backup completo em JSON</strong>
                      <small>Inclui contas, lançamentos, pagamentos e preferências.</small>
                    </span>
                    <Download size={18} />
                  </button>
                  <button onClick={exportCSV}>
                    <FileChartColumn size={24} />
                    <span>
                      <strong>Movimentações em CSV</strong>
                      <small>Período selecionado; compatível com planilhas.</small>
                    </span>
                    <Download size={18} />
                  </button>
                  <button onClick={() => exportFullBackup('csv')}>
                    <FileChartColumn size={24} />
                    <span>
                      <strong>Backup completo em CSV</strong>
                      <small>Todas as entidades e todo o histórico, sem filtro de mês.</small>
                    </span>
                    <Download size={18} />
                  </button>
                  <label className="restore-label">
                    <RefreshCw size={20} /> Restaurar backup JSON
                    <input
                      type="file"
                      accept=".json"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void restore(file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
              </Panel>
            </div>
            <CostSafetyPanel workspace={w} onBackup={exportFullBackup} />
            {w.imports.length > 0 && (
              <Panel
                title="Lotes de importação"
                subtitle="Reverta os pagamentos e cancele os registros do lote sem apagar o histórico."
              >
                <div className="audit-list">
                  {w.imports.map((hash) => (
                    <div key={hash}>
                      <FolderInput size={16} />
                      <strong>Lote {hash.slice(0, 12)}</strong>
                      <button
                        className="text-button"
                        onClick={() =>
                          setConfirm({
                            title: 'Reverter esta importação?',
                            description:
                              'Os pagamentos do lote serão estornados e suas obrigações canceladas. O mesmo arquivo continuará identificado como importado.',
                            run: async () => {
                              await commit(reverseImport(w, hash), 'Lote de importação revertido');
                              setConfirm(null);
                            },
                          })
                        }
                      >
                        Reverter lote
                      </button>
                    </div>
                  ))}
                </div>
              </Panel>
            )}
            <Panel
              title="Histórico de alterações"
              subtitle="As últimas operações confirmadas na persistência"
            >
              <RecordHistory
                w={w}
                busy={busy}
                onUndo={(a) =>
                  setConfirm({
                    title: 'Desfazer alteração?',
                    description:
                      'O valor anterior será restaurado se não houver alterações ou movimentos dependentes posteriores.',
                    run: async () => {
                      await commit(undoChange(w, a), 'Alteração desfeita', a.id);
                      setConfirm(null);
                    },
                  })
                }
              />
            </Panel>
          </>
        );
      case 'settings':
        return (
          <div className="two-columns">
            <Panel title="Suas preferências" subtitle="Português do Brasil · America/Sao_Paulo">
              <form
                className="form"
                key={w.preferences.name}
                onSubmit={(e) => {
                  e.preventDefault();
                  const data = new FormData(e.currentTarget);
                  void commit(
                    {
                      ...w,
                      preferences: {
                        ...w.preferences,
                        name: String(data.get('name')),
                        payday: Number(data.get('payday')),
                        reminderDays: Number(data.get('reminderDays')),
                        estimatedIncome: cents(String(data.get('income') || '0')),
                      },
                    },
                    'Preferências atualizadas',
                  ).catch(() => {});
                }}
              >
                <label>
                  Como podemos chamar você?
                  <input name="name" defaultValue={w.preferences.name} placeholder="Seu nome" />
                </label>
                <div className="form-grid">
                  <label>
                    Dia habitual de recebimento
                    <input
                      name="payday"
                      type="number"
                      min="1"
                      max="31"
                      defaultValue={w.preferences.payday}
                    />
                  </label>
                  <label>
                    Antecedência dos alertas (dias)
                    <input
                      name="reminderDays"
                      type="number"
                      min="0"
                      max="90"
                      defaultValue={w.preferences.reminderDays}
                    />
                  </label>
                </div>
                <label>
                  Renda mensal estimada (R$)
                  <input
                    name="income"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={w.preferences.estimatedIncome / 100}
                  />
                  <small>Referência informativa; não aumenta seu saldo ou receitas.</small>
                </label>
                <label>
                  Moeda principal
                  <select>
                    <option>BRL · Real brasileiro</option>
                  </select>
                </label>
                <Button disabled={busy} type="submit">
                  Salvar preferências
                </Button>
              </form>
            </Panel>
            <div className="stack">
              <Panel title="Aparência e privacidade">
                <div className="setting-row">
                  <span>
                    <Moon size={18} /> Tema escuro
                  </span>
                  <button
                    role="switch"
                    aria-checked={dark}
                    className={`toggle ${dark ? 'on' : ''}`}
                    onClick={toggleTheme}
                  >
                    <i />
                  </button>
                </div>
                <div className="setting-row">
                  <span>
                    <EyeOff size={18} /> Ocultar valores
                  </span>
                  <button
                    role="switch"
                    aria-checked={hidden}
                    className={`toggle ${hidden ? 'on' : ''}`}
                    onClick={() => setHidden(!hidden)}
                  >
                    <i />
                  </button>
                </div>
                <div className="notice">
                  <LockKeyhole size={18} />
                  Seus registros ficam somente na sua conta Supabase, compartilhados entre seus
                  dispositivos.
                </div>
                <Button variant="outline" className="full" onClick={() => setAuthOpen(true)}>
                  {user ? 'Gerenciar sessão' : 'Acessar conta na nuvem'}
                </Button>
              </Panel>
              <CostSafetyPanel workspace={w} onBackup={exportFullBackup} />
              <Panel
                title="Categorias"
                action={
                  <Button variant="outline" size="sm" onClick={() => openResource('category')}>
                    <Plus size={15} /> Nova categoria
                  </Button>
                }
              >
                <div className="category-tags">
                  {w.categories.map((c) => (
                    <span key={c}>
                      <Tag size={12} />
                      {c}
                      <button
                        aria-label={`${w.preferences.archivedCategories?.includes(c) ? 'Reativar' : 'Arquivar'} categoria ${c}`}
                        className="text-button"
                        disabled={busy}
                        onClick={() => {
                          const archived = w.preferences.archivedCategories || [];
                          void commit(
                            {
                              ...w,
                              preferences: {
                                ...w.preferences,
                                archivedCategories: archived.includes(c)
                                  ? archived.filter((x) => x !== c)
                                  : [...archived, c],
                              },
                            },
                            archived.includes(c)
                              ? 'Categoria reativada'
                              : 'Categoria arquivada sem apagar histórico',
                          ).catch(() => {});
                        }}
                      >
                        {w.preferences.archivedCategories?.includes(c) ? 'Reativar' : 'Arquivar'}
                      </button>
                    </span>
                  ))}
                </div>
              </Panel>
            </div>
          </div>
        );
      case 'help':
        return (
          <Panel title="Finanças, sem complicação">
            <div className="help-grid">
              {[
                [
                  'Saldo real',
                  'Saldo inicial mais recebimentos, menos pagamentos e transferências efetivadas até hoje. Contas futuras não alteram esse valor.',
                ],
                [
                  'Competência e caixa',
                  'Competência considera o vencimento das obrigações. Caixa considera a data dos pagamentos. O pagamento da fatura aparece no caixa sem criar outra compra.',
                ],
                [
                  'Dinheiro livre',
                  'Saldo real menos obrigações pendentes até o fim do mês selecionado e reservas para metas. Não inclui receitas que você ainda não recebeu.',
                ],
                [
                  'Parcelas e recorrências',
                  'Parcelas dividem um total finito, distribuindo os centavos restantes nas primeiras parcelas. Recorrências repetem o valor e são materializadas em um horizonte móvel de até 60 meses.',
                ],
                [
                  'Datas de vencimento',
                  'Nos meses curtos, vencimentos nos dias 29, 30 e 31 usam o último dia existente. A compra no dia do fechamento entra na fatura que está fechando.',
                ],
                [
                  'Metas e investimentos',
                  'Reservar para uma meta não é consumo. Avaliações patrimoniais são manuais. Registre somente valores que não estejam duplicados em contas e outros ativos.',
                ],
                [
                  'Projeções',
                  'Estimativas baseadas nas obrigações cadastradas. Simulações são isoladas. Nenhuma projeção é uma garantia e receitas não registradas não são presumidas.',
                ],
                [
                  'Persistência e segurança',
                  'Seus registros financeiros ficam no Supabase e exigem login. Use a mesma conta Google em todos os dispositivos. Sem conexão, gravações são recusadas e não há cópia financeira local.',
                ],
              ].map(([title, description]) => (
                <article key={title}>
                  <span className="goal-icon">
                    <CircleHelp size={19} />
                  </span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </article>
              ))}
            </div>
          </Panel>
        );
      default:
        return null;
    }
  }
  function toggleTheme() {
    void commit(
      { ...w, preferences: { ...w.preferences, theme: dark ? 'light' : 'dark' } },
      'Tema atualizado',
    ).catch(() => {});
  }
  function exportFullBackup(format: 'json' | 'csv') {
    try {
      download(
        `gevyro-backup-completo-${today()}.${format}`,
        format === 'json' ? backupJSON(w) : backupCSV(w),
        format === 'json' ? 'application/json' : 'text/csv;charset=utf-8',
      );
      toast.success('Download do backup iniciado. Guarde o arquivo em um local privado.');
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Não foi possível exportar o backup. Os dados foram preservados.',
      );
    }
  }
  function exportCSV() {
    if (page === 'reports') {
      download(
        `gevyro-relatorio-${perspective}-${reportStart}-${reportEnd}.csv`,
        '\uFEFF' +
          Papa.unparse(
            selectedReportRows.map((r) => ({ ...r, amount_cents: r.amount })),
            { escapeFormulae: true },
          ),
        'text/csv;charset=utf-8',
      );
      return;
    }
    const rows = monthRows.map((o) => ({
      description: o.name,
      date: o.date,
      amount: ((o.kind === 'income' ? 1 : -1) * o.amount) / 100,
      category: o.category,
      status: statusLabels[status(w, o)],
      account:
        w.accounts.find((a) => a.id === o.accountId)?.name ||
        w.cards.find((c) => c.id === o.cardId)?.name ||
        '',
      paid: paid(w, o.id) / 100,
    }));
    download(
      `gevyro-${month}.csv`,
      '\uFEFF' + Papa.unparse(rows, { escapeFormulae: true }),
      'text/csv;charset=utf-8',
    );
  }
  async function readImport(file: File) {
    try {
      if (file.size > COST_POLICY.maxImportBytes)
        throw new Error('O arquivo deve ter no máximo 5 MB.');
      const content = await file.text();
      const hash = Array.from(
        new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content))),
      )
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      if (w.imports.includes(hash)) throw new Error('Esse arquivo já foi importado.');
      setImportHash(hash);
      if (file.name.toLowerCase().endsWith('.ofx')) {
        const rows = parseOFX(content);
        if (!rows.length) throw new Error('Nenhuma transação reconhecida no arquivo OFX.');
        if (rows.length > COST_POLICY.maxImportRows)
          throw new Error('Importe no máximo 3.000 linhas por lote. Nenhum dado foi gravado.');
        setImportRows(rows);
        setRawImport([]);
        setImportHeaders([]);
      } else {
        const parsed = Papa.parse<Record<string, string>>(content, {
          header: true,
          skipEmptyLines: true,
        });
        if (parsed.errors.length) throw new Error('CSV inválido: ' + parsed.errors[0].message);
        if (!parsed.data.length || parsed.data.length > COST_POLICY.maxImportRows)
          throw new Error('Importe entre 1 e 3.000 linhas por lote.');
        const headers = parsed.meta.fields || [];
        setImportHeaders(headers);
        setRawImport(parsed.data);
        const find = (keys: string[]) =>
          headers.find((h) => keys.includes(h.toLowerCase())) || headers[0];
        const map = {
          description: find(['description', 'descrição', 'descricao', 'memo', 'nome']),
          amount: find(['amount', 'valor', 'value']),
          date: find(['date', 'data', 'vencimento']),
        };
        setMapping(map);
        setImportRows(
          parsed.data.map((r) => ({
            description: r[map.description],
            amount: r[map.amount],
            date: r[map.date],
            category: r.category || r.categoria,
          })),
        );
      }
      setImportAccount(w.accounts[0]?.id || '');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao ler arquivo.');
    }
  }
  function mappedRows(map: typeof mapping) {
    setMapping(map);
    setImportRows(
      rawImport.map((r) => ({
        description: r[map.description],
        amount: r[map.amount],
        date: r[map.date],
        category: r.category || r.categoria,
      })),
    );
  }
  const normalizeImportDate = normalizeBankDate;
  async function importConfirm() {
    try {
      if (!w.accounts.some((a) => a.id === importAccount))
        throw new Error('Selecione uma conta de destino.');
      let next = {
        ...w,
        plans: [...w.plans],
        obligations: [...w.obligations],
        payments: [...w.payments],
        imports: [...w.imports, importHash],
      };
      let duplicates = 0;
      const fingerprints = new Set(
        w.obligations.map(
          (o) => `${o.name.toLowerCase().trim()}:${o.kind}:${o.amount}:${o.date}:${o.accountId}`,
        ),
      );
      const externalIds = new Set(
        w.plans
          .filter((p) => p.accountId === importAccount && p.externalId)
          .map((p) => p.externalId),
      );
      for (const row of importRows) {
        const amount = cents(row.amount);
        const date = normalizeImportDate(row.date);
        if (!row.description || !date || !amount)
          throw new Error('Preencha descrição, data e valor de todas as linhas.');
        const kind = amount > 0 ? 'income' : 'expense';
        const fingerprint = `${row.description.toLowerCase().trim()}:${kind}:${Math.abs(amount)}:${date}:${importAccount}`;
        if (
          row.externalId
            ? externalIds.has(row.externalId)
            : fingerprints.has(fingerprint) && !row.allowSimilar
        ) {
          duplicates++;
          continue;
        }
        fingerprints.add(fingerprint);
        if (row.externalId) externalIds.add(row.externalId);
        const id = uid();
        const p: Plan = {
          id,
          name: row.description,
          amount: Math.abs(amount),
          kind,
          category: w.categories.includes(row.category || '') ? row.category! : 'Outros',
          accountId: importAccount,
          cardId: '',
          date,
          mode: 'once',
          count: 1,
          interval: 1,
          unit: 'month',
          end: '',
          notes: `Lote de importação: ${importHash}`,
          externalId: row.externalId,
          subscription: false,
        };
        const generated = occurrences(p);
        next.plans.push(p);
        next.obligations.push(...generated);
        next = addPayment(next, generated[0].id, importAccount, p.amount, date, uid());
      }
      await commit(
        next,
        `Importação confirmada (${importRows.length - duplicates} registros; ${duplicates} duplicados ignorados)`,
      );
      setImportRows([]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Revise o arquivo e tente novamente.');
    }
  }
  async function restore(file: File) {
    try {
      if (file.size > 15 * 1024 * 1024) throw new Error('Backup muito grande.');
      const parsed = workspaceSchema.parse(JSON.parse(await file.text()));
      setConfirm({
        title: 'Restaurar este backup?',
        description:
          'Os dados atuais serão substituídos após confirmação. Exporte uma cópia antes de continuar. A restauração será registrada no histórico.',
        run: async () => {
          await commit(parsed, 'Backup restaurado');
          setConfirm(null);
        },
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Backup inválido.');
    }
  }
  const primaryAction = () => {
    if (page === 'journal') {
      setJournalOpen(true);
      return;
    }
    if (page === 'accounts') openResource('account');
    else if (page === 'cards') openResource('card');
    else if (page === 'goals') openResource('goal');
    else if (page === 'budgets') openResource('budget');
    else if (page === 'investments') openResource('investment');
    else if (page === 'wealth') openResource('asset');
    else if (page === 'planning') openResource('scenario');
    else newEntry(page === 'subscriptions');
  };
  const primaryText: Record<string, string> = {
    journal: 'Registrar movimento',
    accounts: 'Nova conta',
    cards: 'Novo cartão',
    goals: 'Nova meta',
    budgets: 'Novo orçamento',
    investments: 'Novo investimento',
    wealth: 'Novo ativo',
    planning: 'Novo cenário',
    subscriptions: 'Nova assinatura',
  };
  return (
    <div className={`app ${mobile ? 'mobile-open' : ''}`}>
      <Toaster position="bottom-right" theme={dark ? 'dark' : 'light'} richColors />
      {mobile && (
        <button
          className="sidebar-scrim"
          aria-label="Fechar navegação"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className="sidebar">
        <button
          className="brand"
          onClick={() => go('dashboard')}
          aria-label="Gevyro Finanças início"
        >
          <span className="brand-mark">
            <GevyroLogo decorative />
          </span>
          <span>
            gevyro<small>FINANÇAS</small>
          </span>
        </button>
        <button className="workspace-switch" onClick={() => go('settings')}>
          <span className="workspace-avatar">
            {w.preferences.name.slice(0, 1).toUpperCase() || 'P'}
          </span>
          <span>
            <strong>Finanças pessoais</strong>
            <small>Seu espaço financeiro</small>
          </span>
          <ChevronDown size={15} />
        </button>
        <nav aria-label="Navegação principal">
          {nav.map((item, i) => (
            <div key={item.id}>
              {(i === 0 || nav[i - 1].group !== item.group) && (
                <p className="nav-label">{item.group}</p>
              )}
              <button
                className={`nav-item ${page === item.id ? 'active' : ''}`}
                aria-label={item.label}
                aria-current={page === item.id ? 'page' : undefined}
                onClick={() => go(item.id)}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
                {item.id === 'transactions' && monthRows.length > 0 && (
                  <small>{monthRows.length}</small>
                )}
                {page === item.id && <i />}
              </button>
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            className={`nav-item ${page === 'help' ? 'active' : ''}`}
            onClick={() => go('help')}
          >
            <CircleHelp size={18} /> Central de ajuda
          </button>
          <button
            className={`nav-item ${page === 'settings' ? 'active' : ''}`}
            onClick={() => go('settings')}
          >
            <Settings2 size={18} /> Configurações
          </button>
          <div className="sidebar-note">
            <ShieldCheck size={15} />
            <span>Mais controle. Mais tranquilidade.</span>
          </div>
          <button className="profile" onClick={() => setAuthOpen(true)}>
            <span className="profile-avatar">
              {w.preferences.name.slice(0, 2).toUpperCase() || 'EU'}
            </span>
            <span>
              <strong>{w.preferences.name || 'Meu espaço'}</strong>
              <small>{'Conta sincronizada'}</small>
            </span>
            <Ellipsis size={17} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-action"
              aria-label="Abrir navegação"
              onClick={() => setMobile(true)}
            >
              <Menu size={22} />
            </button>
            <span>Meu espaço</span>
            <ChevronRight size={13} />
            <strong>{nav.find((n) => n.id === page)?.label || titles[page]?.[0]}</strong>
          </div>
          <div className="topbar-actions">
            <div className="global-search">
              <Search size={16} />
              <input
                ref={searchRef}
                placeholder="Buscar movimentações…"
                aria-label="Buscar movimentações"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  if (e.target.value) go('transactions');
                }}
              />
              <kbd>⌘ K</kbd>
              {search && (
                <button aria-label="Limpar busca" onClick={() => setSearch('')}>
                  <X size={13} />
                </button>
              )}
            </div>
            <button
              className="icon-action"
              onClick={() => setHidden(!hidden)}
              title={hidden ? 'Mostrar valores' : 'Ocultar valores'}
            >
              {hidden ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
            <button
              className="icon-action"
              onClick={toggleTheme}
              title={dark ? 'Usar tema claro' : 'Usar tema escuro'}
            >
              {dark ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <button
              className="notification-button icon-action"
              title="Notificações"
              onClick={() => setNotifications(true)}
            >
              <Bell size={19} />
              {alerts.length > 0 && <i />}
            </button>
            <span className="topbar-divider" />
            <button className="header-avatar" aria-label="Perfil" onClick={() => go('settings')}>
              {w.preferences.name.slice(0, 2).toUpperCase() || 'EU'}
            </button>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="page-eyebrow">
                {page === 'dashboard'
                  ? `SEU CONTROLE FINANCEIRO${w.preferences.name ? `, ${w.preferences.name.toUpperCase()}` : ''}`
                  : 'GEVYRO FINANÇAS'}
              </div>
              <h1>{titles[page]?.[0]}</h1>
              <p>{titles[page]?.[1]}</p>
            </div>
            <div className="page-actions">
              <div className="month-picker">
                <button
                  aria-label="Mês anterior"
                  onClick={() => {
                    setMonth(monthOf(shiftMonth(`${month}-01`, -1)));
                    setSelectedDay('');
                  }}
                >
                  <ChevronLeft size={16} />
                </button>
                <label>
                  <CalendarDays size={16} />
                  <span>{monthLabel(month)}</span>
                  <input
                    type="month"
                    aria-label="Selecionar mês"
                    value={month}
                    onChange={(e) => {
                      if (e.target.value) setMonth(e.target.value);
                    }}
                  />
                </label>
                <button
                  aria-label="Próximo mês"
                  onClick={() => {
                    setMonth(monthOf(shiftMonth(`${month}-01`, 1)));
                    setSelectedDay('');
                  }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              <Button onClick={primaryAction} disabled={!ready || !!loadError}>
                <Plus size={17} />
                <span>{primaryText[page] || 'Nova movimentação'}</span>
              </Button>
            </div>
          </div>
          {syncError && (
            <div className="notice" role="status">
              {syncError}
            </div>
          )}
          {!ready ? (
            <div className="loading-state">
              <LoaderCircle className="spin" size={27} />
              <p>Carregando seu espaço com segurança…</p>
              <div className="skeleton-grid">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} />
                ))}
              </div>
            </div>
          ) : loadError ? (
            <Panel title="Não foi possível carregar seus dados">
              <Empty
                icon={CircleAlert}
                title="Sua informação precisa estar segura"
                description={loadError}
                action={
                  <Button onClick={() => void refresh(user?.id)}>
                    <RefreshCw size={15} /> Tentar novamente
                  </Button>
                }
              />
            </Panel>
          ) : (
            <div className="page-content" key={page}>
              {renderPage()}
            </div>
          )}
          <footer>
            <span>
              <GevyroLogo decorative className="footer-logo" /> Gevyro Finanças <i /> Feito para uma
              vida mais organizada.
            </span>
            <span>
              {busy ? (
                <>
                  <LoaderCircle size={13} className="spin" /> Salvando…
                </>
              ) : (
                <>
                  <ShieldCheck size={13} />{' '}
                  {syncError
                    ? 'Atualização pendente'
                    : 'Dados na sua conta · atualização a cada 30 s'}
                </>
              )}
            </span>
          </footer>
        </main>
      </div>
      <JournalDialog
        open={journalOpen}
        onClose={() => setJournalOpen(false)}
        w={w}
        commit={commit}
        busy={busy}
      />
      <PurchaseDialog
        key={purchaseId}
        w={w}
        planId={purchaseId}
        hidden={hidden}
        busy={busy}
        commit={commit}
        onClose={() => setPurchaseId('')}
        onDetail={setDetail}
      />
      <Modal
        open={!!detail}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
        title={detail?.name || 'Detalhes'}
        description="Ocorrência individual e histórico de liquidação."
      >
        {detail && (
          <div className="stack">
            <div className="detail-row">
              <span>Categoria</span>
              <strong>{detail.category}</strong>
            </div>
            <div className="detail-row">
              <span>Vencimento</span>
              <strong>
                {dateLabel(detail.date)} / {detail.date.slice(0, 4)}
              </strong>
            </div>
            <div className="detail-row">
              <span>Valor original</span>
              <strong>{f(detail.originalAmount ?? detail.amount)}</strong>
            </div>
            <div className="detail-row">
              <span>Saldo restante</span>
              <strong>{f(remaining(w, detail))}</strong>
            </div>
            <p className="muted">
              {detail.notes ||
                w.plans.find((p) => p.id === detail.planId)?.notes ||
                'Sem observações.'}
            </p>
            <OccurrenceControl
              w={w}
              o={detail}
              busy={busy}
              commit={commit}
              onClose={() => setDetail(null)}
            />
            {w.payments
              .filter((p) => p.obligationId === detail.id)
              .map((p) => (
                <div className="detail-row" key={p.id}>
                  <span>
                    {dateLabel(p.date)} · {f(p.amount)} {p.reversed ? '· Estornado' : ''}
                  </span>
                  {!p.reversed && (
                    <button
                      className="text-button"
                      onClick={() =>
                        setConfirm({
                          title: 'Estornar este pagamento?',
                          description:
                            'O saldo da conta será recomposto e a obrigação voltará a ficar pendente. O histórico será preservado.',
                          run: async () => {
                            await commit(reversePayment(w, p.id), 'Pagamento estornado');
                            setConfirm(null);
                            setDetail(null);
                          },
                        })
                      }
                    >
                      Estornar
                    </button>
                  )}
                </div>
              ))}
            <div className="modal-actions">
              <Button
                variant="outline"
                onClick={() => {
                  const p = w.plans.find((p) => p.id === detail.planId);
                  if (p) {
                    setEditing({
                      ...p,
                      id: uid(),
                      name: `${p.name} (cópia)`,
                      mode: 'once',
                      count: 1,
                      date: today(),
                    });
                    setDetail(null);
                    setEntryOpen(true);
                  }
                }}
              >
                Duplicar lançamento
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  const p = w.plans.find((p) => p.id === detail.planId);
                  if (p) {
                    setDetail(null);
                    requestCancel(p);
                  }
                }}
              >
                Cancelar futuros
              </Button>
            </div>
          </div>
        )}
      </Modal>
      <Modal
        open={entryOpen}
        onOpenChange={setEntryOpen}
        title={
          editing
            ? 'Editar movimentação'
            : subscriptionNew
              ? 'Nova assinatura'
              : 'Nova movimentação'
        }
        description="Organize hoje. Tenha clareza amanhã."
      >
        {entryOpen && (
          <EntryEditor
            key={editing?.id || String(subscriptionNew)}
            workspace={w}
            initial={editing}
            subscription={subscriptionNew}
            onSave={savePlan}
            busy={busy}
          />
        )}
      </Modal>
      <Modal
        open={!!resource}
        onOpenChange={(open) => {
          if (!open) setResource(null);
        }}
        title={resource ? resourceTitle[resource] : ''}
      >
        {resource && (
          <ResourceForm
            key={`${resource}:${editResource?.id || 'new'}`}
            kind={resource}
            initial={editResource}
            w={w}
            onSubmit={saveResource}
            busy={busy}
          />
        )}
      </Modal>
      <Modal
        open={!!payment}
        onOpenChange={(open) => {
          if (!open) setPayment(null);
        }}
        title="Registrar pagamento"
        description={payment?.name}
      >
        {payment && (
          <form
            className="form"
            onSubmit={async (e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              try {
                const next = addPayment(
                  w,
                  payment.id,
                  String(data.get('account')),
                  cents(String(data.get('amount'))),
                  String(data.get('date')),
                  uid(),
                );
                await commit(
                  next,
                  payment.kind === 'income' ? 'Recebimento registrado' : 'Pagamento registrado',
                );
                setPayment(null);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Falha ao registrar.');
              }
            }}
          >
            <div className="payment-total">
              <small>Saldo em aberto</small>
              <strong>{f(remaining(w, payment))}</strong>
            </div>
            <label>
              Conta
              <select name="account" defaultValue={payment.accountId}>
                {w.accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-grid">
              <label>
                Valor pago (R$)
                <input
                  required
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={remaining(w, payment) / 100}
                  defaultValue={remaining(w, payment) / 100}
                />
              </label>
              <label>
                Data efetiva
                <input required name="date" type="date" max={today()} defaultValue={today()} />
              </label>
            </div>
            <p className="muted">Pagamentos parciais preservam o saldo restante da obrigação.</p>
            <Button disabled={busy} type="submit">
              Confirmar pagamento
            </Button>
          </form>
        )}
      </Modal>
      <Modal
        open={!!invoice}
        onOpenChange={(open) => {
          if (!open) setInvoice(null);
        }}
        title={`Fatura · ${w.cards.find((c) => c.id === invoice?.card)?.name || ''}`}
        description={invoice ? monthLabel(invoice.month) : ''}
      >
        {invoice && (
          <>
            <div className="invoice-items">
              {w.obligations
                .filter(
                  (o) =>
                    o.cardId === invoice.card && monthOf(o.date) === invoice.month && !o.cancelled,
                )
                .map((o) => (
                  <div className="detail-row" key={o.id}>
                    <span>
                      {o.name}
                      {o.total > 1 ? ` (${o.installment}/${o.total})` : ''}
                    </span>
                    <strong>{f(remaining(w, o))}</strong>
                  </div>
                ))}
            </div>
            <div className="payment-total">
              <small>Saldo da fatura</small>
              <strong>
                {f(
                  w.obligations
                    .filter((o) => o.cardId === invoice.card && monthOf(o.date) === invoice.month)
                    .reduce((s, o) => s + remaining(w, o), 0),
                )}
              </strong>
            </div>
            {w.obligations.some(
              (o) =>
                o.cardId === invoice.card &&
                monthOf(o.date) === invoice.month &&
                remaining(w, o) > 0,
            ) ? (
              <form
                className="form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const data = new FormData(e.currentTarget);
                  try {
                    const next = payInvoice(
                      w,
                      invoice.card,
                      invoice.month,
                      String(data.get('account')),
                      cents(String(data.get('amount'))),
                      String(data.get('date')),
                      uid(),
                    );
                    await commit(next, 'Pagamento da fatura registrado');
                    setInvoice(null);
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : 'Falha ao pagar fatura.');
                  }
                }}
              >
                <label>
                  Conta de pagamento
                  <select
                    name="account"
                    defaultValue={w.cards.find((c) => c.id === invoice.card)?.accountId}
                  >
                    {w.accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="form-grid">
                  <label>
                    Valor a pagar (R$)
                    <input
                      name="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      defaultValue={
                        w.obligations
                          .filter(
                            (o) => o.cardId === invoice.card && monthOf(o.date) === invoice.month,
                          )
                          .reduce((s, o) => s + remaining(w, o), 0) / 100
                      }
                    />
                  </label>
                  <label>
                    Data efetiva
                    <input name="date" type="date" max={today()} defaultValue={today()} required />
                  </label>
                </div>
                <div className="notice">
                  O pagamento reduz o saldo da conta e liquida os itens sem criar uma segunda
                  despesa.
                </div>
                <Button disabled={busy} type="submit">
                  Confirmar pagamento da fatura
                </Button>
              </form>
            ) : (
              <div className="notice">
                <CheckCheck size={19} /> Não há saldo pendente nesta fatura.
              </div>
            )}
          </>
        )}
      </Modal>
      <Modal
        open={authOpen}
        onOpenChange={setAuthOpen}
        title={user ? 'Sua conta' : 'Bem-vindo ao Gevyro'}
        description="Seu dinheiro merece um espaço seguro."
      >
        <div className="stack">
          <p>{user.email}</p>
          <div className="notice">
            <ShieldCheck size={20} /> Sua sessão usa Supabase Auth. Seus registros ficam na conta e
            são acessíveis nos seus dispositivos.
          </div>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() =>
              setConfirm({
                title: 'Migrar o histórico anterior para sua conta?',
                description:
                  'Exporte um backup antes de continuar. A migração exige uma conta vazia. O histórico antigo só será removido deste navegador depois de gravar e conferir a cópia no Supabase.',
                run: async () => {
                  setBusy(true);
                  try {
                    await copyLocalWorkspaceToCloud(user.id);
                    setConfirm(null);
                    setAuthOpen(false);
                    await refresh(user.id);
                    toast.success(
                      'Histórico migrado e conferido no Supabase; cópia antiga removida deste navegador.',
                    );
                  } catch (e) {
                    toast.error(
                      e instanceof Error
                        ? e.message
                        : 'A cópia não foi concluída. Os dados locais foram preservados.',
                    );
                  } finally {
                    setBusy(false);
                  }
                },
              })
            }
          >
            Migrar histórico da versão anterior
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              const { error } = await supabase!.auth.signOut();
              if (error) toast.error(error.message);
              else {
                setAuthOpen(false);
                toast.success('Sessão encerrada');
              }
            }}
          >
            <LogOut size={16} /> Encerrar sessão
          </Button>
        </div>
      </Modal>
      <Modal
        open={onboarding}
        onOpenChange={setOnboarding}
        title="Seu espaço, do seu jeito"
        description="Comece pelo essencial. Você pode completar tudo depois."
      >
        <form
          className="form"
          onSubmit={async (e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            try {
              const id = uid();
              const name = String(data.get('account') || '').trim();
              const next = {
                ...w,
                preferences: {
                  ...w.preferences,
                  name: String(data.get('name') || ''),
                  estimatedIncome: cents(String(data.get('income') || '0')),
                  payday: Number(data.get('payday') || 5),
                  onboarding: true,
                },
                accounts: name
                  ? [
                      ...w.accounts,
                      {
                        id,
                        name,
                        institution: '',
                        type: 'digital',
                        opening: cents(String(data.get('opening') || '0')),
                        openingDate: today(),
                        color: '#059669',
                      },
                    ]
                  : w.accounts,
              };
              await commit(next, 'Configuração inicial salva');
              setOnboarding(false);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'Revise os campos.');
            }
          }}
        >
          <div className="onboarding-icon">
            <Sparkles size={30} />
          </div>
          <label>
            Como podemos chamar você?
            <input name="name" placeholder="Seu nome" defaultValue={w.preferences.name} />
          </label>
          <div className="form-grid">
            <label>
              Renda mensal estimada (R$)
              <input name="income" type="number" min="0" step="0.01" placeholder="0,00" />
            </label>
            <label>
              Dia de recebimento
              <input name="payday" type="number" min="1" max="31" defaultValue={5} />
            </label>
          </div>
          <label>
            Nome da primeira conta (opcional)
            <input name="account" placeholder="Ex.: Minha conta principal" />
          </label>
          <label>
            Saldo atual dessa conta (R$)
            <input name="opening" type="number" step="0.01" defaultValue={0} />
          </label>
          <div className="notice">
            <ShieldCheck size={18} /> BRL · Português do Brasil · America/Sao_Paulo. Você pode
            adicionar outras contas e cartões a qualquer momento.
          </div>
          <Button disabled={busy} type="submit">
            Começar meu controle financeiro
          </Button>
          <button
            className="text-button centered"
            type="button"
            onClick={() => {
              void commit(
                { ...w, preferences: { ...w.preferences, onboarding: true } },
                'Configuração adiada',
              )
                .then(() => setOnboarding(false))
                .catch(() => {});
            }}
          >
            Configurar depois
          </button>
        </form>
      </Modal>
      <Modal
        open={notifications}
        onOpenChange={setNotifications}
        title="Seu radar financeiro"
        description="Alertas calculados a partir dos seus compromissos."
      >
        <div className="notification-list">
          {financialNotifications(w).length ? (
            financialNotifications(w).map((n) => (
              <div key={n.id} className="notification-entry">
                <button
                  className="notification-row"
                  onClick={() => {
                    const o = w.obligations.find((o) => o.id === n.targetId);
                    if (o) {
                      setMonth(monthOf(o.date));
                      setNotifications(false);
                      go('transactions');
                    }
                  }}
                >
                  <Bell size={18} />
                  <span>
                    <strong>{n.title}</strong>
                    <p>
                      {n.description} · {n.date}
                    </p>
                  </span>
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={n.read || busy}
                  onClick={() => {
                    const records = persistNotifications(w).notifications.map((row) =>
                      row.id === n.id ? { ...row, read: true } : row,
                    );
                    void commit({ ...w, notifications: records }, 'Notificação lida').catch(
                      () => {},
                    );
                  }}
                >
                  {n.read ? 'Lida' : 'Marcar como lida'}
                </Button>
              </div>
            ))
          ) : (
            <Empty
              icon={CheckCheck}
              title="Nenhum compromisso próximo"
              description="Os alertas de receitas e despesas aparecerão de acordo com suas preferências."
            />
          )}
        </div>
      </Modal>
      <Modal
        open={!!confirm}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
        title={confirm?.title || 'Confirmar'}
        description={confirm?.description}
      >
        <div className="modal-actions">
          <Button variant="outline" onClick={() => setConfirm(null)}>
            Voltar
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={() => void confirm?.run().catch(() => {})}
          >
            Confirmar
          </Button>
        </div>
      </Modal>
      <Modal
        open={importRows.length > 0}
        onOpenChange={(open) => {
          if (!open) setImportRows([]);
        }}
        title="Revise sua importação"
        description={`${importRows.length} linhas encontradas. Datas futuras ou inválidas impedirão a importação.`}
      >
        <div className="form">
          <label>
            Conta de destino
            <select value={importAccount} onChange={(e) => setImportAccount(e.target.value)}>
              <option value="">Selecione uma conta</option>
              {w.accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          {importHeaders.length > 0 && (
            <div className="form-grid three">
              {(['description', 'amount', 'date'] as const).map((key) => (
                <label key={key}>
                  {key === 'description' ? 'Descrição' : key === 'amount' ? 'Valor' : 'Data'}
                  <select
                    value={mapping[key]}
                    onChange={(e) => mappedRows({ ...mapping, [key]: e.target.value })}
                  >
                    {importHeaders.map((h) => (
                      <option key={h}>{h}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          )}
          <div className="import-preview">
            <table>
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Data</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                {importRows.slice(0, 30).map((r, i) => (
                  <tr key={i}>
                    <td>
                      <input
                        aria-label={`Descrição da linha ${i + 1}`}
                        value={r.description}
                        onChange={(e) =>
                          setImportRows((rows) =>
                            rows.map((row, j) =>
                              j === i ? { ...row, description: e.target.value } : row,
                            ),
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        aria-label={`Data da linha ${i + 1}`}
                        value={r.date}
                        onChange={(e) =>
                          setImportRows((rows) =>
                            rows.map((row, j) =>
                              j === i ? { ...row, date: e.target.value } : row,
                            ),
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        aria-label={`Valor da linha ${i + 1}`}
                        value={r.amount}
                        onChange={(e) =>
                          setImportRows((rows) =>
                            rows.map((row, j) =>
                              j === i ? { ...row, amount: e.target.value } : row,
                            ),
                          )
                        }
                      />
                    </td>
                    <td>
                      <label className="checkbox">
                        <input
                          type="checkbox"
                          checked={!!r.allowSimilar}
                          disabled={!!r.externalId}
                          onChange={(e) =>
                            setImportRows((rows) =>
                              rows.map((row, j) =>
                                j === i ? { ...row, allowSimilar: e.target.checked } : row,
                              ),
                            )
                          }
                        />
                        Manter semelhante
                      </label>
                      <button
                        className="text-button"
                        onClick={() => setImportRows((rows) => rows.filter((_, j) => i !== j))}
                      >
                        Remover linha
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted">
            Exibindo até 30 linhas para revisão. Identificadores OFX já importados são sempre
            ignorados. Para registros sem identificador, use Manter semelhante apenas para compras
            distintas com dados iguais. A importação é atômica.
          </p>
          <Button disabled={busy} onClick={() => void importConfirm()}>
            <Check size={16} /> Confirmar importação
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default function FinanceApp() {
  return (
    <AccountGate>{(user) => <FinanceWorkspace key={user.id} accountUser={user} />}</AccountGate>
  );
}
