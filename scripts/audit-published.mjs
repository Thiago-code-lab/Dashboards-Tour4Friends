import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
const directory = 'artifacts/professor';
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const response = await page.goto('https://thiago-code-lab.github.io/Dashboards-Tour4Friends/');
  await page.waitForSelector('.kpi');
  const audit = {
    observedAt: new Date().toISOString(), url: page.url(), status: response.status(),
    title: await page.title(), kpis: await page.locator('.kpi-label').allTextContents(),
    navigation: await page.locator('nav a').allTextContents(),
    catalogLink: await page.locator('a').filter({ hasText: 'Catálogo e orçamento' }).count(),
  };
  await page.screenshot({ path: `${directory}/published-overview.png`, fullPage: true });
  await writeFile(`${directory}/published-audit.json`, JSON.stringify(audit, null, 2));
  process.stdout.write(JSON.stringify(audit));
} finally { await browser.close(); }
