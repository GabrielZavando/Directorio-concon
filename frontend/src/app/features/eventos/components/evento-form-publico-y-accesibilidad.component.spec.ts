import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, FormGroup } from '@angular/forms';
import { EventoFormPublicoYAccesibilidadComponent } from './evento-form-publico-y-accesibilidad.component';

describe('EventoFormPublicoYAccesibilidadComponent', () => {
  let component: EventoFormPublicoYAccesibilidadComponent;
  let fixture: ComponentFixture<EventoFormPublicoYAccesibilidadComponent>;
  let form: FormGroup;
  const fb = new FormBuilder();

  beforeEach(async () => {
    form = fb.group({
      publicoObjetivo: [[]],
      nivelRuido: [''],
      accesibilidad: [[]],
    });

    await TestBed.configureTestingModule({
      imports: [EventoFormPublicoYAccesibilidadComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EventoFormPublicoYAccesibilidadComponent);
    component = fixture.componentInstance;
    component.form = form;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render nivelRuido select', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('#nivelRuido')).toBeTruthy();
  });
});
