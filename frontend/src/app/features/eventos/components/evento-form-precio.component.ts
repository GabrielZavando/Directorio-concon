import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

/**
 * EventoFormPrecioComponent — dumb sub-form for pricing fields.
 *
 * Renders precioTipo, precioValor, and precioMoneda.
 */
@Component({
  selector: 'app-evento-form-precio',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <fieldset [formGroup]="form" class="space-y-4">
      <legend class="text-label-md font-semibold text-on-surface mb-2">
        Precio
      </legend>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <!-- Tipo -->
        <div>
          <label for="precioTipo" class="block text-label-sm text-on-surface mb-1">
            Tipo de precio *
          </label>
          <select
            id="precioTipo"
            formControlName="precioTipo"
            class="w-full rounded-custom border border-outline px-3 py-2 text-body-md bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            [class.border-error]="showError('precioTipo')"
            aria-describedby="precioTipo-error"
          >
            <option value="" disabled>Selecciona tipo</option>
            <option value="gratis">Gratis</option>
            <option value="pago">Pago</option>
            <option value="donacion">Donación</option>
            <option value="invitacion">Invitación</option>
          </select>
          @if (showError('precioTipo')) {
            <p id="precioTipo-error" class="text-error text-label-sm mt-1" role="alert">
              Selecciona un tipo de precio.
            </p>
          }
        </div>

        <!-- Valor -->
        <div>
          <label for="precioValor" class="block text-label-sm text-on-surface mb-1">
            Valor *
          </label>
          <input
            id="precioValor"
            type="number"
            min="0"
            formControlName="precioValor"
            class="w-full rounded-custom border border-outline px-3 py-2 text-body-md bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            [class.border-error]="showError('precioValor')"
            aria-describedby="precioValor-error"
            placeholder="0"
          />
          @if (showError('precioValor')) {
            <p id="precioValor-error" class="text-error text-label-sm mt-1" role="alert">
              {{ getError('precioValor') }}
            </p>
          }
        </div>

        <!-- Moneda -->
        <div>
          <label for="precioMoneda" class="block text-label-sm text-on-surface mb-1">
            Moneda
          </label>
          <select
            id="precioMoneda"
            formControlName="precioMoneda"
            class="w-full rounded-custom border border-outline px-3 py-2 text-body-md bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="CLP">CLP</option>
            <option value="USD">USD</option>
          </select>
        </div>
      </div>

      @if (form.hasError('precioGratisInvalido') && form.get('precioTipo')?.touched) {
        <p class="text-error text-label-sm" role="alert">
          Si el evento es gratuito, el valor debe ser 0.
        </p>
      }
    </fieldset>
  `,
})
export class EventoFormPrecioComponent {
  @Input({ required: true }) form!: FormGroup;

  showError(controlName: string): boolean {
    const ctrl = this.form.get(controlName);
    return !!ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  getError(controlName: string): string {
    const ctrl = this.form.get(controlName);
    if (!ctrl?.errors) return '';
    if (ctrl.errors['required']) return 'Este campo es requerido.';
    if (ctrl.errors['min']) return 'El valor mínimo es 0.';
    return 'Valor inválido.';
  }
}
