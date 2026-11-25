import { test, expect } from '@playwright/test';

test('sequência documental acompanha a partida sem alterar o orçamento', async ({
  page,
}, testInfo) => {
  await page.goto('#/catalogo');
  await expect(page.getByTestId('operational-totals')).toHaveText(
    '11 dias de pacote · 5 etapas de caminhada · 114,4 km de caminhada',
  );
  const table = page.getByRole('table', { name: 'Sequência operacional documentada', exact: true });
  await expect(table.locator('tbody tr').first()).toContainText('Chegada');
  await expect(table.locator('tbody tr').nth(1)).toContainText('Transporte');
  await expect(table.locator('tbody tr').nth(2)).toContainText('Sarria');
  await page.getByLabel('Data de início', { exact: true }).fill('2027-05-10');
  await expect(page.getByTestId('commercial-sale')).toContainText('1.530,00');
  await page.getByLabel('Ponto de partida', { exact: true }).selectOption('astorga');
  await expect(page.getByTestId('operational-totals')).toContainText(
    '18 dias de pacote · 12 etapas de caminhada · 257,6 km',
  );
  await page.getByLabel('Ponto de partida', { exact: true }).selectOption('sjpp');
  await expect(
    page.getByText('Cadastro pendente · duração, etapas e quilometragem não informadas.', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(table).toHaveCount(0);
  await page.getByLabel('Caminho', { exact: true }).selectOption('Português');
  await expect(page.getByTestId('commercial-sale')).toHaveText('Preço não informado');
  await page.getByLabel('Ponto de partida', { exact: true }).selectOption('porto-central');
  await expect(page.getByTestId('operational-totals')).toContainText('231,4 km');
  await page.getByLabel('Ponto de partida', { exact: true }).selectOption('porto-costa');
  await expect(page.getByTestId('operational-totals')).toContainText('256,2 km');
  await expect(page.getByText(/Divergência interna, p. 1/)).toBeVisible();
  const section = page
    .getByRole('heading', { name: 'Percurso operacional', exact: true })
    .locator('..')
    .locator('..')
    .locator('..');
  await section.getByRole('button', { name: 'Próxima', exact: true }).click();
  await expect(table.locator('tbody tr').last()).toContainText('Retorno');
  await expect(table.locator('tbody tr').filter({ hasText: 'FreeWalkingTour' })).toContainText(
    'Passeio',
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  await page.screenshot({
    path: `artifacts/${testInfo.project.name}-operational.png`,
    fullPage: true,
  });
  await page.getByLabel('Ponto de partida', { exact: true }).selectOption('tui-valenca');
  await expect(table).toHaveCount(0);
});
