import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';

test('catálogo e orçamento por categoria, ocupação, partida e custos manuais', async ({
  page,
}, testInfo) => {
  await page.goto('#/catalogo');
  await expect(
    page.getByRole('heading', { name: 'Catálogo e orçamento', exact: true }),
  ).toBeVisible();
  const exportButton = page.getByRole('button', { name: 'Exportar orçamento preliminar' });
  await expect(exportButton).toBeDisabled();
  await page.getByLabel('Data de início', { exact: true }).fill('2027-05-10');
  await page.getByLabel('Pessoas', { exact: true }).fill('2');
  await page.getByLabel('Ocupação', { exact: true }).selectOption('duplo');
  await expect(page.getByTestId('commercial-sale')).toContainText('2.200,00');
  await page.getByRole('button', { name: 'Adicionar hospedagem' }).click();
  await page.getByLabel('Cidade 1', { exact: true }).fill('Sarria');
  await page.getByLabel('Etapa 1', { exact: true }).fill('Pernoite inicial');
  await page.getByLabel('Custo EUR 1', { exact: true }).fill('400,50');
  await expect(page.getByTestId('commercial-result')).toContainText('Aguardando dados completos');
  await page.getByRole('checkbox').check();
  await expect(page.getByTestId('commercial-result')).toContainText('1.799,50');
  await expect(exportButton).toBeEnabled();
  const downloaded = page.waitForEvent('download');
  await exportButton.click();
  const file = await downloaded;
  expect(file.suggestedFilename()).toBe('t4f-orcamento-preliminar-eur.csv');
  const csv = readFileSync((await file.path())!, 'utf8');
  expect(csv).toContain('Pernoite inicial');
  expect(csv).toContain('400,50');
  expect(csv).toContain('EUR');
  await page.screenshot({
    path: `artifacts/${testInfo.project.name}-commercial.png`,
    fullPage: true,
  });
  await page.getByLabel('Categoria comercial', { exact: true }).selectOption('Superior');
  await expect(page.getByTestId('commercial-sale')).toContainText('2.900,00');
  await expect(exportButton).toBeDisabled();
  await page.getByLabel('Categoria comercial', { exact: true }).selectOption('Econômico');
  await expect(page.getByTestId('commercial-sale')).toHaveText('Preço não informado');
  await page.getByLabel('Caminho', { exact: true }).selectOption('Português');
  await page.getByLabel('Categoria comercial', { exact: true }).selectOption('Standard');
  await expect(page.getByTestId('commercial-sale')).toHaveText('Preço não informado');
  await page.getByLabel('Ponto de partida', { exact: true }).selectOption('porto-central');
  await expect(page.getByTestId('commercial-sale')).toContainText('3.280,00');
  await page.getByLabel('Ponto de partida', { exact: true }).selectOption('porto-costa');
  await expect(page.getByTestId('commercial-sale')).toContainText('3.460,00');
  await page.getByLabel('Data de início', { exact: true }).fill('2027-07-10');
  await expect(page.getByTestId('commercial-sale')).toHaveText('Preço não informado');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  const audit = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(audit.violations).toEqual([]);
});
