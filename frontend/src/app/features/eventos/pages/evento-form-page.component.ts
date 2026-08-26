import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

import { EventosService } from '../../../shared/data-access/eventos/eventos.service';
import { CreateEvento } from '../../../shared/data-access/eventos/evento.types';
import { EventoFormOrganizadorComponent } from '../components/evento-form-organizador.component';
import { EventoFormUbicacionComponent } from '../components/evento-form-ubicacion.component';
import { EventoFormFechasComponent } from '../components/evento-form-fechas.component';
import { EventoFormPrecioComponent } from '../components/evento-form-precio.component';
import { EventoFormPublicoYAccesibilidadComponent } from '../components/evento-form-publico-y-accesibilidad.component';

/**
 * Subcategorías semilla para categoriaId 'eventos'.
 * TODO: cargar desde CategoriasService cuando exista.
 */
const SUBCATEGORIAS = [
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
] as const;

/**
 * Cross-field validator: fechaFin must be after fechaInicio.
 */
function fechaFinValidator(group: FormGroup): Record<string, boolean> | null {
  const inicio = group.get('fechaInicio')?.value;
  const fin = group.get('fechaFin')?.value;
  if (inicio && fin && new Date(fin) <= new Date(inicio)) {
    return { fechaFinMenor: true };
  }
  return null;
}

/**
 * Cross-field validator: if precioTipo is 'gratis', precioValor must be 0.
 */
function precioGratisValidator(
  group: FormGroup,
): Record<string, boolean> | null {
  const tipo = group.get('precioTipo')?.value;
  const valor = group.get('precioValor')?.value;
  if (tipo === 'gratis' && valor > 0) {
    return { precioGratisInvalido: true };
  }
  return null;
}

/**
 * EventoFormPageComponent — smart component for creating/editing eventos.
 *
 * Handles form creation, validation, and submission via EventosService.
 * Delegates field rendering to 5 dumb sub-components.
 */
