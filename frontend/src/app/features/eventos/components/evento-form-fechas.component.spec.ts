import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, FormGroup } from '@angular/forms';
import { EventoFormFechasComponent } from './evento-form-fechas.component';

describe('EventoFormFechasComponent', () => {
  let component: EventoFormFechasComponent;
  let fixture: ComponentFixture<EventoFormFechasComponent>;
  let form: FormGroup;
  const fb = new FormBuilder();

  beforeEach(async () => {
    form = fb.group({
      fechaInicio: [''],
      fechaFin: [''],
    });

    await TestBed.configureTestingModule({
      imports: [EventoFormFechasComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EventoFormFechasComponent);
    component = fixture.componentInstance;
    component.form = form;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render fechaInicio input', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('#fechaInicio')).toBeTruthy();
  });
});
