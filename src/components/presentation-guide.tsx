import { Link } from 'react-router-dom';
export function PresentationGuide() {
  return (
    <details className="presentation-guide no-print">
      <summary>Explorar demonstração · percurso de 7 minutos</summary>
      <p>
        Use os dados e filtros normais do painel. Navegue livremente; este roteiro não altera
        resultados.
      </p>
      <nav aria-label="Percurso da demonstração">
        {[
          ['/', '1. Panorama e indicadores'],
          ['/reservas', '2. Reservas e filtros'],
          ['/demanda', '3. Previsão, validação e estatística'],
          ['/hospedagens', '4. Disponibilidade por etapa'],
          ['/operacoes', '5. Alertas e anomalias'],
          ['/relatorios', '6. Relatório executivo'],
        ].map(([to, label]) => (
          <Link key={to} to={to}>
            {label}
          </Link>
        ))}
      </nav>
      <p>
        As simulações ficam em Demanda. A publicação atual pode ter recursos anteriores à versão
        candidata; consulte a identificação da entrega e o README.
      </p>
    </details>
  );
}
