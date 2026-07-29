import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { EventoFormPageComponent } from './evento-form-page.component';

describe('EventoFormPageComponent', () => {
  let component: EventoFormPageComponent;
  let fixture: ComponentFixture<EventoFormPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventoFormPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EventoFormPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should create a form with all required fields', () => {
    const form = component.form;
    expect(form.get('nombre')).withContext('nombre control').toBeTruthy();
    expect(form.get('descripcionCorta'))
      .withContext('descripcionCorta control')
      .toBeTruthy();
    expect(form.get('descripcion'))
      .withContext('descripcion control')
      .toBeTruthy();
    expect(form.get('subcategoriaId'))
      .withContext('subcategoriaId control')
      .toBeTruthy();
    expect(form.get('barrioId')).withContext('barrioId control').toBeTruthy();
    expect(form.get('organizador'))
      .withContext('organizador control')
      .toBeTruthy();
    expect(form.get('ubicacionDireccion'))
      .withContext('ubicacionDireccion control')
      .toBeTruthy();
    expect(form.get('coordenadas'))
      .withContext('coordenadas control')
      .toBeTruthy();
    expect(form.get('fechaInicio'))
      .withContext('fechaInicio control')
      .toBeTruthy();
    expect(form.get('fechaFin')).withContext('fechaFin control').toBeTruthy();
    expect(form.get('precioTipo'))
      .withContext('precioTipo control')
      .toBeTruthy();
    expect(form.get('precioValor'))
      .withContext('precioValor control')
      .toBeTruthy();
    expect(form.get('publicoObjetivo'))
      .withContext('publicoObjetivo control')
      .toBeTruthy();
    expect(form.get('nivelRuido'))
      .withContext('nivelRuido control')
      .toBeTruthy();
  });

  describe('validation', () => {
    it('should be invalid when required fields are empty', () => {
      expect(component.form.valid).toBeFalse();
    });

    it('should validate nombre minLength 2', () => {
      const ctrl = component.form.get('nombre')!;
      ctrl.setValue('A');
      expect(ctrl.hasError('minlength')).toBeTrue();
      ctrl.setValue('AB');
      expect(ctrl.hasError('minlength')).toBeFalse();
    });

    it('should validate nombre maxLength 120', () => {
      const ctrl = component.form.get('nombre')!;
      ctrl.setValue('A'.repeat(121));
      expect(ctrl.hasError('maxlength')).toBeTrue();
    });

    it('should validate descripcion minLength 10', () => {
      const ctrl = component.form.get('descripcion')!;
      ctrl.setValue('Corto');
      expect(ctrl.hasError('minlength')).toBeTrue();
    });

    it('should validate descripcionCorta maxLength 140', () => {
      const ctrl = component.form.get('descripcionCorta')!;
      ctrl.setValue('X'.repeat(141));
      expect(ctrl.hasError('maxlength')).toBeTrue();
    });

    it('should validate precioValor min 0', () => {
      const ctrl = component.form.get('precioValor')!;
      ctrl.setValue(-1);
      expect(ctrl.hasError('min')).toBeTrue();
    });

    it('should validate publicoObjetivo required (empty array)', () => {
      const ctrl = component.form.get('publicoObjetivo')!;
      // Empty array [] fails Validators.required
      expect(ctrl.hasError('required')).toBeTrue();
    });

    it('should detect fechaFin < fechaInicio as cross-field error', () => {
      // Set valid values first, then make fechaFin before fechaInicio
      fillValidForm(component);
      component.form.patchValue({
        fechaInicio: '2026-08-17T10:00:00.000Z',
        fechaFin: '2026-08-15T10:00:00.000Z',
      });
      component.form.updateValueAndValidity();
      expect(component.form.hasError('fechaFinMenor')).toBeTrue();
    });

    it('should detect precioTipo gratis but precioValor > 0 as cross-field error', () => {
      fillValidForm(component);
      component.form.patchValue({
        precioTipo: 'gratis',
        precioValor: 5000,
      });
      component.form.updateValueAndValidity();
      expect(component.form.hasError('precioGratisInvalido')).toBeTrue();
    });

    it('should be valid when all fields are correctly filled', () => {
      fillValidForm(component);
      expect(component.form.valid).toBeTrue();
    });
  });

  describe('submit button', () => {
    it('should be disabled when form is invalid', () => {
      fixture.detectChanges();
      const btn = getSubmitButton();
      expect(btn.disabled).toBeTrue();
    });

    it('should be enabled when form is valid', () => {
      fillValidForm(component);
      fixture.detectChanges();
      const btn = getSubmitButton();
      expect(btn.disabled).toBeFalse();
    });
  });

  describe('sub-components rendering', () => {
    it('should render evento-form-organizador', () => {
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('app-evento-form-organizador')).toBeTruthy();
    });

    it('should render evento-form-ubicacion', () => {
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('app-evento-form-ubicacion')).toBeTruthy();
    });

    it('should render evento-form-fechas', () => {
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('app-evento-form-fechas')).toBeTruthy();
    });

    it('should render evento-form-precio', () => {
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('app-evento-form-precio')).toBeTruthy();
    });

    it('should render evento-form-publico-y-accesibilidad', () => {
      const el = fixture.nativeElement as HTMLElement;
      expect(
        el.querySelector('app-evento-form-publico-y-accesibilidad'),
      ).toBeTruthy();
    });
  });

  // ── Helpers ─────────────────────────────────────────────────────

  function getSubmitButton(): HTMLButtonElement {
    return (fixture.nativeElement as HTMLElement).querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
  }

  function fillValidForm(comp: EventoFormPageComponent): void {
    comp.form.patchValue({
      nombre: 'Feria Gastronómica',
      descripcionCorta: 'Degustación de platos típicos',
      descripcion:
        'Una feria con más de 30 stands de comida típica de la región de Valparaíso.',
      subcategoriaId: 'ferias-gastronomicas',
      barrioId: 'centro',
      organizador: 'Municipalidad de Concón',
      organizadorContacto: 'contacto@municipalidad.cl',
      ubicacionDireccion: 'Av. Borgoño 1234',
      coordenadas: { lat: -32.998, lng: -71.518 },
      fechaInicio: '2026-08-15T10:00:00.000Z',
      fechaFin: '2026-08-17T22:00:00.000Z',
      precioTipo: 'gratis',
      precioValor: 0,
      publicoObjetivo: ['familia'],
      nivelRuido: 'medio',
    });
  }
});
