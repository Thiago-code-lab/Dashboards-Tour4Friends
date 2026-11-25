# Implementação 01 — catálogo comercial e orçamento preliminar

Evolução posterior: a [Implementação 02](roteiros-documentais-02.md) conferiu quatro PDFs operacionais em outro checkout local e adicionou suas sequências. As pendências abaixo descrevem o estado da entrega 01; consulte a entrega 02 para o inventário atualizado de fontes.

O módulo **Catálogo e orçamento**, em `/#/catalogo`, mantém React/TypeScript e a arquitetura existente. Não altera FastAPI, migrations, contratos, categorias históricas ou o snapshot sintético em BRL. O catálogo documental é um pequeno módulo estático carregado sob demanda; o rascunho é local à página, sem gravar custos na base histórica. Funciona na demonstração e, após login, no laboratório.

## Fonte e vigência

Origem efetivamente acessível: texto do anexo **CODEX — T4F Performance | Implementação 01**, registrado em **14/11/2026**, que transcreve a tabela `Valores_Roteiros_Autoguiados_2027.pdf`. O PDF original não foi localizado no checkout; os valores não foram conferidos diretamente nele. Referência comercial: **2027**, caminhada autoguiada, preços **por pessoa em EUR**, para início em **maio, junho, setembro e outubro**. A data de registro não representa a data de emissão do documento.

| Partida | Superior individual | Superior duplo | Standard individual | Standard duplo |
| --- | ---: | ---: | ---: | ---: |
| SJPP | 7400 | 5400 | 5410 | 3980 |
| Astorga | 3290 | 2390 | 2440 | 1780 |
| Sarria | 1980 | 1450 | 1530 | 1100 |
| Tui/Valença | 2070 | 1510 | 1580 | 1140 |
| Porto Central | 3130 | 2250 | 2280 | 1640 |
| Porto Costa | 3250 | 2340 | 2390 | 1730 |

Lisboa permanece como partida autorizada sem tarifa. Econômico permanece como categoria comercial sem tarifa. As opções sem preço e datas fora da vigência mostram **Preço não informado** e bloqueiam a exportação. Não há interpolação, conversão BRL/EUR ou uso de pacotes de bicicleta. A etiqueta original **Tui/Valença/Baiona** é preservada no modelo e explicada na interface; Baiona não se torna uma partida adicional. Porto Central e Porto Costa têm IDs, variantes e preços independentes.

## Modelo e cálculo

- `src/lib/commercial/catalog.ts`: sete partidas autorizadas, modalidade caminhada autoguiada, tarifas por categoria/ocupação, metadados de origem e contrato Zod para futuras sugestões de hospedagem.
- `src/lib/commercial/quote.ts`: seleção validada, dinheiro em centavos inteiros, soma de custos manuais e resultado parcial. Sem dependências novas.
- `src/pages/Commercial.tsx`: consulta de tarifas, formulário responsivo, adição/remoção de custos, confirmação explícita de completude e CSV preliminar usando o exportador existente com proteção de fórmulas.

Venda total = tarifa por pessoa × pessoas (inteiro de 1 a 100). Ocupação dupla aplica a tarifa por pessoa em quarto compartilhado; não multiplica automaticamente por dois. A quantidade é explícita. Não há alocação de quartos ou confirmação de acomodação.

Custos são totais **do grupo**, em EUR, para todas as noites do item identificado por cidade e etapa. Aceitam ponto ou vírgula decimal e até duas casas, sem separador de milhar. Valores negativos, vazios, não finitos e precisão adicional são rejeitados. Zero só conta se explicitamente informado. Até 200 itens; cidade e etapa até 120 caracteres.

O resultado aparece apenas quando existe tarifa, a seleção é válida, há pelo menos um custo identificado e o usuário confirma que todos os custos de hospedagem foram registrados. Alterar a seleção ou custos invalida essa confirmação; trocar caminho/partida limpa os custos para evitar reaproveitar outro percurso.

