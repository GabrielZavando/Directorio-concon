import { Component, ChangeDetectionStrategy } from '@angular/core';

/**
 * PlaceholderDirectorioComponent — minimal placeholder rendered at the
 * `/directorio` route so the hero's "Buscar Ahora" navigation does not crash
 * in the gap between this change and the future directory listing change.
 *
 * Scope note: this component is intentionally 1-line UI. The real directory
 * listing page belongs to a separate OpenSpec change.
 */
@Component({
  selector: 'app-placeholder-directorio',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
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
export class PlaceholderDirectorioComponent {}
