export interface Chapter {
  path: string;
  title: string;
  question: string;
  problem: string;
  action: string;
}

/** Ten analytical themes; documentary commerce remains a separate journey. */
export const CHAPTERS: readonly Chapter[] = [
  {
    path: '/',
    title: 'Decisão executiva',
    question: 'Onde concentrar a atenção da gestão?',
    problem: 'Demanda, capacidade e experiência precisam ser lidas em conjunto.',
    action: 'Conferir ocupação e amostra do NPS; abrir os capítulos antes de decidir.',
  },
  {
    path: '/demanda',
    title: 'Planejar a demanda',
    question: 'Qual volume pode exigir capacidade adicional?',
    problem: 'O futuro é incerto e o histórico pode ser insuficiente.',
    action: 'Comparar o erro fora da amostra e testar cenários antes de negociar vagas.',
  },
  {
    path: '/reservas',
    title: 'Entender as reservas',
    question: 'Como contatos se convertem em viagens?',
    problem: 'Reservas por data da viagem e leads por contato são coortes diferentes.',
    action: 'Investigar status, canais e motivos de cancelamento no recorte exportado.',
  },
  {
    path: '/roteiros',
    title: 'Comparar os caminhos',
    question: 'Quais roteiros combinam volume e contribuição?',
    problem: 'Maior receita não implica maior resultado por roteiro.',
    action: 'Confrontar volume, custos e experiência antes de priorizar um roteiro.',
  },
  {
    path: '/hospedagens',
    title: 'Proteger a capacidade',
    question: 'Há vagas comparáveis para cada saída e etapa?',
    problem: 'A ocupação agregada pode esconder insuficiência em uma data específica.',
    action: 'Revisar os slots por saída, etapa e categoria; não compensar vagas entre datas.',
  },
  {
    path: '/operacoes',
    title: 'Priorizar a operação',
    question: 'Quais pendências exigem atuação?',
    problem: 'Alertas de regras de negócio não comprovam anomalia estatística.',
    action: 'Revisar causa, responsável e evidência antes de resolver cada alerta.',
  },
  {
    path: '/experiencia',
    title: 'Ouvir os viajantes',
    question: 'O que as respostas indicam sobre a experiência?',
    problem:
      'NPS depende da amostra; respondentes não representam automaticamente todos os viajantes.',
    action: 'Examinar distribuição, comentários e dimensões antes de propor melhorias.',
  },
  {
    path: '/financeiro',
    title: 'Avaliar a contribuição',
    question: 'Quanto resta da receita após os custos incluídos?',
    problem: 'Custos operacionais não cobrem todas as despesas de um demonstrativo contábil.',
    action:
      'Conferir custos estimados e realizados; interpretar contribuição como resultado gerencial.',
  },
  {
    path: '/relatorios',
    title: 'Comunicar a decisão',
    question: 'Como compartilhar uma decisão rastreável?',
    problem: 'Um indicador sem recorte e definição perde contexto.',
    action: 'Revisar filtros, limitações e recomendações antes de imprimir ou salvar o relatório.',
  },
  {
    path: '/metodologia',
    title: 'Conferir a evidência',
    question: 'Até onde os dados permitem concluir?',
    problem: 'Demonstração sintética não comprova desempenho real ou nacionalidade dos clientes.',
    action: 'Conferir fórmulas, fonte e qualidade; validar decisões com a Tour4Friends.',
  },
];
