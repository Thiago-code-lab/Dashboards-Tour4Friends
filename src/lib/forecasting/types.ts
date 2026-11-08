export type Observation = { month: string; travelers: number };
export type ModelName =
  'Sazonal ingênuo' | 'Ridge temporal' | 'Média ponderada' | 'Tendência amortecida';
export type ModelId = 'seasonal' | 'weighted' | 'ridge' | 'damped';
export type ErrorMetrics = {
  mae: number;
  rmse: number;
  bias: number;
  wape: number | null;
  count: number;
};
export type ForecastModel = {
  id: ModelId;
  name: ModelName;
  minimum: number;
  complexity: number;
  eligible: (history: Observation[]) => boolean;
  predict: (history: Observation[], horizon: number) => number[];
};
export type ForecastPair = { month: string; observed: number; predicted: number; lead: number };
export type ValidationWindow = {
  modelId: ModelId;
  model: ModelName;
  horizon: number;
  origin: string;
  trainingStart: string;
  trainingSize: number;
  pairs: ForecastPair[];
};
export type ModelScore = ErrorMetrics & {
  model: ModelName;
  modelId: ModelId;
  horizon: number;
  windows: number;
};
export type EmpiricalBand = {
  lead: number;
  sample: number;
  lowerError: number | null;
  upperError: number | null;
};
export type ForecastPoint = {
  month: string;
  predicted: number;
  lower?: number;
  upper?: number;
  errorSample?: number;
};
export type ForecastResult = {
  selected: ModelName | null;
  selectedId: ModelId | null;
  reason: string;
  history: Observation[];
  predictions: ForecastPoint[];
  backtest: {
    month: string;
    observed: number;
    baseline: number;
    ridge: number | null;
    selected: number;
  }[];
  metrics: ModelScore[];
  validation: ModelScore[];
  windows: ValidationWindow[];
  trainEnd: string | null;
  testStart: string | null;
  sample: number;
  selectionHorizon: number;
  independentTest: boolean;
  baselineImprovement: number | null;
  uncertainty: {
    kind: 'exploratory' | 'unavailable';
    description: string;
    bands: EmpiricalBand[];
    coverage: { hits: number; count: number; rate: number } | null;
  };
  metadata: {
    model_id: ModelId | null;
    model_version: string;
    method: string | null;
    training_start: string | null;
    training_end: string | null;
    evaluation_period: string | null;
    forecast_horizon: number;
    validation_strategy: string;
    sample_size: number;
    mae: number | null;
    rmse: number | null;
    bias: number | null;
    data_version: string;
    generated_at: string;
    fingerprint: string;
  };
};
