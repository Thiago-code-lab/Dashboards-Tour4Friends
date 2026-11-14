# T4F Performance

Plataforma de análise de desempenho corporativo da Tour4Friends, desenvolvida para o **Projeto Integrador V da Fatec Ipiranga “Pastor Enéas Tognini”**.

Aplicação React/TypeScript com dois modos: demonstração estática independente e laboratório autenticado com FastAPI/PostgreSQL. Indicadores, alertas, insights e previsões utilizam a mesma base sintética. **Dados demonstrativos — cenário acadêmico simulado.** Nenhum resultado representa o desempenho real da agência.

## Versão candidata · preparação da Release 05

Consolidação em `feature/final-quality-and-delivery-v1`, baseada em Analytics e no backend. Os PRs formam uma cadeia; nenhum foi integrado à `main` automaticamente. O Pages público continua na Etapa 01. Para apresentar todos os avanços, execute a candidata localmente.

- [Entrega e verificações finais](docs/entrega-04-final.md), [matriz de aceitação](docs/final-acceptance-checklist.md) e [roteiro oral de sete minutos](docs/roteiro-apresentacao-final.md).
- PDF único para a disciplina: `output/pdf/T4F-Performance-Projeto-Integrador-V-Entrega.pdf`. A geração reproduzível usa dados calculados e capturas reais; são oito páginas A4 com o grupo na capa. Artefato local e da CI, sem versionar binários.
- Validação da release: 95 Vitest, 27 Pytest, oito testes conectados e 27 Playwright, com uma dispensa intencional de captura duplicada. Auditoria de dez módulos em seis resoluções; acessibilidade automatizada sem declaração de conformidade WCAG completa. Evidências e decisão em [readiness](docs/release-05-readiness.md).
- `npm run build:demo` fixa demonstração e API vazia. `npm run qa:audit` requer preview na porta 4175. [Publicação futura somente após aprovação](docs/deployment.md).

## Etapa 02 — laboratório conectado

O backend adiciona PostgreSQL real, migração Alembic, seed idempotente, sessão opaca revogável, quatro perfis, CRUD operacional, auditoria e importação transacional. `ApiDataRepository` integra o snapshot aos mesmos dashboards e ao Ridge existente. O padrão de build permanece `demo`; indisponibilidade da API não provoca fallback silencioso.

- [Execução local e Docker, criação segura do administrador e endpoints](backend/README.md).
- [Evidências da entrega 02](docs/entrega-02-backend.md).
- [Arquitetura](docs/architecture.md), [modelo relacional](docs/data-dictionary.md), [autenticação](docs/authentication.md), [API](docs/api.md) e [manual de operação](docs/operacao-laboratorio.md).

Não existe API cloud publicada nesta etapa. Nenhum recurso faturável foi criado. A publicação existente do Pages continua disponível em demonstração; a integração é executável localmente, com banco real.

## Funcionalidades implementadas

**Implementação 01 — Catálogo e orçamento:** acesse `/#/catalogo` para consultar caminhadas autoguiadas dos Caminhos Francês e Português, tarifas documentais de 2027 em EUR e preparar um orçamento preliminar com custos manuais. O módulo é separado do histórico sintético em BRL. Lisboa, Econômico e datas sem tarifa permanecem sem preço; fontes, regras e importações pendentes estão em [catálogo comercial](docs/catalogo-comercial-01.md).

**Implementação 02 — Percursos documentais:** o mesmo módulo apresenta os dias e etapas de Astorga, Sarria, Porto Central e Porto Costa conforme a partida selecionada, com distâncias, cidades de pernoite e fonte. Caminhada, transporte, passeio e demais dias ficam separados. SJPP, Lisboa e Tui/Valença permanecem pendentes; [fontes, divergências e limitações](docs/roteiros-documentais-02.md).

