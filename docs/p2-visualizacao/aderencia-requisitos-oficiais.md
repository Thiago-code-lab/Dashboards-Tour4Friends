# Aderência aos requisitos oficiais da P2

Conferência em 24/11/2026, America/Sao_Paulo, do `P2_VD2026.docx` indicado pelo solicitante em `D:/Downloads`. O original foi lido sem alteração. SHA-256: `ad8e431187b2b4eaec64d2b3dc41352a4cdf81a4d180d710de0abce17801f1da`; tamanho: 24.503 bytes. Os seis títulos e seus vinte critérios estão transcritos no [registro da fonte](evidencias/requisitos-oficiais.json), na ordem do documento, com normalização de espaços. Os estados abaixo são uma avaliação técnica da entrega, não uma aprovação do professor ou da empresa.

Os entregáveis 1 a 5 estão atendidos no escopo demonstrativo e no laboratório relacional local. O entregável 6 permanece pendente: preparar um roteiro não satisfaz a coleta real de feedback nem os ajustes decorrentes dela. Dados sintéticos não comprovam o desempenho da Tour4Friends ou o comportamento da população brasileira.

| Entregável oficial | Estado | Evidência principal |
| --- | --- | --- |
| 1 Planejamento da Visualização | Atendido no escopo demonstrativo | [Planejamento](planejamento.md) |
| 2 Desenvolvimento do Dashboard | Atendido no escopo demonstrativo e laboratório local | [Manual](manual-do-usuario.md), [integração relacional](integracao-relacional.md) |
| 3 Aplicação de Técnicas de Visualização | Atendido no escopo demonstrativo | [Técnicas e imagens](tecnicas-de-visualizacao.md) |
| 4 Análise e Interpretação dos Dados | Atendido no escopo demonstrativo | [Sete análises](analises-e-insights.md) |
| 5 Documentação da Solução de Visualização | Atendido no escopo demonstrativo | [Manual](manual-do-usuario.md), [arquitetura](../architecture.md) |
| 6 Validação com o Usuário/Parceiro | Pendente | [Instrumento preparado, sem avaliação realizada](validacao-parceiro.md) |

## 1 Planejamento da Visualização

| Critério do DOCX | Estado | Evidência e interpretação |
| --- | --- | --- |
| Definição dos indicadores (KPIs) que serão apresentados | Atendido | [Planejamento](planejamento.md): fórmulas, unidades, denominadores e usuários; ocupação e NPS prioritários, contribuição distinta de lucro líquido. |
| Definição dos tipos de análises e ferramentas utilizadas | Atendido | [Planejamento](planejamento.md): análises descritivas, exploratórias, estatísticas e preditivas; React/TypeScript, Recharts, FastAPI/PostgreSQL e modelos locais efetivamente utilizados. |
| Indicação do framework de Storytelling que será usado | Atendido | Situação → Problema → Evidência → Insight → Ação recomendada, com [dez capítulos](../../src/lib/chapters.ts) e [narrativa executada](evidencias/narrativa.png). |

## 2 Desenvolvimento do Dashboard

| Critério do DOCX | Estado | Evidência e interpretação |
| --- | --- | --- |
| Implementação de dashboard interativo em plataforma web | Atendido | React/TypeScript com dez temáticas, tabelas, exportação e navegação; [capturas reais](evidencias/capturas.json) e [testes desktop/celular](checklist-entrega.md). A candidata P2 ainda não está publicada. |
| Integração com base de dados (relacional ou NoSQL) | Atendido no laboratório local | FastAPI/SQLAlchemy/PostgreSQL com migrações, leitura, filtros, gravação e persistência em nova sessão; [manifesto aprovado](evidencias/laboratorio.json). O Pages serve JSON estático e não consulta PostgreSQL remoto. |
| Filtros dinâmicos (por período, categoria, unidade, etc.) | Atendido | Período, caminho, roteiro, modalidade e categoria, com persistência entre capítulos; [manual](manual-do-usuario.md) e [regressão por caminho](../../tests/route-scope.test.ts). Não há dimensão “unidade” na base; os parênteses do DOCX apresentam exemplos. |
| Atualização automática ou sob demanda dos dados | Atendido | JSON relido sob demanda sem cache HTTP; modo API atualiza após escrita, por foco e intervalo quando visível. Comportamento e limites de persistência no [manual](manual-do-usuario.md). |

## 3 Aplicação de Técnicas de Visualização

