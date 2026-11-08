# Roteiro de apresentação · apoio interno do grupo

Duração-alvo: **7 minutos**, com margem entre 6 e 8. Sem atribuição de falas a integrantes. O único arquivo para submissão à disciplina é `T4F-Performance-Projeto-Integrador-V-Entrega.pdf`; este roteiro é apoio interno.

## Preparação

- Abrir `feature/final-quality-and-delivery-v1`, instalar dependências e executar `npm run dev`. Para apresentar todos os avanços, usar a candidata local. A URL pública permanece na Etapa 01 enquanto não houver aprovação de publicação.
- Manter filtros padrão, sem importação anterior. Não preparar números alternativos. Deixar o PDF aberto em outra aba.
- Persistência pode ser demonstrada após preparar PostgreSQL/API e criar administrador com senha local sem eco, conforme `backend/README.md`. O percurso de demonstração funciona sem isso.
- **Explorar demonstração** orienta os módulos, sem bloquear navegação ou alterar resultados.

## 0:00–0:45 · Empresa e contexto

**Tela: Visão Geral.**

“Nosso projeto estuda a Tour4Friends no contexto de viagens e roteiros. Desenvolvemos a T4F Performance para reunir informações comerciais, financeiras e operacionais em um painel. O trabalho é do Projeto Integrador V de Big Data para Negócios da Fatec Ipiranga. Os dados são sintéticos: demonstram a metodologia e não representam o desempenho real da empresa.”

## 0:45–1:25 · Problema e proposta

“O problema tratado é analisar em conjunto informações com significados diferentes. Uma reserva pode ter vários viajantes; receita contratada não é dinheiro recebido; e hospedagens precisam estar disponíveis na data e na etapa corretas. A plataforma centraliza essas visões e permite comparar o mesmo cenário por período, roteiro, modalidade e categoria.”

## 1:25–2:15 · Painel e indicadores

**Mostrar os quatro indicadores e a Inteligência Gerencial. Ir a Reservas, aplicar um roteiro e limpar o filtro.**

“No recorte padrão temos 143 reservas confirmadas e 188 participações em viagens concluídas. A receita realizada gerencial é de aproximadamente 1,62 milhão de reais nesse cenário. Os cards explicam as definições. A Inteligência Gerencial transforma resultados em perguntas e ações sugeridas.

Ao mudar o roteiro, indicadores e tabelas acompanham o filtro. Podemos buscar reservas e exportar o recorte. No laboratório conectado, usuários autorizados também alteram registros, com validação e auditoria no PostgreSQL.”

## 2:15–3:30 · Previsão e avaliação

**Tela: Demanda. Mostrar comparação H=3 e uma origem.**

“A previsão usa 34 meses completos. Comparamos quatro métodos leves, incluindo uma referência sazonal e a regressão Ridge. Avaliamos várias origens: treinamos com o passado e prevemos os meses seguintes. Os seis meses finais ficam separados da escolha.

O Ridge foi selecionado na validação. No teste final, seu erro absoluto médio foi de aproximadamente 2,56 viajantes por mês. O RMSE dá mais peso aos erros maiores. A média ponderada teve menor erro nesses seis meses finais, mas não trocamos o vencedor depois de olhar o teste. Isso evita uma escolha oportunista.

A faixa cinza vem de erros históricos fora da amostra. É exploratória: cinco de seis meses finais ficaram nela, mas esse tamanho de teste não garante precisão futura.”

## 3:30–4:25 · Planejamento de hospedagem

**Em Demanda, simular +10%; depois abrir Hospedagens.**

“A simulação muda a hipótese de demanda e mostra o volume a planejar. Ela não cria reservas nem altera o banco. Confirmados são respeitados, mesmo quando superam a previsão. Não distribuímos automaticamente o total mensal entre hotéis. Em Hospedagens conferimos cada saída, data, etapa e categoria: vagas livres em uma noite não resolvem falta em outra.”

## 4:25–5:40 · Resultados estatísticos

**Voltar a Demanda e percorrer as três abas do laboratório.**

“A primeira análise descreve sazonalidade. Junho teve a maior média, cerca de 10,67 viajantes, mas há apenas três repetições desse mês.

