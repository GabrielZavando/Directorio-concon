import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EventoPrecioComponent } from './evento-precio.component';
import { Evento } from '../../../shared/data-access/eventos/evento.types';

function makeEvento(overrides: Partial<Evento> = {}): Evento {
  return {
    id: 'evt-1',
    slug: 'test',
    nombre: 'Test',
    descripcionCorta: 'Test',
    descripcion: 'Test',
    categoriaId: 'eventos',
    subcategoriaId: 'conciertos',
    barrioId: 'centro',
    organizador: 'Org',
    organizadorContacto: null,
    organizadorWeb: null,
    ubicacionNombre: null,
    ubicacionDireccion: 'Dir',
    coordenadas: { lat: 0, lng: 0 },
    fechaInicio: '2026-08-15T20:00:00.000Z',
    fechaFin: '2026-08-15T23:00:00.000Z',
    precioTipo: 'pago',
    precioValor: 5000,
    precioMoneda: 'CLP',
    capacidadMaxima: null,
    publicoObjetivo: ['todos'],
    nivelRuido: 'bajo',
    portada: null,
    accesibilidad: [],
    status: 'aprobado',
    estado: 'programado',
    destacado: false,
    verificado: true,
    placeId: null,
    usuarioId: 'usr-1',
    vistasTotales: 0,
    createdAt: '2026-07-01T12:00:00.000Z',
    updatedAt: '2026-07-01T12:00:00.000Z',
    fechaPublicacion: null,
    ...overrides,
  };
}

describe('EventoPrecioComponent', () => {
  let component: EventoPrecioComponent;
  let fixture: ComponentFixture<EventoPrecioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventoPrecioComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EventoPrecioComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    component.evento = makeEvento();
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should render pago with formatted amount', () => {
    component.evento = makeEvento({ precioTipo: 'pago', precioValor: 5000, precioMoneda: 'CLP' });
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Pago');
    expect(text).toContain('5.000');
  });

  it('should render gratis badge', () => {
    component.evento = makeEvento({ precioTipo: 'gratis', precioValor: 0, precioMoneda: 'CLP' });
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Gratis');
    expect(text).not.toContain('$');
  });

  it('should render donacion badge', () => {
    component.evento = makeEvento({ precioTipo: 'donacion', precioValor: 2000, precioMoneda: 'CLP' });
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Donación');
  });

  it('should render invitacion badge', () => {
    component.evento = makeEvento({ precioTipo: 'invitacion', precioValor: 0, precioMoneda: 'CLP' });
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Invitación');
  });

  it('should show USD currency when applicable', () => {
    component.evento = makeEvento({ precioTipo: 'pago', precioValor: 10, precioMoneda: 'USD' });
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent ?? '';
    // es-CL locale formats USD as "US$10"
    expect(text).toMatch(/US\$|USD/);
  });
});
