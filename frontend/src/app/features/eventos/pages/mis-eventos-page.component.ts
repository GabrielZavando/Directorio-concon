import { Component, ChangeDetectionStrategy, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { EventosService } from '../../../shared/data-access/eventos/eventos.service';
import { Evento } from '../../../shared/data-access/eventos/evento.types';

/**
 * Status display config with label and CSS class.
 */
const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pendiente: { label: 'Pendiente', cls: 'bg-warning/10 text-warning border-warning/20' },
  aprobado: { label: 'Aprobado', cls: 'bg-success/10 text-success border-success/20' },
  rechazado: { label: 'Rechazado', cls: 'bg-error/10 text-error border-error/20' },
};

/**
 * MisEventosPageComponent — empresa panel showing own eventos.
 *
 * Smart component: injects EventosService, fetches eventos by usuarioId stub.
 * Shows status badges, actions (ver, editar, eliminar), loading/error/empty states.
 */
@Component({
  selector: 'app-mis-eventos-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, NgxSkeletonLoaderModule],
  template: `
    <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-headline-lg text-on-surface font-headline">Mis Eventos</h1>
        <a
          routerLink="/eventos/nuevo"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-on-primary text-label-md font-medium hover:bg-primary/90 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Evento
        </a>
      </div>

      <!-- Loading skeleton -->
      @if (loading()) {
        <div data-testid="skeleton" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          @for (_ of [1,2,3]; track $index) {
            <ngx-skeleton-loader
              [theme]="{ 'border-radius': '0.5rem', height: '200px' }"
            />
          }
        </div>
      }

      <!-- Error state -->
      @if (error(); as errMsg) {
        <div
          data-testid="error-message"
          class="p-4 rounded-md bg-error/10 border border-error/20 text-error text-body-md"
          role="alert"
        >
          <p class="font-semibold mb-1">Error al cargar tus eventos</p>
          <p>{{ errMsg }}</p>
          <button
            data-testid="retry-btn"
            (click)="loadMisEventos()"
            class="mt-3 px-4 py-2 rounded-md bg-error/20 text-error text-label-md font-medium hover:bg-error/30 transition-colors"
          >
            Reintentar
          </button>
        </div>
      }

      <!-- Empty state -->
      @if (!loading() && !error() && eventos().length === 0) {
        <div
          data-testid="empty-message"
          class="text-center py-16 text-on-surface-variant"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 mx-auto mb-4 text-on-surface-variant/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p class="text-body-lg font-medium mb-1">No tienes eventos publicados</p>
          <p class="text-body-md">Crea tu primer evento para aparecer en el directorio.</p>
        </div>
      }

      <!-- Eventos list -->
      @if (!loading() && !error() && eventos().length > 0) {
        <div class="overflow-x-auto rounded-lg border border-outline-variant">
          <table class="w-full text-left text-body-md" role="table">
            <thead class="bg-surface-container-high text-label-sm text-on-surface-variant uppercase tracking-wider">
              <tr>
                <th scope="col" class="px-4 py-3">Nombre</th>
                <th scope="col" class="px-4 py-3">Fecha</th>
                <th scope="col" class="px-4 py-3">Estado</th>
                <th scope="col" class="px-4 py-3">Status</th>
                <th scope="col" class="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-variant/50">
              @for (evento of eventos(); track evento.id) {
                <tr data-testid="evento-item" class="hover:bg-surface-container-low transition-colors">
                  <td class="px-4 py-3 font-medium text-on-surface">
                    {{ evento.nombre }}
                  </td>
                  <td class="px-4 py-3 text-on-surface-variant whitespace-nowrap">
                    {{ formatDate(evento.fechaInicio) }}
                  </td>
                  <td class="px-4 py-3">
                    <span class="text-label-sm text-on-surface-variant">
                      {{ estadoLabel(evento.estado) }}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <span
                      data-testid="status-badge"
                      [class]="'inline-block text-label-sm px-2.5 py-0.5 rounded-full border ' + statusCls(evento.status)"
                    >
                      {{ statusLabel(evento.status) }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-right">
                    <div class="flex items-center justify-end gap-2">
                      <a
                        data-testid="ver-btn"
                        [routerLink]="['/eventos', evento.slug]"
                        class="px-3 py-1.5 rounded-md text-label-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      >
                        Ver
                      </a>
                      <a
                        data-testid="editar-btn"
                        [routerLink]="['/eventos', evento.id, 'editar']"
                        class="px-3 py-1.5 rounded-md text-label-sm font-medium bg-secondary/20 text-on-surface hover:bg-secondary/30 transition-colors"
                      >
                        Editar
                      </a>
                      <button
                        data-testid="eliminar-btn"
                        (click)="eliminar(evento)"
                        class="px-3 py-1.5 rounded-md text-label-sm font-medium bg-error/10 text-error hover:bg-error/20 transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `,
})
export class MisEventosPageComponent implements OnInit {
  private readonly eventosService = inject(EventosService);

  /** Reactive state */
  protected readonly eventos = signal<Evento[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadMisEventos();
  }

  // ── Public (template) helpers ──────────────────────────────────────

  protected statusLabel(status: string): string {
    return STATUS_MAP[status]?.label ?? status;
  }

  protected statusCls(status: string): string {
    return STATUS_MAP[status]?.cls ?? '';
  }

  protected estadoLabel(estado: string): string {
    const map: Record<string, string> = {
      borrador: 'Borrador',
      programado: 'Programado',
      en_curso: 'En curso',
      finalizado: 'Finalizado',
      cancelado: 'Cancelado',
      suspendido: 'Suspendido',
    };
    return map[estado] ?? estado;
  }

  protected formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // ── Actions ────────────────────────────────────────────────────────

  protected loadMisEventos(): void {
    this.loading.set(true);
    this.error.set(null);

    // TODO(auth-mvp): replace hardcoded usuarioId with real auth
    const USUARIO_ID_STUB = 'stub-usuario';

    this.eventosService.misEventos(USUARIO_ID_STUB).subscribe({
      next: (res) => {
        this.eventos.set(res.data ?? []);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message ?? 'Error desconocido');
        this.loading.set(false);
      },
    });
  }

  protected eliminar(evento: Evento): void {
    const confirmed = window.confirm(
      `¿Estás seguro de eliminar "${evento.nombre}"? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;

    this.eventosService.remove(evento.id).subscribe({
      next: () => {
        // Remove from local list optimistically
        this.eventos.update((list) => list.filter((e) => e.id !== evento.id));
      },
      error: (err) => {
        // For stub purposes, remove anyway
        this.eventos.update((list) => list.filter((e) => e.id !== evento.id));
      },
    });
  }
}
