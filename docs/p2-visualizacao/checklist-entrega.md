# Checklist final da P2

Execução local em 23/11/2026, America/Sao_Paulo. **Atendido** = implementado e/ou comprovado no escopo indicado; **parcial** = há entrega com dependência explicitada; **pendente** = evidência externa não recebida. Não é declaração de aprovação da disciplina ou da empresa.

| Requisito                                                                             | Estado   | Evidência / limite                                                                                        |
| ------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------- |
| Conferir literalmente os seis entregáveis do DOCX                                     | Pendente | `P2_VD2026.docx` ausente; segue-se o texto anexado                                                        |
| Auditar Git, branches, WIP e PRs #4–#8 antes do código                                | Atendido | [Auditoria](auditoria.md); worktree próprio preserva WIP                                                  |
| Planejar problema, público, KPIs, fórmulas e gráficos                                 | Atendido | [Planejamento](planejamento.md)                                                                           |
| Público brasileiro nos Caminhos Francês/Português                                     | Parcial  | Escopo documentado e filtro existente; nacionalidade não consta da base sintética                         |
| Dez dashboards como capítulos                                                         | Atendido | `src/lib/chapters.ts`, `chapter-story.tsx`; E2E desktop/celular percorre dez                              |
| Framework Situação → Problema → Evidência → Insight → Ação                            | Atendido | Narrativa recolhível por capítulo; [captura](evidencias/narrativa.png)                                    |
| Filtros período/caminho/roteiro/modalidade/categoria                                  | Atendido | E2E existente; regressão Vitest corrige estatística por caminho                                           |
| KPIs calculados nos registros carregados                                              | Atendido | [Métricas com hash e três recortes](evidencias/metricas.json); fórmulas e paridade existentes             |
| Prioridade ocupação/NPS; unidades e contribuição corretas                             | Atendido | Aproveita #7/#8; [visão geral](evidencias/visao-geral-desktop.png)                                        |
| Dados sem alterações artificiais                                                      | Atendido | `git diff` de `public/data/demo.json` vazio; hash no JSON de evidências                                   |
| Atualização documentada                                                               | Atendido | [Manual](manual-do-usuario.md); JSON sem cache, API intervalo/foco/escrita                                |
| Carregamento, erro, vazio e ausência de dados                                         | Atendido | E2E de vazio/curto, falhas da API e importação inválida preservam estado                                  |
| Exportação CSV e impressão PDF                                                        | Atendido | E2E de download/conteúdo, impressão e relatório acadêmico gerado                                          |
| Responsividade desktop/celular                                                        | Atendido | [Auditoria 60 telas](evidencias/auditoria-interface.json), seis resoluções, sem overflow                  |
| Acessibilidade                                                                        | Parcial  | axe-core sem violações executadas; teclado/menu/tabelas cobertos; sem auditoria humana WCAG integral      |
| FastAPI/PostgreSQL: leitura, filtros, escrita e persistência                          | Atendido | [Integração](integracao-relacional.md); 27 Pytest, 8 conectados em banco novo                             |
| Limites do Pages explícitos                                                           | Atendido | [Manual](manual-do-usuario.md); não há PostgreSQL remoto no Pages                                         |
| Wireframe e justificativas visuais                                                    | Atendido | [PNG](wireframe.png), fonte SVG, [técnicas](tecnicas-de-visualizacao.md)                                  |
| Capturas reais em navegador                                                           | Atendido | [Manifesto](evidencias/capturas.json): onze locais; público separado                                      |
| Demanda/cancelamento/ocupação/NPS/satisfação/contribuição                             | Atendido | [Sete análises](analises-e-insights.md), sete campos por achado                                           |
| Previsão e estatística sem resultados inventados                                      | Atendido | Teste final separado; Ridge não é proclamado vencedor final; zero anomalias detectadas                    |
| Manual ilustrado e execução relacional                                                | Atendido | [Manual](manual-do-usuario.md)                                                                            |
| Roteiro de avaliação da empresa                                                       | Atendido | [Instrumento](validacao-parceiro.md)                                                                      |
| Feedback confirmado, ajustes e aprovação da empresa                                   | Pendente | Nenhuma avaliação recebida; instrumento não é feedback                                                    |
| PDF com identificação, planejamento, arquitetura, imagens, análises, manual e limites | Atendido | [Relatório P2](P2_Visualizacao_de_Dados_T4F_Performance.pdf), 12 páginas; texto e renderização conferidos |
| Build/TypeScript/dados/unitários/integração/navegação                                 | Atendido | [Resumo](evidencias/verificacao.json)                                                                     |
| Console e ativos nos fluxos verificados                                               | Atendido | E2E e auditoria de seis resoluções sem erros                                                              |
| Documentação e links internos                                                         | Atendido | Conferência dos destinos locais no pacote P2                                                              |
| Branch própria e PR em rascunho                                                       | Atendido | Branch `feature/p2-visualizacao-2026`, PR encadeado ao #8; ver repositório                                |
| Merge/publicação                                                                      | Pendente | Exigem autorização expressa; não realizados nesta tarefa                                                  |

## Resultados executados

184 Vitest; 27 Pytest; 8 Playwright conectados; 39 Playwright estáticos aprovados, com uma dispensa preexistente da captura/PDF analítico duplicado no projeto mobile. Build demo inclui TypeScript. `data:validate` e Ruff aprovados. Auditoria: dez módulos × seis resoluções (60 telas), sem overflow, erros de console ou violações axe-core nos recortes verificados. Cinco medições locais da página Demanda: pronta em 1.100–1.200 ms; aplicação de filtro em 249–304 ms, sem compromisso de desempenho em outros ambientes. Testes executados em Chrome local e PostgreSQL 18 local, não em produção.

## Código versus site publicado

O código desta branch inclui P2 e a ancestralidade #4/#5/#6/#7/#8. [Consulta pública](evidencias/publicado.json): HTTP 200, sem catálogo e sem capítulo P2. A implementação de hospedagens ainda não commitada no checkout original não foi incorporada. Nenhum repositório independente foi modificado.

Pendências humanas: fornecer DOCX oficial, avaliar com a empresa, registrar ajustes, revisar dependências dos PRs e autorizar integração/publicação. O projeto não está integralmente validado pela Tour4Friends.
