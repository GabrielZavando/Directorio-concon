import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { EventoFiltrosComponent } from './evento-filtros.component';

describe('EventoFiltrosComponent', () => {
  let component: EventoFiltrosComponent;
  let fixture: ComponentFixture<EventoFiltrosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventoFiltrosComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EventoFiltrosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should have a form with all filter controls', () => {
    expect(component.form.get('q')).withContext('q control').toBeTruthy();
    expect(component.form.get('subcategoriaId'))
      .withContext('subcategoriaId control')
      .toBeTruthy();
    expect(component.form.get('barrioId'))
      .withContext('barrioId control')
      .toBeTruthy();
    expect(component.form.get('fechaDesde'))
      .withContext('fechaDesde control')
      .toBeTruthy();
    expect(component.form.get('fechaHasta'))
      .withContext('fechaHasta control')
      .toBeTruthy();
    expect(component.form.get('precioTipo'))
      .withContext('precioTipo control')
      .toBeTruthy();
  });

  it('should emit queryChange when q value changes (debounced)', fakeAsync(() => {
    const spy = jasmine.createSpy('queryChange');
    component.queryChange.subscribe(spy);
    component.form.controls.q.setValue('concierto');
    tick(300);
    expect(spy).toHaveBeenCalledWith('concierto');
  }));

  it('should NOT emit queryChange before debounce time', fakeAsync(() => {
    const spy = jasmine.createSpy('queryChange');
    component.queryChange.subscribe(spy);
    component.form.controls.q.setValue('test');
    tick(100); // before 300ms debounce
    expect(spy).not.toHaveBeenCalled();
  }));

  it('should emit subcategoriaIdChange when subcategoriaId changes', () => {
    const spy = jasmine.createSpy('subcategoriaIdChange');
    component.subcategoriaIdChange.subscribe(spy);
    component.form.controls.subcategoriaId.setValue('conciertos');
    expect(spy).toHaveBeenCalledWith('conciertos');
  });

  it('should emit barrioIdChange when barrioId changes', () => {
    const spy = jasmine.createSpy('barrioIdChange');
    component.barrioIdChange.subscribe(spy);
    component.form.controls.barrioId.setValue('centro');
    expect(spy).toHaveBeenCalledWith('centro');
  });

  it('should emit fechaDesdeChange when fechaDesde changes', () => {
    const spy = jasmine.createSpy('fechaDesdeChange');
    component.fechaDesdeChange.subscribe(spy);
    component.form.controls.fechaDesde.setValue('2026-08-01');
    expect(spy).toHaveBeenCalledWith('2026-08-01');
  });

  it('should emit fechaHastaChange when fechaHasta changes', () => {
    const spy = jasmine.createSpy('fechaHastaChange');
    component.fechaHastaChange.subscribe(spy);
    component.form.controls.fechaHasta.setValue('2026-08-31');
    expect(spy).toHaveBeenCalledWith('2026-08-31');
  });

  it('should emit precioTipoChange when precioTipo changes', () => {
    const spy = jasmine.createSpy('precioTipoChange');
    component.precioTipoChange.subscribe(spy);
    component.form.controls.precioTipo.setValue('gratis');
    expect(spy).toHaveBeenCalledWith('gratis');
  });

  it('should be dumb: has no injector dependencies beyond itself', () => {
    const injector = fixture.debugElement.injector;
    expect(injector.get(EventoFiltrosComponent)).toBe(component);
  });
});
