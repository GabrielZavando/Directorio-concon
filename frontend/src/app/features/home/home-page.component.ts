import {
  Component,
  ChangeDetectionStrategy,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  HomeHeroComponent,
} from './hero/home-hero.component';
import {
  CategoryOption,
  BarrioOption,
  SearchCriteria,
} from './hero/hero.types';

/**
 * Hardcoded MVP dummy categories for the hero `<select>`. Source of truth will
 * be the future backend `/api/v1/categorias` module; for now this constant is
 * the single place to swap once that module exists (Decision 3 of design.md).
 *
 * Ids are stable slugs prefixed with `cat-` so a hand-test of the form
 * produces predictable query params on `/directorio`.
 */
const CATEGORIAS_MVP: readonly CategoryOption[] = [
  { id: 'cat-restaurantes', nombre: 'Restaurantes' },
  { id: 'cat-hospedaje', nombre: 'Hospedaje' },
  { id: 'cat-servicios', nombre: 'Servicios' },
  { id: 'cat-retail', nombre: 'Retail' },
  { id: 'cat-salud', nombre: 'Salud' },
];

/**
 * Hardcoded MVP dummy barrios for the hero `<select>`. Source of truth will
 * be the future backend `/api/v1/barrios` module. Stable `b-` prefixed slugs.
 */
const BARRIOS_MVP: readonly BarrioOption[] = [
  { id: 'b-centro', nombre: 'Centro' },
  { id: 'b-bosques', nombre: 'Bosques' },
  { id: 'b-montemar', nombre: 'Montemar' },
  { id: 'b-la-boca', nombre: 'La Boca' },
  { id: 'b-renaca-alto', nombre: 'Reñaca Alto' },
];

/**
 * HomePageComponent — smart container of the home page.
 *
 * Owns:
 *   - the dummy readonly arrays of categorias and barrios (passed as @Input()
 *     to the dumb hero);
 *   - the `Router`, which it uses to navigate to `/directorio` with the
 *     selected filters as query params when the hero emits `searchSubmit`.
 *
 * The hero stays pure presentational (no Router) — DIP / Smart-Dumb split.
 */
@Component({
  selector: 'app-home-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HomeHeroComponent],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.css',
})
export class HomePageComponent {
  private readonly router = inject(Router);

  /** Categorias dummy exposed to the template (read by the hero as @Input). */
  readonly categorias: readonly CategoryOption[] = CATEGORIAS_MVP;
  /** Barrios dummy exposed to the template (read by the hero as @Input). */
  readonly barrios: readonly BarrioOption[] = BARRIOS_MVP;

  /**
   * Bound to the hero's `(searchSubmit)` output. Filters out empty values so
   * the `/directorio` URL only carries filters the user actually picked.
   */
  onSearchSubmit(criteria: SearchCriteria): void {
    const queryParams = this.buildQueryParams(criteria);
    void this.router.navigate(['/directorio'], { queryParams });
  }

  /**
   * Builds a query-params object containing ONLY non-empty filter values so
   * an untouched placeholder does not pollute the URL with `?q=&categoriaId=`.
   */
  private buildQueryParams(
    criteria: SearchCriteria,
  ): Record<string, string> {
    const params: Record<string, string> = {};
    if (criteria.q !== '') params['q'] = criteria.q;
    if (criteria.categoriaId !== '')
      params['categoriaId'] = criteria.categoriaId;
    if (criteria.barrioId !== '') params['barrioId'] = criteria.barrioId;
    return params;
  }
}