| Módulo                   | Recursos                                                                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Visão geral              | Reservas, viajantes atendidos, receita realizada gerencial, NPS, ticket, ocupação, alertas, ranking, insights e Inteligência Gerencial   |
| Demanda e previsões      | Quatro modelos, validação expansiva, teste final separado, MAE/RMSE/viés/WAPE, faixas exploratórias, laboratório estatístico e simulador |
| Reservas e comercial     | Funil por coorte de leads, canais, conversão vinculada, pipeline, tempo de fechamento, status, busca, ordenação, paginação e CSV         |
| Roteiros e destinos      | Demanda temporal, margem, receita/custo, matriz volume/rentabilidade, categorias e percurso específico do roteiro selecionado            |
| Hospedagens e capacidade | Slots por saída/data/etapa/categoria, ocupação, insuficiência sem compensar datas, mapa mensal, ranking e limites configuráveis          |
| Operações e alertas      | Seis regras de negócio, filtros locais, causa e ação recomendada; revisão local na demo e persistida com responsável no laboratório      |
| Experiência do cliente   | NPS correto, amostra, distribuição 0–10, dimensões de satisfação, categorias, roteiros, evolução e feedbacks sintéticos                  |
| Financeiro               | Receita contratada/realizada, pagamentos, custos reais/estimados no cenário, margem, ticket e impacto de cancelamentos                   |
| Relatório executivo      | Capa com instituição e cinco integrantes, resumo, gráficos, previsões, métricas, alertas e metodologia em um documento imprimível        |
| Sobre e metodologia      | Definições de KPIs, arquitetura, metadados, registros, qualidade, referências e limitações                                               |

Filtros globais de período, roteiro, modalidade e categoria são preservados ao navegar. Existem estados vazios, carregamento, tratamento de erros, navegação móvel, acesso por teclado e exportação dos recortes das tabelas.

## Integrantes

- Daniel Fernando dos Santos
- Lucas Antonio Evangelista dos Santos
- Pablo Roberto da Silva Costa
- Thiago Cardoso Davi
- William Nunes Vilany

## Executar localmente

Requisitos da demonstração: **Node.js 22.12+ ou 24 LTS**, npm e navegador moderno. Python é opcional para regenerar dados; backend, banco e credenciais não são necessários nesse modo. O laboratório opcional exige Python 3.12 e PostgreSQL; consulte o README do backend.

```bash
npm ci
npm run dev
```

Abra a URL impressa pelo Vite, normalmente `http://127.0.0.1:5173/Dashboards-Tour4Friends/`.

No PowerShell com execução de scripts bloqueada, use `npm.cmd` no lugar de `npm`. Não é necessário alterar a política de segurança do Windows.

## Base demonstrativa

```bash
python scripts/generate_demo_data.py
npm run data:validate
```

O gerador usa apenas a biblioteca padrão Python e seed **42**. A data de referência é **07/11/2026**; o histórico vai de janeiro de 2024 a outubro de 2026. Saídas futuras são cenários, sem promessa de disponibilidade comercial. O timestamp dos metadados é fixo para tornar o arquivo reproduzível byte a byte.

| Entidade                   | Registros na base completa |
| -------------------------- | -------------------------: |
| Clientes fictícios         |                        116 |
| Reservas                   |                        164 |
| Leads                      |                        258 |
| Roteiros                   |                          6 |
| Saídas                     |                         52 |
| Hospedagens demonstrativas |                         12 |
| Slots de hospedagem        |                        609 |
| Custos                     |                        156 |
| Pagamentos                 |                        147 |
| Avaliações                 |                         72 |

Slots são contratos de uso por data/etapa/categoria. Não representam 609 hotéis. Reservas podem incluir múltiplos participantes, sem duplicar faturamento. A mesma pessoa pode viajar mais de uma vez. A seleção padrão termina em dezembro de 2026; uma saída de janeiro de 2027 só aparece se o período for ampliado. Contagens dos dashboards são calculadas e podem ser menores que as da base completa.

