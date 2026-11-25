import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('caminho persiste, ocupação tem denominador e financeiro expõe contribuição', async ({
  page,
}) => {
  await page.goto('#/');
  await page.getByLabel('Filtrar caminho', { exact: true }).selectOption('Francês');
  await page.getByRole('button', { name: 'Aplicar', exact: true }).click();
  await expect(page.locator('.kpi').first()).toContainText('vagas-noite');
  await expect(page.locator('.kpi').nth(1)).toContainText('pts');
  await page.goto('#/financeiro');
  await expect(page.getByLabel('Filtrar caminho', { exact: true })).toHaveValue('Francês');
  const panel = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Receita, custo e contribuição', exact: true }),
  });
  await panel.getByText('Consultar dados:', { exact: false }).click();
  await expect(panel.getByRole('columnheader', { name: 'Contribuição gerencial' })).toBeVisible();
});

test('mapa mantém desconhecidos, sete partidas e fotos ilustrativas', async ({ page }, info) => {
  await page.goto('#/catalogo');
  await expect(page.getByLabel('Roteiro do mapa')).toBeVisible();
  expect(await page.getByLabel('Roteiro do mapa').locator('option').count()).toBe(7);
  await page.getByLabel('Roteiro do mapa').selectOption('astorga');
  await expect(
    page.getByRole('list', { name: 'Riscos das etapas' }).getByRole('listitem'),
  ).toHaveCount(12);
  await expect(
    page.getByRole('list', { name: 'Riscos das etapas' }).getByText('Disponibilidade desconhecida'),
  ).toHaveCount(12);
  await page.getByLabel('Roteiro do mapa').selectOption('lisboa');
  await expect(
    page.getByText('Sequência operacional ainda não importada nesta branch.', { exact: false }),
  ).toBeVisible();
  const photos = page.getByRole('img', { name: /Ambiente de hospedagem ilustrativo/ });
  await expect(photos).toHaveCount(3);
  await photos.last().scrollIntoViewIfNeeded();
  for (const photo of await photos.all())
    await expect
      .poll(() =>
        photo.evaluate(
          (element) =>
            (element as HTMLImageElement).complete &&
            (element as HTMLImageElement).naturalWidth > 0,
        ),
      )
      .toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: `artifacts/professor/catalogo-${info.project.name}.png`,
    fullPage: true,
  });
});

test('premissa exige origem e período e preserva o resultado fracionário', async ({ page }) => {
  await page.goto('#/demanda');
  const panel = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Público brasileiro e premissa de captura de 0,5%' }),
  });
  await expect(panel.getByRole('status')).toContainText('Preencha');
  await page.getByLabel('Brasileiros considerados', { exact: true }).fill('12345');
  await page.getByLabel('Início do recorte brasileiro').fill('2025-01-01');
  await page.getByLabel('Fim do recorte brasileiro').fill('2025-12-31');
  await page
    .getByLabel('Origem do recorte brasileiro')
    .fill('Cenário de teste; não é dado oficial');
  await expect(panel.getByRole('status')).toContainText('61,725 pessoas');
  await page.getByLabel('Origem do recorte brasileiro').fill('');
  await expect(panel.getByRole('status')).toContainText('Preencha');
});
