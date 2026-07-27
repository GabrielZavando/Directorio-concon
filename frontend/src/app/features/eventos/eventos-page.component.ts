import {
  Component,
  ChangeDetectionStrategy,
} from '@angular/core';

/**
 * EventosPageComponent — skeleton SPA page for the `/eventos` route.
 *
 * Dumb skeleton: heading + "Próximamente". Visual styling via M3 design tokens
 * from `tailwind.config.js`. Real events listing belongs to a future OpenSpec
 * change. No `@Input`/`@Output`, no injected services.
 */
@Component({
  selector: 'app-eventos-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './eventos-page.component.html',
  styleUrl: './eventos-page.component.css',
})
export class EventosPageComponent {}
