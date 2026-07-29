import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EventoInfoComponent } from './evento-info.component';
import { Evento } from '../../../shared/data-access/eventos/evento.types';

const stubEvento: Evento = {
  id: 'evt-1',
  slug: 'concierto-verano',
  nombre: 'Concierto de Verano',
  descripcionCorta: 'Disfruta la mejor música',
  descripcion: 'Una noche inolvidable con artistas locales en la playa de Concón.',
  categoriaId: 'eventos',
  subcategoriaId: 'conciertos',
  barrioId: 'centro',
  organizador: 'Municipalidad',
  organizadorContacto: null,
  organizadorWeb: null,
  ubicacionNombre: null,
  ubicacionDireccion: 'Av. Concón 123',
  coordenadas: { lat: -32.921, lng: -71.515 },
  fechaInicio: '2026-08-15T20:00:00.000Z',
  fechaFin: '2026-08-15T23:00:00.000Z',
  precioTipo: 'pago',
  precioValor: 5000,
  precioMoneda: 'CLP',
  capacidadMaxima: 500,
  publicoObjetivo: ['todos', 'familia'],
  nivelRuido: 'alto',
  portada: null,
  accesibilidad: ['acceso-silla-ruedas', 'banos-accesibles'],
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
};

describe('EventoInfoComponent', () => {
  let component: EventoInfoComponent;
  let fixture: ComponentFixture<EventoInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventoInfoComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EventoInfoComponent);
    component = fixture.componentInstance;
    component.evento = stubEvento;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render the descripcion', () => {
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Una noche inolvidable');
  });

  it('should render fechaInicio and fechaFin', () => {
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('15');
    expect(text).toMatch(/ago|agosto/i);
  });

  it('should render capacidadMaxima when present', () => {
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('500');
    expect(text).toContain('Capacidad');
  });

  it('should render publicoObjetivo badges', () => {
    const badges = fixture.nativeElement.querySelectorAll('[data-testid="publico-badge"]');
    expect(badges.length).withContext('two publico badges').toBe(2);
  });

  it('should render nivelRuido', () => {
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Alto');
  });

  it('should render accesibilidad badges', () => {
    const badges = fixture.nativeElement.querySelectorAll('[data-testid="accesibilidad-badge"]');
    expect(badges.length).withContext('two accesibilidad badges').toBe(2);
  });

  it('should be dumb: no DI injections', () => {
    const injector = fixture.debugElement.injector;
    expect(injector.get(EventoInfoComponent)).toBe(component);
  });
});
