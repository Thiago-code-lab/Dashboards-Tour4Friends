# Auditoria inicial - P2 de Visualização de Dados

Inspeção em 23/11/2026, antes das alterações de código desta entrega. Fonte de requisitos disponível: texto anexado pelo solicitante. `P2_VD2026.docx` não localizado no workspace nem nos anexos pesquisados; a correspondência literal aos seis entregáveis do documento depende de sua disponibilização. Não se presume que o texto substitua o documento oficial.

## Git e dependências de revisão

Checkout original: `feature/hospedagens-comparacao-03`, HEAD `58b05df`. Há WIP em workflow, README, catálogo, hospedagens, componentes e testes, além de arquivos não rastreados. Nenhum desses arquivos foi incorporado ou alterado nesta entrega. `main` e `origin/main`: `0216dce`. O repositório independente de portfólio não faz parte deste trabalho.

Consulta ao GitHub em 23/11/2026, sem merge:

| PR                                                                      | Estado          | Base      | Head    | Conteúdo                                           |
| ----------------------------------------------------------------------- | --------------- | --------- | ------- | -------------------------------------------------- |
| [#4](https://github.com/Thiago-code-lab/Dashboards-Tour4Friends/pull/4) | Aberto          | main      | 3af88df | Catálogo e orçamento EUR 2027                      |
| [#5](https://github.com/Thiago-code-lab/Dashboards-Tour4Friends/pull/5) | Aberto          | branch #4 | 58b05df | Quatro percursos documentais                       |
| [#6](https://github.com/Thiago-code-lab/Dashboards-Tour4Friends/pull/6) | Rascunho aberto | main      | e8db19f | Ocupação/NPS/contribuição                          |
| [#7](https://github.com/Thiago-code-lab/Dashboards-Tour4Friends/pull/7) | Rascunho aberto | branch #5 | 370a3e7 | Filtro de caminho; incorpora #6 por ancestralidade |
| [#8](https://github.com/Thiago-code-lab/Dashboards-Tour4Friends/pull/8) | Rascunho aberto | branch #7 | 0ec5f1a | Mapa documental, cenário manual e apresentação     |

Cadeia: main → #4 → #5 → #7 → #8; #6 está incorporado em #7 e exige conciliação humana na integração. Esta entrega parte de #8 em worktree `D:/Códigos/T4F-P2-Visualizacao`, branch `feature/p2-visualizacao-2026`. Preserva a cadeia, sem integrar branches.

## Dez painéis existentes

| Tema / rota                | Funcionalidade auditada no código                      | Participação na narrativa            |
| -------------------------- | ------------------------------------------------------ | ------------------------------------ |
| Visão geral `/`            | KPIs, denominador da ocupação, NPS em pontos, insights | Situação e prioridades               |
| Demanda `/demanda`         | Séries, quatro modelos, validação temporal, cenários   | Evidência de demanda e incerteza     |
| Reservas `/reservas`       | Coorte, status, busca, CSV, importação validada        | Investigar conversão e cancelamentos |
| Roteiros `/roteiros`       | Comparações de volume, contribuição e categorias       | Escolher recortes para investigação  |
| Hospedagens `/hospedagens` | Slots por data/etapa/categoria, mapa mensal            | Detectar capacidade e insuficiência  |
| Operações `/operacoes`     | Regras operacionais, revisão de alertas                | Priorizar ações executáveis          |
| Experiência `/experiencia` | NPS, amostra, distribuição e dimensões                 | Investigar experiência do viajante   |
| Financeiro `/financeiro`   | Receita, custos, contribuição, pagamentos              | Avaliar resultado gerencial          |
| Relatório `/relatorios`    | Documento imprimível com integrantes                   | Comunicar decisões                   |
| Metodologia `/metodologia` | Fórmulas, qualidade, limitações                        | Tornar a evidência rastreável        |

`/catalogo` é módulo complementar documental, separado das dez temáticas analíticas e do histórico sintético BRL. Não é um décimo primeiro painel histórico. Referências comerciais não comprovam disponibilidade ou resultados operacionais.

## Dados e arquitetura

React 19, TypeScript, Vite, Tailwind 4 e Recharts. Router com hash, apropriado ao Pages. `analyze` centraliza os cálculos; contexto memoiza a análise e compartilha filtros. Zod valida JSON e vínculos. Dados versionados em `public/data/demo.json`, explicitamente sintéticos, seed 42. Não há identificação de nacionalidade que permita concluir desempenho real de peregrinos brasileiros.

`StaticDataRepository` lê JSON estático; no estado inicial, usava a política padrão de cache do navegador. Importação de reservas permanece em memória. Atualizar/recarregar retorna à base versionada. Pages não grava nem consulta PostgreSQL. Modo conectado usa `ApiDataRepository`, sessão autenticada e snapshot FastAPI; atualização a cada 30 segundos quando visível, ao receber foco e após gravações. Falha de API é exibida, sem fallback silencioso.

Backend existente: FastAPI, SQLAlchemy assíncrono, psycopg, PostgreSQL, Alembic, seed idempotente, perfis, CRUD, importação transacional e auditoria. Testes exigem banco descartável `_test`; não serão executados contra o banco de uso do usuário.

## Qualidade e lacunas

Há Vitest, Playwright desktop/celular, axe-core, testes Pytest e integração conectada. Tabelas acessíveis acompanham gráficos, menu móvel controla foco, filtros têm labels e há estados vazios/erro/carregamento. Resultados antigos em outros documentos não substituem a execução desta entrega; resultados atuais ficarão no [checklist](checklist-entrega.md).

Ocupação e NPS já estão priorizados em #7/#8; contribuição já é distinta de lucro líquido. Não será duplicada a implementação desses PRs. Faltam um pacote específico P2, narrativa explícita em capítulos, manual ilustrado, achados calculados com recortes e limitações, wireframe fiel e PDF próprio. Feedback da empresa e DOCX oficial permanecem dependências externas.

O README da branch contém textos históricos conflitantes sobre publicação. Verificação direta do site e limites do publicado serão registrados separadamente; código local não prova deployment. Nenhum merge, deploy, force push ou mudança destrutiva foi realizado na auditoria.

## Achado posterior e resolução rastreada

Na implementação, identificou-se que `historicalBookings`, utilizado por cancelamentos/satisfação/anomalias, ignorava `way`, embora os KPIs e a previsão respeitassem o caminho. Corrigido usando `matchesRoute`, com dois testes de regressão que comparam cada caminho a uma base previamente restrita aos seus roteiros. `StaticDataRepository` passou a usar `cache: no-store` para atualização sob demanda do JSON. Nenhum dataset foi modificado.

Verificação do publicado em 23/11/2026 (America/Sao_Paulo): HTTP 200, menu sem catálogo e sem capítulos P2. [Registro](evidencias/publicado.json) e [captura pública](evidencias/publicado.png) são separados das imagens locais.

## Reauditoria de 24/11/2026

A entrega desta auditoria já estava nos commits `75c35ff` e `e3c9ea6`, com PR #9 em rascunho sobre #8. A [consulta atual dos PRs](evidencias/revisao-prs.json) confirma as mesmas bases e ausência de merges. A nova inspeção preservou o WIP original e identificou evidência de sucesso desatualizada após falha do runner por dependência ausente. Correção, repetição das suítes e limites estão na [revalidação](revalidacao.md). A auditoria inicial acima permanece como registro anterior à implementação.
