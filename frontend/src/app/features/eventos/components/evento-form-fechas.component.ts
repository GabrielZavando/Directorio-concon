import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

/**
 * EventoFormFechasComponent — dumb sub-form for date/time fields.
 *
 * Renders fechaInicio and fechaFin inputs.
 */
@Component({
  selector: 'app-evento-form-fechas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <fieldset [formGroup]="form" class="space-y-4">
      <legend class="text-label-md font-semibold text-on-surface mb-2">
        Fechas y horarios
      </legend>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <!-- Fecha inicio -->
        <div>
          <label for="fechaInicio" class="block text-label-sm text-on-surface mb-1">
            Fecha de inicio *
          </label>
          <input
            id="fechaInicio"
            type="datetime-local"
            formControlName="fechaInicio"
            class="w-full rounded-custom border border-outline px-3 py-2 text-body-md bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            [class.border-error]="showError('fechaInicio')"
            aria-describedby="fechaInicio-error"
          />
          @if (showError('fechaInicio')) {
            <p id="fechaInicio-error" class="text-error text-label-sm mt-1" role="alert">
              Fecha de inicio requerida.
            </p>
          }
        </div>

        <!-- Fecha fin -->
        <div>
          <label for="fechaFin" class="block text-label-sm text-on-surface mb-1">
            Fecha de término *
          </label>
          <input
            id="fechaFin"
            type="datetime-local"
            formControlName="fechaFin"
            class="w-full rounded-custom border border-outline px-3 py-2 text-body-md bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            [class.border-error]="showError('fechaFin')"
            aria-describedby="fechaFin-error"
          />
          @if (showError('fechaFin')) {
            <p id="fechaFin-error" class="text-error text-label-sm mt-1" role="alert">
              Fecha de término requerida.
            </p>
          }
        </div>
      </div>

      @if (form.hasError('fechaFinMenor') && form.get('fechaFin')?.touched) {
        <p class="text-error text-label-sm" role="alert">
          La fecha de término debe ser posterior a la fecha de inicio.
        </p>
      }
    </fieldset>
  `,
})
export class EventoFormFechasComponent {
  @Input({ required: true }) form!: FormGroup;

  showError(controlName: string): boolean {
    const ctrl = this.form.get(controlName);
    return !!ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }
}
