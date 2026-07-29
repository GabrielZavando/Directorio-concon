import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, FormGroup } from '@angular/forms';
import { EventoFormUbicacionComponent } from './evento-form-ubicacion.component';

describe('EventoFormUbicacionComponent', () => {
  let component: EventoFormUbicacionComponent;
  let fixture: ComponentFixture<EventoFormUbicacionComponent>;
  let form: FormGroup;
  const fb = new FormBuilder();

  beforeEach(async () => {
    form = fb.group({
      barrioId: [''],
      ubicacionNombre: [''],
      ubicacionDireccion: [''],
      coordenadas: fb.group({
        lat: [null],
        lng: [null],
      }),
    });

    await TestBed.configureTestingModule({
      imports: [EventoFormUbicacionComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EventoFormUbicacionComponent);
    component = fixture.componentInstance;
    component.form = form;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render barrio select', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('#barrioId')).toBeTruthy();
  });
});
