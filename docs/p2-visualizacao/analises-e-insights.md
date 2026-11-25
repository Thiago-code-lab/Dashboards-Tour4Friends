# Análises e insights

**Dados sintéticos, não resultados reais da Tour4Friends.** Fonte: `public/data/demo.json`, seed 42, referência 07/11/2026. Histórico de meses completos: janeiro/2024 a outubro/2026. Recorte padrão: viagens de 01/01/2024 a 31/12/2026, todas as dimensões; inclui compromissos futuros. A população brasileira é interesse do projeto, mas não é identificável nesta base.

Reprodução: `npx tsx scripts/p2-evidence.ts`. [Métricas, filtros e SHA-256](evidencias/metricas.json) contêm os números não arredondados para três recortes: completo, Francês e Português. Valores abaixo são arredondados apenas na apresentação. Comparações estatísticas limitam viagens a `historyEnd`; não misturar esse denominador com o card que inclui compromissos futuros.

## 1. Ocupação agregada esconde gargalos?

- **Pergunta:** a capacidade total disponível permite vender qualquer saída?
- **Dados/recorte:** padrão; slots vinculados às saídas selecionadas, mesma etapa/categoria.
- **Indicador/gráfico:** card de ocupação e tabela de Hospedagens; [captura](evidencias/hospedagens.png).
- **Resultado:** 838 vagas-noite comprometidas / 1.951 de capacidade = **42,95%**. Há **4 slots com insuficiência**. Francês: 284/666 = 42,64%, dois slots insuficientes; Português: 468/1.070 = 43,74%, dois slots insuficientes.
- **Interpretação:** capacidade agregada não é intercambiável entre datas/etapas. O indicador executivo precisa do detalhamento operacional.
- **Ação:** revisar e negociar os quatro slots antes de confirmar expansão nessas saídas, conferindo contratos e categoria.
- **Limites:** capacidade e reservas são sintéticas; isso não comprova disponibilidade real de hotéis. Não somar insuficiências e vagas livres como compensação.

## 2. Como o NPS e a amostra se relacionam?

- **Pergunta:** a experiência observada permite priorizar investigação?
- **Dados/recorte:** 72 respostas vinculadas às reservas do recorte padrão.
- **Indicador/gráfico:** NPS e distribuição 0-10 em Experiência; [captura](evidencias/experiencia.png).
- **Resultado:** 38 promotores, 7 detratores e 27 neutros. 100 × (38 − 7)/72 = **43,06 pontos**. Francês: 41,67 pontos (n=24); Português: 42,11 pontos (n=38).
- **Interpretação:** as diferenças entre caminhos são pequenas e descritivas. No laboratório, Santiago a pé tem NPS de 25 pontos (n=12), menor entre roteiros elegíveis com ao menos 12 respostas.
- **Ação:** ler comentários por roteiro e acompanhar nova coleta antes de classificar um caminho como superior.
- **Limites:** viés de respondentes, baixa amostra e repetições por cliente impedem generalização causal. NPS é expresso em pontos, não porcentagem de satisfação.

## 3. Qual dimensão merece investigação no atendimento?

- **Pergunta:** quais dimensões têm menor nota na amostra?
- **Dados/recorte:** mesmas 72 respostas do recorte padrão, escala 0-10.
- **Indicador/gráfico:** médias por dimensão e tabela de Experiência.
- **Resultado:** atendimento **9,11**, hospedagem **7,49**, logística **7,96**. Hospedagem tem a menor média entre as três.
- **Interpretação:** hospedagem é candidata a investigação qualitativa; não há teste que prove que ela causou o NPS observado.
- **Ação:** revisar comentários e condições por etapa/categoria, formular melhoria e reavaliar após implementação real.
- **Limites:** médias agregadas não medem causalidade nem qualidade real dos parceiros; dados sintéticos e sujeitos à composição do recorte.

## 4. Cancelamentos exigem distinguir card e análise histórica?

- **Pergunta:** onde investigar cancelamentos sem confundir denominadores?
- **Dados/recorte:** card padrão inclui 160 reservas até dezembro/2026; laboratório usa somente viagens até outubro/2026.
- **Indicador/gráfico:** status de Reservas e análise de cancelamentos em Demanda.
- **Resultado:** card = **16/160 = 10,00%**. No laboratório histórico completo, Assis tem 3/14 = 21,43%, Wilson 95% de 7,57% a 47,59%. É o maior valor entre roteiros com ao menos dez reservas; Assis não integra o foco Francês/Português. No foco Francês, Francês de bike = 3/22 = 13,64% (Wilson 4,75%-33,33%); no Português, Português de bike = 2/15 = 13,33% (3,74%-37,88%).
- **Interpretação:** amplitudes elevadas tornam o ranking instável. Não declarar diferença comprovada entre grupos.
- **Ação:** conferir motivos, canal e antecedência antes de mudar política comercial; priorizar recortes aderentes ao público de interesse.
- **Limites:** grupos pequenos, seleção descritiva e ausência de experimento. O card usa data de viagem, não coorte de reservas criadas no mês.

