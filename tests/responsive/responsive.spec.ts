import { expect, test, type Page } from '@playwright/test';
import { reschedulingWorkspace } from '../fixtures/rescheduling';
import type { Workspace } from '../../src/domain/types';
const widths = [320, 360, 375, 390, 430, 768, 1024, 1280, 1440];
function fixture(): Workspace {
  const w = reschedulingWorkspace();
  w.preferences.name = 'Matheus';
  w.assets = [
    {
      id: 'asset',
      name: 'Ações da carteira de longo prazo',
      type: 'investment',
      classification: 'Ações',
      ticker: 'PETR4',
      institution: 'Corretora de teste',
      value: 35000,
      cost: 35000,
      quantity: '10',
      date: '2026-01-01',
      notes: 'Avaliação manual',
    },
  ];
  w.cards = [
    {
      id: 'card',
      name: 'Cartão principal',
      accountId: 'bank',
      limit: 500000,
      closing: 2,
      due: 10,
      last4: '1234',
    },
  ];
  w.goals = [
    {
      id: 'goal',
      name: 'Reserva de emergência',
      target: 500000,
      reserved: 50000,
      monthly: 10000,
      date: '2027-12-01',
    },
  ];
  w.budgets = [
    { id: 'budget', category: 'Compras', amount: 50000, month: '2026-11', perspective: 'accrual' },
  ];
  return w;
}
async function seed(page: Page) {
  await page.request.post('/__test/reset', { data: fixture() });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.getByLabel('Selecionar mês').fill('2026-11');
}
async function go(page: Page, name: string) {
  if ((page.viewportSize()?.width ?? 1440) < 768) {
    const primary = page
      .getByRole('navigation', { name: 'Navegação do celular' })
      .getByRole('button', { name: `Ir para ${name}`, exact: true });
    if (await primary.count()) {
      await primary.click();
    } else {
      await page.getByRole('button', { name: 'Abrir menu completo' }).click();
      await page
        .getByRole('dialog')
        .getByRole('button', { name: `Abrir ${name}`, exact: true })
        .click();
    }
  } else
    await page
      .getByRole('navigation', { name: 'Navegação principal', exact: true })
      .getByRole('button', { name, exact: true })
      .click();
}
async function noPageOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    width: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    outside: [...document.querySelectorAll('body *')]
      .filter((e) => {
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.right > document.documentElement.clientWidth + 1;
      })
      .slice(0, 12)
      .map((e) => ({
        tag: e.tagName,
        cls: e.className,
        right: Math.round(e.getBoundingClientRect().right),
        width: Math.round(e.getBoundingClientRect().width),
      })),
  }));
  expect(overflow.width, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.viewport + 1);
}
for (const width of widths)
  test(`principais módulos sem overflow em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 860 });
    await seed(page);
    for (const pageName of [
      'Visão geral',
      'Movimentações',
      'Parcelamentos',
      'Investimentos',
      'Calendário',
      'Planejamento',
      'Orçamentos',
      'Metas financeiras',
      'Relatórios',
      'Contas e carteiras',
      'Cartões de crédito',
      'Assinaturas',
      'Patrimônio e dívidas',
      'Aportes e ajustes',
      'Importar e exportar',
    ]) {
      await go(page, pageName);
      await expect(page.getByText('Carregando gráfico…', { exact: true })).toHaveCount(0);
      await noPageOverflow(page);
    }
    await go(page, 'Visão geral');
    await page.screenshot({
      path: `.openai/local/responsive-results/dashboard-${width}.png`,
      fullPage: true,
    });
  });
test('menu, foco e barra inferior funcionam com toque e teclado', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page);
  const nav = page.getByRole('navigation', { name: 'Navegação do celular' });
  await expect(nav.getByRole('button')).toHaveCount(5);
  await nav.getByRole('button', { name: 'Abrir menu completo' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(nav.getByRole('button', { name: 'Abrir menu completo' })).toBeFocused();
  await go(page, 'Movimentações');
  await expect(
    nav.getByRole('button', { name: 'Ir para Movimentações', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
  const card = page.getByRole('article').filter({ hasText: 'Cama Queen Ortobom' });
  await expect(card).toHaveCount(1);
  await expect(card.getByText('05/11/2026')).toBeVisible();
  await card.getByRole('button', { name: /Editar Cama/ }).click();
  await expect(page.getByLabel('Vencimento', { exact: true })).toHaveValue('2026-11-05');
  await page.getByLabel('Vencimento', { exact: true }).fill('2026-12-05');
  await page.getByRole('button', { name: 'Confirmar edição desta parcela' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(card).toHaveCount(0);
  await page.getByLabel('Selecionar mês').fill('2026-12');
  await expect(page.getByRole('article').filter({ hasText: 'Cama Queen Ortobom' })).toHaveCount(2);
  await page.reload();
  await page.getByLabel('Selecionar mês').fill('2026-12');
  await go(page, 'Movimentações');
  await expect(page.getByRole('article').filter({ hasText: 'Cama Queen Ortobom' })).toHaveCount(2);
});
test('formulário mantém rascunho em orientação/viewport baixo e salva movimentação', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await seed(page);
  await page.getByRole('button', { name: 'Nova movimentação', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Descrição', { exact: true }).fill('Despesa no celular');
  await dialog.getByLabel(/Valor total|Valor \(R/).fill('27,90');
  await page.setViewportSize({ width: 700, height: 320 });
  await expect(dialog.getByLabel('Descrição', { exact: true })).toHaveValue('Despesa no celular');
  const submit = dialog.getByRole('button', { name: 'Adicionar movimentação' });
  await submit.scrollIntoViewIfNeeded();
  await expect(submit).toBeInViewport();
  await noPageOverflow(page);
  await submit.click();
  await expect(dialog).toBeHidden();
  await go(page, 'Movimentações');
  await page.getByLabel('Buscar movimentações').fill('Despesa no celular');
  await expect(page.getByRole('article').filter({ hasText: 'Despesa no celular' })).toBeVisible();
});
test('investimento e parcelas permanecem operáveis em 320px e tema escuro', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await seed(page);
  await page.getByRole('button', { name: 'Usar tema escuro' }).click();
  await go(page, 'Investimentos');
  await expect(page.getByText('PETR4', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Operação', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('combobox', { name: 'Operação', exact: true }).selectOption('buy');
  await dialog.getByLabel('Valor financeiro (R$)').fill('35');
  await dialog.getByLabel('Quantidade', { exact: true }).fill('1');
  await dialog.getByLabel('Preço unitário (R$)').fill('35');
  const save = dialog.getByRole('button', { name: 'Confirmar operação' });
  await save.scrollIntoViewIfNeeded();
  await expect(save).toBeInViewport();
  await save.click();
  await expect(dialog).toBeHidden();
  await go(page, 'Parcelamentos');
  await page.getByRole('button', { name: 'Consultar parcelas' }).click();
  await expect(page.getByRole('dialog').getByLabel('Selecionar parcela 4')).toBeVisible();
  await noPageOverflow(page);
  await page.screenshot({
    path: '.openai/local/responsive-results/parcelas-320-dark.png',
    fullPage: true,
  });
});

test('alvos de toque e navegação por toque em contexto móvel isolado', async ({
  browser,
  browserName,
}) => {
  test.skip(browserName === 'firefox', 'O Playwright não emula toque no Firefox.');
  const context = await browser.newContext({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 360, height: 780 },
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    serviceWorkers: 'block',
  });
  const page = await context.newPage();
  await seed(page);
  const nav = page.getByRole('navigation', { name: 'Navegação do celular' });
  for (const button of await nav.getByRole('button').all()) {
    const box = await button.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
  await nav.getByRole('button', { name: 'Ir para Movimentações', exact: true }).tap();
  await expect(page.getByRole('heading', { name: 'Movimentações', exact: true })).toBeVisible();
  await nav.getByRole('button', { name: 'Abrir menu completo' }).tap();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Abrir Contas e carteiras', exact: true })
    .tap();
  await expect(page.getByRole('dialog')).toBeHidden();
  await context.close();
});
