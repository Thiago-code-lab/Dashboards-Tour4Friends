import { useMemo } from 'react';
import { useAnalysis } from '../app/context';
import { forecastDataset } from '../lib/forecasting/dataset';

export function useForecast(horizon = 6) {
  const { filters, data } = useAnalysis();
  return useMemo(() => forecastDataset(data, filters, horizon), [data, filters, horizon]);
}