**Resultado parcial = venda total − hospedagens informadas. Percentual = resultado parcial / venda total × 100.** Valores negativos são preservados. Outros custos diretos e despesas podem faltar, portanto não se trata de lucro apurado. Sem dados completos, exibe **Orçamento incompleto**. Toda exportação é **preliminar e demonstrativa**, sem emissão definitiva ou reserva.

O CSV inclui seleção, fonte, vigência, moeda, resultado em centavos de EUR e linhas de custos manuais na unidade digitada (euros), identificadas por tipo e unidade. Sair da página ou recarregar descarta o rascunho. Os filtros globais históricos não afetam o módulo comercial.

## Hospedagens e pendências documentais

O contrato de sugestões prevê roteiro, cidade, etapa, categoria, nome, documento de origem, data de referência da fonte e status obrigatório **Sugestão de referência — não verificada**. A coleção está vazia porque as planilhas não foram fornecidas. Não há hotéis inventados, parceria, capacidade, preço automático ou disponibilidade presumida. Os custos manuais não criam sugestões de hotéis.

| Material pendente | Consequência e decisão necessária |
| --- | --- |
| `Projeto_Integrador_5_-_2026_2 1.docx`, versão 2.2 | Referência acadêmica principal indisponível; grupo deve revisar aderência antes da aprovação. |
| `T4F.txt` e `basic promt.txt` | Conferir contexto complementar quando disponibilizado. |
| PDF comercial original 2027 | Conferir transcrição, vigência e etiqueta Tui/Valença/Baiona. |
| PDFs operacionais | Etapas, dias e distâncias não preenchidos; comparar separadamente ao pacote comercial. |
| Planilhas de etapas Francês e Português | Importações pendentes; exigir fonte/data e status não verificado. |

Não é possível enumerar divergências numéricas sem os documentos. O campo `operationalSource: null` registra a ausência; não se adaptaram percursos sintéticos aos pacotes comerciais. Quando os documentos chegarem, registrar lado a lado valor operacional, fonte/página, valor comercial, fonte/página e decisão do grupo, sem corrigir automaticamente dias ou quilometragem.

## Validação e revisão

Testes específicos em `tests/commercial.test.ts` cobrem as 24 tarifas documentadas, variantes, categorias, ocupações, vigência, ausência de preço, EUR, centavos, totais, percentuais, custo zero, resultado negativo e entradas inválidas. `tests/e2e/commercial.spec.ts` verifica o fluxo e o conteúdo do CSV, bloqueios, ausência de overflow e acessibilidade automatizada em desktop e celular. Os testes históricos são preservados.

Comandos: `npm test`, `npm run data:validate`, `npm run typecheck`, `npm run build`, `npm run test:e2e`; regressão do backend com `python -m pytest -q` em `backend`, usando somente o banco descartável de teste já configurado.

Branch: `feature/catalogo-orcamento-2027`. Revisão por Pull Request para `main`, sem merge ou publicação automática nesta entrega.

Validação local em 14/11/2026: 136 testes Vitest (41 comerciais novos), validação do snapshot histórico, typecheck e build aprovados; Ruff, 27 Pytest e oito testes conectados aprovados em PostgreSQL temporário exclusivo na porta 55436, encerrado após a execução. Credenciais/configuração do laboratório preservadas. Evidências locais do backend em `artifacts/commercial01/`, sem versionar credenciais ou binários. Pytest emitiu aviso de permissão no cache local; os testes passaram.

Suíte completa Playwright: **29 aprovados e uma dispensa já existente** (captura analítica duplicada no celular). Inclui os dez dashboards históricos e o novo módulo, com CSV, acessibilidade automatizada e ausência de overflow em desktop/celular. Capturas do módulo foram inspecionadas visualmente em `artifacts/desktop-commercial.png` e `artifacts/mobile-commercial.png`. Formatação Prettier dos arquivos novos e `git diff --check` aprovados.
