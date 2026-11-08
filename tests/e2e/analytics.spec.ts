import { test, expect } from '@playwright/test';

test('laboratório compara modelos, recortes, três análises e exporta resultados', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('#/demanda');
  await expect(
    page.getByRole('heading', { name: 'Validação temporal', exact: true }),
  ).toBeVisible();
  const table = page.getByRole('table', {
    name: 'Comparação de modelos na validação',
    exact: true,
  });
  await expect(table.locator('tbody tr')).toHaveCount(4);
  await page.getByLabel('Horizonte da validação', { exact: true }).selectOption('1');
  const origin = page.getByLabel('Origem da validação', { exact: true });
  await expect(origin.locator('option')).toHaveCount(16);
  await origin.selectOption({ index: 0 });
  await expect(page.locator('.analysis-kicker')).toContainText('12 meses de treino');
  await page.getByLabel('Horizonte da validação', { exact: true }).selectOption('6');
  await expect(origin.locator('option')).toHaveCount(11);
  const exportPanel = page
    .locator('.panel')
    .filter({ has: page.getByRole('heading', { name: 'Validação temporal', exact: true }) });
  const download = page.waitForEvent('download');
  await exportPanel.getByRole('button', { name: 'Exportar CSV', exact: true }).first().click();
  expect((await download).suggestedFilename()).toBe('t4f-validacao-modelos.csv');
  await page.getByRole('button', { name: 'Cancelamentos', exact: true }).click();
  await expect(page.getByTestId('cancellation-analysis')).toContainText('Wilson');
  await page.getByLabel('Agrupar análise por', { exact: true }).selectOption('Canal');
  await expect(
    page.getByRole('table', { name: 'Taxas e intervalos de cancelamento', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Satisfação', exact: true }).click();
  await expect(page.getByLabel('Agrupar análise por', { exact: true })).toHaveValue('Roteiro');
  await expect(page.getByTestId('satisfaction-analysis')).toContainText('Bootstrap exploratório');
  await page.getByRole('button', { name: 'Sazonalidade', exact: true }).click();
  await expect(page.getByTestId('seasonality-analysis')).toContainText('maior média observada');
  const fingerprint = await page.getByTestId('analytics-fingerprint').innerText();
  await page.getByLabel('Filtrar roteiro', { exact: true }).selectOption('portugues');
  await page.getByRole('button', { name: 'Aplicar', exact: true }).click();
  await expect(page.getByTestId('analytics-fingerprint')).not.toHaveText(fingerprint);
  await expect(page.getByTestId('final-evaluation')).toBeVisible();
  expect(errors).toEqual([]);
});

test('simulador mantém a base e expõe capacidade por data e etapa', async ({ page }) => {
  await page.goto('#/demanda');
  const original = await page.getByTestId('analytics-fingerprint').innerText();
  const result = page.getByTestId('capacity-scenario-result');
  const baseline = await result.innerText();
  await page.getByRole('button', { name: 'Simular +10%', exact: true }).click();
  await expect(result).not.toHaveText(baseline);
  await page.getByLabel('Vagas extras por saída', { exact: true }).selectOption('5');
  await page.getByLabel('Alteração de capacidade contratada', { exact: true }).selectOption('-30');
  await expect(
    page.getByRole('table', { name: 'Capacidade por data e etapa', exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId('analytics-fingerprint')).toHaveText(original);
  await page.goto('#/operacoes');
  await expect(
    page.getByRole('heading', { name: 'Anomalias estatísticas', exact: true }),
  ).toBeVisible();
});

test('evidências responsivas e relatório analítico em PDF', async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop',
    'Capturas em quatro resoluções usam um contexto desktop.',
  );
  for (const [label, width, height] of [
    ['desktop', 1440, 1000],
    ['laptop', 1280, 900],
    ['tablet', 834, 1112],
    ['mobile', 390, 844],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto('#/demanda');
    await expect(
      page.getByRole('heading', { name: 'Laboratório analítico', exact: true }),
    ).toBeVisible();
    await expect(page.locator('.recharts-surface').first()).toBeVisible();
    await page.screenshot({ path: `artifacts/analytics-${label}.png`, fullPage: true });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Satisfação', exact: true }).click();
  await page
    .getByTestId('satisfaction-analysis')
    .screenshot({ path: 'artifacts/analytics-satisfaction.png' });
  await page.goto('#/');
  await expect(
    page.getByRole('heading', { name: 'Inteligência Gerencial', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: 'artifacts/analytics-overview.png', fullPage: true });
  await page.goto('#/relatorios');
  await expect(
    page.getByRole('heading', { name: 'O que os dados sugerem', exact: true }),
  ).toBeVisible();
  await page.emulateMedia({ media: 'print' });
  await page.pdf({
    path: 'artifacts/analytics-report.pdf',
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
  });
});
