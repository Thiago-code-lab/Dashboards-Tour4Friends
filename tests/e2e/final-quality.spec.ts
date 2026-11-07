import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
test('acessibilidade automatizada nos dez módulos e dados dos gráficos', async ({ page }) => {
  test.setTimeout(90000);
  for (const path of [
    '',
    'demanda',
    'reservas',
    'roteiros',
    'hospedagens',
    'operacoes',
    'experiencia',
    'financeiro',
    'relatorios',
    'metodologia',
  ]) {
    await page.goto(`#/${path}`);
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.getByLabel('Carregando dashboard', { exact: true })).toHaveCount(0);
    const audit = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      audit.violations.map((violation) => ({
        id: violation.id,
        targets: violation.nodes.map((node) => node.target),
      })),
      path,
    ).toEqual([]);
  }
  await page.goto('#/demanda');
  await page.getByText('Consultar dados: Demanda observada e prevista', { exact: true }).click();
  await expect(
    page.getByRole('table', { name: 'Demanda observada e prevista', exact: true }),
  ).toBeVisible();
});
test('menu móvel não mantém links ocultos no teclado e devolve o foco', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('#/');
  const opener = page.getByRole('button', { name: 'Abrir menu', exact: true });
  await expect(page.locator('aside')).toHaveAttribute('inert', '');
  await opener.focus();
  await page.keyboard.press('Enter');
  const closer = page.getByRole('button', { name: 'Fechar navegação', exact: true });
  await expect(closer).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('aside a').last()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(opener).toBeFocused();
  await expect(page.locator('aside')).toHaveAttribute('inert', '');
  await opener.click();
  await page
    .locator('aside')
    .getByRole('link', { name: 'Reservas e comercial', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Reservas e comercial', exact: true }),
  ).toBeVisible();
  await expect(page.locator('aside')).toHaveAttribute('inert', '');
});
test('base vazia e histórico curto têm estados claros sem NaN', async ({ page }) => {
  const source = JSON.parse(readFileSync('public/data/demo.json', 'utf8')) as Record<
    string,
    unknown
  >;
  const empty = Object.fromEntries(
    Object.entries(source).map(([key, value]) => [key, Array.isArray(value) ? [] : value]),
  );
  await page.route('**/data/demo.json', (route) => route.fulfill({ json: empty }));
  await page.goto('#/reservas');
  await expect(page.getByText('Sem dados para exibir').first()).toBeVisible();
  await page.goto('#/demanda');
  await expect(page.getByText('Sem estimativa', { exact: true })).toBeVisible();
  expect(await page.locator('main').innerText()).not.toMatch(/NaN|Infinity/);
  await page.unroute('**/data/demo.json');
  await page.reload();
  await page.getByLabel('Data inicial', { exact: true }).fill('2026-05-01');
  await page.getByRole('button', { name: 'Aplicar', exact: true }).click();
  await expect(page.getByTestId('final-evaluation')).toContainText('Histórico insuficiente');
});
test('exportação estatística preserva dados estruturados e demonstração independe da API', async ({
  page,
}) => {
  const apiRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/v1/')) apiRequests.push(request.url());
  });
  await page.goto('#/demanda');
  await page.getByRole('button', { name: 'Satisfação', exact: true }).click();
  const panel = page.getByTestId('satisfaction-analysis');
  const download = page.waitForEvent('download');
  await panel.getByRole('button', { name: 'Exportar CSV', exact: true }).click();
  const path = await (await download).path();
  const content = readFileSync(path!, 'utf8');
  expect(content).not.toContain('[object Object]');
  expect(content).toContain('iterations');
  await page.goto('#/');
  await page.getByText('Explorar demonstração · percurso de 7 minutos', { exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Percurso da demonstração' })).toBeVisible();
  expect(apiRequests).toEqual([]);
});
