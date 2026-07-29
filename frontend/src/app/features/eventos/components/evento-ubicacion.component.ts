import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoogleMap, MapMarker } from '@angular/google-maps';
import { Evento } from '../../../shared/data-access/eventos/evento.types';

/**
 * EventoUbicacionComponent — dumb presentational panel for the event location
 * with an embedded Google Map.
 *
 * SRP: renders location details and a map marker at the event coordinates.
 * The Google Maps JS API is loaded by the GoogleMap component automatically.
 */
@Component({
  selector: 'app-evento-ubicacion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, GoogleMap, MapMarker],
  template: `
    <section class="space-y-4">
      <h2 class="text-headline-md text-on-surface font-headline">Ubicación</h2>

      <!-- Address info -->
      @if (evento.ubicacionNombre; as name) {
        <p class="text-body-lg text-on-surface font-semibold">{{ name }}</p>
      }
      <p class="text-body-md text-on-surface-variant">{{ evento.ubicacionDireccion }}</p>

      <!-- Google Map -->
      <div class="rounded-lg overflow-hidden border border-outline">
        <google-map
          [center]="center"
          [zoom]="zoom"
          height="300px"
          width="100%"
          [options]="mapOptions"
        >
          <map-marker
            [position]="markerPosition"
            [title]="evento.nombre"
          />
        </google-map>
      </div>
    </section>
  `,
})
export class EventoUbicacionComponent {
  @Input({ required: true }) evento!: Evento;

  /** Center coordinates for the map (derived from evento.coordenadas). */
  get center(): google.maps.LatLngLiteral {
    return this.evento.coordenadas;
  }

  /** Zoom level for the map. */
  readonly zoom = 14;

  /** Marker position (same as center). */
  get markerPosition(): google.maps.LatLngLiteral {
    return this.evento.coordenadas;
  }

  /** Map options — disable default UI for a cleaner look. */
  readonly mapOptions: google.maps.MapOptions = {
    mapTypeId: 'roadmap',
    streetViewControl: false,
    fullscreenControl: false,
  };
}
