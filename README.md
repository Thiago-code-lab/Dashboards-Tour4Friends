# T4F Performance

Plataforma de análise de desempenho corporativo da Tour4Friends, desenvolvida para o **Projeto Integrador V da Fatec Ipiranga “Pastor Enéas Tognini”**.

Aplicação estática funcional em React/TypeScript. Indicadores, alertas, insights e previsões são calculados no navegador a partir de uma base sintética versionada. **Dados demonstrativos — cenário acadêmico simulado.** Nenhum resultado representa o desempenho real da agência.

## Funcionalidades implementadas

| Módulo                   | Recursos                                                                                                                                                 |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Visão geral              | Reservas, viajantes atendidos, receita realizada gerencial, NPS, ticket, ocupação, alertas, ranking e três insights calculados                           |
| Demanda e previsões      | Série mensal, sazonalidade, comparação de roteiros, Ridge e baseline sazonal, teste temporal de seis meses, MAE/RMSE, horizontes 3/6/12 e simulação ±30% |
| Reservas e comercial     | Funil por coorte de leads, canais, conversão vinculada, pipeline, tempo de fechamento, status, busca, ordenação, paginação e CSV                         |
| Roteiros e destinos      | Demanda temporal, margem, receita/custo, matriz volume/rentabilidade, categorias e percurso específico do roteiro selecionado                            |
| Hospedagens e capacidade | Slots por saída/data/etapa/categoria, ocupação, insuficiência sem compensar datas, mapa mensal, ranking e limites configuráveis                          |
| Operações e alertas      | Seis regras de negócio, filtros locais, causa, ação recomendada e revisão/resolução persistida no navegador                                              |
| Experiência do cliente   | NPS correto, amostra, distribuição 0–10, dimensões de satisfação, categorias, roteiros, evolução e feedbacks sintéticos                                  |
| Financeiro               | Receita contratada/realizada, pagamentos, custos reais/estimados no cenário, margem, ticket e impacto de cancelamentos                                   |
| Relatório executivo      | Capa com instituição e cinco integrantes, resumo, gráficos, previsões, métricas, alertas e metodologia em um documento imprimível                        |
| Sobre e metodologia      | Definições de KPIs, arquitetura, metadados, registros, qualidade, referências e limitações                                                               |

Filtros globais de período, roteiro, modalidade e categoria são preservados ao navegar. Existem estados vazios, carregamento, tratamento de erros, navegação móvel, acesso por teclado e exportação dos recortes das tabelas.

## Integrantes

- Daniel Fernando dos Santos
- Lucas Antonio Evangelista dos Santos
- Pablo Roberto da Silva Costa
- Thiago Cardoso Davi
- William Nunes Vilany

## Executar localmente

Requisitos: **Node.js 22.12+ ou 24 LTS**, npm e navegador moderno. **Python 3.11+ é necessário somente para regenerar a base.** Não há backend obrigatório, banco de dados, credenciais ou serviços pagos.

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

O módulo compara **sazonal ingênuo** com **regressão Ridge temporal** (tendência e dois harmônicos anuais; λ=4). Os últimos seis meses são reservados para teste quando há histórico suficiente. O menor MAE seleciona o método; depois ele é ajustado ao histórico completo. O mesmo teste usado na seleção não é uma avaliação independente posterior.

Sem amostra suficiente, o fallback é explícito: sazonal ingênuo ou média ponderada de três meses, sem chamar essa média de Machine Learning. Recortes muito pequenos não produzem previsão. Somente meses completos dentro do filtro entram no modelo. A simulação modifica a projeção, sem novo treinamento.

Detalhes: [previsão e backtesting](docs/forecasting.md).

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
- `.github/workflows/pages.yml`: reproduz dados, valida, testa, compila, executa E2E e publica o artefato `dist/`.
- Em **Settings → Pages → Build and deployment → Source**, selecione **GitHub Actions** se essa configuração ainda não estiver ativa.
- Se necessário, execute **Actions → Validate and deploy GitHub Pages → Run workflow** no branch `main`.
- A publicação precisa concluir o job `deploy`. O endereço deve ser verificado depois do deployment.

Instruções e diagnóstico: [publicação](docs/deployment.md).

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
  services/               # DataRepository substituível por API
  types/                  # Schemas Zod e tipos derivados
public/data/demo.json     # Snapshot sintético versionado
scripts/                  # Geração Python e validação TypeScript
tests/                    # Testes unitários e E2E
docs/                     # Documentação técnica
.github/workflows/        # Validação e deployment
```

## Decisões de arquitetura e performance

Carregamento único do JSON e validação antes da exposição à UI. Provider compartilha agregações memoizadas; não há consultas por componente. Mapas por ID são usados para os joins de entidades. Páginas secundárias são carregadas com `React.lazy`; gráficos têm chunk separado. Tabelas paginam dez linhas e exportam o conjunto filtrado. Modelos operam sobre no máximo 34 pontos mensais e um sistema linear 6×6, com custo pequeno no navegador.

Documentação: [dicionário](docs/data-dictionary.md), [KPIs](docs/kpis.md), [arquitetura](docs/architecture.md), [segurança](docs/security.md).

## Limitações e roadmap

- Não há conexão ativa com PostgreSQL, MongoDB, Data Lake, WhatsApp ou e-mail. O site é estático.
- Não há autenticação, autorização multiusuário ou sincronização de alertas. Estados de revisão são locais e não corrigem a causa na origem.
- Valores são em BRL demonstrativos, sem conciliação contábil, tributos, multas, estornos ou câmbio.
- Custos por categoria são rateados por receita; não são despesas individuais apuradas.
- Satisfação é uma amostra sintética não probabilística; não inferir causalidade ou desempenho real.
- Intervalos de previsão não são apresentados sem calibração confiável. A demanda futura contratada deve ser considerada em conjunto com a projeção estatística.
- Próxima iteração: contratos homologados, API autenticada, auditoria multiusuário, custos por categoria, validação em múltiplas janelas e intervalos calibrados.

## Referências consultadas

Somente documentação, contratos e código: [Data Lake](https://github.com/Thiago-code-lab/tour4friends-datalake), [catálogo histórico](https://github.com/Thiago-code-lab/tour4friends-datalake/blob/main/docs/routes-catalog.md), [DW anterior](https://github.com/Thiago-code-lab/tour4friends-analytics). Nenhum dos repositórios históricos foi alterado. A separação de prefixo de assets e roteamento segue a [documentação do Vite](https://vite.dev/guide/static-deploy) e do [HashRouter](https://reactrouter.com/api/declarative-routers/HashRouter).
