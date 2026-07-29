import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, FormGroup } from '@angular/forms';
import { EventoFormPrecioComponent } from './evento-form-precio.component';

describe('EventoFormPrecioComponent', () => {
  let component: EventoFormPrecioComponent;
  let fixture: ComponentFixture<EventoFormPrecioComponent>;
  let form: FormGroup;
  const fb = new FormBuilder();

  beforeEach(async () => {
    form = fb.group({
      precioTipo: [''],
      precioValor: [0],
      precioMoneda: ['CLP'],
    });

    await TestBed.configureTestingModule({
      imports: [EventoFormPrecioComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EventoFormPrecioComponent);
    component = fixture.componentInstance;
    component.form = form;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render precioTipo select', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('#precioTipo')).toBeTruthy();
  });
});
