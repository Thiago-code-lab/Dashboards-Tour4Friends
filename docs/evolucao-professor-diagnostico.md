# Evolução solicitada pelo professor · diagnóstico e plano

Auditoria de 16/11/2026. Nenhum merge em main ou deployment autorizado nesta tarefa.

## Estado encontrado

`main` e `origin/main`: `0216dce5f67b83fbb0ba84346a7742dcb4f5ce23`.
Backend, analytics e QA dos PRs #1–#3 já integram essa revisão. README e
deployment.md ainda descreviam uma candidata anterior; não são prova do estado publicado.
O registro local `release-05-published.md` contém evidências históricas da publicação.
Uma nova verificação HTTP/navegação será registrada na validação desta entrega.

| Trabalho | Estado consultado no GitHub | Base / conteúdo |
| --- | --- | --- |
| [PR #4](https://github.com/Thiago-code-lab/Dashboards-Tour4Friends/pull/4) | aberto | main; catálogo 2027 e orçamento EUR |
| [PR #5](https://github.com/Thiago-code-lab/Dashboards-Tour4Friends/pull/5) | aberto | #4; quatro roteiros documentados |
| [PR #6](https://github.com/Thiago-code-lab/Dashboards-Tour4Friends/pull/6) | aberto, draft | main; ocupação/NPS e terceira série financeira |
| `feature/hospedagens-comparacao-03` local | alterações sem commit | referências SJPP/Lisboa e comparação comercial; preservadas integralmente no checkout original |

A branch desta entrega usa worktree isolado em `tmp/evolucao-professor`, parte
do HEAD do #5 e incorpora a ancestralidade do #6 por merge **somente na branch
de trabalho**. Não repete sua implementação. O trabalho sem commit não foi
copiado, integrado, descartado ou anunciado como entregue nesta branch.

## Dez capítulos preservados

| Capítulo | Implementação |
| --- | --- |
| Visão geral | `src/pages/Overview.tsx` |
| Demanda e previsões | `src/pages/Demand.tsx` |
| Reservas e comercial | `src/pages/Reservations.tsx` |
| Roteiros e destinos | `src/pages/Routes.tsx` |
| Hospedagens e capacidade | `src/pages/Accommodations.tsx` |
| Operações e alertas | `src/pages/Operations.tsx` |
| Experiência do cliente | `src/pages/Satisfaction.tsx` |
| Financeiro | `src/pages/Finance.tsx` |
| Relatório executivo | `src/pages/Reports.tsx` |
| Sobre e metodologia | `src/pages/Methodology.tsx` |

Catálogo e orçamento é a jornada adicional de #4/#5. HashRouter, React,
TypeScript, Recharts, carregamento sob demanda, modo demo e laboratório
FastAPI/PostgreSQL continuam. Não há justificativa para reconstruir a aplicação.

## Cálculos e cenários

As funções centrais já calculam ocupação por slots comparáveis, NPS por
promotores/detratores e margem ponderada sobre receita. Há fixture independente
com resultados manuais e testes de paridade Python/TypeScript. Denominador zero
é null. Capacidade não deve ser compensada entre datas.

Custos existentes: Hospedagem, Transporte, Guias e apoio; podem ser realizados
ou estimados. Ausência de cobertura contábil completa impede chamar o resultado
de lucro bruto apurado. Usar contribuição gerencial, explicando a composição.

Histórico sintético BRL: Premium/Conforto/Alternativa, seis roteiros (inclusive
Assis e Espanha cultural). Não renomear nem apagar esses registros: alteraria
contratos e séries. O novo escopo comercial usa somente Francês/Português e
as sete partidas, já cadastradas em #4. Categorias Econômico/Standard/Superior
são independentes. Uma equivalência entre tiers históricos e comerciais não
foi validada; não aplicar migração sem documento da empresa. Nos filtros,
identificar a classificação histórica e encaminhar partidas ao catálogo.

## Fontes acessíveis e pendências

- Quatro itinerários operacionais importados em #5 e respectivas fontes/hashes.
  Os PDFs continuam localizáveis no acervo `tour4friends-datalake`, consultado
  apenas para inventário; nenhum arquivo desse outro projeto foi modificado.
- O JSON documental e sugestões do trabalho local ainda sem commit existem no
  checkout original; não são tratados como disponibilidade ou parceria.
- Tarifas 2027 são transcrição documental já registrada em #4. Original PDF,
  planilhas originais e validação da empresa continuam necessários.
- Não foram fornecidos nesta tarefa a apresentação de 16 páginas nem os
  recortes brasileiros 2025/2026. O PDF acadêmico gerado localmente é outra
  entrega e não substitui a referência pedida.
- [Oficina del Peregrino](https://oficinadelperegrino.com/estadisticas-2/),
  consultada nesta sessão, remete a relatório Power BI. O HTML não fornece
  uma série brasileira verificável. Não preencher valores por estimativa.
- Não há evidência de disponibilidade atual, eventos locais ou coordenadas
  documentais das etapas. Usar mapa esquemático identificado e status cinza;
  não apresentar geometria como trajeto GPS nem inferir vagas reais.

## Plano incremental e critérios de aceite

1. **Indicadores e financeiro:** aproveitar #6; mostrar denominador em
   vagas-noite e NPS em pontos; custos/cobertura explícitos. Testes dos valores,
   terceira série/tabela acessível, negativos e recorte vazio.
2. **Filtros:** caminho separado do roteiro/modalidade no histórico, opções
   dependentes e persistência; manter API e previsão no mesmo recorte. Sete
   partidas permanecem no catálogo documental sem equivalências inventadas.
3. **Mapa e risco:** seleção das sete partidas e sequência das quatro fontes
   operacionais. Semáforo com validação de origem, data e escopo; sem evidência
   comparável = desconhecido. Dados sintéticos não alimentam vagas reais.
4. **Demanda:** premissa 0,5% em simulador separado, entrada brasileira,
   período/filtros/origem explícitos; nenhum valor oficial pré-preenchido sem
   comprovação. Não aplicar 0,5% à previsão da carteira sintética.
5. **Hospedagem:** preservar orçamento em centavos, lacunas e EUR; área dos
   três tiers com fotografias ilustrativas e sem alegação de parceiros.
6. **Apresentação:** 12–16 slides, narrativa de negócio e capturas reais do
   build local identificado como candidato. Sem resultados empresariais
   inventados. Fonte anterior ausente impede revisão fiel de suas 16 páginas.
7. **Validação:** Vitest, typecheck, build demo, integridade do dataset,
   Playwright desktop/celular e inspeção de capturas. Backend: testes
   específicos/paridade quando houver alteração analítica. Resultados só
   registrados depois de executados.

PRs de revisão encadeados e sem deployment. A integração futura deve preservar
#4/#5/#6 e o WIP de hospedagens; nenhum PR existente será encerrado automaticamente.