O catálogo é referência histórica; preços, etapas, clientes, parceiros e datas são exclusivamente demonstrativos. Nenhum CSV operacional dos repositórios anteriores foi copiado.

## Previsão executável

O motor v2 compara **sazonal ingênuo, média ponderada, Ridge temporal e tendência amortecida**. Origens expansivas anteriores aos seis meses finais selecionam o modelo a três meses, por MAE e simplicidade. O teste final permanece separado quando há amostra suficiente. MAE, RMSE, viés e WAPE são calculados; faixas exploratórias usam somente resíduos fora da amostra.

Sem amostra suficiente, o fallback é média ponderada explícita, sem inventar métricas independentes. Recortes muito pequenos não produzem previsão. Somente meses completos entram no modelo. Simulação mensal e verificação de contratos por data/etapa preservam unidades diferentes. O laboratório em Demanda apresenta sazonalidade, cancelamentos/Wilson, satisfação/bootstrap e anomalias robustas separadas de alertas operacionais.

Reproduza os resultados com `npm run analytics:report`. Detalhes: [entrega 03](docs/entrega-03-analytics.md), [validação de modelos](docs/model-validation.md), [análises estatísticas](docs/statistical-analysis.md) e [anomalias](docs/anomaly-detection.md).

## Verificação

```bash
npm run data:validate
npm test
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
```

Os testes E2E usam o build de produção sob o prefixo do repositório. Na execução local, usam o Chrome instalado; com `CI=true`, usam o Chromium instalado pelo Playwright. O workflow Linux instala o Chromium e suas dependências automaticamente.

Vitest verifica fórmulas com resultados conhecidos, integridade, meses sem movimento, filtros, alertas, importação atômica, Ridge efetivo, não negatividade e ausência de vazamento temporal. Playwright verifica as dez rotas em desktop/celular, recarga, ativos, console, filtros, cenários, busca, CSV, revisão local e impressão. Evidências geradas ficam em `artifacts/` (não versionadas).

Para conferir o build manualmente:

```bash
npm run build
npm run preview
```

## Gerar o relatório acadêmico

1. Ajuste os filtros globais e clique em **Aplicar**.
2. Abra **Relatório executivo**.
3. Clique em **Imprimir / salvar PDF**.
4. Selecione **Salvar como PDF**, papel A4, sem cabeçalhos/rodapés do navegador.

A capa identifica todos os integrantes. As demais páginas utilizam os mesmos cálculos do painel. O teste de impressão também gera um PDF de conferência em `artifacts/t4f-relatorio-verificacao.pdf`.

## Importar reservas localmente

Em **Reservas e comercial**, baixe o **modelo com reservas do recorte**. Esse formato técnico é diferente do CSV analítico da tabela. Edite apenas os registros sintéticos e importe pelo botão **Importar CSV local**.

- Máximo de 1 MB e 500 linhas.
- IDs de clientes, leads e saídas devem existir; todos os vínculos e pagamentos precisam continuar válidos.
- Mesmo ID substitui a reserva; novo ID insere uma reserva válida.
- Datas ISO, booleanos `true`/`false`, viajantes separados por `|`, valor monetário com ponto decimal.
- O lote inteiro é validado antes de substituir a base em memória.
- Erros preservam a base anterior. O arquivo não é transmitido nem persistido em servidor.
- **Recarregar base original** ou atualizar a página retorna ao JSON versionado.

## GitHub Pages

Destino configurado: **https://thiago-code-lab.github.io/Dashboards-Tour4Friends/**. A configuração por si só não comprova um deployment ativo.

