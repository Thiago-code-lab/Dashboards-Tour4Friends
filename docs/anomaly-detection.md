# Detecção exploratória de anomalias

Alertas operacionais derivam de regras objetivas: ficha exigível, transferência vencida, contrato pendente e capacidade excedida. **Anomalias estatísticas** indicam comportamento incomum diante de uma referência; não comprovam erro, fraude ou causa. Sua revisão não é gravada como revisão de alerta. Operações apresenta os dois painéis separados.

## Custos comparáveis

São utilizados custos realizados de saídas históricas concluídas, no roteiro/modalidade/período selecionado. Cada rubrica é normalizada por `viajantes confirmados × dias do roteiro`. O denominador exclui canceladas/pendentes. Compara-se o valor aos custos da mesma rubrica e roteiro, excluindo o próprio registro. Saídas sem participantes não são classificadas. Custos de saída são globais: filtro de categoria de hospedagem não cria rateio fictício e não é aplicado a esta comparação.

Exigem-se seis pares comparáveis. Mediana e MAD são calculados; intensidade = `(valor − mediana)/(MAD/0,67448975)`. Somente custos altos, intensidade >3,5, são candidatos à investigação. Quando MAD é zero, usa-se escala `IQR/1,3489795`; sem dispersão também no IQR, o motor se abstém. Essas constantes são uma escala robusta de referência, não uma afirmação de normalidade ou p-valor.

Comparação de custos é **retrospectiva**: pares podem ocorrer depois da saída analisada, até o corte selecionado. Não deve ser apresentada como alerta que teria sido emitido naquela data. Diferenças de roteiro/duração/tamanho são controladas parcialmente pela normalização, sem ajustar câmbio, contrato, composição ou qualidade de serviço. Comparações múltiplas não recebem controle de FDR; todo achado é exploratório.

## Demanda inesperada

Para cada mês após os 12 iniciais, o baseline sazonal fixo prevê o próximo mês usando somente o passado. Não se usa um método escolhido posteriormente para classificar o passado. O resíduo observado é comparado apenas aos resíduos de meses anteriores; mínimo de oito erros. Sinalização em módulo acima de 3,5 na escala robusta. Os testes alteram valores futuros extremos e confirmam que ocorrências anteriores não mudam.

Isso é uma simulação histórica sobre o snapshot atual de participações confirmadas; não recupera snapshots antigos do sistema de vendas. Revisões de reservas feitas hoje podem revisar a demanda histórica.

## Comportamento operacional

- Ocupação do grupo = viajantes confirmados / capacidade física da saída, em %. Referência: outras saídas concluídas do mesmo roteiro; mínimo de seis pares, critério robusto em módulo >3,5. Não é ocupação por noite de hotel.
- Cancelamentos: roteiro com pelo menos dez reservas é comparado aos demais, que precisam reunir ao menos vinte. Só há sinal quando o limite inferior Wilson do grupo supera o superior dos demais. Comparação exploratória, sem ajuste para multiplicidade ou composição comercial. Um cancelamento isolado num grupo pequeno não dispara sinalização.

Cada ocorrência contém indicador, escopo/data, valor/unidade, referência, método, n, intensidade, explicação e investigação sugerida. Todas recebem **atenção exploratória**; não existe escalada estatística automática para crítico. A gravidade crítica na Visão Geral vem exclusivamente das regras operacionais existentes.

## Resultado da base original

Nenhuma ocorrência ultrapassou esses critérios com a amostra e dispersão exigidas. Esse resultado é mostrado como **zero anomalias sinalizadas**, sem reduzir limiares ou alterar a seed para produzir achados. Não significa ausência de problemas: os doze alertas operacionais da mesma base continuam visíveis e acionáveis.

Testes controlados, separados da base original, inserem um custo extremo normalizado e uma demanda inesperada. Verificam detecção, ausência de sinal por simples aumento proporcional de viajantes/duração, abstenção em grupos pequenos/constantes e ausência de classificação crítica. Os dados modificados existem somente nos testes.

Referência: NIST, [identificação e investigação de outliers](https://www.itl.nist.gov/div898/handbook/eda/section3/eda35h.htm). O projeto usa rotulagem exploratória robusta; não reproduz os testes formais sob normalidade descritos nessa referência.

A constante de escala do MAD pode ser conferida na [documentação científica do SciPy](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.median_abs_deviation.html). SciPy não foi adicionado como dependência; o cálculo permanece em TypeScript.
