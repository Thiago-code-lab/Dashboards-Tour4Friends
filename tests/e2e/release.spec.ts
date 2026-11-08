import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

test('candidata estática navega dez módulos com API e origens externas bloqueadas', async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  test.setTimeout(90000);
  if (!baseURL) throw new Error('Preview de produção não configurado.');
  const origin = new URL(baseURL).origin;
  const forbiddenRequests: string[] = [];
  const errors: string[] = [];
  const failures: string[] = [];
  let staticRequests = 0;
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('requestfailed', (request) => failures.push(new URL(request.url()).pathname));
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin || url.pathname.startsWith('/api/')) {
      forbiddenRequests.push(`${url.origin}${url.pathname}`);
      return route.abort('blockedbyclient');
    }
    staticRequests++;
    return route.continue();
  });
  const directory = 'artifacts/release-05';
  mkdirSync(directory, { recursive: true });
  const captured = new Set(['', 'demanda', 'reservas', 'hospedagens', 'operacoes', 'relatorios']);
  for (const route of [
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
    await page.goto(`#/${route}`);
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.getByLabel('Carregando dashboard', { exact: true })).toHaveCount(0);
    await expect(
      page.getByText('Modo demonstração · dados sintéticos', { exact: true }),
    ).toBeVisible();
    if (captured.has(route))
      await page.screenshot({
        path: `${directory}/${testInfo.project.name}-${route || 'overview'}.png`,
        fullPage: true,
      });
    if (route === 'demanda') {
      const laboratory = page.getByTestId('seasonality-analysis');
      await expect(laboratory).toContainText('maior média observada');
      await laboratory.screenshot({
        path: `${directory}/${testInfo.project.name}-laboratorio.png`,
      });
    }
    await page.reload();
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.getByLabel('Carregando dashboard', { exact: true })).toHaveCount(0);
  }
  const evidence = {
    project: testInfo.project.name,
    modules: 10,
    reloads: 10,
    staticRequests,
    forbiddenRequests,
    failures,
    errors,
  };
  writeFileSync(
    `${directory}/network-${testInfo.project.name}.json`,
    JSON.stringify(evidence, null, 2),
  );
  expect(staticRequests).toBeGreaterThan(10);
  expect(forbiddenRequests).toEqual([]);
  expect(failures).toEqual([]);
  expect(errors).toEqual([]);
});
