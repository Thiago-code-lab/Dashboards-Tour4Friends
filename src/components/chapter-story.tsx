import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../app/context';
import { CHAPTERS } from '../lib/chapters';
import { dateLabel, number, percent } from '../lib/format';

export function ChapterStory() {
  const { pathname } = useLocation();
  const { data, view, filters } = useApp();
  const index = CHAPTERS.findIndex((chapter) => chapter.path === pathname);
  if (index < 0 || !data || !view) return null;
  const chapter = CHAPTERS[index];
  return (
    <details
      className="no-print mb-5 rounded-xl border border-slate-200 bg-white p-4"
      key={pathname}
    >
      <summary className="cursor-pointer text-sm font-semibold text-slate-700">
        Capítulo {String(index + 1).padStart(2, '0')} de 10 · {chapter.title} · Entenda a decisão
      </summary>
      <p className="mt-3 text-sm font-semibold text-slate-800">{chapter.question}</p>
      <dl className="mt-3 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
        <StoryStep title="Situação">
          Cenário sintético de {dateLabel(filters.start)} a {dateLabel(filters.end)}. Os filtros
          aplicados são compartilhados entre os painéis.
        </StoryStep>
        <StoryStep title="Problema">{chapter.problem}</StoryStep>
        <StoryStep title="Evidência">
          {view.bookings.length} reservas; ocupação {percent(view.occupancy)}; NPS{' '}
          {view.nps == null ? 'indisponível' : `${number(view.nps)} pontos`} ({view.feedback.length}{' '}
          respostas). Consulte os gráficos e denominadores do capítulo.
        </StoryStep>
        <StoryStep title="Insight">
          {view.bookings.length
            ? 'O recorte delimita a comparação. Investigue as diferenças nos gráficos; os números isolados não demonstram causa.'
            : 'Não há reservas neste recorte. Não há evidência para recomendar expansão ou afirmar desempenho.'}
        </StoryStep>
        <StoryStep title="Ação recomendada">
          {view.bookings.length
            ? chapter.action
            : 'Ampliar o período ou limpar os filtros para consultar registros disponíveis.'}
        </StoryStep>
      </dl>
      <nav
        aria-label="Capítulos da análise"
        className="mt-4 flex flex-wrap gap-4 text-sm text-slate-700"
      >
        {index > 0 && (
          <Link className="underline" to={CHAPTERS[index - 1].path}>
            Anterior: {CHAPTERS[index - 1].title}
          </Link>
        )}
        {index < CHAPTERS.length - 1 && (
          <Link className="underline" to={CHAPTERS[index + 1].path}>
            Próximo: {CHAPTERS[index + 1].title}
          </Link>
        )}
      </nav>
    </details>
  );
}

function StoryStep({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-semibold text-slate-800">{title}</dt>
      <dd className="mt-1 leading-relaxed">{children}</dd>
    </div>
  );
}
