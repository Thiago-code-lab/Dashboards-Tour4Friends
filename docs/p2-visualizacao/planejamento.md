# Planejamento da visualização

## Problema, público e objetivo

A Tour4Friends precisa relacionar demanda, reservas, capacidade contratada, experiência e custos para planejar viagens. A plataforma organiza essas informações para gestores, comercial, operações, atendimento e financeiro. O público de interesse do projeto são peregrinos brasileiros nos Caminhos Francês e Português. A base atual é **sintética**, sem nacionalidade: demonstra a análise por caminho, mas não mede a população brasileira nem o desempenho real da agência.

Objetivo: apoiar decisões de capacidade e qualidade, com ocupação e NPS no primeiro nível, detalhamento por filtros e comunicação rastreável. Dados de Assis/cultural permanecem no histórico completo; selecionar Caminho Francês ou Português restringe o recorte sem modificar a base. Catálogo 2027 EUR e categorias comerciais são documentais, separados do histórico BRL e Premium/Conforto/Alternativa.

## Indicadores e usuários

| Indicador                   | Fórmula / unidade                                                                  | Usuário e decisão                                                   |
| --------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Ocupação                    | 100 × soma das vagas-noite comprometidas / soma da capacidade dos mesmos slots     | Operações/gestão; negociar capacidade por data, etapa e categoria   |
| NPS                         | 100 × (promotores 9-10 − detratores 0-6) / respostas; **pontos**, −100 a 100       | Atendimento/gestão; investigar experiência com tamanho da amostra   |
| Reservas confirmadas        | Contagem de status `confirmed` por início da viagem                                | Comercial; acompanhar carteira                                      |
| Viajantes atendidos         | Participações em reservas confirmadas concluídas até a referência                  | Operações; dimensionar atendimento; não são pessoas únicas          |
| Cancelamento                | 100 × reservas canceladas / todas as reservas do recorte                           | Comercial; investigar motivos e canais                              |
| Conversão                   | 100 × leads distintos da coorte com reserva confirmada vinculada / leads da coorte | Comercial; avaliar fechamento por primeiro contato                  |
| Receita contratada          | Soma dos valores das reservas confirmadas                                          | Financeiro; acompanhar contratos, incluindo futuros                 |
| Receita realizada gerencial | Soma de reservas confirmadas concluídas até a referência                           | Financeiro; separar histórico e compromissos futuros                |
| Contribuição                | Receita contratada − custos incluídos no recorte, em BRL                           | Gestão/financeiro; avaliar resultado parcial, **não lucro líquido** |
| Margem de contribuição      | 100 × contribuição / receita contratada                                            | Gestão; comparação ponderada, não média de percentuais              |
| Ticket médio                | Receita contratada / reservas confirmadas                                          | Comercial; comparar valor por reserva                               |
| Satisfação                  | Média das notas por dimensão, 0-10, com n                                          | Atendimento; investigar hospedagem, logística e atendimento         |

Denominadores zero produzem ausência de indicador, não zero de desempenho. NPS usa respostas vinculadas às reservas do recorte; não é porcentagem de clientes satisfeitos. Slots repetem a participação por etapa, por isso vagas-noite diferem de viajantes. Custos de saída são rateados pela participação da receita quando há filtro de categoria; explicitar que o rateio não é custo individual observado.

## Storytelling e capítulos

Framework: **Situação → Problema → Evidência → Insight → Ação recomendada**. Cada painel inclui uma seção recolhível “Entenda a decisão”, com contexto do recorte e navegação anterior/próximo. KPIs executivos permanecem visíveis. A evidência numérica vem do contexto analítico, sem constantes de desempenho nos componentes. O insight orienta investigação e evita atribuir causalidade.

| Capítulo       | Pergunta / papel                                | Técnica e justificativa                                               |
| -------------- | ----------------------------------------------- | --------------------------------------------------------------------- |
| 01 Visão geral | Onde agir primeiro? Situação                    | Cards de ocupação/NPS com denominadores, série de demanda e ranking   |
| 02 Demanda     | Qual volume pode exigir vagas? Evidência futura | Linha temporal, projeção diferenciada e erro fora da amostra          |
| 03 Reservas    | Como contatos viram viagens? Problema comercial | Funil por coorte, barras de canais/status e tabela filtrável          |
| 04 Roteiros    | Quais combinam volume e resultado? Comparação   | Barras e matriz volume/rentabilidade; não confundir volume com margem |
| 05 Hospedagens | Onde falta capacidade? Evidência operacional    | Mapa mensal, ocupação por slot e tabela de insuficiências             |
| 06 Operações   | Que pendência resolver? Ação                    | Lista por severidade com causa, recomendação e revisão                |
| 07 Experiência | O que dizem os respondentes? Insight            | NPS, distribuição 0-10, linha e barras por dimensão/grupo             |
| 08 Financeiro  | Quanto resta após custos incluídos? Resultado   | Séries de receita/custo/contribuição e tabela; preservar negativos    |
| 09 Relatório   | Como compartilhar a decisão? Comunicação        | Síntese imprimível com recorte, integrantes e metodologia             |
| 10 Metodologia | Até onde concluir? Confiança                    | Definições, qualidade e fonte, sem gráfico redundante                 |

## Análises e tecnologias efetivas

Descritiva: totais, percentuais ponderados, evolução e rankings. Diagnóstica exploratória: cruzamentos, motivos e comentários; não inferir causa. Estatística: Wilson para cancelamentos, bootstrap por cliente para NPS, desvios robustos com amostra mínima. Preditiva: sazonal ingênuo, média ponderada, Ridge e tendência amortecida, seleção temporal anterior ao teste final. Prescritiva limitada: regras operacionais e cenários manuais, sem otimização causal ou garantia.

Frontend React/TypeScript/Vite, Tailwind CSS e CSS existente, Recharts, Zod, PapaParse e HashRouter. Cálculos locais memoizados; módulos carregados sob demanda. Laboratório: Python/FastAPI, SQLAlchemy assíncrono/psycopg, PostgreSQL e Alembic. Testes: Vitest, Playwright/axe-core e Pytest. Não há LLM ou consumo de tokens para gerar insights; regras determinísticas e modelos numéricos locais evitam custo de API e latência de inferência remota. Fallbacks de previsão são explícitos quando a amostra é insuficiente.

Escopo técnico: reutilizar #8, corrigir seleção estatística por caminho, tornar atualização estática independente do cache HTTP e criar evidências/documentação P2. Não reconstruir, migrar categorias, alterar dados para melhorar gráficos, publicar API ou contratar nuvem.

## Aceitação

Conferir [matriz de entrega](checklist-entrega.md). O DOCX oficial e o feedback da empresa impedem declarar validação acadêmica/empresarial integral. Não há prazo, reunião ou aprovação presumidos.
