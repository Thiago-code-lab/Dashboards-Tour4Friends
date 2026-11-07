import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const routes = [
  ['', 'Visão geral'],
  ['demanda', 'Demanda e previsões'],
  ['reservas', 'Reservas e comercial'],
  ['roteiros', 'Roteiros e destinos'],
  ['hospedagens', 'Hospedagens e capacidade'],
  ['operacoes', 'Operações e alertas'],
  ['experiencia', 'Experiência do cliente'],
  ['financeiro', 'Financeiro'],
  ['relatorios', 'Relatório executivo'],
  ['metodologia', 'Sobre e metodologia'],
];
test('todos os dashboards, gráficos e ativos carregam sem erros', async ({ page }, testInfo) => {
  const errors: string[] = [];
  const failures: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') errors.push(message.text());
  });
  page.on('response', (response) => {
    if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
  });
  for (const [path, title] of routes) {
    await page.goto(`#/${path}`);
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await expect(
      page.getByText('Dados demonstrativos — cenário acadêmico simulado.', { exact: true }).last(),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    ).toBe(true);
    if (['', 'demanda', 'financeiro'].includes(path))
      await expect(page.locator('.recharts-surface').first()).toBeVisible();
    if (path === '')
      await page.screenshot({
        path: `artifacts/${testInfo.project.name}-overview.png`,
        fullPage: true,
      });
    await page.reload();
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  }
  expect(errors).toEqual([]);
  expect(failures).toEqual([]);
});
test('filtros globais alteram KPIs, persistem ao navegar e podem ser limpos', async ({ page }) => {
  await page.goto('#/');
  await expect(page.locator('.metric-value').first()).toBeVisible();
  const total = await page.locator('.metric-value').first().innerText();
  await page.getByLabel('Filtrar roteiro', { exact: true }).selectOption('portugues');
  await page.getByRole('button', { name: 'Aplicar', exact: true }).click();
  await expect(page.locator('.metric-value').first()).not.toHaveText(total);
  await page.goto('#/reservas');
  await expect(page.getByLabel('Filtrar roteiro', { exact: true })).toHaveValue('portugues');
  await page.getByLabel('Filtrar modalidade', { exact: true }).selectOption('Bicicleta');
  await page.getByRole('button', { name: 'Aplicar', exact: true }).click();
  await expect(page.getByText('Sem dados para exibir').first()).toBeVisible();
  await page.getByRole('button', { name: 'Limpar filtros' }).click();
  await expect(page.getByLabel('Filtrar roteiro', { exact: true })).toHaveValue('all');
  await expect(page.locator('tbody tr').first()).toBeVisible();
});
test('cenários, busca, CSV e revisão local funcionam', async ({ page }) => {
  await page.goto('#/demanda');
  await expect(
    page.getByRole('heading', { name: 'Demanda e previsões', exact: true }),
  ).toBeVisible();
  const base = await page.locator('.metric-value').nth(1).innerText();
  await page.getByRole('button', { name: 'Simular +10%' }).click();
  await expect(page.getByLabel('Variação do cenário')).toHaveValue('10');
  await expect(page.locator('.metric-value').nth(1)).not.toHaveText(base);
  await page.getByLabel('Horizonte da previsão').selectOption('12');
  await expect(page.locator('.metric-value').nth(3)).toHaveText('12');
  await page.goto('#/reservas');
  await page.getByLabel('Buscar reservas', { exact: true }).fill('T4F-0001');
  await expect(
    page.getByRole('table', { name: 'Reservas', exact: true }).locator('tbody tr'),
  ).toHaveCount(1);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar CSV', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('t4f-reservas-filtradas.csv');
  await page.goto('#/operacoes');
  await expect(
    page.getByRole('heading', { name: 'Operações e alertas', exact: true }),
  ).toBeVisible();
  const select = page.locator('select[aria-label^="Status "]').first();
  const id = await select.getAttribute('aria-label');
  await select.selectOption('resolved');
  await page.reload();
  await expect(page.getByLabel(id!, { exact: true })).toHaveValue('resolved');
});
test('importação inválida preserva a base e modelo técnico pode ser reimportado', async ({
  page,
}, testInfo) => {
  await page.goto('#/reservas');
  await expect(page.locator('.metric-value').first()).toBeVisible();
  const before = await page.locator('.metric-value').first().innerText();
  await page.getByLabel('Arquivo CSV de reservas').setInputFiles({
    name: 'invalid.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('id;status\nA;confirmed'),
  });
  await expect(page.getByRole('alert')).toContainText('Colunas obrigatórias');
  await expect(page.locator('.metric-value').first()).toHaveText(before);
  const templateDownload = page.waitForEvent('download');
  const downloadButton = page.getByRole('button', {
    name: 'Baixar modelo com reservas do recorte',
  });
  await downloadButton.scrollIntoViewIfNeeded();
  if (testInfo.project.use.isMobile) await downloadButton.tap();
  else await downloadButton.click();
  const template = await templateDownload;
  const templatePath = await template.path();
  if (!templatePath) throw new Error('Modelo CSV não foi baixado');
  await page.getByLabel('Arquivo CSV de reservas').setInputFiles(templatePath);
  await expect(page.getByRole('status').last()).toContainText('Importação validada');
  await expect(page.locator('.metric-value').first()).toHaveText(before);
});
test('menu, ordenação, datas e teclado mantêm a navegação funcional', async ({ page }) => {
  await page.goto('#/');
  await expect(page.locator('.metric-value').first()).toBeVisible();
  const skip = page.getByRole('link', { name: 'Pular para o conteúdo' });
  await skip.focus();
  await skip.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
  const menu = page.getByRole('button', { name: 'Abrir menu' });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole('link', { name: 'Reservas e comercial', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Reservas e comercial', exact: true }),
  ).toBeVisible();
  const table = page.getByRole('table', { name: 'Reservas', exact: true });
  await table.getByRole('button', { name: 'Valor da reserva' }).click();
  await expect(table.getByRole('columnheader', { name: 'Valor da reserva' })).toHaveAttribute(
    'aria-sort',
    'ascending',
  );
  await page.getByLabel('Data inicial', { exact: true }).fill('2026-01-01');
  await page.getByLabel('Data final', { exact: true }).fill('2026-10-31');
  await page.getByRole('button', { name: 'Aplicar', exact: true }).click();
  await expect(page.locator('.metric-value').first()).not.toHaveText('160');
});
test('relatório contém identificação completa e versão para impressão', async ({
  page,
}, testInfo) => {
  await page.goto('#/relatorios');
  await expect(
    page.getByRole('heading', { name: 'Relatório executivo', exact: true }),
  ).toBeVisible();
  for (const name of [
    'Daniel Fernando dos Santos',
    'Lucas Antonio Evangelista dos Santos',
    'Pablo Roberto da Silva Costa',
    'Thiago Cardoso Davi',
    'William Nunes Vilany',
  ])
    await expect(page.getByText(name, { exact: true })).toBeVisible();
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.sidebar')).toBeHidden();
  await expect(page.locator('.report-cover')).toBeVisible();
  await expect(page.locator('.report-chart')).toHaveCount(2);
  await expect(page.locator('.report-chart polyline').first()).toBeVisible();
  if (testInfo.project.name === 'desktop')
    await page.pdf({
      path: 'artifacts/t4f-relatorio-verificacao.pdf',
      printBackground: true,
      preferCSSPageSize: true,
    });
  expect(readFileSync('public/data/demo.json', 'utf8')).toContain('synthetic_demo');
});
