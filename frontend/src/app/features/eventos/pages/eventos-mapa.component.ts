import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  Subject,
  catchError,
  of,
  startWith,
  map,
  takeUntil,
} from 'rxjs';

import { GoogleMap, MapMarker, MapInfoWindow } from '@angular/google-maps';
import { NgxSkeletonLoaderComponent } from 'ngx-skeleton-loader';

import { EventosService } from '../../../shared/data-access/eventos/eventos.service';
import { EventoMapDataItem } from '../../../shared/data-access/eventos/evento.types';

/** Internal state emitted by the data pipeline. */
interface MapState {
  loading: boolean;
  points: EventoMapDataItem[];
  error: string | null;
}

/** Chip descriptor for the filter bar. */
interface SubcategoriaChip {
  value: string;
  label: string;
}

/**
 * Map label lookup — human-friendly names for subcategorias.
 * Covers the 10 subcategorias from the seed and a fallback.
 */
const SUBCATEGORIA_LABELS: Record<string, string> = {
  conciertos: 'Conciertos',
  'ferias-gastronomicas': 'Ferias gastronómicas',
  talleres: 'Talleres',
  deportes: 'Deportes',
  culturales: 'Culturales',
  infantiles: 'Infantiles',
  'al-aire-libre': 'Al aire libre',
  conferencias: 'Conferencias',
  'networking-empresarial': 'Networking',
  'benéficos': 'Benéficos',
};

/** Format a subcategoriaId into a human-readable label. */
function toChipLabel(id: string): string {
  return SUBCATEGORIA_LABELS[id] ?? id;
}

/**
 * EventosMapaComponent — interactive map view of all approved eventos.
 *
 * Smart component that loads lightweight map data, renders markers on a
 * Google Map, and provides quick filter chips by subcategoria.
 */
@Component({
  selector: 'app-eventos-mapa',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    GoogleMap,
    MapMarker,
    MapInfoWindow,
    NgxSkeletonLoaderComponent,
  ],
  template: `
    <section class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 class="text-headline-xl text-on-surface font-headline mb-6">
        Mapa de Eventos
      </h1>

      <!-- Filter chips -->
      <div class="flex flex-wrap gap-2 mb-6" role="group" aria-label="Filtrar por categoría">
        @for (chip of chips(); track chip.value) {
          <button
            data-testid="filter-chip"
            (click)="selectChip(chip.value)"
            [class.bg-primary]="selectedChip() === chip.value"
            [class.text-on-primary]="selectedChip() === chip.value"
            [class.bg-surface-container-high]="selectedChip() !== chip.value"
            [class.text-on-surface]="selectedChip() !== chip.value"
            class="px-4 py-1.5 rounded-full text-label-md transition-colors cursor-pointer border border-outline"
          >
            {{ chip.label }}
          </button>
        }
      </div>

      <!-- Loading skeleton -->
      @if (loading()) {
        <div class="space-y-3" aria-label="Cargando mapa">
          <ngx-skeleton-loader
            count="1"
            [appearance]="'square'"
            [theme]="{ 'height.px': 400, 'border-radius': '0.75rem' }"
          />
        </div>
      }

      <!-- Error state -->
      @if (error(); as err) {
        <div class="mt-12 text-center" role="alert">
          <p class="text-body-lg text-error mb-4">{{ err }}</p>
          <button
            data-testid="retry-btn"
            (click)="retry()"
            class="px-6 py-2 bg-primary text-on-primary rounded-md text-label-md hover:bg-primary/90 transition-colors"
          >
            Reintentar
          </button>
        </div>
      }

      <!-- Empty state -->
      @if (!loading() && !error() && filteredPoints().length === 0) {
        <div class="mt-12 text-center">
          <p class="text-body-lg text-on-surface-variant">
            No hay eventos publicados con ubicación en el mapa.
          </p>
        </div>
      }

      <!-- Google Map -->
      @if (!loading() && !error() && filteredPoints().length > 0) {
        <div class="rounded-xl overflow-hidden border border-outline">
          <google-map
            [center]="mapCenter"
            [zoom]="zoom"
            height="450px"
            width="100%"
            [options]="mapOptions"
          >
            @for (point of filteredPoints(); track point.id) {
              <map-marker
                [position]="point.coordenadas"
                [title]="point.nombre"
                (mapClick)="onMarkerClick(point)"
              />
            }

            @if (selectedCoords(); as coords) {
              <map-info-window [position]="coords">
                @if (selectedPoint(); as point) {
                  <div data-testid="info-window-content" class="p-1 min-w-[180px]">
                    <p class="font-semibold text-sm text-gray-900">{{ point.nombre }}</p>
                    <p class="text-xs text-gray-600 mt-1">{{ point.fechaInicio | date:'shortDate' }}</p>
                    <p class="text-xs text-gray-500">{{ toChipLabel(point.subcategoriaId) }}</p>
                    <button
                      data-testid="ver-detalle-btn"
                      (click)="goToDetail(point.slug)"
                      class="mt-2 text-xs font-medium text-blue-600 hover:underline"
                    >
                      Ver detalle →
                    </button>
                  </div>
                }
              </map-info-window>
            }
          </google-map>
        </div>
      }
    </section>
  `,
})
export class EventosMapaComponent implements OnInit, OnDestroy {
  private readonly eventosService = inject(EventosService);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  readonly infoWindow = viewChild(MapInfoWindow);

