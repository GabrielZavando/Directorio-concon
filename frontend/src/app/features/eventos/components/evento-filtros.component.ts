import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormGroup,
  FormControl,
  ReactiveFormsModule,
} from '@angular/forms';
import { Subject, debounceTime, takeUntil, distinctUntilChanged, skip } from 'rxjs';

/**
 * Subcategoría option for the filter select.
 */
export interface SubcategoriaOption {
  id: string;
  nombre: string;
}

/**
 * Barrio option for the filter select.
 */
export interface BarrioOption {
  id: string;
  nombre: string;
}

/**
 * EventoFiltrosComponent — dumb presentational filter bar for the eventos list.
 *
 * Emits individual output events when each filter changes.
 * The smart parent subscribes to these outputs and feeds them to EventosService.
 *
 * SRP: only renders filter controls and emits typed events.
 * No Router, no HttpClient, no data services.
 */
@Component({
  selector: 'app-evento-filtros',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="flex flex-wrap items-end gap-3">
      <!-- Search text -->
      <div class="flex-1 min-w-[200px]">
        <label for="filtro-q" class="block text-label-sm text-on-surface mb-1">Buscar</label>
        <input
          id="filtro-q"
          data-testid="filtro-q"
          type="search"
          [formControl]="form.controls.q"
          class="w-full rounded-md border border-outline bg-surface px-3 py-2 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Nombre del evento…"
        />
      </div>

      <!-- Subcategoría -->
      <div>
        <label for="filtro-subcategoria" class="block text-label-sm text-on-surface mb-1">Categoría</label>
        <select
          id="filtro-subcategoria"
          data-testid="filtro-subcategoria"
          [formControl]="form.controls.subcategoriaId"
          class="rounded-md border border-outline bg-surface px-3 py-2 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Todas</option>
          @for (sub of subcategorias; track sub.id) {
            <option [value]="sub.id">{{ sub.nombre }}</option>
          }
        </select>
      </div>

      <!-- Barrio -->
      <div>
        <label for="filtro-barrio" class="block text-label-sm text-on-surface mb-1">Barrio</label>
        <select
          id="filtro-barrio"
          data-testid="filtro-barrio"
          [formControl]="form.controls.barrioId"
          class="rounded-md border border-outline bg-surface px-3 py-2 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Todos</option>
          @for (barrio of barrios; track barrio.id) {
            <option [value]="barrio.id">{{ barrio.nombre }}</option>
          }
        </select>
      </div>

      <!-- Fecha desde -->
      <div>
        <label for="filtro-fecha-desde" class="block text-label-sm text-on-surface mb-1">Desde</label>
        <input
          id="filtro-fecha-desde"
          data-testid="filtro-fecha-desde"
          type="date"
          [formControl]="form.controls.fechaDesde"
          class="rounded-md border border-outline bg-surface px-3 py-2 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <!-- Fecha hasta -->
      <div>
        <label for="filtro-fecha-hasta" class="block text-label-sm text-on-surface mb-1">Hasta</label>
        <input
          id="filtro-fecha-hasta"
          data-testid="filtro-fecha-hasta"
          type="date"
          [formControl]="form.controls.fechaHasta"
          class="rounded-md border border-outline bg-surface px-3 py-2 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <!-- Precio -->
      <div>
        <label for="filtro-precio-tipo" class="block text-label-sm text-on-surface mb-1">Precio</label>
        <select
          id="filtro-precio-tipo"
          data-testid="filtro-precio-tipo"
          [formControl]="form.controls.precioTipo"
          class="rounded-md border border-outline bg-surface px-3 py-2 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Todos</option>
          <option value="gratis">Gratis</option>
          <option value="pago">Pago</option>
          <option value="donacion">Donación</option>
          <option value="invitacion">Invitación</option>
        </select>
      </div>
    </div>
  `,
})
export class EventoFiltrosComponent implements OnInit, OnDestroy {
  /** Available subcategorias for the filter dropdown. */
  @Input({ required: true }) subcategorias: SubcategoriaOption[] = [];

  /** Available barrios for the filter dropdown. */
  @Input({ required: true }) barrios: BarrioOption[] = [];

  // ── Outputs ───────────────────────────────────────────────────────

  /** Emits the current search query string. */
  @Output() queryChange = new EventEmitter<string>();

  /** Emits the selected subcategoriaId (empty string = all). */
  @Output() subcategoriaIdChange = new EventEmitter<string>();

  /** Emits the selected barrioId (empty string = all). */
  @Output() barrioIdChange = new EventEmitter<string>();

  /** Emits the selected fechaDesde (ISO date string or empty). */
  @Output() fechaDesdeChange = new EventEmitter<string>();

  /** Emits the selected fechaHasta (ISO date string or empty). */
  @Output() fechaHastaChange = new EventEmitter<string>();

  /** Emits the selected precioTipo string or empty for all. */
  @Output() precioTipoChange = new EventEmitter<string>();

  // ── Reactive form ─────────────────────────────────────────────────

  readonly form = new FormGroup({
    q: new FormControl<string>('', { nonNullable: true }),
    subcategoriaId: new FormControl<string>('', { nonNullable: true }),
    barrioId: new FormControl<string>('', { nonNullable: true }),
    fechaDesde: new FormControl<string>('', { nonNullable: true }),
    fechaHasta: new FormControl<string>('', { nonNullable: true }),
    precioTipo: new FormControl<string>('', { nonNullable: true }),
  });

  private readonly destroy$ = new Subject<void>();

  ngOnInit(): void {
    // Debounce the text query. valueChanges does NOT emit initial value;
    // distincUntilChanged prevents repeated same-value emissions.
    this.form.controls.q.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((val) => this.queryChange.emit(val));

    // Emit other filters immediately on change
    this.form.controls.subcategoriaId.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((val) => this.subcategoriaIdChange.emit(val));

    this.form.controls.barrioId.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((val) => this.barrioIdChange.emit(val));

    this.form.controls.fechaDesde.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((val) => this.fechaDesdeChange.emit(val));

    this.form.controls.fechaHasta.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((val) => this.fechaHastaChange.emit(val));

    this.form.controls.precioTipo.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((val) => this.precioTipoChange.emit(val));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
