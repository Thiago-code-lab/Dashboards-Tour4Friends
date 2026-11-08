# Entrega 04 · consolidação e versão candidata

## Escopo e branches

`feature/final-quality-and-delivery-v1` foi criada sobre Analytics em `170f331`. Seu PR aponta para `feature/advanced-analytics-v1`, dependendo dos PRs #2 e #1. Backend, seed e registros sintéticos foram preservados. Não houve merge, push em `main`, contratação ou deployment.

## Problemas e correções

| Achado                                                            | Correção                                                                        | Evidência                                                |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Operações ultrapassava o celular em 9 px; Relatório, em 78/108 px | Controles respeitam a margem; tabelas têm largura e quebra de texto controladas | 60 combinações de tela/resolução sem overflow final      |
| Textos auxiliares com pouco contraste                             | Cores de texto ajustadas, preservando fundos, gráficos e paleta                 | Axe sem violações nas regras executadas                  |
| Links do menu fechado disponíveis ao teclado                      | Menu inerte, foco contido, Escape e retorno de foco                             | Testes em 360×800                                        |
| Respostas inválidas e espera indefinida na API                    | Timeout de 15 s, mensagens claras e parsing defensivo                           | Unitários e fluxos conectados de falhas                  |
| Resposta antiga podia sobrescrever o editor após troca rápida     | Abort da consulta anterior e descarte de resposta cancelada                     | Teste conectado com resposta atrasada                    |
| Erro 422 sem associação ao campo                                  | Erro tipado preservado, descrição e `aria-invalid`                              | Formulário permanece consistente e sem gravação otimista |
| CSV estatístico perdia objetos                                    | JSON dentro da célula; neutralização de fórmulas preservada                     | Download real sem `[object Object]`                      |
| Metodologia descrevia como futuras funcionalidades já prontas     | Textos, README e deployment atualizados                                         | Revisão alinhada às quatro etapas                        |
| Três avisos npm na cadeia de testes                               | Vitest atualizado para 4.1.12                                                   | Suíte aprovada e zero avisos na auditoria                |
| Dados tabulares dos gráficos montados mesmo recolhidos            | Montagem somente ao abrir                                                       | Comparação de heap antes/depois                          |

O seletor E2E de reservas passou a identificar sua tabela pelo nome acessível, pois a nova tabela auxiliar de gráfico tornou ambíguo o seletor genérico. A verificação do fluxo foi mantida. Não houve alteração de fórmula ou número de referência da base padrão.

## Auditoria dos módulos e indicadores

Foram percorridos Visão Geral, Demanda, Reservas, Roteiros, Hospedagens, Operações, Experiência, Financeiro, Relatório e Metodologia. Filtros, recarga, tabelas, ordenação, CSV, estados vazios e falhas foram exercitados. O modo conectado preserva gravação, nova sessão, indicadores e auditoria.

Uma carteira manual independente contém seis reservas, três saídas e três avaliações. Consolidado: receita 2.100, ticket 525, NPS zero, ocupação 12/18 vagas-noite, cancelamento 1/6 e pagamentos 1.000. Dois déficits de vagas-noite não são compensados pela capacidade de outra data. Quatro recortes foram conferidos contra TypeScript e Python, sem derivar o resultado esperado das funções de produção.

Um custo de 50 na saída sem receita não tem base de rateio; fica apenas no consolidado. A definição existente foi explicitada, sem modificar o dataset original. Receita não duplica por participante; valores contratados, realizados e recebidos permanecem distintos; leads usam data do contato e reservas, data da viagem.

Referências preservadas: Ridge selecionado em H=3; MAE validação 2,5817; MAE final 2,5567; RMSE 2,7508; viés +1,3771; WAPE 38,35%. Ponderada com MAE final 2,1335, sem reseleção após o holdout. Cobertura exploratória 5/6; zero anomalias e 12 alertas. Nenhum modelo novo foi adicionado.

## UX, acessibilidade e performance

Resoluções: 1440×900, 1280×800, 1024×768, 834×1112, 390×844 e 360×800, nos dez módulos. Capturas antes/depois ficam em `artifacts/qa-baseline/` e `artifacts/qa-final/`. Foram verificados contraste, teclado, rótulos, foco, mensagens e dados consultáveis dos gráficos. Não se declara conformidade WCAG completa.

Cinco carregamentos de Demanda por variante no ambiente local: referência inicial com mediana de 1.014 ms para análise disponível, 126 ms para aplicar filtro e heap aproximado de 18,28 MB. A versão com tabelas auxiliares eager atingiu 22,12 MB. Montá-las somente ao abrir reduziu a mediana para aproximadamente 18,36 MB, cerca de 17% abaixo da versão eager. Abertura final: 992 ms; filtro: 146 ms. Não se reivindica ganho de latência: diferenças pequenas e ruído local não o sustentam.

Bundle principal: aproximadamente 394 kB, 124 kB gzip; gráficos compartilhados, 443 kB, 125 kB gzip. Módulos continuam lazy, tabelas paginadas e cache de previsão limitado a 32 recortes por snapshot. Não foi criada infraestrutura adicional.

## Testes e reprodução

87 Vitest, 27 Pytest/PostgreSQL, oito testes conectados e 25 Playwright de demonstração/QA, com uma dispensa intencional de captura duplicada. TypeScript, build, Ruff, formatação e auditoria npm aprovados. Falhas 401/403/409/422/503, offline, resposta inválida, CSV malformado, base vazia e histórico curto têm cobertura. No navegador, falhas de serviço são injetadas; a indisponibilidade do banco também é exercitada no backend.

```bash
npm ci
npm run data:validate
npm test
npm run typecheck
npm run build:demo
npm run test:e2e
# Preview em outro terminal:
npm run preview -- --port 4175 --strictPort
# Na raiz, com preview disponível:
npm run qa:audit
npm run delivery:data
python -m pip install -r scripts/requirements-delivery.txt
python scripts/build-academic-report.py
```

Integração: executar Pytest/Ruff e `backend/scripts/run_connected_tests.py --allow-reset-test-db` com ambiente Python e PostgreSQL exclusivo `_test`, conforme o README do backend. No PowerShell bloqueado, usar `npm.cmd` e o executável Python do ambiente. Não usar base operacional.

## Artefatos e limites

Arquivo único para submissão: `output/pdf/T4F-Performance-Projeto-Integrador-V-Entrega.pdf`, oito páginas A4. Capa com cinco integrantes, curso, instituição, empresa, URLs e data. Contém contexto, capturas reais, KPIs, previsão, inteligência, arquitetura e conclusão. TypeScript recalcula os dados; Python apenas compõe o documento. Oito páginas foram renderizadas/revisadas, com texto, links e contagem verificados.

`docs/roteiro-apresentacao-final.md` é apoio interno de sete minutos, com perguntas/respostas; não é segundo arquivo para a disciplina. A CI publica evidências demo, sem credenciais ou traces de sessões conectadas. Os verificadores não imprimem valores privados.

Detalhes: [matriz de aceitação](final-acceptance-checklist.md) e [publicação futura](deployment.md). API pública HTTPS, backups e homologação operacional permanecem pendências. A candidata não foi publicada; o Pages atual permanece na Etapa 01.