  // ── State signals ─────────────────────────────────────────────────
  protected readonly loading = signal(true);
  protected readonly allPoints = signal<EventoMapDataItem[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly selectedChip = signal<string>('todas');
  protected readonly selectedPoint = signal<EventoMapDataItem | null>(null);
  protected readonly selectedCoords = signal<google.maps.LatLngLiteral | null>(null);

  /** Derived: points filtered by selected chip. */
  protected readonly filteredPoints = computed(() => {
    const chip = this.selectedChip();
    if (chip === 'todas') return this.allPoints();
    return this.allPoints().filter((p) => p.subcategoriaId === chip);
  });

  /** Derived: unique subcategoria chips from loaded data. */
  protected readonly chips = computed<SubcategoriaChip[]>(() => {
    const unique = new Set(this.allPoints().map((p) => p.subcategoriaId));
    const subcategorias = Array.from(unique).map((id) => ({
      value: id,
      label: toChipLabel(id),
    }));
    // Sort by label for consistency
    subcategorias.sort((a, b) => a.label.localeCompare(b.label));
    return [{ value: 'todas', label: 'Todas' }, ...subcategorias];
  });

  /** Default map center — Concón, Chile. */
  protected readonly mapCenter: google.maps.LatLngLiteral = {
    lat: -32.92,
    lng: -71.515,
  };

  /** Zoom level. */
  protected readonly zoom = 13;

  /** Map options. */
  protected readonly mapOptions: google.maps.MapOptions = {
    mapTypeId: 'roadmap',
    streetViewControl: false,
    fullscreenControl: false,
  };

  /** Exposed for template access. */
  protected readonly toChipLabel = toChipLabel;

  ngOnInit(): void {
    this.loadMapData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Fetch map data from the API. */
  private loadMapData(): void {
    this.eventosService
      .mapData()
      .pipe(
        map(
          (points): MapState => ({
            loading: false,
            points,
            error: null,
          }),
        ),
        catchError(() =>
          of<MapState>({
            loading: false,
            points: [],
            error: 'Error al cargar los datos del mapa. Intenta de nuevo.',
          }),
        ),
        startWith<MapState>({ loading: true, points: [], error: null }),
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe((state) => {
        this.loading.set(state.loading);
        this.allPoints.set(state.points);
        this.error.set(state.error);
        // Reset selection on new data
        this.selectedPoint.set(null);
        this.selectedCoords.set(null);
        this.selectedChip.set('todas');
      });
  }

  /** Select a filter chip. */
  protected selectChip(value: string): void {
    this.selectedChip.set(value);
    // Close info window when filtering
    this.selectedPoint.set(null);
    this.selectedCoords.set(null);
  }

  /** Handle marker click — show info window. */
  protected onMarkerClick(point: EventoMapDataItem): void {
    this.selectedPoint.set(point);
    this.selectedCoords.set(point.coordenadas);
    this.infoWindow()?.open();
  }

  /** Navigate to evento detail page. */
  protected goToDetail(slug: string): void {
    this.router.navigate(['/eventos', slug]);
  }

  /** Retry after error. */
  protected retry(): void {
    this.error.set(null);
    this.loading.set(true);
    this.loadMapData();
  }
}
