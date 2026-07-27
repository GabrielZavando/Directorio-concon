import {
  Component,
  ChangeDetectionStrategy,
} from '@angular/core';

/**
 * RegistratePageComponent — skeleton SPA page for the `/registrate` route.
 *
 * Dumb skeleton: heading + "Próximamente". Visual styling via M3 design tokens
 * from `tailwind.config.js`. Real signup form / Firebase Auth integration
 * belongs to a future OpenSpec change. No `@Input`/`@Output`, no injected
 * services.
 */
@Component({
  selector: 'app-registrate-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './registrate-page.component.html',
  styleUrl: './registrate-page.component.css',
})
export class RegistratePageComponent {}
