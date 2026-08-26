import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Evento } from '../../../shared/data-access/eventos/evento.types';

/**
 * Display labels for precioTipo.
 */
const PRECIO_LABELS: Record<string, string> = {
  gratis: 'Gratis',
  pago: 'Pago',
  donacion: 'Donación',
  invitacion: 'Invitación',
};

/**
 * EventoPrecioComponent — dumb presentational panel for the event price.
 *
 * Shows a badge for the price type and formatted amount.
 * Hides the amount for "gratis" events.
 */
@Component({
  selector: 'app-evento-precio',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <section class="space-y-4">
      <h2 class="text-headline-md text-on-surface font-headline">Precio</h2>

      <div class="flex items-center gap-3">
        <span
          data-testid="precio-badge"
          class="inline-block text-label-sm px-3 py-1 rounded-full"
          [class.bg-secondary/20]="evento.precioTipo !== 'gratis'"
          [class.bg-tertiary/10]="evento.precioTipo === 'gratis'"
          [class.text-tertiary]="evento.precioTipo === 'gratis'"
        >
          {{ precioLabel }}
        </span>

        @if (evento.precioTipo !== 'gratis' && evento.precioValor > 0) {
          <span class="text-headline-md text-on-surface font-semibold">
            {{ formattedAmount }}
          </span>
        }
      </div>
    </section>
  `,
})
export class EventoPrecioComponent {
  @Input({ required: true }) evento!: Evento;

  get precioLabel(): string {
    return PRECIO_LABELS[this.evento.precioTipo] ?? this.evento.precioTipo;
  }

  get formattedAmount(): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: this.evento.precioMoneda,
      maximumFractionDigits: 0,
    }).format(this.evento.precioValor);
  }
}
