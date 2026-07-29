import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Evento } from '../../../shared/data-access/eventos/evento.types';

/**
 * Subcategorías semilla para categoriaId 'eventos'.
 * TODO: cargar desde CategoriasService cuando exista (misma fuente que evento-form-page).
 */
const SUBCATEGORIA_LABELS: Record<string, string> = {
  conciertos: 'Conciertos',
  'ferias-gastronomicas': 'Ferias Gastronómicas',
  talleres: 'Talleres',
  deportes: 'Deportes',
  cultura: 'Cultura',
  'ferias-artesanales': 'Ferias Artesanales',
  infantiles: 'Infantiles',
  capacitacion: 'Capacitación',
  turismo: 'Turismo',
  otro: 'Otro',
};

/**
 * Display labels for precioTipo.
 */
const PRECIO_TIPO_LABELS: Record<string, string> = {
  gratis: 'Gratis',
  pago: 'Pago',
  donacion: 'Donación',
  invitacion: 'Invitación',
};

/**
 * EventoCardComponent — dumb presentational card for an Evento.
 *
 * SRP: only renders the evento data. No Router, no HttpClient, no data services.
 * The smart parent owns navigation and data fetching.
 */
@Component({
  selector: 'app-evento-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  template: `
    <article
      class="bg-surface-container-low rounded-lg shadow-elevation-1 hover:shadow-elevation-2 transition-shadow duration-200 overflow-hidden flex flex-col"
    >
      <!-- Portada image or skeleton placeholder -->
      <a [routerLink]="['/eventos', evento.slug]" class="block aspect-video overflow-hidden bg-surface-container">
        @if (evento.portada; as src) {
          <img
            [src]="src"
            [alt]="'Portada de ' + evento.nombre"
            class="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            loading="lazy"
          />
        } @else {
          <div
            data-testid="portada-placeholder"
            class="w-full h-full flex items-center justify-center bg-surface-container"
          >
            <span class="text-body-sm text-on-surface-variant/40">Sin imagen</span>
          </div>
        }
      </a>

      <!-- Body -->
      <div class="p-4 flex flex-col gap-2 flex-1">
        <!-- Subcategoria badge -->
        <div class="flex items-center gap-2 flex-wrap">
          <span
            data-testid="subcategoria-badge"
            class="inline-block text-label-sm px-2 py-0.5 rounded-full bg-primary/10 text-primary"
          >
            {{ subcategoriaLabel }}
          </span>
          <span
            data-testid="precio-badge"
            class="inline-block text-label-sm px-2 py-0.5 rounded-full bg-secondary/20 text-on-surface"
          >
            {{ precioLabel }}
          </span>
        </div>

        <!-- Nombre -->
        <a [routerLink]="['/eventos', evento.slug]">
          <h3 class="text-headline-md text-on-surface font-headline line-clamp-2 hover:text-primary transition-colors">
            {{ evento.nombre }}
          </h3>
        </a>

        <!-- Descripción corta -->
        <p class="text-body-md text-on-surface-variant line-clamp-2">
          {{ evento.descripcionCorta }}
        </p>

        <!-- Meta row: fecha + barrio -->
        <div class="flex items-center gap-3 text-body-sm text-on-surface-variant mt-auto pt-2">
          <span class="flex items-center gap-1 text-on-surface-variant">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {{ fechaFormateada }}
          </span>
          <span class="flex items-center gap-1 text-on-surface-variant">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {{ evento.barrioId }}
          </span>
        </div>
      </div>
    </article>
  `,
})
export class EventoCardComponent {
  /**
   * The evento to render. Required.
   */
  @Input({ required: true }) evento!: Evento;

  /**
   * Computed display label for subcategoriaId.
   */
  get subcategoriaLabel(): string {
    return SUBCATEGORIA_LABELS[this.evento.subcategoriaId] ?? this.evento.subcategoriaId;
  }

  /**
   * Computed display label for precioTipo.
   */
  get precioLabel(): string {
    return PRECIO_TIPO_LABELS[this.evento.precioTipo] ?? this.evento.precioTipo;
  }

  /**
   * Formatted fechaInicio for display.
   */
  get fechaFormateada(): string {
    const date = new Date(this.evento.fechaInicio);
    return date.toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
}
