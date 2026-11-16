import geography from '../lib/commercial/map-points.json';

const projected = geography.points.map((point) => ({
  ...point,
  x: 80 + (point.longitude + 9.5) * 77,
  y: 50 + (43.5 - point.latitude) * 74,
}));
const points = new Map(projected.map((point) => [point.id, point]));
const ways = [
  { name: 'Francês', color: '#496da7', ids: ['sjpp', 'astorga', 'sarria', 'santiago'] },
  { name: 'Português', color: '#4d7661', ids: ['lisboa', 'porto', 'valenca', 'tui', 'santiago'] },
];
const labels: Record<string, string> = {
  sjpp: 'SJPP',
  astorga: 'Astorga',
  sarria: 'Sarria',
  lisboa: 'Lisboa',
  porto: 'Porto Central / Costa',
  tui: 'Tui / Valença',
  valenca: '',
  santiago: 'Santiago de Compostela',
};
const routeIds: Record<string, string> = {
  sjpp: 'sjpp',
  astorga: 'astorga',
  sarria: 'sarria',
  lisboa: 'lisboa',
  porto: 'porto-central',
  tui: 'tui-valenca',
  valenca: 'tui-valenca',
};

export function WayGeography({ onSelect }: { onSelect: (routeId: string) => void }) {
  return (
    <figure className="my-5">
      <div className="overflow-x-auto rounded-lg bg-slate-50">
        <svg
          viewBox="0 0 800 460"
          className="min-w-[600px] w-full"
          aria-label="Localização geográfica das partidas e ligações generalizadas dos Caminhos Francês e Português"
        >
          <text x="700" y="35" fill="#475569" fontSize="15">
            N ↑
          </text>
          {ways.map((way) => (
            <g key={way.name}>
              <polyline
                points={way.ids.map((id) => `${points.get(id)!.x},${points.get(id)!.y}`).join(' ')}
                fill="none"
                stroke={way.color}
                strokeWidth="3"
                strokeDasharray="7 5"
              />
              <text
                x={way.name === 'Francês' ? 430 : 135}
                y={way.name === 'Francês' ? 45 : 280}
                fill={way.color}
                fontSize="16"
              >
                Caminho {way.name}
              </text>
            </g>
          ))}
          {projected.map((point) => (
            <g
              key={point.id}
              role={routeIds[point.id] ? 'button' : undefined}
              tabIndex={routeIds[point.id] ? 0 : undefined}
              aria-label={
                routeIds[point.id] ? `Selecionar ${labels[point.id] || 'Valença'}` : undefined
              }
              onClick={() => routeIds[point.id] && onSelect(routeIds[point.id])}
              onKeyDown={(event) => {
                if ((event.key === 'Enter' || event.key === ' ') && routeIds[point.id]) {
                  event.preventDefault();
                  onSelect(routeIds[point.id]);
                }
              }}
              className="cursor-pointer"
            >
              <circle
                cx={point.x}
                cy={point.y}
                r="7"
                fill="#64748b"
                stroke="white"
                strokeWidth="2"
              />
              <text
                x={point.x + 12}
                y={point.y + (point.id === 'santiago' ? -14 : point.id === 'sarria' ? 26 : 5)}
                fill="#1e293b"
                fontSize="15"
              >
                {labels[point.id]}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <figcaption className="mt-3 text-sm">
        Pontos geocodificados em 16/11/2026 ·{' '}
        <a
          href="https://www.openstreetmap.org/copyright"
          className="underline"
          target="_blank"
          rel="noreferrer"
        >
          © OpenStreetMap contributors
        </a>
        . Linhas generalizadas entre cidades de referência; não são traçados GPS, etapas
        intermediárias ou rotas de navegação. Porto Central e Costa compartilham a partida; suas
        etapas documentais diferem abaixo.
      </figcaption>
    </figure>
  );
}
