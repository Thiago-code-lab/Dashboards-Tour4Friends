import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const base = process.env.P2_BASE_URL ?? 'http://127.0.0.1:4177/Dashboards-Tour4Friends/';
const directory = 'docs/p2-visualizacao/evidencias';
mkdirSync(directory, { recursive: true });
const browser = await chromium.launch(process.env.CI ? {} : { channel: 'chrome' });
const captures = [];
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  for (const [route, name] of [
    ['', 'visao-geral-desktop'],
    ['demanda', 'demanda'],
    ['experiencia', 'experiencia'],
    ['financeiro', 'financeiro'],
    ['hospedagens', 'hospedagens'],
    ['relatorios', 'relatorio'],
  ]) {
    await page.goto(`${base}#/${route}`);
    await page.locator('.metric-value').first().waitFor();
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${directory}/${name}.png` });
    captures.push({
      file: `${name}.png`,
      url: page.url(),
      viewport: page.viewportSize(),
      source: 'local production build; viewport capture',
    });
    const chart =
      route === 'demanda'
        ? ['A próxima jornada começa nos dados', 'demanda-serie']
        : route === 'financeiro'
          ? ['Receita, custo e contribuição', 'financeiro-serie']
          : null;
    if (chart) {
      const panel = page
        .locator('.panel')
        .filter({ has: page.getByRole('heading', { name: chart[0], exact: true }) });
      await panel.screenshot({ path: `${directory}/${chart[1]}.png` });
      captures.push({
        file: `${chart[1]}.png`,
        url: page.url(),
        viewport: page.viewportSize(),
        source: 'local production build; chart panel capture',
      });
    }
  }
  await page.goto(base);
  await page.locator('.metric-value').first().waitFor();
  await page.locator('summary').filter({ hasText: 'Entenda a decisão' }).click();
  await page.screenshot({ path: `${directory}/narrativa.png` });
  captures.push({
    file: 'narrativa.png',
    url: page.url(),
    viewport: page.viewportSize(),
    source: 'local production build; expanded chapter',
  });
  await page.locator('summary').filter({ hasText: 'Entenda a decisão' }).click();
  await page.getByLabel('Filtrar caminho', { exact: true }).selectOption('Português');
  await page.getByRole('button', { name: 'Aplicar', exact: true }).click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${directory}/filtro-portugues.png` });
  captures.push({
    file: 'filtro-portugues.png',
    url: page.url(),
    viewport: page.viewportSize(),
    filters: { way: 'Português' },
    source: 'local production build',
  });
  await page.getByRole('button', { name: 'Limpar filtros' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${directory}/visao-geral-mobile.png`, fullPage: true });
  captures.push({
    file: 'visao-geral-mobile.png',
    url: page.url(),
    viewport: page.viewportSize(),
    source: 'local production build; full page',
  });
  // Public page is read-only: its deployment is independent of the candidate.
  const publicPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  try {
    const response = await publicPage.goto(
      'https://thiago-code-lab.github.io/Dashboards-Tour4Friends/',
      { timeout: 30000 },
    );
    await publicPage.locator('h1').first().waitFor();
    await publicPage.screenshot({ path: `${directory}/publicado.png` });
    writeFileSync(
      `${directory}/publicado.json`,
      JSON.stringify(
        {
          checkedAt: new Date().toISOString(),
          url: publicPage.url(),
          status: response.status(),
          heading: await publicPage.locator('h1').first().innerText(),
          links: await publicPage.locator('aside a').allTextContents(),
          p2ChapterVisible:
            (await publicPage.getByText('Capítulo 01 de 10', { exact: false }).count()) > 0,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    writeFileSync(
      `${directory}/publicado.json`,
      JSON.stringify(
        { checkedAt: new Date().toISOString(), verified: false, error: error.message },
        null,
        2,
      ),
    );
  }
  const wireframe = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await wireframe.setContent(readFileSync('docs/p2-visualizacao/wireframe.svg', 'utf8'));
  await wireframe.locator('svg').screenshot({ path: 'docs/p2-visualizacao/wireframe.png' });
} finally {
  await browser.close();
}
writeFileSync(
  `${directory}/capturas.json`,
  JSON.stringify(
    {
      datasetSha256: createHash('sha256')
        .update(readFileSync('public/data/demo.json'))
        .digest('hex'),
      captures,
      errors,
    },
    null,
    2,
  ) + '\n',
);
if (errors.length) throw new Error(`Erros no navegador: ${errors.join('; ')}`);
process.stdout.write(`${captures.length} capturas locais e wireframe gerados.\n`);
