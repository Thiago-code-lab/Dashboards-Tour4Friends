import type { Filters, Route } from '../../types/domain';

/** Explicit historical classification; never maps a synthetic route to a 2027 package. */
export const historicalWays: Readonly<Record<string, string>> = {
  santiago: 'Francês',
  'frances-bike': 'Francês',
  portugues: 'Português',
  'portugues-bike': 'Português',
};

export function matchesRoute(route: Route, filters: Filters): boolean {
  return (
    (!filters.way || filters.way === 'all' || historicalWays[route.id] === filters.way) &&
    (filters.route === 'all' || filters.route === route.id) &&
    (filters.modality === 'all' || filters.modality === route.modality)
  );
}

export function dependentScope(
  routes: Route[],
  filters: Filters,
  key: 'way' | 'route' | 'modality',
  value: string,
): Filters {
  const next = { ...filters, [key]: value };
  if (key === 'way') next.route = next.modality = 'all';
  if (key === 'route' && value !== 'all') {
    const route = routes.find((entry) => entry.id === value);
    if (route) next.modality = route.modality;
  }
  if (
    key === 'modality' &&
    next.route !== 'all' &&
    !routes.some((route) => matchesRoute(route, next))
  )
    next.route = 'all';
  return next;
}
