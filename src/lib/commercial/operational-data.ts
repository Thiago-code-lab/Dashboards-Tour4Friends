import { commercialRoutes } from './catalog';
import {
  documentedItinerarySchema,
  type DocumentedItinerary,
  type OperationalDay,
  type OperationalItinerary,
} from './operational';

type WalkingRow = readonly [start: string, end: string, km: number];
type Activity = OperationalDay['activities'][number];

function day(
  number: number,
  activities: Activity[],
  description: string,
  lodgingCity: string | null,
  startCity: string | null = null,
  endCity: string | null = null,
): OperationalDay {
  return {
    order: number,
    day: number,
    activities,
    description,
    startCity,
    endCity,
    walkingStage: null,
    distanceKm: null,
    accommodation: lodgingCity ? { city: lodgingCity, name: null } : null,
    accommodationSuggestions: [],
    evidence: { page: 1, location: `Dia ${number}` },
  };
}

function walkingDays(rows: readonly WalkingRow[]): OperationalDay[] {
  return rows.map(([startCity, endCity, distanceKm], index) => ({
    ...day(index + 3, ['caminhada'], `${startCity} → ${endCity}`, endCity, startCity, endCity),
    walkingStage: index + 1,
    distanceKm,
    evidence: { page: 1, location: `Dia ${index + 3}, etapa ${index + 1}, tabela de etapas` },
  }));
}

function spanishSchedule(rows: readonly WalkingRow[], departure: string): OperationalDay[] {
  const afterWalking = rows.length + 3;
  return [
    day(1, ['chegada', 'preparacao'], 'Chegada Madrid | Ajustes', 'Madrid', null, 'Madrid'),
    day(2, ['transporte'], `Translado Madrid-${departure}`, departure, 'Madrid', departure),
    ...walkingDays(rows),
    day(afterWalking, ['passeio'], 'Tour Santiago', 'Santiago Compostela'),
    day(
      afterWalking + 1,
      ['transporte', 'passeio'],
      'Translado e Tour Muxia & Finisterre',
      'Santiago Compostela',
    ),
    day(
      afterWalking + 2,
      ['transporte'],
      'Translado Santiago - Madrid',
      'Madrid',
      'Santiago',
      'Madrid',
    ),
    day(afterWalking + 3, ['encerramento'], 'Fim Roteiro', null),
  ];
}

const sarria: readonly WalkingRow[] = [
  ['Sarria', 'Portomarin', 22.2],
  ['Portomarin', 'Palas de Reis', 24.8],
  ['Palas de Reis', 'Arzua', 28.7],
  ['Arzua', 'Pedrouzo', 19.3],
  ['Pedrouzo', 'Santiago Compostela', 19.4],
];
const astorga: readonly WalkingRow[] = [
  ['Astorga', 'Foncebadon', 25.8],
  ['Foncebadon', 'Molinaseca', 19.1],
  ['Molinaseca', 'Cacabelos', 25.2],
  ['Cacabelos', 'Vega Valcarcer', 23],
  ['Vega Valcarcer', 'Cebreiro', 11.5],
  ['Cebreiro', 'Triacastela', 20.8],
  ['Triacastela', 'Sarria', 17.8],
  ...sarria,
];
const central: readonly WalkingRow[] = [
  ['Porto', 'São Pedro Rates', 24],
  ['São Pedro Rates', 'Barcelos', 16],
  ['Barcelos', 'Balugaes', 14.6],
  ['Balugaes', 'Ponte de Lima', 16.3],
  ['Ponte de Lima', 'Rubiães', 18.6],
  ['Rubiães', 'Tui | Valença', 20.3],
  ['Tui | Valença', 'O Porrino', 18.4],
  ['O Porrino', 'Redondela', 16.1],
  ['Redondela', 'Pontevedra', 20.2],
  ['Pontevedra', 'Caldas de Rei', 22.2],
  ['Caldas de Rei', 'Padrón', 19.1],
  ['Padrón', 'Santiago Compostela', 25.6],
];
const coast: readonly WalkingRow[] = [
  ['Porto - Matosinhos', 'Povoa do Varzin', 24.8],
  ['Povoa do Varzin', 'Esposente', 20.2],
  ['Esposente', 'Viana do Castelo', 25.1],
  ['Viana do Castelo', 'Caminha', 26.8],
  ['Caminha', 'Serrallo', 20.7],
  ['Serrallo', 'Baiona', 14.3],
  ['Baiona', 'Vigo', 25.3],
  ['Vigo', 'Redondela', 16],
  ['Redondela', 'Pontevedra', 19.6],
  ['Pontevedra', 'Caldas de Rei', 21.1],
  ['Caldas de Rei', 'Padrón', 18.6],
  ['Padrón', 'Santiago Compostela', 23.7],
];

