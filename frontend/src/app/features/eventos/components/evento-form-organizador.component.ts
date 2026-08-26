import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

/**
 * EventoFormOrganizadorComponent — dumb sub-form for organizer info.
 *
 * Renders organizador, organizadorContacto, and organizadorWeb fields.
 */
@Component({
  selector: 'app-evento-form-organizador',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <fieldset [formGroup]="form" class="space-y-4">
      <legend class="text-label-md font-semibold text-on-surface mb-2">
        Organizador
      </legend>

      <!-- Organizador -->
      <div>
        <label for="organizador" class="block text-label-sm text-on-surface mb-1">
          Nombre del organizador *
        </label>
        <input
          id="organizador"
          type="text"
          formControlName="organizador"
          class="w-full rounded-custom border border-outline px-3 py-2 text-body-md bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          [class.border-error]="showError('organizador')"
          aria-describedby="organizador-error"
        />
        @if (showError('organizador')) {
          <p id="organizador-error" class="text-error text-label-sm mt-1" role="alert">
            {{ getError('organizador') }}
          </p>
        }
      </div>

      <!-- Contacto -->
      <div>
        <label for="organizadorContacto" class="block text-label-sm text-on-surface mb-1">
          Correo de contacto
        </label>
        <input
          id="organizadorContacto"
          type="email"
          formControlName="organizadorContacto"
          class="w-full rounded-custom border border-outline px-3 py-2 text-body-md bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          aria-describedby="contacto-error"
        />
        @if (showError('organizadorContacto')) {
          <p id="contacto-error" class="text-error text-label-sm mt-1" role="alert">
            {{ getError('organizadorContacto') }}
          </p>
        }
      </div>

      <!-- Sitio web -->
      <div>
        <label for="organizadorWeb" class="block text-label-sm text-on-surface mb-1">
          Sitio web
        </label>
        <input
          id="organizadorWeb"
          type="url"
          formControlName="organizadorWeb"
          class="w-full rounded-custom border border-outline px-3 py-2 text-body-md bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          aria-describedby="web-error"
        />
        @if (showError('organizadorWeb')) {
          <p id="web-error" class="text-error text-label-sm mt-1" role="alert">
            {{ getError('organizadorWeb') }}
          </p>
        }
      </div>
    </fieldset>
  `,
})
export class EventoFormOrganizadorComponent {
  @Input({ required: true }) form!: FormGroup;

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
    if (ctrl.errors['email']) return 'Correo electrónico inválido.';
    if (ctrl.errors['pattern']) return 'Formato inválido.';
    return 'Valor inválido.';
  }
}
