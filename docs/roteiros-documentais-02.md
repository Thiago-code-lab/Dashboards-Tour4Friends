# Implementação 02 — etapas e roteiros documentais

Base: commit `3af88df` da Implementação 01 (PR #4). Branch: `feature/roteiros-documentais-02`. O PR #4 ainda estava aberto ao iniciar este trabalho; esta branch contém seu commit integralmente, sem merge na main. A revisão deve ser encadeada à branch do PR #4 enquanto ele estiver aberto.

## Fontes efetivamente conferidas

As cópias locais foram encontradas em outro checkout, na pasta `D:\Códigos\tour4friends-datalake\tour4friends-datalake\Tour4friends-context\Caminho Santiago a Pé\Roteiros`. Nenhum arquivo desse repositório foi alterado. Cada PDF tem uma página; texto e renderização integral foram conferidos em **14/11/2026**. A data de emissão não está informada no conteúdo. O prefixo **Cópia de** dos arquivos locais foi preservado. Os arquivos não foram republicados nem incluídos como binários neste projeto.

| Percurso | Arquivo local, página 1 | Dias do pacote | Etapas de caminhada | Total da tabela / soma |
| --- | --- | ---: | ---: | ---: |
| Astorga | `Cópia de ROT FRAAstorga 12E_0P_18D.pdf` | 18 | 12 | 257,6 km |
| Sarria | `Cópia de ROT FRASarria 5E_0P_11D.pdf` | 11 | 5 | 114,4 km |
| Porto Central | `Cópia de ROT CENPorto 12E_0P_18D.pdf` | 18 | 12 | 231,4 km |
| Porto Costa | `Cópia de ROT COSPorto 12E_0P_18D.pdf` | 18 | 12 | 256,2 km |

Identificação reproduzível das cópias (SHA-256):

| Percurso | SHA-256 |
| --- | --- |
| Astorga | `630a1c478cace02a67329d426a06151c110b36f20c3db1045a6eda3bcb03d28d` |
| Sarria | `344005df5c8edfd8f2e3a72004f000d86bb059bfa3a7a8a15e71d33c276bd134` |
| Porto Central | `8835db9ca39de86f410d83b6a6e3bced03da46504baa843e57d209f884b6cc9d` |
| Porto Costa | `381ec740cb2c8e41963906fba43e96e540edfb7fad7ac484c7dcb788afac619a` |

## Modelo e apresentação

`src/lib/commercial/operational.ts` define schemas Zod e tipos para fonte, dia operacional, percurso documentado/pendente, totalizações e comparação documental. `operational-data.ts` contém a transcrição vinculada aos IDs comerciais existentes. `src/components/operational-route.tsx` apresenta os dados em **Catálogo e orçamento**, abaixo do orçamento, acompanhando a mesma partida selecionada. O componente reutiliza `Panel`, `DataTable` e `Empty`, sem novo seletor ou estado comercial paralelo.

O campo legado `CommercialRoute.operationalSource` do PR #4 permanece intacto por compatibilidade; o registro documental tem fonte própria e vínculo por `routeId`, sem acoplar informações operacionais à tabela de preços.

Cada registro possui ordem, dia do pacote, atividades, número de etapa de caminhada quando aplicável, cidade inicial/final, distância em km quando documentada, descrição e referência de página/linha. Cidades de hospedagem são copiadas da coluna **Hospedagem**. Todos os nomes de hotel permanecem nulos porque as colunas **Hotel/Pousada/Hostel** estão vazias ou com traço. Grafias e alternativas da fonte, como `Vega Valcarcer`, `Povoa do Varzin`, `Esposente`, `Tui | Valença` e `Madrid | Porto`, foram preservadas.

Uma linha pode conter várias atividades: **transporte + passeio** não vira etapa de caminhada. `FreeWalkingTour Santiago` é passeio urbano e não entra no total de etapas/distâncias do Caminho. Os dias de chegada, preparação, retorno e encerramento também são separados. O dia 2 de Porto Central (`Dia Porto`) e de Porto Costa (`T`, descrição `Porto`) permanecem com atividade não detalhada. `Fim Roteiro` nos PDFs espanhóis não foi convertido em viagem de retorno inventada. Origem/fim não explicitados em passeios ficam nulos, mesmo quando a cidade de hospedagem está indicada.

Os schemas rejeitam dias/ordem repetidos ou fora de sequência, etapas descontínuas, caminhada sem cidades, transporte com número de etapa, distâncias negativas e referências ausentes. Totais somam apenas as distâncias das linhas de caminhada, em metros inteiros antes da conversão a km. Distância desconhecida mantém o total incompleto; percurso pendente retorna totais nulos, nunca zero. Duração declarada na fonte e duração calculada da sequência permanecem separadas para detectar inconsistências.

A tabela inicia ordenada pela sequência e mantém a paginação existente de dez linhas; **Próxima** permite consultar os demais dias do pacote. É possível ordenar pelas demais colunas e voltar a **Ordem**. Todos os dias possuem referência à página 1 e à linha do documento.

## Comparação e decisões pendentes

| Tema | Evidência / limitação | Tratamento |
| --- | --- | --- |
| Tabelas operacionais | As quatro somas de etapas conferem com os totais declarados nas tabelas. | Preservar tabela e soma separadas; nenhuma correção automática. |
| Perfil Porto Costa | Na mesma página, tabela = **256,2 km**, perfil ilustrado Porto–Santiago = **261,9 km**. | Divergência interna exibida no módulo; o grupo deve decidir qual referência utilizar para cada finalidade. A soma utiliza a tabela, sem apagar o perfil. |
| Perfis de Astorga/Sarria | Ilustração abrange o Caminho Francês completo, além do recorte das etapas cadastradas. | Não utilizar a extensão do perfil como distância do pacote. |
| Perfil Porto Central | Ilustração inclui Lisboa, enquanto a tabela começa no Porto. | Registrar abrangências distintas; não forçar equivalência. |
| Tabela comercial 2027 | O PDF original não foi localizado. A transcrição do PR #4 contém preços, sem duração, número de etapas ou quilometragem comercial. | Os três campos comerciais ficam nulos e a comparação fica **pendente**, sem afirmar concordância ou divergência numérica entre fontes inacessíveis. |
| Porto Costa, dia 17 | `Translado Madrid | Porto`, hospedagem `Madrid | Porto`. | Preservar alternativas textuais; não escolher um destino nem afirmar reserva. |

A comparação preparada recebe métricas comerciais com a respectiva fonte e registra discrepâncias de duração, etapas ou km sem alterar os dados de entrada. Os testes usam referências explicitamente fictícias de teste para verificar essa lógica; elas não fazem parte do catálogo apresentado ao usuário.

## Cadastros e importações pendentes

Foram pesquisados o checkout atual, os anexos locais do Codex, Downloads/Documents e nomes correspondentes nos checkouts de `D:\Códigos`. Os seguintes materiais não foram localizados:

- `Caminho_Frances_Etapas_SJPP_Hoteis.xlsx`: cadastro de SJPP e sugestões de hotéis pendentes.
- `caminho portugues etapas desde Lisboa e exemplo de hoteis (1).xlsx`: cadastro de Lisboa e sugestões de hotéis pendentes.
- `Valores_Roteiros_Autoguiados_2027.pdf`: comparação comercial e conferência direta das tarifas pendentes. O PDF de valores **2026** encontrado no acervo não foi utilizado como substituto.

Tui/Valença permanece pendente de fonte operacional selecionada/conferida para esta entrega; não foi extraída uma sequência a partir de Porto Central ou Porto Costa. Outros PDFs de variantes no acervo não substituíram as planilhas e versões solicitadas. A existência de arquivos com nomes próximos não comprova equivalência entre percursos/pacotes.

Cada dia já comporta `accommodationSuggestions`, usando o schema de sugestões do PR #4 com categoria, documento, data de referência e status obrigatório **Sugestão de referência — não verificada**. As listas continuam vazias. Cidade prevista para pernoite não constitui hotel cadastrado, preço, parceria, reserva ou disponibilidade real.

## Preservação e validação

O cálculo, os preços e a exportação comercial do PR #4 foram preservados; o formulário recebeu apenas a inclusão do componente de percurso. Não foram alterados `quote.ts`, tarifas, contratos FastAPI, migrations, dataset sintético em BRL, indicadores ou dashboards históricos. Não há coordenadas, mapas, scraping, consulta de hotéis, APIs externas ou previsão nova. Nenhuma dependência foi adicionada à aplicação. Ferramentas Python de leitura/renderização dos PDFs foram instaladas apenas no ambiente local ignorado `.tools/audit-venv`.

Testes novos em `tests/operational.test.ts` cobrem ordenação, totalizações conhecidas, tipos de dias, passeios com transporte, ausência de fontes/distâncias, metadados, hotel ausente, variantes e comparação sem mutação. `tests/e2e/operational.spec.ts` verifica seleção, sequência, paginação, cadastro pendente, vínculo à partida do orçamento e ausência de overflow em desktop e celular. Os testes comerciais anteriores permanecem ativos.

Comandos de validação: `npm test`, `npm run typecheck`, `npm run build`, `npm run data:validate` e `npm run test:e2e`. Evidências e capturas ficam em `artifacts/`, sem versionar arquivos temporários ou dados sensíveis.

Validação local em 14/11/2026: **157 testes Vitest aprovados**, incluindo 21 novos testes documentais; typecheck, build, validação do dataset e formatação dos arquivos TypeScript aprovados. A inspeção visual das capturas desktop/celular confirmou a tabela com rolagem interna, sem overflow da página. O build emite avisos de anotações de comentários da dependência Zod, sem falha de compilação.

Suíte Playwright completa: **31 aprovados e uma dispensa móvel preexistente**, com `npm run test:e2e -- --reporter=list --output=artifacts/operational02/e2e-results`. O preview precisou ser encerrado manualmente após a execução dos testes; o executor concluiu com código zero. FastAPI/PostgreSQL: **27 testes Pytest aprovados** em cluster temporário isolado; Ruff aprovado. Houve um aviso de permissão para gravar cache do Pytest, sem impacto nos testes. O banco e o `.env` do laboratório existente não foram alterados.

Suíte conectada: **oito testes aprovados**, com `python backend/scripts/run_connected_tests.py --allow-reset-test-db` e URLs de teste fornecidas somente ao processo pelo ambiente. A primeira execução, concorrente com a suíte estática, teve timeout ao carregar o painel histórico de demanda (sete aprovados); a repetição isolada passou integralmente, sem alterar código nem expectativas. Os clusters temporários foram encerrados. Logs locais: `artifacts/operational02/backend-pytest.log`, `backend-connected.log`, `backend-results.json` e `e2e-results/.last-run.json`.

A CI passa a aceitar PRs destinados à branch `feature/catalogo-orcamento-2027`, permitindo a revisão encadeada com as mesmas verificações existentes. O deployment continua condicionado exclusivamente a push em `main`.