function document(
  routeId: string,
  code: string,
  sha256: string,
  km: number,
  days: OperationalDay[],
  notes: string[],
): DocumentedItinerary {
  return documentedItinerarySchema.parse({
    routeId,
    status: 'documented',
    source: {
      document: `Cópia de ROT ${code}.pdf`,
      sha256,
      documentDate: null,
      inspectedAt: '2026-11-14',
    },
    declaredDurationDays: routeId === 'sarria' ? 11 : 18,
    declaredWalkingStages: routeId === 'sarria' ? 5 : 12,
    declaredDistanceKm: km,
    days,
    notes,
  });
}

const documented = [
  document(
    'astorga',
    'FRAAstorga 12E_0P_18D',
    '630a1c478cace02a67329d426a06151c110b36f20c3db1045a6eda3bcb03d28d',
    257.6,
    spanishSchedule(astorga, 'Astorga'),
    [
      'O perfil ilustrado inclui o Caminho Francês completo; os totais deste cadastro vêm da tabela Astorga–Santiago.',
      '“Fim Roteiro” não informa um deslocamento de retorno.',
    ],
  ),
  document(
    'sarria',
    'FRASarria 5E_0P_11D',
    '344005df5c8edfd8f2e3a72004f000d86bb059bfa3a7a8a15e71d33c276bd134',
    114.4,
    spanishSchedule(sarria, 'Sarria'),
    [
      'O perfil ilustrado inclui o Caminho Francês completo; não é a distância da sequência Sarria–Santiago.',
      '“Fim Roteiro” não informa um deslocamento de retorno.',
    ],
  ),
  document(
    'porto-central',
    'CENPorto 12E_0P_18D',
    '8835db9ca39de86f410d83b6a6e3bced03da46504baa843e57d209f884b6cc9d',
    231.4,
    [
      day(1, ['preparacao', 'passeio'], 'Ajustes | Credencial | Tour', 'Porto'),
      day(2, ['nao_informado'], 'Dia Porto', 'Porto'),
      ...walkingDays(central),
      day(15, ['passeio'], 'Tour Santiago Compostela', 'Santiago Compostela'),
      day(
        16,
        ['transporte', 'passeio'],
        'Translado e Tour Muxia & Finisterre',
        'Santiago Compostela',
      ),
      day(17, ['transporte'], 'Translado Santiago - Porto (Bus)', 'Porto', 'Santiago', 'Porto'),
      day(18, ['retorno'], 'Porto | Embarque Brasil', null, 'Porto', 'Brasil'),
    ],
    [
      '“Dia Porto” não detalha a atividade; não foi classificado como caminhada.',
      'O perfil ilustrado inclui Lisboa e tem abrangência distinta da tabela Porto–Santiago.',
    ],
  ),
  document(
    'porto-costa',
    'COSPorto 12E_0P_18D',
    '381ec740cb2c8e41963906fba43e96e540edfb7fad7ac484c7dcb788afac619a',
    256.2,
    [
      day(1, ['chegada', 'preparacao'], 'Chegada Porto | Ajustes', 'Porto', null, 'Porto'),
      day(2, ['nao_informado'], 'Porto (marcador T; atividade não detalhada)', 'Porto'),
      ...walkingDays(coast),
      day(15, ['passeio'], 'FreeWalkingTour Santiago', 'Santiago Compostela'),
      day(
        16,
        ['transporte', 'passeio'],
        'Translado e Tour Muxia&Finisterra',
        'Santiago Compostela',
      ),
      day(
        17,
        ['transporte'],
        'Translado Madrid | Porto (T+B)',
        'Madrid | Porto',
        null,
        'Madrid | Porto',
      ),
      day(18, ['retorno'], 'Retorno Brasil', null, null, 'Brasil'),
    ],
    [
      'Divergência interna, p. 1: tabela de etapas totaliza 256,2 km; perfil ilustrado indica 261,9 km. Preservados; decisão do grupo pendente.',
      '“Madrid | Porto” preserva alternativas da fonte; não representa dois destinos confirmados.',
      'O marcador T no dia 2 não detalha passeio ou transporte; classificação pendente.',
    ],
  ),
];

export const pendingOperationalSources = [
  'Caminho_Frances_Etapas_SJPP_Hoteis.xlsx',
  'caminho portugues etapas desde Lisboa e exemplo de hoteis (1).xlsx',
  'Valores_Roteiros_Autoguiados_2027.pdf',
];
const documentsByRoute = new Map(documented.map((entry) => [entry.routeId, entry]));
export const operationalItineraries: readonly OperationalItinerary[] = commercialRoutes.map(
  (route) =>
    documentsByRoute.get(route.id) ?? {
      routeId: route.id,
      status: 'pending',
      expectedSources:
        route.id === 'sjpp'
          ? [pendingOperationalSources[0]]
          : route.id === 'lisboa'
            ? [pendingOperationalSources[1]]
            : ['Roteiro operacional específico Tui/Valença a conferir pelo grupo'],
    },
);
