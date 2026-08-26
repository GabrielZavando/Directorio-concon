import {
  Component,
  ChangeDetectionStrategy,
} from '@angular/core';

/**
 * ContactoPageComponent — skeleton SPA page for the `/contacto` route.
 *
 * Dumb skeleton: heading + "Próximamente". Visual styling via M3 design tokens
 * from `tailwind.config.js`. Real contact form/content belongs to a future
 * OpenSpec change. No `@Input`/`@Output`, no injected services.
 */
@Component({
  selector: 'app-contacto-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contacto-page.component.html',
  styleUrl: './contacto-page.component.css',
})
export class ContactoPageComponent {}