## 5. Há padrão temporal útil para planejar?

- **Pergunta:** que meses concentram demanda observada?
- **Dados/recorte:** 34 meses completos, janeiro/2024 a outubro/2026, reservas confirmadas por mês de início da viagem.
- **Indicador/gráfico:** série e laboratório de sazonalidade em Demanda; [captura](evidencias/demanda.png).
- **Resultado:** no completo, junho tem maior média mensal por mês do ano: **10,67 viajantes**, com três observações desse mês. No Francês, setembro: 5,33 (n=3); no Português, junho: 8,67 (n=3).
- **Interpretação:** padrão descritivo sugere revisar capacidade antes dessas janelas; três repetições anuais não comprovam sazonalidade inferencial nem tendência persistente de crescimento.
- **Ação:** cruzar meses de maior volume com disponibilidade comparável e cancelamentos, preservando meses sem movimento.
- **Limites:** poucos ciclos e volumes baixos; não extrapolar como procura brasileira total ou tendência de mercado.

## 6. O resultado financeiro é lucro líquido?

- **Pergunta:** quanto sobra dos contratos depois dos custos incluídos?
- **Dados/recorte:** padrão, confirmadas e custos das saídas selecionadas, inclusive futuros estimados; BRL.
- **Indicador/gráfico:** receita, custo e contribuição no Financeiro; [captura](evidencias/financeiro.png).
- **Resultado:** receita contratada **R$ 1.838.900**, custos incluídos **R$ 1.301.456** e contribuição **R$ 537.444** (29,23% da receita). Receita realizada gerencial: R$ 1.618.600. Francês: contribuição R$ 207.020; Português: R$ 274.589.
- **Interpretação:** há contribuição positiva no cenário, mas não existe cobertura de todas as despesas e tributos para calcular lucro líquido.
- **Ação:** conferir custos estimados, contratos futuros e cobertura de despesas antes de decidir preço ou investimento.
- **Limites:** rateio por receita quando filtrado por categoria, datas/cobertura diferentes de um DRE, dados sintéticos. Não somar EUR do catálogo ao BRL histórico.

## 7. Qual confiança atribuir à previsão e aos alertas?

- **Pergunta:** o modelo selecionado foi o melhor no teste final e há outliers reais identificados pelo método?
- **Dados/recorte:** completo; seleção por origens expansivas em H=3 antes dos seis meses finais (maio-outubro/2026); projeção de novembro/2026 a abril/2027.
- **Indicador/gráfico:** validação temporal, faixas e painel de anomalias em Demanda.
- **Resultado:** seleção **Ridge temporal**. Teste final: MAE **2,56 viajantes**, RMSE **2,75**, viés **+1,38**, WAPE **38,35%**. Média ponderada teve MAE 2,13 no mesmo teste; o selecionado não venceu esse conjunto final. O detector existente retornou **zero anomalias estatísticas** no completo e nos dois caminhos. Existem alertas operacionais por regras; eles são outro objeto.
- **Interpretação:** seleção anterior ao teste evita escolher retrospectivamente o vencedor. Não há evidência para anunciar superioridade universal do Ridge ou outliers que o método não encontrou.
- **Ação:** monitorar erro em novas observações, comparar baseline e usar faixas exploratórias; tratar pendências operacionais mesmo sem anomalia estatística.
- **Limites:** seis pares no teste final, origens de validação sobrepostas, WAPE instável em pequenos recortes e faixas sem cobertura garantida. Ausência de detecção não equivale à inexistência de problemas.

## Síntese de gestão

Situação: capacidade e qualidade precisam ser lidas juntas. Problema: taxa global pode ocultar insuficiências e amostras pequenas podem produzir rankings frágeis. Evidência: quatro slots insuficientes coexistem com 42,95% de ocupação; NPS 43,06 pontos em 72 respostas. Insight: aprofundar por etapa e amostra evita decisões baseadas apenas no agregado. Ação recomendada: revisar slots e comentários, conferir custos e validar o fluxo com a empresa antes de aplicar a dados reais.
