import { test, expect } from '@playwright/test';
import { CHAPTERS } from '../../src/lib/chapters';

test('dez capítulos contam a narrativa e preservam o recorte na navegação', async ({ page }) => {
  await page.goto('#/');
  await page.getByLabel('Filtrar caminho', { exact: true }).selectOption('Francês');
  await page.getByRole('button', { name: 'Aplicar', exact: true }).click();
  for (const [index, chapter] of CHAPTERS.entries()) {
    await expect(
      page
        .locator('summary')
        .filter({ hasText: `Capítulo ${String(index + 1).padStart(2, '0')} de 10` }),
    ).toBeVisible();
    await page.locator('summary').filter({ hasText: 'Entenda a decisão' }).click();
    const story = page
      .locator('details')
      .filter({ has: page.getByRole('navigation', { name: 'Capítulos da análise' }) });
    await expect(story.getByText(chapter.question, { exact: true })).toBeVisible();
    for (const step of ['Situação', 'Problema', 'Evidência', 'Insight', 'Ação recomendada'])
      await expect(story.locator('dt').filter({ hasText: step })).toBeVisible();
    if (index < CHAPTERS.length - 1) await story.getByRole('link', { name: /^Próximo:/ }).click();
  }
  await page.goto('#/');
  await expect(page.getByLabel('Filtrar caminho', { exact: true })).toHaveValue('Francês');
  await page.getByLabel('Data inicial', { exact: true }).fill('2027-12-01');
  await page.getByLabel('Data final', { exact: true }).fill('2027-12-31');
  await page.getByRole('button', { name: 'Aplicar', exact: true }).click();
  await page.locator('summary').filter({ hasText: 'Entenda a decisão' }).click();
  await expect(page.getByText('Não há reservas neste recorte.', { exact: false })).toBeVisible();
});
