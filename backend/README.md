# Backend T4F Performance · etapa 02

FastAPI + Pydantic v2 + SQLAlchemy 2 + Psycopg 3 + Alembic + PostgreSQL. O laboratório usa **exatamente o JSON sintético da versão 1**, preservando IDs, relações e escala. A versão pública do GitHub Pages continua em demonstração, sem dependência deste servidor.

## Executar com Docker Compose

Requisitos: Docker Engine/Desktop iniciado e Python 3.12 para gerar a configuração local. A instalação de Docker não inicia seu daemon automaticamente.

Na raiz do projeto:

```bash
python backend/scripts/configure_env.py
docker compose --env-file backend/.env up -d --build
docker compose --env-file backend/.env ps
docker compose --env-file backend/.env logs -f api
```

O configurador recusa sobrescrever um `.env` existente e gera senha aleatória, sem imprimi-la. A porta padrão PostgreSQL é **55433**, restrita a loopback; API **8000**. Os serviços se comunicam pela rede interna do Compose. O volume `postgres_data` é persistente. Não use `down -v` se quiser preservar o laboratório.

O serviço API aplica migrações e a seed idempotente antes de iniciar. **Não cria usuário de aplicação nem senha administrativa padrão.** Crie o administrador com uma senha escolhida localmente:

```bash
docker compose --env-file backend/.env exec api python -m app.cli create-admin --email SEU_EMAIL --name "SEU NOME"
```

`SEU_EMAIL` e `SEU NOME` são argumentos a substituir. A senha é solicitada por `getpass`, com confirmação, sem eco no terminal ou argumento de linha de comando. Também existe `--password-stdin` para automação local segura; nunca passe senhas pela linha de comando ou pelo chat.

## Executar com PostgreSQL instalado

Crie **bancos exclusivos** para o laboratório e testes. Não utilize uma base operacional. Configure `backend/.env` a partir de `.env.example`, com credenciais próprias e URL `postgresql+psycopg://...`. Os testes exigem que o nome do banco termine em `_test` e **limpam esse banco**.

```bash
python -m venv .venv
```

Ative o ambiente (`.venv\Scripts\Activate.ps1` no Windows ou `source .venv/bin/activate` em Linux/macOS). No PowerShell que bloqueia scripts, chame `.venv\Scripts\python.exe` diretamente, sem mudar a política do Windows.

```bash
pip install -r backend/requirements.txt
cd backend
alembic upgrade head
python -m app.cli seed-demo
python -m app.cli create-admin --email SEU_EMAIL --name "SEU NOME"
python -m app.server --host 127.0.0.1 --port 8000
```

`app.server` usa Uvicorn e seleciona o event loop compatível com Psycopg assíncrono no Windows. Em Linux, também funciona `uvicorn app.main:app --host 127.0.0.1 --port 8000`.

- Processo: `http://127.0.0.1:8000/health`.
- Banco, migração e seed: `http://127.0.0.1:8000/ready`.
- OpenAPI interativo: `http://127.0.0.1:8000/docs`.
- Schema: `http://127.0.0.1:8000/openapi.json`.

`/health` pode estar saudável enquanto `/ready` retorna 503. Nenhum dos dois revela credenciais ou erro SQL.

## Conectar o React existente

Na raiz, crie `.env.local` com configurações **públicas**:

