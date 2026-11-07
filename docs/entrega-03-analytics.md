# Entrega 03 · inteligência analítica e previsão v2

## Escopo entregue

Evolução dos dez módulos existentes na branch `feature/advanced-analytics-v1`, baseada na etapa 02 (`feature/backend-postgresql-v1`). O PR dependente tem como destino a branch de backend; o PR #1 continua sendo a dependência para integração posterior em `main`. Nenhum merge ou deployment é realizado nesta etapa.

O JSON original e a seed 42 foram preservados: 116 clientes, 164 reservas, 258 leads, seis roteiros, 52 saídas, 12 hospedagens e 72 avaliações, além dos slots/custos/pagamentos existentes. São dados sintéticos. Foram mantidos FastAPI/PostgreSQL, autenticação, operações, auditoria e ambos os modos. Não houve infraestrutura paga, API externa de IA ou importação de dados reais.

## Funcionalidades

- Quatro modelos puros com contrato comum: sazonal ingênuo, média ponderada, Ridge temporal e tendência amortecida. O Ridge anterior e seus parâmetros permanecem disponíveis.
- Backtesting expansivo nos horizontes 1/3/6, origens comuns entre candidatos, seleção por MAE em H=3, desempate por simplicidade e teste final separado quando viável.
- MAE, RMSE, viés, WAPE e comparação sazonal. Seleção reproduzível, critérios de amostra explícitos, fallback e ausência de falsa avaliação independente.
- Faixas exploratórias por passo a partir de erros de validação; contagem de resíduos e cobertura observada no teste final. Nenhuma garantia nominal de 90%/95%.
- Previsão individual por roteiro usando os filtros existentes. Modelos independentes não são reconciliados ao agregado.
- Simulador de demanda, vagas extras por saída e alteração contratual simulada. Volume mensal permanece separado de compromissos por data, etapa e categoria. Nenhuma simulação grava no banco.
- Laboratório com sazonalidade, cancelamentos/Wilson e satisfação/bootstrap por cliente, gráficos, dispersão, amostra, exportação e conclusões calculadas.
- Motor robusto de anomalias de custos normalizados, demanda prequential e comportamento operacional. Painel separado de alertas objetivos; nenhuma escalada estatística automática para crítico.
- Inteligência Gerencial na Visão Geral; Demanda, Operações, Metodologia e Relatório atualizados. Capa com os cinco integrantes e impressão em um PDF preservadas.
- Identificação do snapshot/modelo/filtros/horizonte, cache limitado por snapshot e invalidação depois de alteração persistida.

## Validação temporal e resultados reais

Histórico completo: janeiro/2024–outubro/2026, 34 observações mensais e 188 participações. Desenvolvimento: janeiro/2024–abril/2026 (28 meses). Teste final: maio–outubro/2026 (seis meses), excluído de seleção e parâmetros. Treino inicial mínimo: 12 meses. Origens comuns: 16 em H=1, 14 em H=3, 11 em H=6. Há sobreposição de alvos, sem alegação de independência estatística dos pares.

| Modelo               | MAE validação H=3 | RMSE validação H=3 | Viés validação H=3 | Origens | MAE final | RMSE final | Viés final |
| -------------------- | ----------------: | -----------------: | -----------------: | ------: | --------: | ---------: | ---------: |
| Sazonal ingênuo      |            3,2143 |             3,8822 |            −0,8333 |      14 |    3,8333 |     4,4159 |     2,5000 |
| Média ponderada      |            4,3211 |             5,0014 |            −0,2272 |      14 |    2,1335 |     2,6409 |     0,4668 |
| Tendência amortecida |            4,9287 |             5,6179 |            −0,0338 |      14 |    2,1366 |     2,9209 |    −0,9744 |
| Ridge temporal       |            2,5817 |             3,1265 |            −0,4020 |      14 |    2,5567 |     2,7508 |     1,3771 |

**Selecionado: Ridge**, por menor MAE de validação H=3, aproximadamente 19,68% abaixo do sazonal nas mesmas origens. No teste final, ponderada e amortecida apresentam MAE menor; isso é informado, sem escolher novamente o vencedor depois do teste. O resultado não demonstra superioridade geral do Ridge. Viés final positivo indica superestimação média. WAPE final do Ridge: 38,35%.

Após registrar a avaliação, a projeção reajustada nos 34 meses produz, de novembro/2026 a abril/2027: aproximadamente 4,6454; 2,3405; 1,1127; 2,0624; 4,7059; 7,3358 viajantes esperados. Valores fracionários são mantidos nos cálculos; não são reservas confirmadas. Compromissos futuros podem exceder a previsão e são preservados no planejamento.

## Incerteza

