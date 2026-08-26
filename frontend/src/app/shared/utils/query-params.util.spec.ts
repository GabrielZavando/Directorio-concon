import { buildQueryParams } from './query-params.util';
import { SearchCriteria } from '../ui/search-bar/interfaces/search-criteria.interface';

/**
 * Spec for buildQueryParams util — pure function that omits empty filters
 * from the query params object.
 *
 * TDD RED: written first, implementation follows in Task 6.3.
 */
describe('buildQueryParams', () => {
  it('should omit empty categoriaId and barrioId when only q is set', () => {
    const criteria: SearchCriteria = { q: 'pizzería', categoriaId: '', barrioId: '' };
    const result = buildQueryParams(criteria);
    expect(result).toEqual({ q: 'pizzería' });
    expect(Object.keys(result)).not.toContain('categoriaId');
    expect(Object.keys(result)).not.toContain('barrioId');
  });

  it('should omit empty q when only categoriaId and barrioId are set', () => {
    const criteria: SearchCriteria = { q: '', categoriaId: 'gastronomia', barrioId: 'higuerillas' };
    const result = buildQueryParams(criteria);
    expect(result).toEqual({ categoriaId: 'gastronomia', barrioId: 'higuerillas' });
    expect(Object.keys(result)).not.toContain('q');
  });

  it('should preserve all three filters when all are non-empty', () => {
    const criteria: SearchCriteria = { q: 'café', categoriaId: 'gastronomia', barrioId: 'la-costa' };
    const result = buildQueryParams(criteria);
    expect(result).toEqual({ q: 'café', categoriaId: 'gastronomia', barrioId: 'la-costa' });
  });

  it('should return empty object when all filters are empty', () => {
    const criteria: SearchCriteria = { q: '', categoriaId: '', barrioId: '' };
    const result = buildQueryParams(criteria);
    expect(result).toEqual({});
  });
});