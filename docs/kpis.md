# Regras dos indicadores

Filtros de reservas, custos e saídas usam **data de início da viagem**. Feedback é a coorte de reservas selecionadas; evolução usa a data da resposta. Leads e conversão usam **data do primeiro contato**. As coortes são explicitadas na interface para evitar comparação incorreta. Intervalos incluem ambas as extremidades.

| Indicador                   | Fórmula / regra                                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Confirmadas                 | Contagem de reservas `status=confirmed`                                                                            |
| Viajantes confirmados       | Soma de `travelerIds.length` em reservas confirmadas                                                               |
| Atendidos                   | Participações de confirmadas cuja saída terminou até a referência                                                  |
| Clientes únicos             | Cardinalidade dos IDs dos participantes confirmados                                                                |
| Receita contratada          | Soma de `totalAmount` das confirmadas, uma vez por reserva                                                         |
| Receita realizada gerencial | Mesma soma, somente viagens concluídas até a referência                                                            |
| Contratada futura           | Confirmadas com viagem ainda não concluída; realizada + futura reconcilia com contratada                           |
| Recebimentos                | Soma dos pagamentos das reservas selecionadas; **não somar à receita**                                             |
| Ticket médio                | Receita contratada / número de reservas confirmadas                                                                |
| Custo                       | Soma dos registros de custo das saídas selecionadas                                                                |
| Custo por categoria         | Custo da saída × receita confirmada da categoria / receita confirmada total da saída; zero sem receita para rateio |
| Contribuição                | Receita contratada − custos; não é lucro líquido                                                                   |
| Margem                      | 100 × contribuição / receita contratada                                                                            |
| Custo por viajante          | Custo / participantes confirmados                                                                                  |
| Cancelamento                | 100 × reservas canceladas / total de reservas                                                                      |
| Conversão                   | 100 × leads únicos da coorte com reserva confirmada vinculada / leads únicos da coorte                             |
| Pipeline                    | Leads abertos sem reserva ativa + reservas pendentes vinculadas à coorte de leads, sem dupla contagem              |
| Fechamento                  | Média de dias entre primeiro contato e contratação de reservas confirmadas selecionadas                            |
| Ocupação                    | 100 × soma dos comprometimentos / soma das capacidades **dos mesmos slots**                                        |
| Disponível                  | Soma de max(0, capacidade − comprometimento) por slot                                                              |
| Contratação adicional       | Soma de max(0, comprometimento − capacidade) por slot                                                              |
| NPS                         | 100 × (promotores com 9–10 − detratores com 0–6) / total de respostas; 7–8 neutros                                 |

Denominador zero resulta em `null`, exibido como “—”. Nenhuma divisão por zero é convertida em crescimento artificial. A interface não exibe variações percentuais quando não existe uma janela anterior comparável na base.

Limites demonstrativos: conforto abaixo de 75%, atenção de 75% até 85%, crítica acima de 85%. Os dois limites de ocupação são configuráveis no módulo de hospedagens e persistem no navegador. Desvio de custo: mais de 20% acima do orçamento. Regras em `analytics/alerts.ts`.

Os insights dependem dos resultados: número/causa do alerta prioritário, concentração de receita por roteiro e NPS/tamanho de amostra. Sem dados, exibem ausência de evidência, não conclusões genéricas de IA.
