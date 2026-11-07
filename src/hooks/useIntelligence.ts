import { useMemo } from 'react';
import { useAnalysis } from '../app/context';
import type { ForecastResult } from '../lib/forecasting/models';
import { detectAnomalies } from '../lib/analytics/anomalies';
import {
  seasonalAnalysis,
  cancellationAnalysis,
  satisfactionAnalysis,
} from '../lib/analytics/statistics';

export function useIntelligence(forecast: ForecastResult) {
  const { data, filters } = useAnalysis();
  return useMemo(
    () => ({
      anomalies: detectAnomalies(data, filters, forecast.history),
      seasonality: seasonalAnalysis(forecast.history),
      cancellations: cancellationAnalysis(data, filters),
      satisfaction: satisfactionAnalysis(data, filters),
    }),
    [data, filters, forecast.history],
  );
}