| Critério do DOCX | Estado | Evidência e interpretação |
| --- | --- | --- |
| Protótipo do dashboard (wireframe ou mockup) | Atendido | [Wireframe PNG](wireframe.png) e [fonte SVG](wireframe.svg), fiéis à hierarquia do dashboard. |
| Escolha dos tipos de gráficos mais adequados (linha, barra, dispersão, heatmap, etc.) | Atendido | [Técnicas](tecnicas-de-visualizacao.md) justificam os gráficos pelo propósito: séries temporais, comparações, capacidade, experiência e contribuição. A lista do DOCX é exemplificativa, não obrigação de usar todo tipo de gráfico. |
| Uso de princípios de design (cores, contraste, hierarquia visual) | Atendido no escopo verificado | Hierarquia de KPIs, rótulos/unidades, contraste, ícones e cor acompanhada de texto; [60 telas auditadas](evidencias/auditoria-interface.json). A auditoria automatizada não substitui avaliação humana integral de acessibilidade. |
| Aplicação de boas práticas de visualização (evitar poluição visual, clareza, legibilidade) | Atendido no escopo verificado | Narrativa recolhível, tabelas alternativas, foco de teclado e layouts desktop/celular; [técnicas](tecnicas-de-visualizacao.md). |
| Representação de resultados de análises estatísticas e modelos de IA | Atendido no escopo demonstrativo | [Demanda](../../src/pages/Demand.tsx) representa análises de cancelamentos/satisfação/sazonalidade e previsões com modelos numéricos, incluindo Ridge temporal. Observado, previsto, erros de teste e faixas exploratórias são distintos; não se alega uso de LLM. [Análise 7](analises-e-insights.md) explicita os limites. |

## 4 Análise e Interpretação dos Dados

| Critério do DOCX | Estado | Evidência e interpretação |
| --- | --- | --- |
| Identificação de padrões, tendências e outliers | Atendido no escopo investigado | [Análises 5 e 7](analises-e-insights.md): padrões mensais descritivos, avaliação temporal e detector existente; zero anomalias detectadas. Não há evidência para declarar crescimento persistente nem fabricar outliers. Ausência de detecção não prova ausência de problemas. |
| Geração de insights relevantes para o negócio | Atendido no escopo demonstrativo | [Sete achados](analises-e-insights.md) relacionam gargalos por slot, ocupação, NPS/amostra, cancelamentos, hospedagem e contribuição a decisões recomendadas. Utilidade real depende da validação do parceiro. |
| Relatório explicativo dos principais achados a partir do dashboard | Atendido | [Análises](analises-e-insights.md) com pergunta, recorte, indicador, cálculo, interpretação, ação e limites; [relatório PDF](P2_Visualizacao_de_Dados_T4F_Performance.pdf). |

## 5 Documentação da Solução de Visualização

| Critério do DOCX | Estado | Evidência e interpretação |
| --- | --- | --- |
| Descrição das ferramentas utilizadas (ex: bibliotecas ou frameworks) | Atendido | [Planejamento](planejamento.md), [arquitetura](../architecture.md) e [integração relacional](integracao-relacional.md) descrevem as ferramentas em uso. |
| Explicação da estrutura do dashboard | Atendido | [Planejamento](planejamento.md) descreve os dez capítulos; [manual](manual-do-usuario.md) distingue o catálogo documental complementar do histórico analítico. |
| Manual de uso do painel (como interpretar e interagir com os dados) | Atendido | [Manual ilustrado](manual-do-usuario.md): navegação, filtros, KPIs, previsões, CSV, impressão, atualização, modo estático e laboratório relacional. |

## 6 Validação com o Usuário/Parceiro

| Critério do DOCX | Estado | Evidência necessária |
| --- | --- | --- |
| Coleta de feedback da organização parceira | Pendente | Receber avaliação real, com origem, data, versão avaliada e evidência consentida. O [roteiro](validacao-parceiro.md) está preparado, mas não houve coleta confirmada. |
| Ajustes baseados na experiência do usuário | Pendente | Após a coleta, registrar comentário real, decisão fundamentada, ajuste ou justificativa, arquivo/commit e evidência posterior. Não atribuir as melhorias técnicas existentes a feedback empresarial não recebido. |

## Limites da conferência

O recebimento do DOCX encerra a pendência de acesso e de correspondência literal aos requisitos. Não encerra a validação empresarial, a revisão acadêmica humana ou a autorização para merge/deploy. A base continua sintética e não identifica nacionalidade. A [matriz geral](checklist-entrega.md) mantém essas limitações e as exigências adicionais do pedido original.
