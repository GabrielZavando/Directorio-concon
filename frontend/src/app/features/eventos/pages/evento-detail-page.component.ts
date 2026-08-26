import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, catchError, of, startWith, map, takeUntil } from 'rxjs';

import { EventosService } from '../../../shared/data-access/eventos/eventos.service';
import { Evento } from '../../../shared/data-access/eventos/evento.types';
import { EventoInfoComponent } from '../components/evento-info.component';
import { EventoOrganizadorComponent } from '../components/evento-organizador.component';
import { EventoPrecioComponent } from '../components/evento-precio.component';
import { EventoUbicacionComponent } from '../components/evento-ubicacion.component';
import { NgxSkeletonLoaderComponent } from 'ngx-skeleton-loader';

/**
 * Internal state emitted by the data pipeline.
 */
interface DetailState {
  loading: boolean;
  data: Evento | null;
  error: string | null;
  notFound: boolean;
}

/**
 * EventoDetailPageComponent — detail view for a single evento.
 *
 * Smart component: reads the slug from the route param, fetches the evento
 * via EventosService, and renders the detail sub-components.
 * Handles loading, 404, and error states.
 */
@Component({
  selector: 'app-evento-detail-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    EventoInfoComponent,
    EventoOrganizadorComponent,
    EventoPrecioComponent,
    EventoUbicacionComponent,
    NgxSkeletonLoaderComponent,
  ],
  template: `
    <section class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Back link -->
      <a
        data-testid="volver-link"
        routerLink="/eventos"
        class="inline-flex items-center gap-1 text-label-md text-primary hover:underline mb-6"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Volver al listado
      </a>

      <!-- Loading skeleton -->
      @if (loading()) {
        <div class="space-y-4">
          <ngx-skeleton-loader count="1" [appearance]="'line'" [theme]="{ 'height.px': 32, 'width': '60%', 'border-radius': '0.25rem' }" />
          <ngx-skeleton-loader count="3" [appearance]="'line'" [theme]="{ 'height.px': 16, 'border-radius': '0.25rem' }" />
          <ngx-skeleton-loader count="1" [appearance]="'square'" [theme]="{ 'height.px': 200, 'border-radius': '0.75rem' }" />
        </div>
      }

      <!-- 404 state -->
      @if (notFound()) {
        <div class="mt-12 text-center">
          <h1 class="text-headline-lg text-on-surface font-headline mb-2">Evento no encontrado</h1>
          <p class="text-body-md text-on-surface-variant mb-6">
            El evento que buscas no existe o ha sido eliminado.
          </p>
          <a
            routerLink="/eventos"
            class="px-6 py-2 bg-primary text-on-primary rounded-md text-label-md hover:bg-primary/90 transition-colors"
          >
            Ver todos los eventos
          </a>
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

      <!-- Detail content -->
      @if (!loading() && !notFound() && !error() && evento(); as evt) {
        <article class="space-y-8">
          <header>
            <h1 class="text-headline-xl text-on-surface font-headline">{{ evt.nombre }}</h1>
            <p class="text-body-lg text-on-surface-variant mt-2">{{ evt.descripcionCorta }}</p>
          </header>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <!-- Main content -->
            <div class="lg:col-span-2 space-y-8">
              <app-evento-info [evento]="evt" />
              <app-evento-ubicacion [evento]="evt" />
            </div>

            <!-- Sidebar -->
            <aside class="space-y-6">
              <app-evento-organizador [evento]="evt" />
              <app-evento-precio [evento]="evt" />
            </aside>
          </div>
        </article>
      }
    </section>
  `,
})
export class EventoDetailPageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly eventosService = inject(EventosService);
  private readonly destroy$ = new Subject<void>();

  // ── State signals ─────────────────────────────────────────────────
  protected readonly loading = signal(true);
  protected readonly evento = signal<Evento | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly notFound = signal(false);

  /** Current slug from route. Set externally by the test or via ActivatedRoute. */
  protected slug: string | null = null;

  ngOnInit(): void {
    // Subscribe to route params for the slug
    this.route.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        const slug = params.get('slug');
        if (slug) {
          this.slug = slug;
          this.loadEvento();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Fetch evento data from the API. */
  protected loadEvento(): void {
    if (!this.slug) return;

    this.eventosService
      .getBySlug(this.slug)
      .pipe(
        map(
          (res): DetailState => ({
            loading: false,
            data: res.data,
            error: null,
            notFound: false,
          }),
        ),
        catchError((err) => {
          if (err.status === 404) {
            return of<DetailState>({
              loading: false,
              data: null,
              error: null,
              notFound: true,
            });
          }
          return of<DetailState>({
            loading: false,
            data: null,
            error: 'Error al cargar el evento. Intenta de nuevo.',
            notFound: false,
          });
        }),
        startWith<DetailState>({
          loading: true,
          data: null,
          error: null,
          notFound: false,
        }),
      )
      .subscribe((state) => {
        this.loading.set(state.loading);
        this.evento.set(state.data);
        this.error.set(state.error);
        this.notFound.set(state.notFound);
      });
  }

  /** Retry after error. */
  protected retry(): void {
    this.error.set(null);
    this.loadEvento();
  }
}