Resíduos únicos de validação por passo: 16, 14, 14, 11, 11, 11. Quantis 10/90 são somados à previsão e limitados inferiormente a zero. As faixas são exploratórias, inclusive pelo uso dos mesmos dados de desenvolvimento para selecionar o modelo. Cinco dos seis valores finais ficaram na faixa estimada sem usar o holdout na calibração. **5/6 não é validação de cobertura nominal futura.** Acima de seis meses e com menos de oito erros por passo, não é desenhada uma faixa.

## Achados estatísticos e aplicação prática

1. **Sazonalidade:** junho tem a maior média observada, 10,67 viajantes, com três repetições; janeiro, zero. Ação: antecipar a negociação antes dos picos observados. Não há teste que comprove sazonalidade geral com essa amostra.
2. **Cancelamentos:** Assis tem a maior taxa entre roteiros com dez ou mais reservas: 3/14, 21,43%, Wilson 95% aproximadamente 7,57%–47,59%. Ação: revisar motivos/canais; intervalo amplo e comparação descritiva não comprovam diferença entre roteiros.
3. **Satisfação:** Santiago a pé tem o menor NPS entre roteiros com 12 ou mais respostas: 25 (n=12); hospedagem média 7,08, atendimento 8,92 e logística 7,67. Ação: investigar comentários e etapas, sem concluir causa ou superioridade estatística de outros roteiros.

**Anomalias sinalizadas na base original: zero** com os critérios robustos e amostras mínimas definidos. Limiares não foram reduzidos para fabricar ocorrências. Os doze alertas operacionais continuam existentes: regras de contrato/ficha/ocupação/transfer são diferentes de desvios estatísticos. Testes independentes com outliers conhecidos comprovam a detecção sem alterar o JSON original.

## Reprodução, testes e evidências

```bash
npm run analytics:report
npm run data:validate
npm test
npm run typecheck
npm run build
npm run test:e2e
# Com o ambiente Python da etapa 02 e PostgreSQL de teste configurados:
cd backend
python -m pytest -q
python -m ruff check app tests scripts
cd ..
python backend/scripts/run_connected_tests.py --allow-reset-test-db
```

A suíte contém 77 testes Vitest (32 novos casos metodológicos e 45 anteriores), 23 testes backend, cinco testes conectados e 18 casos Playwright de demonstração/analytics: 17 executáveis e uma dispensa intencional da duplicação móvel do teste de capturas desktop. Os testes cobrem futuro extremo sem vazamento, seleção sem holdout, pares/horizontes, quantis/deduplicação, normalização, amostras pequenas, bootstrap determinístico, reprocessamento depois de persistência, filtros, simulação e exportações.

Capturas em 1440×1000, 1280×900, 834×1112 e 390×844 são geradas em `artifacts/analytics-*.png`, com comparação/laboratório, Visão Geral e satisfação. A verificação exige ausência de rolagem horizontal da página. O PDF único em `artifacts/analytics-report.pdf` contém cinco páginas; todas foram renderizadas e revisadas. A CI publica as evidências sintéticas no artefato `analytical-evidence`, junto com `analytics-results.json`. Logs/senhas de sessão conectada não integram esse artefato.

O script mede 20 execuções sem cache do backtesting na máquina local; mediana observada na ordem de poucos milissegundos, sem compromisso de SLA. Cache evita treinos a cada renderização; os modelos não precisam de Worker, servidor científico ou novas dependências pesadas.

## Limites e próximos passos

- Apenas 34 meses e poucos eventos por roteiro; intervalos exploratórios e ausência de poder para afirmar superioridade de modelos/grupos.
- Revisões retroativas de reservas podem alterar a série; faltam snapshots históricos de eventos para uma avaliação comercial estrita “como conhecido na data”.
- Custos por viajante-dia controlam escala parcialmente, sem explicar câmbio, contratos ou composição. Grupos pequenos/sem dispersão são ignorados, não aprovados como normais.
- Wilson pressupõe independência binomial; bootstrap por cliente não corrige seleção de respondentes. Comparações múltiplas não recebem correção inferencial.
- Modelos por roteiro não são reconciliados. Sem hipóteses de calendário, previsão mensal não define hotel ou simultaneidade; simulação não altera contratos reais.
- Próximas evoluções: validação em novos meses, monitoramento de erro e revisões, avaliação por múltiplos cortes externos, reconciliação hierárquica se houver necessidade demonstrada e melhoria da coleta de feedback.
- API externa HTTPS, backups e operação de produção permanecem pendências da etapa 02. Esta etapa não publicou backend nem atualizou a `main`/Pages.

Detalhes: [validação](model-validation.md), [estatística](statistical-analysis.md), [anomalias](anomaly-detection.md), [arquitetura](architecture.md).
