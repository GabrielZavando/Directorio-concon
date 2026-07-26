import {
  Component,
  ChangeDetectionStrategy,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { HomeHeroComponent } from './hero/home-hero.component';
import { SearchCriteria } from './hero/hero.types';
import { buildQueryParams } from '../../shared/utils/query-params.util';

/**
 * HomePageComponent — smart container of the home page.
 *
 * Owns:
 *   - the `Router`, which it uses to navigate to `/directorio` with the
 *     selected filters as query params when the hero emits `searchSubmit`.
 *
 * Data (categorias, barrios) is now provided by the SearchBarContainerComponent
 * embedded inside the hero, via the DirectorioOpcionesPort DIP.
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

  /**
   * Bound to the hero's `(searchSubmit)` output. Uses the shared `buildQueryParams`
   * util to filter out empty values so the `/directorio` URL only carries
   * filters the user actually picked.
   */
  onSearchSubmit(criteria: SearchCriteria): void {
    void this.router.navigate(['/directorio'], {
      queryParams: buildQueryParams(criteria),
    });
  }
}
