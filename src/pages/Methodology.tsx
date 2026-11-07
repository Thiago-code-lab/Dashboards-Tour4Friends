import { Database, Layers, ShieldCheck, TrendingUp } from 'lucide-react';
import { useAnalysis } from '../app/context';
import { PageHeading } from '../components/layout';
import { Badge, Panel } from '../components/ui';
import { dateLabel, number } from '../lib/format';
import { MEMBERS } from '../lib/project';

export default function Methodology() {
  const { data } = useAnalysis();
  return (
    <>
      <PageHeading
        eyebrow="PROJETO INTEGRADOR V"
        title="Sobre e metodologia"
        description="O que os números representam, como são calculados e até onde permitem concluir."
      />
      <div className="project-intro">
        <span className="project-icon">
          <Layers size={32} />
        </span>
        <div>
          <Badge tone="blue">Fatec Ipiranga “Pastor Enéas Tognini”</Badge>
          <h2>T4F Performance</h2>
          <p>
            Uma plataforma de análise de desempenho corporativo para centralizar a visão comercial,
            financeira e operacional de uma pequena agência de turismo.
          </p>
        </div>
      </div>
      <div className="two-column">
        <Panel title="O problema e a decisão" subtitle="Informação organizada para planejar melhor">
          <p className="panel-prose">
            Planilhas, formulários e sistemas dispersos dificultam a leitura conjunta de demanda,
            reservas e disponibilidade negociada com hospedagens parceiras. A plataforma reúne essas
            dimensões para ajudar o gestor a priorizar confirmações, planejar vagas, comparar
            roteiros e acompanhar a experiência dos viajantes.
          </p>
          <p className="panel-prose">
            Os gráficos respondem a perguntas de gestão. Os insights são regras determinísticas
            sobre resultados calculados. Não utilizamos um modelo de linguagem para escrever
            conclusões.
          </p>
        </Panel>
        <Panel title="Quem desenvolve" subtitle="Projeto Integrador V · Big Data para Negócios">
          <ul className="members-list">
            {MEMBERS.map((m, i) => (
              <li key={m}>
                <span>{String(i + 1).padStart(2, '0')}</span>
                {m}
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <Panel
        title="Uma base demonstrativa, de ponta a ponta"
        subtitle="Fonte: gerador sintético · nenhum registro operacional foi importado"
      >
        <div className="metadata-grid">
          <div>
            <Database size={19} />
            <span>Versão</span>
            <strong>{data.metadata.version}</strong>
          </div>
          <div>
            <ShieldCheck size={19} />
            <span>Classificação</span>
            <strong>{data.metadata.source_type}</strong>
          </div>
          <div>
            <TrendingUp size={19} />
            <span>Corte histórico</span>
            <strong>{dateLabel(data.metadata.historyEnd)}</strong>
          </div>
          <div>
            <Layers size={19} />
            <span>Seed / referência</span>
            <strong>
              {data.metadata.seed} · {dateLabel(data.metadata.referenceDate)}
            </strong>
          </div>
        </div>
        <div className="record-counts">
          {Object.entries(data)
            .filter(([, value]) => Array.isArray(value))
            .map(([key, value]) => (
              <span key={key}>
                <strong>{number((value as unknown[]).length)}</strong> {key}
              </span>
            ))}
        </div>
        <p className="panel-note">
          Geração reproduzível em Python, apenas biblioteca padrão. Nomes de roteiros são referência
          histórica de catálogo; etapas e valores são ilustrativos. Nenhum preço, data de saída ou
          parceiro representa uma oferta atual.
        </p>
      </Panel>
      <div className="two-column">
        <Panel title="Definições que mantêm a análise consistente">
          <dl className="definition-list">
            <dt>Receita contratada</dt>
            <dd>
              Soma do valor das reservas confirmadas, uma vez por reserva. Canceladas e pendentes
              não entram.
            </dd>
            <dt>Receita realizada gerencial</dt>
            <dd>
              Parcela contratada de viagens concluídas até a referência. Pagamentos são recebimentos
              e não devem ser adicionados à receita.
            </dd>
            <dt>Ticket médio</dt>
            <dd>
              Receita contratada ÷ reservas confirmadas, independentemente do número de viajantes.
            </dd>
            <dt>Margem de contribuição</dt>
            <dd>
              (Receita contratada − custo operacional) ÷ receita contratada × 100. Sem custos fixos
              e tributos.
            </dd>
            <dt>Ocupação</dt>
            <dd>
              Vagas comprometidas ÷ vagas contratadas nos mesmos slots de data, saída, etapa e
              categoria. Agregado em vagas-noite.
            </dd>
            <dt>NPS</dt>
            <dd>
              100 × (promotores 9–10 − detratores 0–6) ÷ respostas. Notas 7–8 são neutras. Sem
              respostas, mostramos “—”.
            </dd>
            <dt>Conversão</dt>
            <dd>
              Leads criados no período com reserva confirmada vinculada ÷ total da coorte de leads.
              Não mistura contatos sem vínculo.
            </dd>
            <dt>Cancelamento</dt>
            <dd>
              Reservas canceladas ÷ total de reservas do recorte. Denominador zero nunca produz
              percentual.
            </dd>
          </dl>
        </Panel>
        <Panel title="Previsão, com validação e limites">
          <dl className="definition-list">
            <dt>Dois métodos comparáveis</dt>
            <dd>
              Baseline sazonal ingênuo repete o mesmo mês do ano anterior. Ridge usa tendência
              temporal e dois pares de seno/cosseno com período anual, λ=4 fixo e intercepto sem
              penalização.
            </dd>
            <dt>Separação temporal</dt>
            <dd>
              Com pelo menos 18 meses e 8 meses não nulos no treino, os últimos 6 meses ficam
              reservados para teste. O modelo não recebe os valores futuros durante o treinamento
              inicial.
            </dd>
            <dt>Seleção e ajuste final</dt>
            <dd>
              O menor MAE seleciona o método; em empate, escolhemos o baseline. Só depois da
              avaliação o método é ajustado ao histórico completo. O teste é usado para seleção, não
              é uma estimativa independente do desempenho após seleção.
            </dd>
            <dt>MAE e RMSE</dt>
            <dd>
              MAE é o erro absoluto médio em viajantes por mês. RMSE é a raiz da média dos erros
              quadráticos, dando mais peso a erros grandes.
            </dd>
            <dt>Amostra insuficiente</dt>
            <dd>
              Sem condições para comparar modelos, usamos sazonal ingênuo ou média ponderada dos
              últimos 3 meses. Menos de 6 meses ou 3 meses não nulos não produz previsão.
            </dd>
            <dt>Simulação</dt>
            <dd>
              Ajustar a demanda em ±30% multiplica a projeção e recalcula vagas. Não treina um novo
              modelo e não cria uma previsão validada adicional.
            </dd>
            <dt>Incerteza</dt>
            <dd>
              Não exibimos intervalos, pois a pequena amostra de teste não sustenta uma cobertura
              confiável. Projeções longas têm maior incerteza.
            </dd>
          </dl>
        </Panel>
      </div>
      <Panel title="Arquitetura e qualidade" subtitle="Um site estático, sem servidor obrigatório">
        <div className="architecture-flow">
          <span>Python · seed 42</span>
          <b>→</b>
          <span>JSON versionado</span>
          <b>→</b>
          <span>Zod + integridade</span>
          <b>→</b>
          <span>Funções analíticas</span>
          <b>→</b>
          <span>React + Recharts</span>
        </div>
        <p className="panel-prose">
          React, TypeScript, Vite, Tailwind CSS, Recharts, Lucide, React Router, Zod e Vitest.
          HashRouter mantém a navegação compatível com GitHub Pages. O repositório de dados expõe
          uma interface assíncrona para permitir futura substituição por API REST/PostgreSQL, sem
          alterar as regras de cálculo.
        </p>
        <p className="panel-prose">
          A base é validada antes de entrar na aplicação: chaves únicas, referências existentes,
          datas ISO, status permitidos, preços e quantidades não negativos, coerência de pagamentos,
          avaliações após viagens e notas de 0 a 10. Importações são atômicas e permanecem em
          memória. Exportações CSV neutralizam fórmulas.
        </p>
        <p className="panel-prose">
          Filtros são aplicados por data da viagem; leads usam a data de contato. Previsões usam
          apenas meses completos dentro do filtro e até outubro de 2026. Custos por categoria são
          estimados por rateio da receita da mesma saída. Preferências e estados dos alertas ficam
          somente no navegador.
        </p>
      </Panel>
      <div className="two-column">
        <Panel title="Limitações e evolução">
          <p className="panel-prose">
            Cenário acadêmico, sem conexão ativa com sistemas da empresa, sem autenticação e sem
            envio externo de mensagens. Feedbacks não constituem amostra representativa. Não há
            taxas de câmbio, conciliação contábil ou controle de estornos.
          </p>
          <p className="panel-prose">
            Próximas etapas: homologar contratos de dados com a agência, criar API autenticada com
            controle de acesso, apurar custos por categoria, avaliar modelos em múltiplas janelas
            temporais e calibrar incerteza com histórico maior. Nenhuma correlação observada na
            simulação permite concluir causalidade.
          </p>
        </Panel>
        <Panel title="Referências de arquitetura e catálogo">
          <p className="panel-prose">
            Foram consultados apenas documentação e código dos repositórios anteriores. O Data Lake
            orientou as relações entre contatos, leads, reservas, roteiros e saídas. O DW anterior
            orientou a separação entre fatos e dimensões. O KNN histórico é de recomendação e não
            foi reutilizado para previsão temporal.
          </p>
          <div className="reference-links">
            <a
              href="https://github.com/Thiago-code-lab/tour4friends-datalake/blob/main/docs/domain-model.md"
              target="_blank"
              rel="noreferrer"
            >
              Modelo de domínio · Data Lake ↗
            </a>
            <a
              href="https://github.com/Thiago-code-lab/tour4friends-datalake/blob/main/docs/routes-catalog.md"
              target="_blank"
              rel="noreferrer"
            >
              Catálogo histórico de roteiros ↗
            </a>
            <a
              href="https://github.com/Thiago-code-lab/tour4friends-analytics"
              target="_blank"
              rel="noreferrer"
            >
              Arquitetura do Data Warehouse ↗
            </a>
          </div>
        </Panel>
      </div>
    </>
  );
}
