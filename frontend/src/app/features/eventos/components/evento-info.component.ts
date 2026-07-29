import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Evento } from '../../../shared/data-access/eventos/evento.types';

/**
 * Labels for publicoObjetivo enum values.
 */
const PUBLICO_LABELS: Record<string, string> = {
  todos: 'Todo público',
  ninos: 'Niños',
  adolescentes: 'Adolescentes',
  adultos: 'Adultos',
  familia: 'Familiar',
  tercera_edad: 'Tercera edad',
  mascotas: 'Mascotas',
};

/**
 * Labels for nivelRuido enum values.
 */
const RUIDO_LABELS: Record<string, string> = {
  bajo: 'Bajo',
  medio: 'Medio',
  alto: 'Alto',
};

/**
 * Labels for accesibilidad enum values.
 */
const ACCESIBILIDAD_LABELS: Record<string, string> = {
  'acceso-silla-ruedas': 'Acceso silla de ruedas',
  'banos-accesibles': 'Baños accesibles',
  'estacionamiento-reservado': 'Estacionamiento reservado',
  'interprete-senas': 'Intérprete de señas',
  'material-braille': 'Material Braille',
  'rampa-acceso': 'Rampa de acceso',
};

/**
 * EventoInfoComponent — dumb presentational panel for evento details.
 *
 * Renders the full description, dates, capacity, publico, ruido, and accesibilidad.
 */
@Component({
  selector: 'app-evento-info',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <section class="space-y-6">
      <!-- Descripción -->
      <div>
        <h2 class="text-headline-md text-on-surface font-headline mb-2">Descripción</h2>
        <p class="text-body-md text-on-surface-variant whitespace-pre-line">
          {{ evento.descripcion }}
        </p>
      </div>

      <!-- Fechas -->
      <div>
        <h3 class="text-label-md text-on-surface font-semibold mb-2">Fechas y horarios</h3>
        <p class="text-body-md text-on-surface-variant">
          {{ fechaFormateada }}
        </p>
      </div>

      <!-- Capacidad -->
      @if (evento.capacidadMaxima != null) {
        <div>
          <h3 class="text-label-md text-on-surface font-semibold mb-2">Capacidad</h3>
          <p class="text-body-md text-on-surface-variant">
            {{ evento.capacidadMaxima }} personas
          </p>
        </div>
      }

      <!-- Público objetivo -->
      <div>
        <h3 class="text-label-md text-on-surface font-semibold mb-2">Público objetivo</h3>
        <div class="flex flex-wrap gap-2">
          @for (item of evento.publicoObjetivo; track item) {
            <span
              data-testid="publico-badge"
              class="inline-block text-label-sm px-2 py-0.5 rounded-full bg-primary/10 text-primary"
            >
              {{ publicoLabel(item) }}
            </span>
          }
        </div>
      </div>

      <!-- Nivel de ruido -->
      <div>
        <h3 class="text-label-md text-on-surface font-semibold mb-2">Nivel de ruido</h3>
        <span class="inline-block text-label-sm px-2 py-0.5 rounded-full bg-tertiary/10 text-tertiary">
          {{ ruidoLabel }}
        </span>
      </div>

      <!-- Accesibilidad -->
      @if (evento.accesibilidad.length > 0) {
        <div>
          <h3 class="text-label-md text-on-surface font-semibold mb-2">Accesibilidad</h3>
          <div class="flex flex-wrap gap-2">
            @for (item of evento.accesibilidad; track item) {
              <span
                data-testid="accesibilidad-badge"
                class="inline-block text-label-sm px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface"
              >
                {{ accesibilidadLabel(item) }}
              </span>
            }
          </div>
        </div>
      }
    </section>
  `,
})
export class EventoInfoComponent {
  @Input({ required: true }) evento!: Evento;

  /** Formatted date range for display. */
  get fechaFormateada(): string {
    const inicio = new Date(this.evento.fechaInicio);
    const fin = new Date(this.evento.fechaFin);
    const opts: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };
    return `${inicio.toLocaleDateString('es-CL', opts)} – ${fin.toLocaleDateString('es-CL', opts)}`;
  }

  /** Display label for nivelRuido. */
  get ruidoLabel(): string {
    return RUIDO_LABELS[this.evento.nivelRuido] ?? this.evento.nivelRuido;
  }

  /** Display label for a publicoObjetivo value. */
  publicoLabel(value: string): string {
    return PUBLICO_LABELS[value] ?? value;
  }

  /** Display label for an accesibilidad value. */
  accesibilidadLabel(value: string): string {
    return ACCESIBILIDAD_LABELS[value] ?? value;
  }
}
