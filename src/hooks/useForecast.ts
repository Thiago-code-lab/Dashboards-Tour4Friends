import { useMemo } from 'react';
import { useAnalysis } from '../app/context';
import { forecastDemand } from '../lib/forecasting/models';

export function useForecast(horizon = 6) {
  const { view, filters, data } = useAnalysis();
  return useMemo(() => {
    const cutoff = filters.end < data.metadata.historyEnd ? filters.end : data.metadata.historyEnd;
    const history = view.monthly.filter((p) => {
      const lastDay = new Date(
        Date.UTC(Number(p.month.slice(0, 4)), Number(p.month.slice(5, 7)), 0),
      )
        .toISOString()
        .slice(0, 10);
      return `${p.month}-01` >= filters.start && lastDay <= cutoff;
    });
    return forecastDemand(history, horizon);
  }, [view.monthly, filters.start, filters.end, data.metadata.historyEnd, horizon]);
}