A segunda compara cancelamentos considerando o tamanho do grupo. Assis teve três em 14 reservas. O intervalo é amplo: recomendamos investigar os motivos, sem afirmar que o roteiro é pior.

A terceira examina satisfação. Santiago a pé teve NPS 25 em 12 respostas. Mostramos também atendimento, hospedagem e logística. A amostra é pequena e pode ter viés de resposta. São resultados que ajudam a decidir o que investigar, sem comprovar causalidade.”

## 5:40–6:25 · Alertas e integração

**Tela: Operações.**

“Há 12 alertas operacionais, como ficha incompleta, transfer ou capacidade. Existem zero anomalias estatísticas pelos critérios atuais, e isso está correto. Alerta indica uma regra objetiva; anomalia indica algo incomum diante de uma referência. Não alteramos a base para fabricar ocorrências.

O backend possui autenticação e quatro perfis. Alteração e auditoria são gravadas na mesma transação. Após salvar, o frontend recarrega a base e recalcula os dashboards.”

## 6:25–7:10 · Relatório e conclusão

**Mostrar Relatório e PDF final.**

“O relatório executivo reflete os filtros e pode ser impresso. Para a disciplina, consolidamos um PDF com identificação do grupo, capturas reais, indicadores, modelos, arquitetura e limitações.

A contribuição é reunir dados e aplicar métodos verificáveis ao planejamento e à gestão. O próximo passo seria homologar processos com a agência, coletar novos meses e preparar uma operação segura. A aplicação pública usa demonstração estática; o backend continua em laboratório. Obrigado.”

## Respostas curtas para perguntas

| Pergunta                                   | Resposta sugerida                                                                                                                                               |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Por que a Tour4Friends?                    | É a empresa estudada no projeto. O domínio reúne dados comerciais, financeiros, operacionais e de satisfação, permitindo demonstrar análise integrada.          |
| Qual problema resolve?                     | Centraliza indicadores e ajuda a comparar roteiros, acompanhar reservas e planejar compromissos com definições consistentes.                                    |
| Quais dados foram usados?                  | Uma simulação com seed 42: 116 clientes, 164 reservas, 258 leads, seis roteiros, 52 saídas, 12 hospedagens e 72 avaliações. O recorte pode ter menos registros. |
| Por que base sintética?                    | Permite desenvolver sem expor dados pessoais ou apresentar operações reais sem homologação. Demonstra métodos, não resultados reais da empresa.                 |
| Como calculam a demanda?                   | Somamos participantes confirmados por mês da viagem. Modelos recebem apenas meses anteriores à previsão; períodos incompletos são excluídos.                    |
| MAE e RMSE são iguais?                     | MAE é o erro absoluto médio. RMSE aumenta o peso dos erros grandes por elevá-los ao quadrado antes da média.                                                    |
| Por que Ridge foi escolhido?               | Teve menor MAE nas origens de validação a três meses, antes de observar o teste final.                                                                          |
| Por que outro modelo venceu o teste final? | O teste tem só seis meses e o ranking pode mudar. Não o usamos para escolher novamente; ele avalia a decisão anterior.                                          |
| Como a previsão ajuda na hospedagem?       | Estima volume mensal; contratação depende de saídas, noites, etapas e categorias. Confirmados têm prioridade sobre a estimativa.                                |
| O que acontece se a demanda muda?          | O simulador mostra uma hipótese sem gravar. Uma alteração persistida no laboratório muda o snapshot e reprocessa as análises.                                   |
| Alerta e anomalia são diferentes?          | Alerta viola regra operacional. Anomalia é incomum estatisticamente e exige investigação, sem comprovar erro ou causa.                                          |
| Quais tecnologias foram usadas?            | React/TypeScript, Vite, Tailwind e Recharts; FastAPI, SQLAlchemy, Alembic e PostgreSQL; testes e GitHub Actions.                                                |
| Qual a função do PostgreSQL?               | Persistir registros, usuários, sessões, revisões, importações e auditoria com integridade e transações.                                                         |
| O Pages executa o backend?                 | Não. Serve arquivos estáticos. API e PostgreSQL rodam separadamente; a demonstração funciona sem eles.                                                          |
| O que falta para uso real?                 | Homologar dados/processos, publicar a API com HTTPS e aprovação, validar backups e acessos e acompanhar novos períodos.                                         |
