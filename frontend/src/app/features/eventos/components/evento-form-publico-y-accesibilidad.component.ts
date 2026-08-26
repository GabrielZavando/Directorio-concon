import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

/**
 * EventoFormPublicoYAccesibilidadComponent — dumb sub-form for audience
 * and accessibility fields.
 *
 * Renders publicoObjetivo (checkboxes), nivelRuido (select), accesibilidad
 * (checkboxes).
 */
@Component({
  selector: 'app-evento-form-publico-y-accesibilidad',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <fieldset [formGroup]="form" class="space-y-4">
      <legend class="text-label-md font-semibold text-on-surface mb-2">
        Público y accesibilidad
      </legend>

      <!-- Público objetivo -->
      <div>
        <span class="block text-label-sm text-on-surface mb-2">
          Público objetivo * (selecciona al menos uno)
        </span>
        <div class="flex flex-wrap gap-4">
          @for (opt of publicoOptions; track opt.id) {
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                [value]="opt.id"
                [checked]="isPublicoSelected(opt.id)"
                (change)="togglePublico(opt.id)"
                class="rounded border-outline text-primary focus:ring-primary"
              />
              <span class="text-body-md text-on-surface">{{ opt.label }}</span>
            </label>
          }
        </div>
        @if (showArrayError('publicoObjetivo')) {
          <p class="text-error text-label-sm mt-1" role="alert">
            Selecciona al menos un público objetivo.
          </p>
        }
      </div>

      <!-- Nivel de ruido -->
      <div>
        <label for="nivelRuido" class="block text-label-sm text-on-surface mb-1">
          Nivel de ruido *
        </label>
        <select
          id="nivelRuido"
          formControlName="nivelRuido"
          class="w-full rounded-custom border border-outline px-3 py-2 text-body-md bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          [class.border-error]="showError('nivelRuido')"
          aria-describedby="ruido-error"
        >
          <option value="" disabled>Selecciona nivel</option>
          <option value="bajo">Bajo</option>
          <option value="medio">Medio</option>
          <option value="alto">Alto</option>
        </select>
        @if (showError('nivelRuido')) {
          <p id="ruido-error" class="text-error text-label-sm mt-1" role="alert">
            Selecciona un nivel de ruido.
          </p>
        }
      </div>

      <!-- Accesibilidad -->
      <div>
        <span class="block text-label-sm text-on-surface mb-2">
          Accesibilidad (opcional)
        </span>
        <div class="flex flex-wrap gap-4">
          @for (opt of accesibilidadOptions; track opt.id) {
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                [value]="opt.id"
                [checked]="isAccesibilidadSelected(opt.id)"
                (change)="toggleAccesibilidad(opt.id)"
                class="rounded border-outline text-primary focus:ring-primary"
              />
              <span class="text-body-md text-on-surface">{{ opt.label }}</span>
            </label>
          }
        </div>
      </div>
    </fieldset>
  `,
})
export class EventoFormPublicoYAccesibilidadComponent {
  @Input({ required: true }) form!: FormGroup;

  protected readonly publicoOptions = [
    { id: 'familia', label: 'Familia' },
    { id: 'adultos', label: 'Adultos' },
    { id: 'tercera_edad', label: 'Tercera edad' },
    { id: 'mascotas', label: 'Mascotas' },
    { id: 'todos', label: 'Todos' },
    { id: 'ninos', label: 'Niños' },
    { id: 'adolescentes', label: 'Adolescentes' },
  ];

  protected readonly accesibilidadOptions = [
    { id: 'acceso-silla-ruedas', label: 'Acceso silla de ruedas' },
    { id: 'banos-accesibles', label: 'Baños accesibles' },
    { id: 'estacionamiento-reservado', label: 'Estacionamiento reservado' },
    { id: 'interprete-senas', label: 'Intérprete de señas' },
    { id: 'material-braille', label: 'Material braille' },
    { id: 'rampa-acceso', label: 'Rampa de acceso' },
  ];

  get publicoCtrl() {
    return this.form.get('publicoObjetivo')!;
  }

  isPublicoSelected(id: string): boolean {
    const val = this.publicoCtrl.value;
    return Array.isArray(val) && val.includes(id);
  }

  togglePublico(id: string): void {
    const current: string[] = Array.isArray(this.publicoCtrl.value)
      ? this.publicoCtrl.value
      : [];
    const idx = current.indexOf(id);
    const next =
      idx >= 0
        ? current.filter((v: string) => v !== id)
        : [...current, id];
    this.publicoCtrl.markAsDirty();
    this.publicoCtrl.setValue(next.length > 0 ? next : []);
  }

  isAccesibilidadSelected(id: string): boolean {
    const ctrl = this.form.get('accesibilidad');
    const val = ctrl?.value;
    return Array.isArray(val) && val.includes(id);
  }

  toggleAccesibilidad(id: string): void {
    const ctrl = this.form.get('accesibilidad');
    if (!ctrl) return;
    const current: string[] = Array.isArray(ctrl.value) ? ctrl.value : [];
    const idx = current.indexOf(id);
    const next =
      idx >= 0
        ? current.filter((v: string) => v !== id)
        : [...current, id];
    ctrl.markAsDirty();
    ctrl.setValue(next);
  }

  showError(controlName: string): boolean {
    const ctrl = this.form.get(controlName);
    return !!ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  showArrayError(controlName: string): boolean {
    const ctrl = this.form.get(controlName);
    return (
      !!ctrl &&
      ctrl.invalid &&
      (ctrl.dirty || ctrl.touched) &&
      ctrl.value?.length === 0
    );
  }
}