```dotenv
VITE_DATA_MODE=demo
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Execute `npm ci` e `npm run dev`. Clique em **Entrar no laboratório** e autentique o usuário criado localmente. `VITE_DATA_MODE=api` abre diretamente a tela de acesso. Reinicie o Vite após mudar variáveis.

A sessão fica **somente em memória**. O navegador guarda a preferência `demo/api` no `sessionStorage`, sem token, senha ou perfil. Depois de recarregar no modo conectado, é necessário entrar novamente. Erros da API não mudam a fonte silenciosamente; existe uma ação explícita para retornar à demonstração.

## Migrações e seed

```bash
alembic upgrade head
alembic downgrade -1
python -m app.cli seed-demo
```

**Downgrade remove as tabelas desta primeira migração. Execute somente em banco descartável.** O teste automatizado verifica downgrade/upgrade exclusivamente em `TEST_DATABASE_URL` terminado em `_test`. A aplicação não usa `create_all()` para criar o schema.

A primeira seed valida o contrato, insere em transação e reconstrói um snapshot equivalente ao JSON. Repetir a seed não duplica nem desfaz alterações operacionais posteriores. Um fingerprint diferente ou banco parcialmente preenchido sem metadados é recusado. Na base completa: 116 clientes, 164 reservas, 258 leads, 6 roteiros, 52 saídas, 12 hospedagens, 609 slots, 156 custos, 147 pagamentos e 72 avaliações.

## Endpoints e permissões

Todos os endpoints abaixo usam `/api/v1`, exceto saúde. Listas operacionais aceitam `page`, `page_size` (máximo 100), `q`, `start`, `end`, `route_id`, `status`, `sort` e `direction`. `q` busca ID; a busca ampliada dos dashboards continua local ao snapshot.

| Grupo      | Rotas                                                                              | Acesso                                                      |
| ---------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Sessão     | `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`                            | Login público; demais autenticadas                          |
| Dados      | `GET /dataset`, `GET /dataset/metadata`                                            | Todos os quatro perfis autenticados                         |
| KPIs       | `GET /analytics/overview`, `/demand`, `/capacity`, `/satisfaction`, `/financial`   | Autenticado; filtros `start/end/route_id/modality/category` |
| Reservas   | `GET/POST /bookings`, `GET/PATCH /bookings/{id}`, `GET /bookings/{id}/history`     | Consulta: todos; escrita/histórico: gestor/admin            |
| Saídas     | `GET/POST /departures`, `GET/PATCH /departures/{id}`                               | Consulta: todos; escrita: gestor/admin                      |
| Capacidade | `GET/POST /allocations`, `GET/PATCH /allocations/{id}`                             | Consulta: todos; escrita: gestor/admin                      |
| Custos     | `GET/POST /costs`, `GET/PATCH /costs/{id}`                                         | Consulta: todos; escrita: gestor/admin                      |
| Alertas    | `GET /alerts`, `PATCH /alerts/{id}/status`                                         | Consulta: todos; escrita: gestor/admin                      |
| CSV        | `POST /imports/bookings/validate`, `POST /imports/bookings/commit`, `GET /imports` | Admin                                                       |
| Usuários   | `GET/POST /admin/users`, `PATCH /admin/users/{id}`                                 | Admin                                                       |
| Auditoria  | `GET /admin/audit`                                                                 | Admin, paginado e filtrável por entidade/ID                 |

Admin e gestor modificam dados operacionais; analista e visualizador apenas consultam/analisam/exportam. A autorização é validada no servidor. Criação/desativação de usuário e consulta global de auditoria ficam restritas ao administrador. Não é possível desativar o último administrador ativo.

Exemplo de atualização: primeiro consulte `GET /bookings/T4F-0001`; use o `version` recebido como `expectedVersion` no PATCH. O corpo pode conter `formComplete`, `totalAmount`, `category`, `status`, `travelerIds` e `cancellationReason`. Versão desatualizada retorna 409, sem alteração parcial. As listas completas de campos e tipos estão no OpenAPI.

## Transações e regras

- A transação é concluída **antes** de enviar sucesso HTTP (`Depends(scope="function")`). Erros no commit não se tornam respostas falsas de sucesso.
- Escritas de negócio obtêm advisory lock transacional do dataset; a agência pequena prioriza consistência entre entidades. Transações usam `SERIALIZABLE`, incluindo leituras repetíveis; snapshots não misturam commits, e conflitos entre invariantes de entidades distintas são recusados com 409. Login usa uma janela `READ COMMITTED` serializada por IP para consultar tentativas recentes.
- Alteração e auditoria são atômicas. Valores monetários usam `NUMERIC(14,2)` no banco e `Decimal` em Python.
- `booking_travelers` preserva ordem, titular e participantes. Índice parcial impede duas reservas ativas do mesmo viajante na mesma saída; FK composta mantém saída/status consistentes.
- Confirmação é recusada se ultrapassar capacidade física do grupo/slots ou faltar ficha exigível a até sete dias. Os contratos devem ser ajustados antes; alertas de ocupação acima de 85% continuam visíveis, mesmo sem extrapolar capacidade física.
- Troca de categoria/status sincroniza o lead vinculado e gera auditoria. Não há exclusão física de reservas.
- Cancelar viagem já iniciada é recusado neste fluxo. Cancelar uma futura preserva a data da confirmação e recebimentos anteriores; não cria estornos fictícios. Receita exclui canceladas; caixa recebido é uma métrica distinta. Nenhuma fórmula da base original foi alterada.
- Mudar datas de saída ou status financeiro pode exigir compatibilizar slots, custos e demais vínculos; o backend rejeita alteração inconsistente, sem cascatas silenciosas.
- Alertas continuam derivados das regras; apenas revisão, observação, responsável, data e versão são persistidos. Resolver administrativamente não elimina a causa.
- CSV: até 1 MB/500 reservas, validação seguida de commit com token descartável e expiração de 15 minutos. Hash normalizado impede reaplicação do lote, mesmo reordenado; versões detectam alterações após validar. Revalida antes de gravar e faz merge/auditoria em transação, com consultas em lote.

## Testes

É necessário PostgreSQL real, um `TEST_DATABASE_URL` exclusivo terminado em `_test` e dependências Node instaladas na raiz para os testes de paridade.

```bash
# Dentro de backend, ambiente Python ativo:
pytest -q
# Na raiz, com ambiente Python ativo:
python backend/scripts/run_connected_tests.py --allow-reset-test-db
npm test
npm run test:e2e
```

O teste conectado inicia API na porta **8001** e Vite na **4174**, cria usuários temporários com senha aleatória somente em memória, usa CORS explícito dessa porta e encerra os processos ao terminar. Usuários/sessões temporários são desativados/revogados ao final. Não há gravação de senha em traces. Os testes limpam somente o banco `_test`; nunca execute contra dados operacionais.

## Produção e limitações

Dockerfile Linux não usa root e expõe healthcheck. Em hospedagem separada, configure `DATABASE_URL`, `CORS_ORIGINS` explícito, HTTPS no proxy, migração como etapa de release, backup e política de retenção. Não exponha a porta do PostgreSQL à Internet. O mesmo usuário de banco serve migração e API no laboratório; produção deve separar papéis e privilégios.

Nenhum serviço pago ou recurso cloud foi criado. API pública não foi hospedada. O Pages continua com JSON até existir API HTTPS segura e um build explicitamente configurado. Não há integração com dados reais, recuperação de senha, MFA, refresh token, estornos ou treinamento Python. Limites globais de requisição são por processo; limite de login é persistente no PostgreSQL. Documentação e evidências: [entrega 02](../docs/entrega-02-backend.md).
