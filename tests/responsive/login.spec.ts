import { expect, test } from '@playwright/test';
for (const width of [320, 360, 375, 390, 430, 768, 1024, 1280, 1440])
  test(`login Google realista e sem overflow em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const screenshot = page.waitForResponse((r) => r.url().includes('login-reference.png'));
    await page.goto('/?login');
    await expect(
      page.getByRole('button', { name: 'Entrar com Google', exact: true }),
    ).toBeVisible();
    expect((await screenshot).status()).toBe(200);
    const brand = page.getByRole('img', { name: 'Gevyro Finanças', exact: true }).last();
    await expect(brand).toBeVisible();
    await expect(brand).toHaveJSProperty('naturalWidth', 1536);
    await expect(page.getByText('Acesse sua conta', { exact: true })).toBeVisible();
    await expect(page.getByText('Controle suas', { exact: false })).toBeVisible();
    await expect(page.getByRole('textbox')).toHaveCount(0);
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      width: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    }));
    expect(dimensions.width).toBeLessThanOrEqual(dimensions.viewport + 1);
    if (width < 640) {
      const box = await page
        .getByRole('button', { name: 'Entrar com Google', exact: true })
        .boundingBox();
      expect(box!.y + box!.height).toBeLessThan(850);
    }
    expect(errors).toEqual([]);
    if (width === 390 || width === 1440)
      await page.screenshot({
        path: `.openai/local/responsive-results/login-${width}.png`,
        fullPage: true,
      });
  });
test('login encaminha à integração Google existente e permite recuperar um erro', async ({
  page,
}) => {
  await page.goto('/?login');
  const button = page.getByRole('button', { name: 'Entrar com Google', exact: true });
  await expect(button).toBeEnabled();
  const request = page.waitForRequest((r) => r.url().includes('/__test/oauth'));
  await button.click();
  const input = (await request).postDataJSON();
  expect(input.provider).toBe('google');
  expect(input.options.redirectTo).toBe('http://localhost:4178/');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(button).toBeEnabled();
});

test('erro OAuth informa a falha e permite nova tentativa', async ({ page }) => {
  await page.goto('/?login&oauthError=1');
  const button = page.getByRole('button', { name: 'Entrar com Google', exact: true });
  await button.click();
  await expect(page.getByRole('alert')).toContainText('Tente novamente');
  await expect(button).toBeEnabled();
  await button.click();
  await expect(page.getByRole('alert')).toHaveCount(0);
});
