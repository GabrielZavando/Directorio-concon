import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

/**
 * EventoFormUbicacionComponent — dumb sub-form for location info.
 *
 * Renders barrioId, ubicacionNombre, ubicacionDireccion, and coordenadas fields.
 */
@Component({
  selector: 'app-evento-form-ubicacion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <fieldset [formGroup]="form" class="space-y-4">
      <legend class="text-label-md font-semibold text-on-surface mb-2">
        Ubicación
      </legend>

      <!-- Barrio -->
      <div>
        <label for="barrioId" class="block text-label-sm text-on-surface mb-1">
          Barrio *
        </label>
        <select
          id="barrioId"
          formControlName="barrioId"
          class="w-full rounded-custom border border-outline px-3 py-2 text-body-md bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          [class.border-error]="showError('barrioId')"
          aria-describedby="barrio-error"
        >
          <option value="" disabled>Selecciona un barrio</option>
          @for (b of barrios; track b.id) {
            <option [value]="b.id">{{ b.nombre }}</option>
          }
        </select>
        @if (showError('barrioId')) {
          <p id="barrio-error" class="text-error text-label-sm mt-1" role="alert">
            Selecciona un barrio.
          </p>
        }
      </div>

      <!-- Nombre del lugar -->
      <div>
        <label for="ubicacionNombre" class="block text-label-sm text-on-surface mb-1">
          Nombre del lugar
        </label>
        <input
          id="ubicacionNombre"
          type="text"
          formControlName="ubicacionNombre"
          class="w-full rounded-custom border border-outline px-3 py-2 text-body-md bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          maxlength="200"
        />
      </div>

      <!-- Dirección -->
      <div>
        <label for="ubicacionDireccion" class="block text-label-sm text-on-surface mb-1">
          Dirección *
        </label>
        <input
          id="ubicacionDireccion"
          type="text"
          formControlName="ubicacionDireccion"
          class="w-full rounded-custom border border-outline px-3 py-2 text-body-md bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          [class.border-error]="showError('ubicacionDireccion')"
          aria-describedby="direccion-error"
        />
        @if (showError('ubicacionDireccion')) {
          <p id="direccion-error" class="text-error text-label-sm mt-1" role="alert">
            {{ getError('ubicacionDireccion') }}
          </p>
        }
      </div>

      <!-- Coordenadas (lat / lng) -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label for="lat" class="block text-label-sm text-on-surface mb-1">
            Latitud *
          </label>
          <input
            id="lat"
            type="number"
            step="any"
            [formControl]="latCtrl"
            class="w-full rounded-custom border border-outline px-3 py-2 text-body-md bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            [class.border-error]="showCoordError('lat')"
            aria-describedby="lat-error"
            placeholder="-32.998"
          />
          @if (showCoordError('lat')) {
            <p id="lat-error" class="text-error text-label-sm mt-1" role="alert">
              Latitud requerida.
            </p>
          }
        </div>
        <div>
          <label for="lng" class="block text-label-sm text-on-surface mb-1">
            Longitud *
          </label>
          <input
            id="lng"
            type="number"
            step="any"
            [formControl]="lngCtrl"
            class="w-full rounded-custom border border-outline px-3 py-2 text-body-md bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            [class.border-error]="showCoordError('lng')"
            aria-describedby="lng-error"
            placeholder="-71.518"
          />
          @if (showCoordError('lng')) {
            <p id="lng-error" class="text-error text-label-sm mt-1" role="alert">
              Longitud requerida.
            </p>
          }
        </div>
      </div>
    </fieldset>
  `,
})
export class EventoFormUbicacionComponent {
  @Input({ required: true }) form!: FormGroup;

  /** Static barrio list — TODO: inject from DirectorioOpcionesPort */
  protected readonly barrios = [
    { id: 'centro', nombre: 'Centro' },
    { id: 'bosques', nombre: 'Bosques de Montemar' },
    { id: 'montemar', nombre: 'Montemar' },
    { id: 'la-boca', nombre: 'La Boca' },
    { id: 'higuerillas', nombre: 'Higuerillas' },
    { id: 'rene-Schneider', nombre: 'René Schneider' },
    { id: 'villa-alegre', nombre: 'Villa Alegre' },
    { id: 'concón-alto', nombre: 'Concón Alto' },
    { id: 'mirador-de-concón', nombre: 'Mirador de Concón' },
    { id: 'playa-negra', nombre: 'Playa Negra' },
    { id: 'costa-de-montemar', nombre: 'Costa de Montemar' },
    { id: 'lirquén', nombre: 'Lirquén' },
    { id: 'zona-rural', nombre: 'Zona Rural' },
  ];

  get latCtrl(): FormControl<number | null> {
    return this.form.get('coordenadas.lat') as FormControl<number | null>;
  }

  get lngCtrl(): FormControl<number | null> {
    return this.form.get('coordenadas.lng') as FormControl<number | null>;
  }

  showError(controlName: string): boolean {
    const ctrl = this.form.get(controlName);
    return !!ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  showCoordError(field: 'lat' | 'lng'): boolean {
    const group = this.form.get('coordenadas');
    if (!group) return false;
    const ctrl = group.get(field);
    return !!ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  getError(controlName: string): string {
    const ctrl = this.form.get(controlName);
    if (!ctrl?.errors) return '';
    if (ctrl.errors['required']) return 'Este campo es requerido.';
    if (ctrl.errors['maxlength'])
      return `Máximo ${ctrl.errors['maxlength'].requiredLength} caracteres.`;
    return 'Valor inválido.';
  }
}
