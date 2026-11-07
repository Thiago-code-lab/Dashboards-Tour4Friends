# Validação e governança dos modelos v2

## Alvo, calendário e elegibilidade

Participações confirmadas por mês da viagem. Série cronológica, valores finitos não negativos até `MAX_SAFE_INTEGER`, horizonte de 1 a 24 meses. Duplicatas e desordem são recusadas; meses internos ausentes são explicitamente preenchidos com zero, supondo calendário conhecido. O adaptador do dataset não inventa períodos anteriores ao início da base e remove meses parciais. Alterações retroativas de status/participantes mudam a série atual; não há dataset histórico imutável de eventos de venda.

| Candidato            | Condição mínima                                                | Método e parâmetros fixos                                                                                                                                     |
| -------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sazonal ingênuo      | 12 meses para comparação                                       | Mesmo mês do ano anterior; previsão recursiva se horizonte excede 12. A função legada preserva fallback ponderado quando chamada diretamente com menos de 12. |
| Média ponderada      | 3 meses; previsão da aplicação exige 6 meses e 3 positivos     | Últimos três valores com pesos 1, 2, 3; projeção recursiva.                                                                                                   |
| Tendência amortecida | 6 meses                                                        | Holt aditivo amortecido, α=0,4, β=0,2, φ=0,85. Nível inicial y₀; tendência inicial (y₂−y₀)/2.                                                                 |
| Ridge temporal       | 12 meses, 8 positivos, variabilidade e 4 origens elegíveis H=3 | Intercepto, t/12, seno/cosseno anuais e segundo harmônico; λ=4, intercepto sem penalização. Sistema 6×6 com pivoteamento parcial.                             |

São alternativas leves para uma agência com 34 observações. Coeficientes fixos evitam busca oportunista de parâmetros no teste. Truncamento em zero preserva o domínio; frações não são arredondadas antes das métricas. O baseline permite verificar se complexidade acrescenta valor. Ridge é candidato, não vencedor obrigatório. Estes critérios são regras de projeto explícitas, não limiares estatísticos universais.

## Seleção e teste

1. Com ao menos 24 meses, remova os seis finais antes de comparar candidatos. Menos de 24 usa rolling-origin no histórico disponível, sem reivindicar teste independente.
2. A partir de 12 meses de treino, preveja H=1, H=3 e H=6 e avance a origem um mês; treino expansivo. Cada horizonte só aceita origens elegíveis para **todos** os candidatos participantes. Ridge sem quatro origens próprias H=3 é excluído da comparação.
3. Compare MAE em H=3 com pelo menos quatro origens comuns. Dentro de 1% do menor MAE, prefira simplicidade: sazonal, ponderada, amortecida, Ridge. Sem condições, use ponderada exploratória sem inventar métricas finais.
4. Congele o escolhido, ajuste até o início do holdout e preveja os seis meses finais sem atualização entre eles. Os outros candidatos aparecem para transparência, sem selecionar novamente o método depois de observar o holdout.
5. Registre o resultado final; só então ajuste o método ao histórico completo para a previsão futura.

Na base original: desenvolvimento janeiro/2024–abril/2026 (28 meses); holdout maio–outubro/2026 (6). Origens comuns: 16 em H=1, 14 em H=3, 11 em H=6. Em H=3 são 42 pares; em H=6, 66. Alvos sobrepostos **não são observações independentes**. Não há teste de significância de diferença entre os modelos nem alegação de superioridade geral. A comparação atual não substitui validação em períodos novos.

## Métricas

- MAE = média de `|previsto − observado|`: erro médio em viajantes/mês.
- RMSE = raiz da média dos quadrados dos erros: dá mais peso a erros grandes.
- Viés = média de `previsto − observado`: positivo superestima; negativo subestima.
- WAPE = `100 × soma |erro| / soma observado`, somente com denominador positivo.
- Melhora relativa = `100 × (MAE sazonal − MAE escolhido) / MAE sazonal`, nas mesmas origens H=3. Ausente se MAE sazonal é zero.

O navegador permite comparar H=1/3/6, explorar uma única origem e distinguir o teste final. Valores por mês e metadados são inspecionáveis; CSV exporta a comparação. Grandes erros no gráfico são destacados quando excedem duas vezes o MAE do respectivo horizonte; é diagnóstico visual, não detecção causal.

## Incerteza

Resíduo = observado − previsto. Remova duplicatas `(origem, passo)` entre horizontes sobrepostos. Calcule quantis interpolados 10/90 **por passo** somente com oito ou mais resíduos de validação. Some os quantis à previsão central, truncando limites em zero. Não estime erros acima do passo seis por extrapolação.

Essas são faixas exploratórias: dependência temporal, seleção do modelo no mesmo desenvolvimento e amostra pequena impedem garantia de cobertura nominal. Na base, amostras dos passos 1–6: 16, 14, 14, 11, 11, 11. O holdout final não calibra os quantis; permite contar quantos de seus seis alvos ficaram na faixa correspondente. Não tratamos seis alvos como comprovação de cobertura futura.

## Reprodutibilidade e limites

Metadados incluem modelo/versão, início/fim do ajuste final, período de avaliação, horizonte, estratégia, n, MAE/RMSE/viés, versão dos dados, identificação de conteúdo e instante de geração. Métricas não dependem de aleatoriedade; o instante é informativo. Fingerprint não criptográfico inclui conteúdo do snapshot, filtros, série, horizonte e versão do motor. O cache é vinculado ao objeto de snapshot; não sobrevive a nova carga da API.

Recortes por roteiro têm muitos zeros e pequeno volume; critérios podem excluir Ridge ou toda comparação. Modelos individuais são ajustados diretamente às suas séries, não distribuídos por percentuais fixos. Sua soma não precisa igualar o modelo agregado; não existe reconciliação hierárquica. Nenhuma previsão é persistida como observação real.

## Referências

- Hyndman e Athanasopoulos, [validação temporal e avaliação de previsões](https://otexts.com/fpp3/toolbox.html#sec-tscv).
- Os mesmos autores, [distribuições e intervalos de previsão](https://otexts.com/fpp3/toolbox.html#sec-prediction-intervals). A faixa exploratória deste projeto não recebe as garantias de um intervalo formal do livro.
