# Release 05 · preparação e homologação

Fase A executada em **07/11/2026, America/Sao_Paulo**. Integração e publicação continuam sem autorização. Não houve merge nos PRs, alteração da `main`, transição de rascunho ou deployment da candidata. Os únicos merges ocorreram no clone local descartável, sem remotos, descrito abaixo.

**GO técnico — aguardando autorização.** Verificações locais e CI da candidata técnica aprovadas. Aprovações para merge e deploy permanecem **pendentes**.

## Auditoria do GitHub e versão preservada

Consultados os endpoints atuais do GitHub antes das alterações. Todos os PRs estavam abertos, em rascunho, `mergeable=true` e `mergeable_state=clean`, com bases corretas. Não havia commits posteriores à Entrega 04 nem mudanças inesperadas na `main`.

| Referência | SHA verificado | Base / CI anterior |
| --- | --- | --- |
| `main` | `5ea96abe019964e1d4e35104a60e5a48c3a172e5` | [run saudável 42392608918](https://github.com/Thiago-code-lab/Dashboards-Tour4Friends/actions/runs/42392608918), build e deploy aprovados |
| [PR #1](https://github.com/Thiago-code-lab/Dashboards-Tour4Friends/pull/1), backend | `4800c881869c3e1db2907db398ada56dbfa17a85` | `main`; [CI aprovada 42401046530](https://github.com/Thiago-code-lab/Dashboards-Tour4Friends/actions/runs/42401046530) |
| [PR #2](https://github.com/Thiago-code-lab/Dashboards-Tour4Friends/pull/2), Analytics | `170f3318a3c2b5c8068bab0f8de9d69b55552491` | backend; [CI aprovada 42412862183](https://github.com/Thiago-code-lab/Dashboards-Tour4Friends/actions/runs/42412862183) |
| [PR #3](https://github.com/Thiago-code-lab/Dashboards-Tour4Friends/pull/3), entrega 04 inicial | `6c8061566e526918b19b19b93f6671b0a1e65546` | Analytics; [CI aprovada 42422847729](https://github.com/Thiago-code-lab/Dashboards-Tour4Friends/actions/runs/42422847729) |
| Correções técnicas da Release 05 no PR #3 | `d91514ff92adf2f01a0acfb76090dbe6aafeb28f` | mesma base Analytics; [homologação aprovada 42433433917](https://github.com/Thiago-code-lab/Dashboards-Tour4Friends/actions/runs/42433433917), build e backend aprovados, deploy ignorado |

O commit `e29a9d6` teve uma CI antiga com falha, corrigida em `4800c88`; o status atual do PR #1 é aprovado. A consulta completa normalizada está em `artifacts/release-05/github-audit-initial.json`.

O deployment preservado é **7623980366**, concluído com sucesso em 07/11/2026 às **13:43:29 -03:00**, na [URL oficial](https://thiago-code-lab.github.io/Dashboards-Tour4Friends/). A consulta de 22:16:47 confirmou HTML, cinco referências de assets e JSON com HTTP 200, além do SHA saudável acima. Evidência: `artifacts/release-05/public-baseline.json`. O JSON publicado tem o mesmo SHA-256 da candidata. Esta consulta apenas verificou o site existente.

## Correções e limites da publicação

As alterações locais encontradas no início foram examinadas e consolidadas na própria `feature/final-quality-and-delivery-v1`, preservando o PR #3 e sua ancestralidade. Não foi necessário criar branch auxiliar.

- Upload do artefato Pages e job `deploy` exigem `github.event_name == 'push' && github.ref == 'refs/heads/main'`.
- `deploy` continua dependendo de `build` e `backend` aprovados; permissões de escrita Pages/OIDC ficam somente nele.
- `tests/workflow-contract.test.ts` interpreta o YAML real com chaves únicas e valida os cinco cenários abaixo, dependências, permissões e build demo. O parser YAML é dependência somente de desenvolvimento.
- Build da CI usa `build:demo`; revisão estática usa `actions/upload-artifact`, sem deployment, com retenção de 14 dias. Evidências/PDF têm retenção de sete dias.
- `release:check` valida HTML, assets, prefixos, JSON idêntico, contagens, fingerprint e hashes. O verificador de credenciais cobre arquivos rastreados, novos arquivos não ignorados, build e evidências demo sem imprimir valores privados.
- PDF passa a registrar SHA de origem, dataset, tamanho, páginas, links e hash. README, deployment e segurança foram alinhados ao comportamento manual somente de validação.
- Playwright inicia o preview diretamente pelo Node, evitando a diferença de execução de `npm.cmd` no Windows.

| Evento | Referência | Deploy |
| --- | --- | --- |
| Pull request | branch de trabalho / ref de PR | Não |
| `workflow_dispatch` | branch de trabalho | Não |
| `workflow_dispatch` | `refs/heads/main` | Não |
| `push` | branch de trabalho | Não; evento não inscrito |
| `push` | `refs/heads/main` | Somente após build e backend aprovados |

Os oito casos do contrato estão incluídos nos 95 testes unitários. Não foram disparados pushes em `main` ou deployments para testar a condição positiva.

## Reprodução e testes reais

| Verificação | Resultado e alcance |
| --- | --- |
| `npm ci` | Instalação aprovada pelo lockfile |
| `npm run data:validate` | Integridade, vínculos, contagens, KPIs e modelos aprovados |
| `npm test` | **95 aprovados**, oito arquivos; inclui contrato de workflow e referência independente de KPIs |
| `npm run typecheck` | Aprovado; também executado por `build:demo` |
| `npm run build:demo` | Aprovado, modo demo e URL API vazia |
| `npm run test:e2e` | **27 aprovados, uma dispensa intencional**, desktop/celular, saída zero |
| `npm run analytics:report` | Resultados calculados e reproduzidos, sem alterar modelos ou seed |
| Ruff do backend e scripts de release/PDF | Aprovado |
| Pytest / PostgreSQL real | **27 aprovados**; migração, idempotência, integridade, perfis, concorrência, transações, persistência, paridade Python/TypeScript |
| Testes conectados | **8 aprovados**, API real, PostgreSQL exclusivo, persistência e falhas de interface |
| `npm audit --audit-level=moderate` | **Zero vulnerabilidades** na consulta da Fase A |
| `scripts/check-artifacts.ts` | Credenciais/arquivos privados/build/evidências aprovados |
| `npm run release:check` | Pacote estático aprovado; manifesto com SHA-256 por asset |
| `npm run qa:audit` | **60 combinações**, dez módulos × seis resoluções, zero overflow de página, erros ou violações nas regras Axe executadas |
| Acessibilidade E2E | Axe em dez módulos desktop/celular, teclado/menu/foco, campos e dados consultáveis; não constitui certificação WCAG completa |
| Prettier e `git diff --check` | Aprovados nos arquivos alterados pertinentes |
| Relatório acadêmico | Exportação recalculada, geração, A4, oito páginas, capa, links e revisão visual de todas as páginas |

PostgreSQL local criado exclusivamente para esta execução: cluster `.tools/pg-release05-v2`, `127.0.0.1:55435`, banco **`t4f_release05_test`**, senha efêmera não impressa. `DATABASE_URL` e `TEST_DATABASE_URL` foram fornecidas apenas aos processos de teste. Nenhuma configuração em `backend/.env` ou base existente foi modificada. Cluster encerrado ao final; logs e resultados em `artifacts/release-05/backend-*.log` e `backend-results.json`. A CI reproduz a mesma separação com container PostgreSQL 18 descartável.

Houve bloqueio inicial de rede e de inicialização/encerramento de processos no sandbox Windows. Auditoria npm, instalação das bibliotecas PDF, PostgreSQL e o encerramento completo do Playwright foram repetidos com a execução permitida pelo ambiente. O primeiro cluster, que não chegou a iniciar, foi preservado para diagnóstico. Nenhuma verificação foi retirada. Pytest emitiu um aviso de permissão no cache local, sem falha funcional; a CI serve como segunda execução independente. Rollup avisou sobre comentários de anotação da dependência Zod e os removeu do bundle, sem erro de build.

## Seed, indicadores e modelos

Gerador executado novamente e `git diff --exit-code -- public/data/demo.json` aprovado, inclusive no clone integrado. O mesmo blob Git aparece em `main`, backend, Analytics e candidata: **`c9c7468169bb0b436faa500817d952b78275c3a3`**.

- SHA-256 do JSON: **`b9362c92d4e8702eb685a532ee55dd7d9f21e2840ed10f652bad65e25fff237e`**.
- Fingerprint completo: **`08a268303d7eb582-242655`**.
- 116 clientes, 164 reservas, 258 leads, seis roteiros, 52 saídas, 12 hospedagens, 72 avaliações, 609 alocações, 156 custos e 147 pagamentos.
- No filtro padrão há 160 reservas selecionadas, 143 confirmadas, 213 participações confirmadas e 188 atendidas. A diferença entre 164 registros totais e 160 no período é de escopo, sem exclusão de dados.

| Indicador no filtro padrão | Resultado |
| --- | --- |
| Receita realizada | R$ 1.618.600,00 |
| Receita contratada | R$ 1.838.900,00, inclui R$ 220.300,00 futuros |
| Ticket por reserva confirmada | R$ 12.859,44 |
| NPS | 43,0556; 72 respostas |
| Ocupação agregada | 42,9523% nos mesmos slots |
| Cancelamento | 10% no recorte |
| Custos | R$ 1.301.456,00 |
| Contribuição / margem gerencial | R$ 537.444,00 / 29,2264% |
| Recebido | R$ 1.706.720,00 |

Paridade independente de quatro recortes Python/TypeScript preservada. Custos sem base de rateio permanecem apenas no consolidado, conforme definição anterior; vagas em datas diferentes não se compensam.

| Modelo / validação | Resultado reproduzido |
| --- | --- |
| Seleção anterior ao holdout | Ridge temporal, 34 meses, H=3, 14 origens e 42 erros |
| MAE validação Ridge H=3 | **2,5817044738013415** |
| MAE final Ridge | **2,5566699870100056** |
| RMSE final Ridge | **2,750766255921746** |
| Menor MAE no holdout final | Média ponderada: **2,1334876543209873**, sem reseleção pelo teste |
| Faixas | Exploratórias, 5/6 pontos finais contidos; nenhuma promessa de cobertura |
| Anomalias estatísticas | **Zero** |
| Alertas operacionais | **12** |

Não houve alteração de fórmula, modelo, seed ou valores esperados para recuperar resultados. Saídas calculadas em `artifacts/analytics-results.json` e `artifacts/qa-final/report-data.json`.

## Pacote e prévia local

`dist/` contém 22 arquivos: HTML, CSS, JavaScript em chunks, favicon e `data/demo.json`. As referências do HTML foram resolvidas no prefixo `/Dashboards-Tour4Friends/`; JSON em `dist` é idêntico ao versionado. `HashRouter`, cálculos/previsões no navegador e navegação sem login foram preservados. Manifesto completo: `artifacts/release-05/static-package.json`.

Preview de produção local: **http://127.0.0.1:4175/Dashboards-Tour4Friends/**. Para recriar: `npm run build:demo` e `npm run preview -- --port 4175 --strictPort`. A prévia não é pública.

Os dez módulos foram percorridos e recarregados com `/#/`: Visão Geral, Demanda, Reservas, Roteiros, Hospedagens, Operações, Experiência, Financeiro, Relatório e Metodologia. Fluxos cobrem filtros, busca, ordenação, paginação, CSV, importação inválida, previsão/backtesting, laboratório estatístico, simulador, revisão de alertas e impressão/PDF. Estados vazios e histórico curto permanecem tratados.

`release.spec.ts` bloqueia `/api/` e toda origem externa durante a navegação. Em cada projeto, desktop e celular: **dez módulos, dez recargas, 133 requisições estáticas, zero tentativas à API/origem externa, zero falhas e zero erros de página**. Evidências: `artifacts/release-05/network-desktop.json` e `network-mobile.json`.

Capturas completas desktop/celular dos sete assuntos solicitados: `artifacts/release-05/{desktop,mobile}-{overview,demanda,laboratorio,reservas,hospedagens,operacoes,relatorios}.png`. Foram inspecionadas visualmente. A varredura adicional guarda as 60 telas em `artifacts/qa-final/`. Resoluções: 1440×900, 1280×800, 1024×768, 834×1112, 390×844 e 360×800. As pranchas `review-*.png` são recortes auxiliares; os arquivos originais completos foram preservados.

## PDF final preservado

Arquivo local: **`output/pdf/T4F-Performance-Projeto-Integrador-V-Entrega.pdf`**.

| Campo | Valor |
| --- | --- |
| Origem do código / capturas | `d91514ff92adf2f01a0acfb76090dbe6aafeb28f` |
| Gerado | **07/11/2026 às 22:14:01 -03:00** (`2026-11-08T01:14:01.930987+00:00`) |
| Tamanho | **143.085 bytes** |
| Páginas | **8, A4** |
| SHA-256 | **`ef4cb4cedec3b2bf6db513c87655ef16e5e409dc834cdb9095a78d2c631d4cf0`** |
| Manifesto | `output/pdf/T4F-Performance-Projeto-Integrador-V-Entrega.manifest.json` |

Todas as oito páginas foram renderizadas com PDFium e inspecionadas individualmente em `artifacts/release-05/pdf-pages/page-1.png` até `page-8.png`. Conferidos: cinco integrantes na capa, Fatec Ipiranga, Projeto Integrador V, Big Data para Negócios, Tour4Friends, identificação de dados sintéticos, capturas atuais, indicadores recalculados, modelos/validação temporal, arquitetura, conclusões e limitações. Não foram encontrados cortes, sobreposições ou glifos corrompidos. Quatro anotações de links HTTPS, com três destinos distintos; todos retornaram HTTP 200.

**Baixar/copiar o PDF e seu manifesto e guardá-los em armazenamento durável do responsável.** A cópia está no workspace; não foi oferecida como download público. A CI gera outra cópia com seu próprio SHA de origem e horário; seu hash pode diferir. O hash acima identifica exclusivamente esta cópia local revisada, cuja origem é o commit técnico. O commit documental posterior não modifica aplicação, gerador, dados ou capturas.

## Ensaio da integração

Clone novo `.tools/release05-integration`, criado sem hardlinks e com `origin` removido antes dos merges. Ancestralidade confirmada por `git merge-base --is-ancestor`. Estratégia: três commits locais **`--no-ff`**, preservando os pais, sem squash/rebase e sem push.

| Etapa simulada | Base original | Commit local resultante |
| --- | --- | --- |
| PR #3 → Analytics | `170f3318a3c2b5c8068bab0f8de9d69b55552491` | `dd812fa21993f3e4f2dd0a8e7975a3604e979af6` |
| PR #2 consolidado → backend | `4800c881869c3e1db2907db398ada56dbfa17a85` | `ff2d1c39072d7bfb772f8dfd04c5072cafc1430f` |
| PR #1 consolidado → main do clone | `5ea96abe019964e1d4e35104a60e5a48c3a172e5` | `2a945fdcd44f61bfe8f161a9cc30e89d2d3a138b` |

Entrada candidata: `d91514ff92adf2f01a0acfb76090dbe6aafeb28f`. Árvore candidata e integrada: **`4c99e75ba8de8633cb7fb6ec76da83c66bfd77c8`**, idênticas. **Zero conflitos, diferenças inesperadas ou alterações da seed**. Repetidos no clone: geração/diff da seed, `npm ci`, validação de dados, 95 testes, `build:demo` com typecheck e `release:check`; todos com saída zero. Backend/browser foram testados no workspace com o mesmo conteúdo da aplicação. Evidência integral: `artifacts/release-05/integration-rehearsal.json`.

Comparação da candidata técnica com `main`: **145 arquivos, 13.527 inserções e 1.038 remoções**. O diff reúne backend/PostgreSQL, Analytics, QA e proteções da release. JSON e gerador da seed preservados. O commit posterior de readiness acrescenta documentação. Os commits locais do ensaio são descartáveis e não constituem a autorização nem os SHAs da futura integração real.

Reprodução: executar `scripts/rehearse-release.py` com os SHAs completos registrados, `--destination` apontando para um diretório novo dentro de `.tools` e `--verify`. O script recusa destino existente/fora de `.tools`, valida ancestralidade, remove o remoto e verifica a igualdade da árvore final.

## Rollback preparado, sem execução

Estado saudável conhecido: `main=5ea96abe019964e1d4e35104a60e5a48c3a172e5`; run **42392608918**; deployment **7623980366**; URL e evidência HTTP acima. Preservar esta referência, o PDF/manifesto e os diretórios de evidência antes de qualquer publicação.

Depois de autorização e imediatamente antes da Fase B, consultar novamente PRs, refs, CI e deployment. Registrar o SHA efetivo do merge final em `main`, seus pais e o run de publicação. Se qualquer entrada tiver mudado, repetir a análise de integração antes de prosseguir.

Se a publicação autorizada falhar:

1. Registrar run, SHA publicado e sintomas; confirmar se o primeiro pai do merge de release é o SHA saudável registrado. Se houver alterações posteriores em `main`, analisar os deltas antes de preparar reversão.
2. Criar branch de rollback a partir de `origin/main`, em checkout isolado. Preparar **`git revert -m 1` do SHA de merge efetivamente registrado na Fase B**, preservando o histórico. Não executar reset remoto nem force push.
3. Comparar a árvore resultante com `5ea96ab` e justificar diferenças documentais ou posteriores. A seed deve permanecer idêntica. Reproduzir build demo, segurança e testes da reversão e abrir PR para revisão.
4. Obter autorização explícita para integrar/publicar a reversão. Somente então o push resultante em `main` poderá passar pela CI e pelo deploy normal.
5. Confirmar o novo deployment, SHA, HTTP/JSON/assets e rotas públicas. Guardar evidências e comunicar o resultado observado.

Rollback do site estático **não exclui bancos, volumes ou dados**, nem desfaz migrações existentes. Não se executou nenhum procedimento de rollback nesta fase. A API HTTPS continua fora de escopo; não foram criados serviços pagos ou outro domínio.

## Checklist GO / NO-GO

| Verificação | Resultado |
| --- | --- |
| PR #1 íntegro | Verificado |
| PR #2 íntegro | Verificado |
| PR #3 íntegro | Verificado, continua em rascunho e baseado em Analytics |
| Workflow protegido | Verificado com teste de contrato |
| Seed preservada | Verificado |
| Testes frontend | Verificado: 95 unitários, typecheck e 27 E2E |
| Testes backend | Verificado: Ruff e 27 Pytest |
| Testes conectados | Verificado: oito testes |
| Analytics reproduzível | Verificado |
| Build demo | Verificado |
| Dez módulos | Verificado em desktop/celular e seis resoluções |
| PDF acadêmico | Verificado estrutural e visualmente, oito páginas |
| Links do relatório | Verificado: quatro links, três destinos HTTP 200 |
| Rollback planejado | Verificado; não executado |
| CI da candidata técnica | Verificado: run 42433433917 aprovado, upload Pages e deploy ignorados; artefato de revisão enviado |
| Aprovação para merge | **Pendente** |
| Aprovação para deploy | **Pendente** |

A Fase B permanece suspensa até autorização explícita do proprietário para integrar os três PRs e publicar a versão completa no GitHub Pages. CI verde não substitui essa autorização. Não criar `release-05-published.md` como publicação concluída antes de verificar um deployment real autorizado.
