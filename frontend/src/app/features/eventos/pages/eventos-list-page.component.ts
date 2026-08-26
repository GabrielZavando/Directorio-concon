import { Component, ChangeDetectionStrategy, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  BehaviorSubject,
  Subject,
  Observable,
  switchMap,
  catchError,
  of,
  startWith,
  map,
  takeUntil,
} from 'rxjs';

import { EventosService } from '../../../shared/data-access/eventos/eventos.service';
import {
  Evento,
  EventoQuery,
} from '../../../shared/data-access/eventos/evento.types';
import { EventoCardComponent } from '../components/evento-card.component';
import {
  EventoFiltrosComponent,
  SubcategoriaOption,
  BarrioOption,
} from '../components/evento-filtros.component';
import { NgxSkeletonLoaderComponent } from 'ngx-skeleton-loader';

/**
 * Subcategorías semilla para el filtro. Misma fuente que evento-form-page.
 */
const SUBCATEGORIAS: SubcategoriaOption[] = [
  { id: 'conciertos', nombre: 'Conciertos' },
  { id: 'ferias-gastronomicas', nombre: 'Ferias Gastronómicas' },
  { id: 'talleres', nombre: 'Talleres' },
  { id: 'deportes', nombre: 'Deportes' },
  { id: 'cultura', nombre: 'Cultura' },
  { id: 'ferias-artesanales', nombre: 'Ferias Artesanales' },
  { id: 'infantiles', nombre: 'Infantiles' },
  { id: 'capacitacion', nombre: 'Capacitación' },
  { id: 'turismo', nombre: 'Turismo' },
  { id: 'otro', nombre: 'Otro' },
];

const BARRIOS: BarrioOption[] = [
  { id: 'centro', nombre: 'Centro' },
  { id: 'bosques', nombre: 'Bosques de Montemar' },
  { id: 'montemar', nombre: 'Montemar' },
  { id: 'la-boca', nombre: 'La Boca' },
  { id: 'los-lilos', nombre: 'Los Lilos' },
  { id: 'villa-alegre', nombre: 'Villa Alegre' },
  { id: 'renaca-alto', nombre: 'Reñaca Alto' },
  { id: 'castillo', nombre: 'Castillo' },
];

/**
 * Internal state shape emitted by the data pipeline.
 */
interface LoadState {
  loading: boolean;
  data: Evento[];
  error: string | null;
}

/**
 * EventosListPageComponent — public list of approved eventos.
 *
 * Smart component: owns data fetching via EventosService and filter state.
 * Delegates card rendering to EventoCardComponent and filters to EventoFiltrosComponent.
 */
@Component({
  selector: 'app-eventos-list-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    EventoCardComponent,
    EventoFiltrosComponent,
    NgxSkeletonLoaderComponent,
  ],
  template: `
    <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 class="text-headline-lg text-on-surface font-headline mb-6">Eventos en Concón</h1>

      <!-- Filters -->
      <app-evento-filtros
        [subcategorias]="subcategorias"
        [barrios]="barrios"
        (queryChange)="onQueryChange($event)"
        (subcategoriaIdChange)="onSubcategoriaChange($event)"
        (barrioIdChange)="onBarrioChange($event)"
        (fechaDesdeChange)="onFechaDesdeChange($event)"
        (fechaHastaChange)="onFechaHastaChange($event)"
        (precioTipoChange)="onPrecioTipoChange($event)"
      />

      <!-- Loading skeleton -->
      @if (loading()) {
        <div class="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          @for (_ of skeletonItems; track $index) {
            <div
              class="rounded-lg bg-surface-container-low p-4 space-y-3"
              style="height: 380px"
            >
              <ngx-skeleton-loader
                count="1"
                [appearance]="'square'"
                [theme]="{ 'height.px': 160, 'border-radius': '0.5rem', 'margin-bottom': '0' }"
              />
              <ngx-skeleton-loader
                count="2"
                [appearance]="'line'"
                [theme]="{ 'height.px': 16, 'border-radius': '0.25rem', 'margin-bottom': '0' }"
              />
            </div>
          }
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
      @if (!loading() && !error() && eventos().length === 0) {
        <div class="mt-12 text-center">
          <p class="text-body-lg text-on-surface-variant">
            No hay eventos que coincidan con tu búsqueda.
          </p>
        </div>
      }

      <!-- Cards grid -->
      @if (!loading() && eventos().length > 0) {
        <div class="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          @for (evento of eventos(); track evento.id) {
            <app-evento-card [evento]="evento" />
          }
        </div>
      }
    </section>
  `,
})
export class EventosListPageComponent implements OnInit, OnDestroy {
  private readonly eventosService = inject(EventosService);
  private readonly destroy$ = new Subject<void>();

  // ── Subcategorias / barrios refs for the filters (TODO: load from service) ──
  protected readonly subcategorias = SUBCATEGORIAS;
  protected readonly barrios = BARRIOS;

  /** Helper for skeleton @for loop */
  protected readonly skeletonItems = Array.from({ length: 6 });

  // ── State signals ─────────────────────────────────────────────────────────
  protected readonly loading = signal(true);
  protected readonly eventos = signal<Evento[]>([]);
  protected readonly error = signal<string | null>(null);

  /**
   * BehaviorSubject that drives data fetches.
   * Each emission triggers a new HTTP request via switchMap.
   */
  private readonly query$ = new BehaviorSubject<EventoQuery>({
    page: 1,
    limit: 20,
  });

  ngOnInit(): void {
    this.query$
      .pipe(
        switchMap(
          (q) =>
            this.eventosService.list(q).pipe(
              map(
                (res): LoadState => ({
                  loading: false,
                  data: res.data,
                  error: null,
                }),
              ),
              catchError(
                (): Observable<LoadState> =>
                  of({
                    loading: false,
                    data: [],
                    error: 'Error al cargar eventos. Intenta de nuevo.',
                  }),
              ),
              startWith<LoadState>({ loading: true, data: [], error: null }),
            ),
        ),
        takeUntil(this.destroy$),
      )
      .subscribe((state) => {
        this.loading.set(state.loading);
        this.eventos.set(state.data);
        this.error.set(state.error);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.query$.complete();
  }

  // ── Filter handlers ───────────────────────────────────────────────────────

  protected onQueryChange(q: string): void {
    this.updateQuery({ q: q || undefined });
  }

  protected onSubcategoriaChange(subcategoriaId: string): void {
    this.updateQuery({ subcategoriaId: subcategoriaId || undefined });
  }

  protected onBarrioChange(barrioId: string): void {
    this.updateQuery({ barrioId: barrioId || undefined });
  }

  protected onFechaDesdeChange(fechaDesde: string): void {
    this.updateQuery({ fechaDesde: fechaDesde || undefined });
  }

  protected onFechaHastaChange(fechaHasta: string): void {
    this.updateQuery({ fechaHasta: fechaHasta || undefined });
  }

  protected onPrecioTipoChange(precioTipo: string): void {
    this.updateQuery({ precioTipo: (precioTipo || undefined) as any });
  }

  /** Retry loading after error. */
  protected retry(): void {
    this.error.set(null);
    this.query$.next(this.query$.value);
  }

  // ── Private ───────────────────────────────────────────────────────────────

  /**
   * Merge partial query into current and emit.
   * Resets page to 1 when any filter changes.
   */
  private updateQuery(partial: Partial<EventoQuery>): void {
    this.query$.next({ ...this.query$.value, ...partial, page: 1 });
  }
}


