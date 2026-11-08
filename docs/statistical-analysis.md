# Três análises estatísticas reproduzíveis

O laboratório está em **Demanda e previsões**, em três abas. Executa as mesmas funções TypeScript usadas por `npm run analytics:report`. Trabalha sobre o dataset selecionado, sem API externa de IA. Conclusões interpolam resultados calculados, não textos com valores fixos. Na demonstração, os dados são sintéticos; não comprovam desempenho real da Tour4Friends.

## A — Sazonalidade da demanda

**Pergunta:** existem períodos do ano com maior concentração de viagens?

Dados: participações confirmadas em meses completos dentro de início/fim histórico e filtros. Métodos: série mensal, média, mediana, desvio padrão amostral, mínimo/máximo e quartis; agregação por mês do calendário incluindo zeros. Gráficos: histórico, média por mês e histograma descritivo dos volumes mensais. O histograma possui classes explícitas: 0, 1–3, 4–6, 7–9, 10 ou mais viajantes. Não há teste inferencial: duas ou três repetições por mês não fundamentam uma prova geral de sazonalidade.

Base padrão: 34 meses, 188 participações. Junho apresenta a maior média, 10,67 viajantes/mês (três anos); janeiro tem média zero. Isso sugere planejar negociação antes dos picos observados, sem atribuir causa ao calendário. Filtros mudam médias, amostra e conclusão. Distribuição/variabilidade são apresentadas para evitar interpretar apenas os picos.

Limites: série curta, agência pequena, várias saídas agrupadas no mesmo mês, revisões retroativas e dados sintéticos. A ausência de viagens em um mês é um zero conhecido da simulação, não evidência de demanda comercial inexistente.

## B — Cancelamentos e comportamento comercial

**Pergunta:** quais roteiros ou canais apresentam maiores taxas?

Dados: reservas por data histórica de viagem, incluindo confirmadas, pendentes e canceladas. Numerador: canceladas; denominador: todas as reservas do mesmo grupo. Grupos por roteiro, canal do lead vinculado e categoria de hospedagem. Sem denominador não há percentual.

Método: taxas e limites Wilson com z=1,95996398454 (referência binomial de 95%). Todos os n são mostrados; grupos com menos de dez reservas recebem indicação de amostra baixa e não entram no ranking narrativo. O gráfico mostra taxas; a tabela mostra contagens e limites. Não há teste múltiplo de superioridade ou ajuste por perfil.

Na base padrão, Assis tem a maior taxa entre roteiros com n≥10: 3/14 = 21,43%; Wilson aproximadamente 7,57%–47,59%. O intervalo amplo impede conclusões fortes. A ação sugerida é investigar motivos e canais; o código não atribui causalidade ao roteiro. Pendentes integram o denominador porque a pergunta é sobre a carteira de reservas, não apenas reservas previamente confirmadas.

Limites: clientes podem repetir reservas, violando independência estrita dos ensaios binomiais; diferenças observadas de taxas não significam diferenças estatisticamente sustentadas. Reservas futuras não integram esta análise histórica.

## C — Satisfação e qualidade da experiência

**Pergunta:** satisfação varia por roteiro ou categoria de hospedagem?

Dados: feedback vinculado às reservas históricas filtradas, com resposta até o corte. Métodos: NPS, distribuição 0–10, média/desvio padrão das notas, atendimento, hospedagem e logística; comparação por roteiro e categoria.

NPS = `100 × (promotores − detratores)/respostas`, promotores 9–10 e detratores 0–6. Quando existem ao menos 12 respostas e oito clientes distintos, o código realiza 500 reamostragens determinísticas **por cliente**, preservando respostas repetidas do mesmo titular. Quantis 10/90 são uma faixa bootstrap exploratória, sem garantia nominal de cobertura. Semente deriva do conteúdo do grupo; a seleção de modelos de previsão não usa aleatoriedade. Grupos menores mostram “amostra insuficiente”.

Na base padrão há 72 respostas. Santiago a pé tem o menor NPS observado entre roteiros com pelo menos 12 respostas: 25 (n=12); hospedagem média 7,08, atendimento 8,92 e logística 7,67. Esses resultados justificam leitura de comentários e revisão das etapas; não comprovam que roteiro ou hospedagem causou menor satisfação. Outras distribuições e notas ficam disponíveis no laboratório, com n e dispersão.

Limites: viés de resposta, poucos clientes, categorias com composições diferentes e ausência de ajuste para comparações múltiplas. O bootstrap não corrige seleção de respondentes nem transforma poucos dados em evidência robusta. Não são produzidos p-valores ou declarações de superioridade.

## Reprodução e exportação

`npm run analytics:report` grava tabelas completas em `artifacts/analytics-results.json`. O laboratório exporta CSVs das três análises. O relatório executivo reúne conclusões e limitações, preservando capa, integrantes e impressão em um PDF. Identificação do snapshot permite distinguir dados alterados da referência original.

Referência para proporções: NIST, [intervalos Wilson](https://www.itl.nist.gov/div898/handbook/prc/section2/prc241.htm). O cálculo segue a fórmula; a interpretação permanece limitada pelos pressupostos acima.