@Component({
  selector: 'app-evento-form-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    EventoFormOrganizadorComponent,
    EventoFormUbicacionComponent,
    EventoFormFechasComponent,
    EventoFormPrecioComponent,
    EventoFormPublicoYAccesibilidadComponent,
  ],
  template: `
    <section class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 class="text-headline-lg text-on-surface font-headline mb-6">
        {{ isEditing ? 'Editar Evento' : 'Nuevo Evento' }}
      </h1>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-8" novalidate>
        <!-- Nombre -->
        <div>
          <label for="nombre" class="block text-label-sm text-on-surface mb-1">
            Nombre del evento *
          </label>
          <input
            id="nombre"
            type="text"
            formControlName="nombre"
            class="w-full rounded-custom border border-outline px-3 py-2 text-body-md bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            [class.border-error]="showError('nombre')"
            aria-describedby="nombre-error"
            placeholder="Ej: Feria Gastronómica 2026"
          />
          @if (showError('nombre')) {
            <p id="nombre-error" class="text-error text-label-sm mt-1" role="alert">
              {{ getError('nombre') }}
            </p>
          }
        </div>

        <!-- Descripción corta -->
        <div>
          <label for="descripcionCorta" class="block text-label-sm text-on-surface mb-1">
            Descripción corta *
          </label>
          <input
            id="descripcionCorta"
            type="text"
            formControlName="descripcionCorta"
            class="w-full rounded-custom border border-outline px-3 py-2 text-body-md bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            [class.border-error]="showError('descripcionCorta')"
            aria-describedby="descCorta-error"
            placeholder="Breve descripción (máx. 140 caracteres)"
          />
          @if (showError('descripcionCorta')) {
            <p id="descCorta-error" class="text-error text-label-sm mt-1" role="alert">
              {{ getError('descripcionCorta') }}
            </p>
          }
        </div>

        <!-- Descripción larga -->
        <div>
          <label for="descripcion" class="block text-label-sm text-on-surface mb-1">
            Descripción *
          </label>
          <textarea
            id="descripcion"
            formControlName="descripcion"
            rows="4"
            class="w-full rounded-custom border border-outline px-3 py-2 text-body-md bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            [class.border-error]="showError('descripcion')"
            aria-describedby="desc-error"
            placeholder="Descripción completa del evento (mín. 10 caracteres)"
          ></textarea>
          @if (showError('descripcion')) {
            <p id="desc-error" class="text-error text-label-sm mt-1" role="alert">
              {{ getError('descripcion') }}
            </p>
          }
        </div>

        <!-- Subcategoría -->
        <div>
          <label for="subcategoriaId" class="block text-label-sm text-on-surface mb-1">
            Categoría del evento *
          </label>
          <select
            id="subcategoriaId"
            formControlName="subcategoriaId"
            class="w-full rounded-custom border border-outline px-3 py-2 text-body-md bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            [class.border-error]="showError('subcategoriaId')"
            aria-describedby="subcat-error"
          >
            <option value="" disabled>Selecciona una categoría</option>
            @for (cat of subcategorias; track cat.id) {
              <option [value]="cat.id">{{ cat.nombre }}</option>
            }
          </select>
          @if (showError('subcategoriaId')) {
            <p id="subcat-error" class="text-error text-label-sm mt-1" role="alert">
              Selecciona una categoría.
            </p>
          }
        </div>

        <!-- Sub-componentes dumb -->
        <app-evento-form-organizador [form]="form" />
        <app-evento-form-ubicacion [form]="form" />
        <app-evento-form-fechas [form]="form" />
        <app-evento-form-precio [form]="form" />
        <app-evento-form-publico-y-accesibilidad [form]="form" />

        <!-- Errores generales del formulario -->
        @if (submitError) {
          <div class="bg-error-container text-error p-4 rounded-custom" role="alert">
            <p class="text-label-md font-semibold">Error al guardar</p>
            <p class="text-body-md">{{ submitError }}</p>
          </div>
        }

        <!-- Acciones -->
        <div class="flex items-center gap-4 pt-4 border-t border-outline-variant">
          <button
            type="submit"
            [disabled]="form.invalid || submitting"
            class="bg-primary hover:bg-primary-container text-white px-6 py-2.5 rounded-custom font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ submitting ? 'Guardando...' : isEditing ? 'Actualizar' : 'Publicar Evento' }}
          </button>
          <button
            type="button"
            class="text-on-surface-variant hover:text-primary px-4 py-2 text-sm font-medium transition"
            (click)="cancel()"
          >
            Cancelar
          </button>
        </div>
      </form>
    </section>
  `,
})
export class EventoFormPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly eventosService = inject(EventosService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly subcategorias = SUBCATEGORIAS;

  /** True if editing an existing evento (route has :id param). */
  protected isEditing = false;
  protected submitting = false;
  protected submitError: string | null = null;

  /** The reactive form. */
  readonly form: FormGroup = this.fb.group(
    {
      nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
      descripcionCorta: [
        '',
        [Validators.required, Validators.minLength(1), Validators.maxLength(140)],
      ],
      descripcion: [
        '',
        [Validators.required, Validators.minLength(10), Validators.maxLength(2000)],
      ],
      subcategoriaId: ['', Validators.required],
      barrioId: ['', Validators.required],
      organizador: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(200)]],
      organizadorContacto: [''],
      organizadorWeb: [''],
      ubicacionNombre: [''],
      ubicacionDireccion: ['', [Validators.required, Validators.maxLength(200)]],
      coordenadas: this.fb.group({
        lat: [null, Validators.required],
        lng: [null, Validators.required],
      }),
      fechaInicio: ['', Validators.required],
      fechaFin: ['', Validators.required],
      precioTipo: ['', Validators.required],
      precioValor: [0, [Validators.required, Validators.min(0)]],
      precioMoneda: ['CLP'],
      capacidadMaxima: [null],
      publicoObjetivo: [[] as string[], Validators.required],
      nivelRuido: ['', Validators.required],
      portada: [''],
      accesibilidad: [[] as string[]],
    },
    { validators: [fechaFinValidator, precioGratisValidator] },
  );

  ngOnInit(): void {
    // Check if editing: look for :id in route params
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.isEditing = true;
      // TODO(evento-form): load existing evento data via EventosService.getById(idParam)
      // and patch form values. This is blocked by auth header stubs.
    }
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.submitting) return;

    this.submitting = true;
    this.submitError = null;

    const dto: CreateEvento = {
      nombre: this.form.value.nombre,
      descripcionCorta: this.form.value.descripcionCorta,
      descripcion: this.form.value.descripcion,
      subcategoriaId: this.form.value.subcategoriaId,
      barrioId: this.form.value.barrioId,
      organizador: this.form.value.organizador,
      organizadorContacto: this.form.value.organizadorContacto || null,
      organizadorWeb: this.form.value.organizadorWeb || null,
      ubicacionNombre: this.form.value.ubicacionNombre || null,
      ubicacionDireccion: this.form.value.ubicacionDireccion,
      coordenadas: this.form.value.coordenadas,
      fechaInicio: new Date(this.form.value.fechaInicio).toISOString(),
      fechaFin: new Date(this.form.value.fechaFin).toISOString(),
      precioTipo: this.form.value.precioTipo,
      precioValor: Number(this.form.value.precioValor),
      precioMoneda: this.form.value.precioMoneda || 'CLP',
      capacidadMaxima: this.form.value.capacidadMaxima
        ? Number(this.form.value.capacidadMaxima)
        : null,
      publicoObjetivo: this.form.value.publicoObjetivo,
      nivelRuido: this.form.value.nivelRuido,
      portada: this.form.value.portada || null,
      accesibilidad: this.form.value.accesibilidad || [],
    };

    if (this.isEditing) {
      const id = this.route.snapshot.paramMap.get('id')!;
      this.eventosService.update(id, dto).subscribe({
        next: () => {
          this.submitting = false;
          this.router.navigate(['/eventos']);
        },
        error: (err: Error) => {
          this.submitting = false;
          this.submitError = err.message ?? 'Error al actualizar el evento.';
        },
      });
    } else {
      this.eventosService.create(dto).subscribe({
        next: () => {
          this.submitting = false;
          this.router.navigate(['/eventos']);
        },
        error: (err: Error) => {
          this.submitting = false;
          this.submitError = err.message ?? 'Error al crear el evento.';
        },
      });
    }
  }

  protected cancel(): void {
    this.router.navigate(['/eventos']);
  }

  // ── Error helpers ───────────────────────────────────────────────

  showError(controlName: string): boolean {
    const ctrl = this.form.get(controlName);
    return !!ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  getError(controlName: string): string {
    const ctrl = this.form.get(controlName);
    if (!ctrl?.errors) return '';
    if (ctrl.errors['required']) return 'Este campo es requerido.';
    if (ctrl.errors['minlength'])
      return `Mínimo ${ctrl.errors['minlength'].requiredLength} caracteres.`;
    if (ctrl.errors['maxlength'])
      return `Máximo ${ctrl.errors['maxlength'].requiredLength} caracteres.`;
    if (ctrl.errors['min']) return `El valor mínimo es ${ctrl.errors['min'].min}.`;
    return 'Valor inválido.';
  }
}
