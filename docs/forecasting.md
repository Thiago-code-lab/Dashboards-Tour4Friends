# Previsão de demanda e backtesting

## Alvo e janela

Alvo: participantes de reservas confirmadas por **mês da viagem**. A série inclui zeros nos meses conhecidos sem movimento, de janeiro de 2024 a outubro de 2026. Filtros dimensionais restringem os registros; filtro temporal restringe os meses. Meses parciais são removidos. Reservas futuras confirmadas não entram no treinamento histórico.

## Métodos

1. **Sazonal ingênuo:** `ŷ[t+h] = y[t+h−12]`; a projeção é recursiva quando necessário. Com menos de 12 observações, usa média dos três últimos valores com pesos 1, 2, 3.
2. **Ridge temporal:** `x(t) = [1, t/12, sin(2πm/12), cos(2πm/12), sin(4πm/12), cos(4πm/12)]`, com fase de calendário derivada do primeiro mês. Resolve `(XᵀX + λD)β = Xᵀy`, `λ=4`, `D=diag(0,1,1,1,1,1)`. Intercepto não penalizado. Eliminação de Gauss com pivoteamento parcial em matriz 6×6. Projeções são truncadas em zero; frações representam valores esperados.

Penalização fixa evita ajustar hiperparâmetros no teste curto. Não há dependência de Python no site e nenhum KNN de recomendação é tratado como previsão temporal.

## Teste cronológico

Exige pelo menos 18 meses completos e 8 meses com demanda positiva no treino. Os seis últimos meses são teste. Os modelos são ajustados **apenas no treino** e projetam os seis meses sem receber observações do teste.

- `MAE = média(|y−ŷ|)`.
- `RMSE = sqrt(média((y−ŷ)²))`.

Seleciona o menor MAE; empate favorece o baseline mais simples. Depois o método é ajustado à série completa para o horizonte 3/6/12. O teste usado para seleção não constitui avaliação independente posterior, e a comparação possui somente uma janela. Esse limite é mostrado na metodologia.

## Fallbacks e simulação

- 6–17 meses, ou treino muito esparso: baseline explícito, sem métricas de validação.
- Menos de seis meses ou três meses com movimento: nenhuma previsão.
- Cenário: `projeção × (1 + variação/100)`, entre −30% e +30%, sem novo treinamento.
- Vagas por noite: maior valor entre demanda do cenário arredondada para cima e viajantes futuros já confirmados no mesmo mês, respeitando roteiro/modalidade/categoria. Compromissos dentro do horizonte podem ultrapassar a data final do filtro histórico. Nunca entram no treino nem na validação. É planejamento agregado, não simultaneidade nem confirmação de contratação por localidade.
- Não há intervalo de incerteza: seis resíduos não permitem reivindicar cobertura confiável. Não exibir uma faixa arbitrária é uma decisão metodológica.

## Resultado de referência

No recorte padrão, treino até abril de 2026 e teste de maio a outubro de 2026. O script `npm run data:validate` imprime MAE, RMSE, método selecionado e valores futuros. Os resultados mudam com filtros e importações; nenhum valor é fixado nos componentes.

Os testes alteram propositalmente os valores de teste e verificam que as previsões desse teste permanecem iguais, enquanto as métricas mudam. Também verificam resposta do Ridge a mudanças no treino, filtros, horizontes e não negatividade.
