import { SearchCriteria } from '../ui/search-bar/interfaces/search-criteria.interface';

/**
 * Builds a query-params object from SearchCriteria, omitting any field
 * whose value is an empty string. This ensures clean URLs like
 * `/directorio?q=foo` instead of `/directorio?q=foo&categoriaId=&barrioId=`.
 *
 * Pure function — no side effects, no dependencies.
 */
export function buildQueryParams(criteria: SearchCriteria): Record<string, string> {
  const params: Record<string, string> = {};
  if (criteria.q !== '') params['q'] = criteria.q;
  if (criteria.categoriaId !== '') params['categoriaId'] = criteria.categoriaId;
  if (criteria.barrioId !== '') params['barrioId'] = criteria.barrioId;
  return params;
}