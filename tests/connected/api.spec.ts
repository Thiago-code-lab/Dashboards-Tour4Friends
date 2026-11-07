import { test, expect, type Page } from '@playwright/test';

async function login(page: Page, role: 'admin' | 'manager' | 'analyst' | 'viewer') {
  await page
    .getByRole('button', { name: 'Entrar no laboratório', exact: true })
    .click({ timeout: 30000 });
  await page
    .getByLabel('E-mail de acesso')
    .fill(process.env[`T4F_E2E_${role.toUpperCase()}_EMAIL`]!);
  await page.getByLabel('Senha de acesso').fill(process.env.T4F_E2E_PASSWORD!);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(
    page.getByText('Ambiente conectado · base sintética persistente', { exact: true }),
  ).toBeVisible();
  await expect(page.locator('.metric-value').first()).toBeVisible({ timeout: 20000 });
}

test('login, gravação, nova sessão, auditoria e logout com PostgreSQL real', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('#/reservas');
  await login(page, 'manager');
  await page.goto('#/demanda');
  const previousForecast = await page.getByTestId('analytics-fingerprint').innerText();
  await page.goto('#/reservas');
  await page.getByRole('button', { name: 'Gerenciar reservas', exact: true }).click();
  await page.getByLabel('Selecionar registro').selectOption('T4F-0001');
  await expect(page.getByLabel('Valor total (BRL)')).not.toHaveValue('');
  const amount = Number(await page.getByLabel('Valor total (BRL)').inputValue()) + 1000;
  await page.getByLabel('Valor total (BRL)').fill(String(amount));
  await page.getByRole('button', { name: 'Salvar no PostgreSQL', exact: true }).click();
  await expect(
    page.getByText('Alteração salva no PostgreSQL. Indicadores atualizados.', { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: 'artifacts/connected-reservations.png', fullPage: true });
  const storage = await page.evaluate(() =>
    JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }),
  );
  expect(storage).not.toContain('accessToken');
  expect(storage).not.toContain('Bearer');
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Entre no ambiente conectado' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Entre no ambiente conectado' })).toBeVisible();
  await page.getByLabel('E-mail de acesso').fill(process.env.T4F_E2E_MANAGER_EMAIL!);
  await page.getByLabel('Senha de acesso').fill(process.env.T4F_E2E_PASSWORD!);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.getByRole('button', { name: 'Gerenciar reservas', exact: true }).click();
  await page.getByLabel('Selecionar registro').selectOption('T4F-0001');
  await expect(page.getByLabel('Valor total (BRL)')).toHaveValue(String(amount));
  await page.getByRole('button', { name: 'Consultar histórico', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Histórico de alterações', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.audit-history details').first()).toBeVisible();
  await page.getByRole('button', { name: 'Fechar painel' }).click();
  await page.goto('#/demanda');
  await expect(page.getByTestId('analytics-fingerprint')).not.toHaveText(previousForecast);
  await expect(
    page.getByRole('heading', { name: 'Laboratório analítico', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  expect(errors).toEqual([]);
});

test('visualizador consulta dados e não acessa controles de gravação', async ({ page }) => {
  await page.goto('#/reservas');
  await login(page, 'viewer');
  await expect(
    page.getByText('Perfil de consulta · alterações operacionais não permitidas.'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Gerenciar reservas' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Importar CSV no banco' })).toBeDisabled();
  await page.goto('#/hospedagens');
  await expect(
    page.getByRole('heading', { name: 'Hospedagens e capacidade', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Gerenciar hospedagens' })).toHaveCount(0);
});

test('falha da API não troca a fonte silenciosamente', async ({ page }) => {
  await page.goto('#/');
  await login(page, 'analyst');
  await page.route('**/api/v1/dataset', (route) => route.abort('connectionfailed'));
  await page.getByRole('button', { name: 'Atualizar dados da API' }).click();
  await expect(page.getByRole('heading', { name: 'A base não pôde ser validada' })).toBeVisible();
  await expect(
    page.getByText('Ambiente conectado · base sintética persistente', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Retornar à demonstração', exact: true }).click();
  await expect(
    page.getByText('Modo demonstração · dados sintéticos', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Visão geral', exact: true })).toBeVisible();
});

test('revisão de alerta sobrevive a uma nova sessão', async ({ page }) => {
  await page.goto('#/operacoes');
  await login(page, 'manager');
  await page.getByRole('button', { name: 'Revisar alerta', exact: true }).first().click();
  await page.getByLabel('Status da revisão').selectOption('resolved');
  await page.getByLabel('Observação do alerta').fill('Revisão persistente do laboratório');
  await page.getByRole('button', { name: 'Salvar revisão', exact: true }).click();
  await expect(
    page.getByText('Resolvido administrativamente — condição operacional ainda detectada.').first(),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Entre no ambiente conectado' })).toBeVisible();
  await page.getByLabel('E-mail de acesso').fill(process.env.T4F_E2E_MANAGER_EMAIL!);
  await page.getByLabel('Senha de acesso').fill(process.env.T4F_E2E_PASSWORD!);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByText('Revisão persistente do laboratório', { exact: true })).toBeVisible();
});

test('administrador gerencia usuários e pagina os eventos de auditoria', async ({ page }) => {
  await page.goto('#/reservas');
  await login(page, 'admin');
  await page.getByRole('button', { name: 'Usuários e auditoria', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Usuários e auditoria', exact: true });
  await expect(dialog.getByRole('heading', { name: 'Criar usuário', exact: true })).toBeVisible();
  const email = `viewer-${crypto.randomUUID()}@example.com`;
  await dialog.getByLabel('Nome', { exact: true }).fill('Visualizador temporário');
  await dialog.getByLabel('E-mail', { exact: true }).fill(email);
  await dialog.getByLabel('Senha inicial', { exact: true }).fill(process.env.T4F_E2E_PASSWORD!);
  await dialog.getByLabel('Perfil', { exact: true }).selectOption('viewer');
  await dialog.getByRole('button', { name: 'Criar usuário no banco', exact: true }).click();
  const row = dialog.getByRole('row').filter({ hasText: email });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Desativar', exact: true }).click();
  await expect(row.getByRole('cell', { name: 'Inativo', exact: true })).toBeVisible();
  // Produce more than one audit page even when this test runs alone.
  for (let index = 0; index < 8; index++) {
    const activate = index % 2 === 0;
    await row.getByRole('button', { name: activate ? 'Ativar' : 'Desativar', exact: true }).click();
    await expect(
      row.getByRole('cell', { name: activate ? 'Ativo' : 'Inativo', exact: true }),
    ).toBeVisible();
  }
  await dialog.getByRole('button', { name: 'Próximos', exact: true }).click();
  await expect(dialog.locator('.pagination')).toContainText('página 2');
  await dialog.getByRole('button', { name: 'Anteriores', exact: true }).click();
  await expect(dialog.locator('.pagination')).toContainText('página 1');
});

test('conflitos e validação preservam o formulário; modal cabe no celular e restaura foco', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('#/reservas');
  await login(page, 'manager');
  const opener = page.getByRole('button', { name: 'Gerenciar reservas', exact: true });
  await opener.click();
  await page.getByLabel('Selecionar registro').selectOption('T4F-0002');
  const amount = page.getByLabel('Valor total (BRL)', { exact: true });
  await expect(amount).not.toHaveValue('');
  const initial = await amount.inputValue();
  for (const status of [403, 409, 422]) {
    await page.route('**/api/v1/bookings/T4F-0002', async (route) => {
      if (route.request().method() !== 'PATCH') return route.continue();
      await route.fulfill({
        status,
        json: {
          detail:
            status === 422
              ? [{ path: ['body', 'totalAmount'], message: 'Valor precisa ser revisto.' }]
              : status === 409
                ? 'Versão desatualizada. Reabra o registro.'
                : 'Perfil sem permissão para esta operação.',
        },
      });
    });
    await page.getByRole('button', { name: 'Salvar no PostgreSQL', exact: true }).click();
    await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible();
    await expect(amount).toHaveValue(initial);
    if (status === 422) {
      await expect(amount).toHaveAttribute('aria-invalid', 'true');
      await expect(page.getByText('Valor precisa ser revisto.', { exact: true })).toBeVisible();
    }
    await page.unroute('**/api/v1/bookings/T4F-0002');
  }
  const box = await page.getByRole('dialog').boundingBox();
  expect(box!.width).toBeLessThanOrEqual(360);
  expect(box!.height).toBeLessThanOrEqual(800);
  await page.keyboard.press('Escape');
  await expect(opener).toBeFocused();
});

test('erros de serviço e respostas inválidas mantêm a fonte; 401 encerra a sessão', async ({
  page,
}) => {
  await page.goto('#/');
  await login(page, 'analyst');
  for (const failure of [
    { status: 503, body: JSON.stringify({ detail: 'Banco temporariamente indisponível.' }) },
    { status: 200, body: '{}' },
    { status: 200, body: '<html>resposta inválida</html>' },
  ]) {
    await page.route('**/api/v1/dataset', (route) =>
      route.fulfill({ ...failure, contentType: 'application/json' }),
    );
    await page.getByRole('button', { name: 'Atualizar dados da API' }).click();
    await expect(page.getByRole('heading', { name: 'A base não pôde ser validada' })).toBeVisible();
    await expect(
      page.getByText('Ambiente conectado · base sintética persistente', { exact: true }),
    ).toBeVisible();
    await page.unroute('**/api/v1/dataset');
    await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
    await expect(page.locator('.metric-value').first()).toBeVisible();
  }
  await page.route('**/api/v1/dataset', (route) =>
    route.fulfill({ status: 401, json: { detail: 'Sessão expirada.' } }),
  );
  await page.getByRole('button', { name: 'Atualizar dados da API' }).click();
  await expect(page.getByRole('heading', { name: 'Entre no ambiente conectado' })).toBeVisible();
  await expect(
    page.getByText('Sua sessão expirou ou foi revogada. Entre novamente.', { exact: true }),
  ).toBeVisible();
});

test('trocar rapidamente o registro não aplica a resposta antiga sobre a seleção nova', async ({
  page,
}) => {
  await page.goto('#/reservas');
  await login(page, 'manager');
  await page.getByRole('button', { name: 'Gerenciar reservas', exact: true }).click();
  await page.route('**/api/v1/bookings/T4F-0001', async (route) => {
    const response = await route.fetch();
    await new Promise((resolve) => setTimeout(resolve, 400));
    await route.fulfill({ response });
  });
  await page.getByLabel('Selecionar registro').selectOption('T4F-0001');
  await page.getByLabel('Selecionar registro').selectOption('T4F-0002');
  const source = JSON.parse(
    (await import('node:fs')).readFileSync('public/data/demo.json', 'utf8'),
  ) as { bookings: { id: string; totalAmount: number }[] };
  const expected = String(
    source.bookings.find((booking) => booking.id === 'T4F-0002')!.totalAmount,
  );
  await expect(page.getByLabel('Valor total (BRL)')).toHaveValue(expected);
  await page.waitForTimeout(500);
  await expect(page.getByLabel('Valor total (BRL)')).toHaveValue(expected);
});
