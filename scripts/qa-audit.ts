import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, writeFileSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const phase = process.env.QA_PHASE ?? 'final';
const directory = `artifacts/qa-${phase}`;
mkdirSync(directory, { recursive: true });
const routes = [
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
];
const sizes = [
  [1440, 900],
  [1280, 800],
  [1024, 768],
  [834, 1112],
  [390, 844],
  [360, 800],
];
const browser = await chromium.launch(process.env.CI ? {} : { channel: 'chrome' });
let ready = false;
for (let attempt = 0; attempt < 100; attempt++) {
  try {
    ready = (
      await fetch(`${process.env.QA_BASE_URL ?? 'http://127.0.0.1:4175'}/Dashboards-Tour4Friends/`)
    ).ok;
  } catch {
    /* Owned preview may still be starting. */
  }
  if (ready) break;
  await new Promise((resolve) => setTimeout(resolve, 100));
}
if (!ready) {
  await browser.close();
  throw new Error('O preview de produção não ficou disponível para QA.');
}
const results: Record<string, unknown>[] = [];
const measurements: Record<string, unknown>[] = [];
try {
  for (const [width, height] of sizes) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    for (const route of routes) {
      await page.goto(
        `${process.env.QA_BASE_URL ?? 'http://127.0.0.1:4175'}/Dashboards-Tour4Friends/#/${route}`,
      );
      await page.locator('h1').first().waitFor();
      await page.locator('[aria-label="Carregando dashboard"]').waitFor({ state: 'detached' });
      await page.screenshot({
        path: `${directory}/${route || 'overview'}-${width}.png`,
        fullPage: true,
      });
      if (width === 1440 && ['', 'reservas', 'hospedagens', 'operacoes'].includes(route)) {
        await page.screenshot({ path: `${directory}/${route || 'overview'}-viewport.png` });
        await page
          .locator('.kpi-grid')
          .first()
          .screenshot({ path: `${directory}/${route || 'overview'}-kpis.png` });
        if (!route)
          await page
            .locator('.overview-primary')
            .screenshot({ path: `${directory}/overview-panels.png` });
      }
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      const violations =
        width === 1440
          ? (
              await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
            ).violations.map((violation) => ({
              id: violation.id,
              impact: violation.impact,
              description: violation.description,
              helpUrl: violation.helpUrl,
              nodes: violation.nodes.map((node) => ({
                target: node.target,
                summary: node.failureSummary,
                html: node.html,
              })),
            }))
          : [];
      results.push({
        route: route || 'overview',
        width,
        height,
        overflow,
        errors: [...errors],
        violations,
      });
    }
    await context.close();
  }
  for (let run = 0; run < 5; run++) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const started = Date.now();
    await page.goto(
      `${process.env.QA_BASE_URL ?? 'http://127.0.0.1:4175'}/Dashboards-Tour4Friends/#/demanda`,
    );
    await page.getByTestId('analytics-fingerprint').waitFor();
    const initial = Date.now() - started;
    await page.getByLabel('Filtrar roteiro', { exact: true }).selectOption('portugues');
    const applyStarted = Date.now();
    const original = await page.getByTestId('analytics-fingerprint').innerText();
    await page.getByRole('button', { name: 'Aplicar', exact: true }).click();
    await page.waitForFunction(
      (previous) =>
        document.querySelector('[data-testid="analytics-fingerprint"]')?.textContent !== previous,
      original,
    );
    measurements.push({
      run: run + 1,
      readyMs: initial,
      applyMs: Date.now() - applyStarted,
      ...(await page.evaluate(() => ({
        resourceBytes: performance
          .getEntriesByType('resource')
          .reduce((sum, item) => sum + (item as PerformanceResourceTiming).transferSize, 0),
        heapBytes:
          (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory
            ?.usedJSHeapSize ?? null,
      }))),
    });
    await context.close();
  }
} finally {
  await browser.close();
}
const assets = readdirSync('dist/assets')
  .filter((name) => name.endsWith('.js'))
  .map((name) => ({
    name,
    bytes: statSync(`dist/assets/${name}`).size,
    gzip: gzipSync(readFileSync(`dist/assets/${name}`)).length,
  }));
writeFileSync(
  `${directory}/audit.json`,
  JSON.stringify({ phase, results, performance: measurements, assets }, null, 2),
);
process.stdout.write(
  JSON.stringify(
    {
      phase,
      screens: results.length,
      failures: results.filter(
        (row) => Number(row.overflow) > 1 || (row.errors as string[]).length,
      ),
      accessibility: results
        .filter((row) => (row.violations as unknown[]).length)
        .map((row) => ({
          route: row.route,
          violations: (row.violations as { id: string; nodes: unknown[] }[]).map((violation) => ({
            id: violation.id,
            nodes: violation.nodes.length,
          })),
        })),
      performance: measurements,
    },
    null,
    2,
  ),
);
if (
  results.some(
    (row) =>
      Number(row.overflow) > 1 ||
      (row.errors as string[]).length ||
      (row.violations as unknown[]).length,
  )
)
  process.exitCode = 1;
