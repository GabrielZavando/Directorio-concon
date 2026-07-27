import {
  Component,
  ChangeDetectionStrategy,
} from '@angular/core';

/**
 * DirectorioPageComponent — skeleton SPA page for the `/directorio` route.
 *
 * Replaces the previous `PlaceholderDirectorioComponent`. This skeleton is
 * intentionally minimal: a heading and a "Próximamente" message. The real
 * directory listing (with the shared `SearchBarContainerComponent` re-plugged
 * in, filters, and result cards) belongs to a future OpenSpec change.
 *
 * Design notes:
 *   - Dumb component: no `@Input`, no `@Output`, no injected services
 *     (per `frontend-spa-navigation` spec — "Skeleton pages are presentational").
 *   - Uses only M3 design tokens from `tailwind.config.js` (`bg-background`,
 *     `text-primary`, `text-on-surface-variant`, `font-headline`).
 *   - Responsive vertical padding (`py-10 md:py-16`) follows the design
 *     system's "Dunas y Océano" framing convention.
 */
@Component({
  selector: 'app-directorio-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './directorio-page.component.html',
  styleUrl: './directorio-page.component.css',
})
export class DirectorioPageComponent {}
