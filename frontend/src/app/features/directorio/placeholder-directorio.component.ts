import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SearchBarContainerComponent } from '../../shared/ui/search-bar/search-bar-container.component';
import { SearchCriteria } from '../../shared/ui/search-bar/interfaces/search-criteria.interface';
import { buildQueryParams } from '../../shared/utils/query-params.util';

/**
 * PlaceholderDirectorioComponent — placeholder rendered at the `/directorio`
 * route. Embeds the shared SearchBarContainerComponent so the hero's and the
 * directorio's search experience share the same data and form component.
 *
 * Scope note: the real directory listing page belongs to a separate OpenSpec
 * change. This placeholder navigates with `queryParamsHandling: 'merge'` so
 * URL params from the hero survive the navigation.
 */
@Component({
  selector: 'app-placeholder-directorio',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SearchBarContainerComponent],
  template: `
    <section class="bg-background py-8 px-4">
      <div class="container max-w-5xl mx-auto">
        <app-search-bar-container (searchSubmit)="onSearchSubmit($event)" />
      </div>
    </section>
    <section class="bg-background px-4 py-20">
      <div class="container mx-auto text-center">
        <h1 class="font-headline text-3xl md:text-4xl font-bold text-primary mb-3">
          Directorio — Próximamente
        </h1>
        <p class="text-on-surface-variant">
          El listado de empresas coincidentes aparecerá acá.
        </p>
      </div>
    </section>
  `,
})
export class PlaceholderDirectorioComponent {
  private readonly router = inject(Router);

  /**
   * Delegates search submission to navigation. Uses `queryParamsHandling: 'merge'`
   * so existing URL params (from the hero navigation) are preserved while new
   * filters are added or overwritten.
   */
  onSearchSubmit(criteria: SearchCriteria): void {
    void this.router.navigate(['/directorio'], {
      queryParams: buildQueryParams(criteria),
      queryParamsHandling: 'merge',
    });
  }
}
