# Revalidação da entrega P2

Execução em 24/11/2026, America/Sao_Paulo, sobre a entrega já existente na branch `feature/p2-visualizacao-2026`. O [PR #9](https://github.com/Thiago-code-lab/Dashboards-Tour4Friends/pull/9) continua em rascunho, com base no #8. A [consulta dos PRs #4–#9](evidencias/revisao-prs.json) confirma que permanecem abertos e sem merge. Não foi criado um PR duplicado. O checkout original com WIP de hospedagens e a `main` foram preservados.

## Correção identificada

Na primeira tentativa, o Python global não tinha `argon2-cffi`. A suíte relacional encerrou com erro de dependência; o PostgreSQL temporário foi encerrado, mas o runner conservou `results.json` de uma execução anterior bem-sucedida. Esse arquivo antigo não comprovava o resultado da nova tentativa.

O runner agora substitui a evidência por `running` antes de verificar dependências ou criar o cluster. Registra cada suíte como `not_run`, `running`, `passed` ou `failed`, grava o resultado por substituição atômica e registra falha/interrupção. Confere o estado do PostgreSQL antes de confirmar seu encerramento. Uma falha de encerramento não pode produzir status geral de sucesso. Cinco testes sem banco cobrem essas transições; a CI executa esses testes antes do laboratório.

As dependências declaradas foram instaladas em `.venv` local ignorada pelo Git. A repetição em PostgreSQL 18 novo passou: 27 Pytest e oito testes de navegador conectados. O [manifesto](evidencias/laboratorio.json) registra `status: passed`, todas as suítes aprovadas e `stopped: true`. Nenhum `.env` ou banco existente foi alterado. A tentativa inicial malsucedida não é contada como validação aprovada.

## Verificações repetidas

| Verificação | Resultado |
| --- | --- |
| Vitest | 184 testes aprovados; contrato do workflow novamente conferido após sua edição |
| Build demo e TypeScript | Aprovados; avisos de anotações de terceiros em Zod sem falha de build |
| Dados e métricas P2 | Validação aprovada; métricas reproduzidas sem diferença e dataset preservado |
| Runner | Cinco testes de regressão aprovados; Ruff aprovado |
| FastAPI/PostgreSQL | 27 Pytest e oito conectados; leitura, filtros, gravação e persistência em nova sessão |
| Navegador desktop/celular | 39 aprovados e uma dispensa móvel preexistente da captura duplicada |
| Interface | 60 telas em seis resoluções; sem overflow, erros de console ou violações nas regras axe executadas |
| Dependências Python | `pip check` aprovado no ambiente isolado |
| Documentos | Links locais, métricas e PDF de 12 páginas conferidos; capturas existentes representam o mesmo frontend |

Fontes: [resumo](evidencias/verificacao.json), [interface](evidencias/auditoria-interface.json), [Pytest](evidencias/laboratorio-pytest.txt), [conectados](evidencias/laboratorio-conectado.txt), [métricas](evidencias/metricas.json). As medições locais de Demanda foram de 1.179 a 1.280 ms para ficar pronta e 259 a 387 ms para aplicar filtro; houve outras suítes concorrentes. Não se infere melhora ou regressão de desempenho em produção.

## Publicação e dependências externas

A [nova leitura do site público](evidencias/publicado-revalidacao.json) retornou HTTP 200, sem catálogo e com os KPIs anteriores. O site continua separado da candidata P2. A CI anterior do PR #9 terminou com sucesso; isso não equivale a deployment. Não houve merge, deploy, force push, API pública ou contratação de serviço.

Na conclusão desta revalidação técnica, o DOCX ainda não havia sido indicado. Posteriormente, o solicitante forneceu `D:/Downloads/P2_VD2026.docx` e a [correspondência aos seis entregáveis](aderencia-requisitos-oficiais.md) foi concluída: itens 1–5 atendidos no escopo demonstrativo/laboratório; item 6 pendente de feedback real e ajustes decorrentes. O relatório foi ampliado para 13 páginas para incluir essa conferência. Nenhuma resposta, reunião ou aprovação foi criada. A [matriz](checklist-entrega.md) mantém esses limites explícitos.

## Nova execução de 25/11/2026

A implementação já estava pronta no commit `2101183` e no PR #9 em rascunho. A [nova auditoria dos PRs #4–#9](evidencias/revisao-prs-2026-11-25.json) confirma que as bases e os estados permanecem iguais, sem merge. Foram preservados o checkout original com suas alterações de hospedagens, a `main` e o repositório independente de portfólio. Não foi criado outro PR para a mesma entrega.

As verificações foram repetidas sobre esse código: 184 Vitest, cinco regressões do runner, build demo/TypeScript, validação do dataset, reprodução das métricas, 27 Pytest e oito testes conectados em cluster PostgreSQL 18 exclusivo. O laboratório registrou todas as suítes aprovadas e `stopped: true`. Os 39 testes estáticos de navegador passaram em desktop/celular, com a dispensa preexistente da captura duplicada no mobile. Os fluxos cobrem dez capítulos, persistência dos filtros, vazio/erro, gráficos, importação, exportação, impressão e navegação sem API.

A auditoria atual de 60 telas não encontrou overflow, erros de console ou violações nas regras axe executadas. Foram inspecionadas as capturas atuais de visão geral em desktop e celular. As onze imagens ilustrativas versionadas continuam válidas para o mesmo frontend; a rodada não altera componentes. Cinco medições locais de Demanda retornaram 1.076–1.140 ms para ficar pronta e 183–229 ms para aplicar o filtro. Houve suítes concorrentes; não se trata de benchmark de produção ou comparação controlada com a rodada anterior.

Também passaram Ruff, Prettier nos arquivos TypeScript da P2, `pip check`, verificação de credenciais e `release:check`; `npm audit --audit-level=moderate` retornou zero vulnerabilidades. O hash do dataset e as métricas reproduzidas permanecem iguais; o DOCX original conserva o SHA-256 registrado. A [consulta pública atual](evidencias/publicado-revalidacao.json) retornou HTTP 200, KPIs anteriores e ausência de catálogo. Nenhum merge, deploy ou serviço externo foi criado.

Esta rodada atualiza documentação, logs e manifestos de evidência e regenera o relatório de 13 páginas com a data da verificação atual. O entregável 6 continua pendente de feedback real e ajustes decorrentes. Não foram inventadas avaliações ou aprovações.

As 13 páginas do PDF atualizado foram renderizadas e inspecionadas, sem cortes ou sobreposições; o texto é extraível e permanece nos limites das páginas. Todos os links locais do pacote e os vinte critérios transcritos foram conferidos contra seus destinos e o DOCX original, respectivamente. A [evidência documental](evidencias/documentacao-2026-11-25.json) registra essas verificações; o [manifesto do PDF](evidencias/relatorio.json) contém o hash do arquivo entregue.
