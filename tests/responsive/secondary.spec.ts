import { expect, test, type Page } from '@playwright/test';
import { reschedulingWorkspace } from '../fixtures/rescheduling';
import { occurrences } from '../../src/domain/finance';
async function start(page: Page) {
  await page.request.post('/__test/reset', { data: reschedulingWorkspace() });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.getByLabel('Selecionar mês').fill('2026-11');
}
async function secondary(page: Page, label: string) {
  if ((page.viewportSize()?.width ?? 1440) < 768) {
    await page.getByRole('button', { name: 'Abrir menu completo' }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: `Abrir ${label}`, exact: true })
      .click();
  } else await page.getByRole('button', { name: label, exact: true }).click();
}
const widths = [320, 360, 375, 390, 430, 768, 1024, 1280, 1440];
test('configurações e ajuda acessíveis em todas as larguras', async ({ page }) => {
  await start(page);
  for (const width of widths) {
    await page.setViewportSize({ width, height: 850 });
    for (const label of ['Configurações', 'Central de ajuda']) {
      await secondary(page, label);
      const size = await page.evaluate(() => [
        document.documentElement.clientWidth,
        Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      ]);
      expect(size[1]).toBeLessThanOrEqual(size[0] + 1);
    }
  }
});
test('filtros móveis independentes, pesquisa e download CSV', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const w = reschedulingWorkspace();
  const income = {
    ...w.plans[0],
    id: 'income',
    name: 'Receita do mês',
    kind: 'income' as const,
    amount: 250000,
    date: '2026-11-27',
    mode: 'once' as const,
    count: 1,
    category: 'Salário',
  };
  w.plans.push(income);
  w.obligations.push(...occurrences(income));
  await page.request.post('/__test/reset', { data: w });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.getByLabel('Selecionar mês').fill('2026-11');
  await page.getByRole('button', { name: 'Ir para Movimentações', exact: true }).click();
  await page.getByRole('combobox', { name: 'Filtrar tipo', exact: true }).selectOption('income');
  await page.getByRole('combobox', { name: 'Filtrar status', exact: true }).selectOption('pending');
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('article').getByText('Receita do mês')).toBeVisible();
  await page
    .getByRole('combobox', { name: 'Filtrar categoria', exact: true })
    .selectOption('Compras');
  await expect(page.getByRole('article')).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Filtrar categoria', exact: true }).selectOption('all');
  await page.getByRole('combobox', { name: 'Filtrar tipo', exact: true }).selectOption('expense');
  await page.getByRole('combobox', { name: 'Filtrar status', exact: true }).selectOption('overdue');
  await expect(page.getByRole('article')).toHaveCount(1);
  await page.getByLabel('Buscar movimentações').fill('Cama');
  await expect(page.getByRole('article')).toHaveCount(1);
  await secondary(page, 'Relatórios');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar CSV' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.csv$/);
  expect(await download.failure()).toBeNull();
});
test('validação monetária mantém rascunho e indica o campo; valores grandes ficam completos', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 780 });
  const w = reschedulingWorkspace();
  w.accounts[0].opening = 10000000000000;
  await page.request.post('/__test/reset', { data: w });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const visible = await page.evaluate(
    () =>
      Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) <=
      document.documentElement.clientWidth + 1,
  );
  expect(visible).toBe(true);
  await page.getByRole('button', { name: 'Nova movimentação', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Descrição', { exact: true }).fill('Rascunho preservado');
  await dialog.getByRole('textbox', { name: 'Valor (R$)', exact: true }).fill('abc');
  await dialog.getByRole('button', { name: 'Adicionar movimentação' }).click();
  await expect(dialog.getByRole('alert')).toBeVisible();
  await expect(dialog.getByLabel('Descrição', { exact: true })).toHaveValue('Rascunho preservado');
  await expect(dialog.getByRole('textbox', { name: 'Valor (R$)', exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
});