- `vite.config.ts`: `base: '/Dashboards-Tour4Friends/'`.
- JSON carregado por `import.meta.env.BASE_URL`.
- `HashRouter`: rotas como `/#/demanda`, sem 404 na recarga.
- `.github/workflows/pages.yml`: reproduz dados, valida, testa, compila e executa E2E. Somente `push` em `refs/heads/main`, após aprovação dos jobs `build` e `backend`, pode publicar `dist/`.
- Em **Settings → Pages → Build and deployment → Source**, selecione **GitHub Actions** se essa configuração ainda não estiver ativa.
- **Run workflow** valida qualquer branch selecionada, inclusive `main`, sem publicar. O artefato `release-candidate-static` permite revisar o build sem deployment e fica retido por 14 dias.
- A publicação precisa concluir o job `deploy`. O endereço deve ser verificado depois do deployment.

Instruções e diagnóstico: [publicação](docs/deployment.md). Homologação da Fase A: [readiness da release 05](docs/release-05-readiness.md).

## Estrutura

```text
src/
  app/                    # Provider, estado e rotas
  components/             # Layout, filtros, gráficos, métricas e tabelas
  hooks/                  # Previsão memoizada por recorte
  pages/                  # Dez módulos funcionais, carregados sob demanda
  lib/
    analytics/            # Indicadores, alertas e insights
    forecasting/          # Ridge, baseline e teste temporal
    validation/           # Integridade e contrato da base
  services/               # Adaptadores estático/API e sessão em memória
  types/                  # Schemas Zod e tipos derivados
public/data/demo.json     # Snapshot sintético versionado
scripts/                  # Geração Python e validação TypeScript
tests/                    # Testes unitários e E2E
docs/                     # Documentação técnica
.github/workflows/        # Validação e deployment
backend/                  # FastAPI, modelos, migrações, seed e testes PostgreSQL
docker-compose.yml        # PostgreSQL e API local
```

## Decisões de arquitetura e performance

Carregamento único do JSON e validação antes da exposição à UI. Provider compartilha agregações memoizadas; não há consultas por componente. Mapas por ID são usados para os joins de entidades. Páginas secundárias são carregadas com `React.lazy`; gráficos têm chunk separado. Tabelas paginam dez linhas e exportam o conjunto filtrado. Modelos operam sobre no máximo 34 pontos mensais e um sistema linear 6×6, com custo pequeno no navegador.

Documentação: [dicionário](docs/data-dictionary.md), [KPIs](docs/kpis.md), [arquitetura](docs/architecture.md), [segurança](docs/security.md).

## Limitações e roadmap

- O Pages padrão permanece estático. O laboratório opcional conecta PostgreSQL; não há conexão com dados operacionais, MongoDB, Data Lake, WhatsApp ou e-mail.
- Na demonstração, revisões ficam no navegador. No laboratório, autenticação, autorização, auditoria e revisões são persistentes no servidor. A revisão administrativa não corrige a causa.
- Valores são em BRL demonstrativos, sem conciliação contábil, tributos, multas, estornos ou câmbio.
- Custos por categoria são rateados por receita; não são despesas individuais apuradas.
- Satisfação é uma amostra sintética não probabilística; não inferir causalidade ou desempenho real.
- Intervalos de previsão não são apresentados sem calibração confiável. O planejamento usa o maior valor entre a projeção arredondada e os viajantes futuros já confirmados, sem inserir esses compromissos no treinamento.
- Próxima iteração: hospedagem HTTPS da API, backups/recuperação, custos apurados por categoria, múltiplas janelas temporais e intervalos calibrados. API autenticada e auditoria já estão implementadas no laboratório local.

## Referências consultadas

Somente documentação, contratos e código: [Data Lake](https://github.com/Thiago-code-lab/tour4friends-datalake), [catálogo histórico](https://github.com/Thiago-code-lab/tour4friends-datalake/blob/main/docs/routes-catalog.md), [DW anterior](https://github.com/Thiago-code-lab/tour4friends-analytics). Nenhum dos repositórios históricos foi alterado. A separação de prefixo de assets e roteamento segue a [documentação do Vite](https://vite.dev/guide/static-deploy) e do [HashRouter](https://reactrouter.com/api/declarative-routers/HashRouter).
