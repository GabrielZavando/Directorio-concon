import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, FormGroup } from '@angular/forms';
import { EventoFormOrganizadorComponent } from './evento-form-organizador.component';

describe('EventoFormOrganizadorComponent', () => {
  let component: EventoFormOrganizadorComponent;
  let fixture: ComponentFixture<EventoFormOrganizadorComponent>;
  let form: FormGroup;
  const fb = new FormBuilder();

  beforeEach(async () => {
    form = fb.group({
      organizador: [''],
      organizadorContacto: [''],
      organizadorWeb: [''],
    });

    await TestBed.configureTestingModule({
      imports: [EventoFormOrganizadorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EventoFormOrganizadorComponent);
    component = fixture.componentInstance;
    component.form = form;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render organizador input', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('#organizador')).toBeTruthy();
  });
});
