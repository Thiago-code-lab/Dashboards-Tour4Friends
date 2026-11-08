# Previsão de demanda v2

O alvo é o número de participantes de reservas atualmente confirmadas por **mês da viagem**, com histórico de janeiro de 2024 a outubro de 2026. Apenas meses completos no filtro e no corte entram; meses conhecidos sem movimento são zero. Datas futuras confirmadas alimentam planejamento, nunca treino. A base representa o estado atual dos registros, não snapshots de reservas conhecidos historicamente em cada data; revisões retroativas afetam a série reconstruída.

O motor compara sazonal ingênuo, média ponderada, Ridge temporal e tendência amortecida. Há origens expansivas para 1, 3 e 6 meses. Seleção fixa em H=3; teste final de seis meses separado quando viável; ajuste ao histórico inteiro só depois da avaliação. O contrato `forecastDemand(history, horizon)` permanece disponível e o adaptador `forecastDataset(data, filters, horizon)` adiciona corte, cache e identificação do snapshot.

Consulte [validação e parâmetros](model-validation.md) e [resultados da entrega](entrega-03-analytics.md). `npm run analytics:report` executa os modelos, as três análises e a detecção robusta, gravando `artifacts/analytics-results.json`.

Faixas usam quantis dos erros fora da amostra, não erros de ajuste. São **exploratórias**, com no mínimo oito resíduos por passo, sem cobertura nominal garantida. Sem amostra ou acima de seis passos não há faixa. O teste final mede cobertura sem participar da estimativa dos quantis.

O simulador mantém previsão fracionária nos cálculos; arredonda somente viajantes a planejar. Compara volume mensal com capacidade de saídas e verifica separadamente contratos/confirmados em cada slot de data, etapa e categoria. Vagas-noite não são subtraídas de viajantes/mês. Não existe distribuição automática de demanda projetada por hotel, gravação automática ou reconciliação de previsões independentes por roteiro.
