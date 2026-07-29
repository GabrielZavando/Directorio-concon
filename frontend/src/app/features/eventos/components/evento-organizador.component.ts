import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Evento } from '../../../shared/data-access/eventos/evento.types';

/**
 * EventoOrganizadorComponent — dumb presentational panel for the event organizer.
 *
 * Displays organizer name, contact email, and website.
 * Sections are hidden when the corresponding fields are null.
 */
@Component({
  selector: 'app-evento-organizador',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <section class="space-y-4">
      <h2 class="text-headline-md text-on-surface font-headline">Organizador</h2>

      <p class="text-body-lg text-on-surface font-semibold">
        {{ evento.organizador }}
      </p>

      @if (evento.organizadorContacto || evento.organizadorWeb) {
        <div class="flex flex-col gap-2 text-body-md">
          @if (evento.organizadorContacto; as email) {
            <a
              [href]="'mailto:' + email"
              class="text-primary hover:underline inline-flex items-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {{ email }}
            </a>
          }
          @if (evento.organizadorWeb; as web) {
            <a
              [href]="web"
              target="_blank"
              rel="noopener noreferrer"
              class="text-primary hover:underline inline-flex items-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              {{ web }}
            </a>
          }
        </div>
      }
    </section>
  `,
})
export class EventoOrganizadorComponent {
  @Input({ required: true }) evento!: Evento;
}
