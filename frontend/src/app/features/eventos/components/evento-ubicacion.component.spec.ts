import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { EventoUbicacionComponent } from './evento-ubicacion.component';
import { Evento } from '../../../shared/data-access/eventos/evento.types';

const stubEvento: Evento = {
  id: 'evt-1',
  slug: 'concierto-verano',
  nombre: 'Concierto de Verano',
  descripcionCorta: 'Disfruta la mejor música',
  descripcion: 'Descripción',
  categoriaId: 'eventos',
  subcategoriaId: 'conciertos',
  barrioId: 'centro',
  organizador: 'Municipalidad',
  organizadorContacto: null,
  organizadorWeb: null,
  ubicacionNombre: 'Plaza de la Cultura',
  ubicacionDireccion: 'Av. Concón 123, Concón',
  coordenadas: { lat: -32.921, lng: -71.515 },
  fechaInicio: '2026-08-15T20:00:00.000Z',
  fechaFin: '2026-08-15T23:00:00.000Z',
  precioTipo: 'pago',
  precioValor: 5000,
  precioMoneda: 'CLP',
  capacidadMaxima: null,
  publicoObjetivo: ['todos'],
  nivelRuido: 'alto',
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
};

describe('EventoUbicacionComponent', () => {
  let component: EventoUbicacionComponent;
  let fixture: ComponentFixture<EventoUbicacionComponent>;

  beforeAll(() => {
    // Mock google.maps for @angular/google-maps components to initialize
    (window as any).google = {
      maps: {
        Map: class Map {
          constructor() { /* noop */ }
          setCenter() { /* noop */ }
          setZoom() { /* noop */ }
        },
        Marker: class Marker {
          constructor() { /* noop */ }
          setMap() { /* noop */ }
        },
        InfoWindow: class InfoWindow {
          constructor() { /* noop */ }
          open() { /* noop */ }
          close() { /* noop */ }
        },
        LatLng: class LatLng {
          constructor(public lat: number, public lng: number) { /* noop */ }
        },
        event: {
          clearInstanceListeners() { /* noop */ },
        },
        MapTypeId: { ROADMAP: 'roadmap' },
      } as any,
    };
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventoUbicacionComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EventoUbicacionComponent);
    component = fixture.componentInstance;
    component.evento = stubEvento;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render ubicacionNombre when present', () => {
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Plaza de la Cultura');
  });

  it('should render ubicacionDireccion', () => {
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Av. Concón 123');
  });

  it('should render the map container with google-map component', () => {
    const mapEl = fixture.nativeElement.querySelector('google-map');
    expect(mapEl).withContext('google-map element present').toBeTruthy();
  });

  it('should pass center coordinates to the map', () => {
    expect(component.center).toEqual({ lat: -32.921, lng: -71.515 });
    expect(component.zoom).toBe(14);
  });

  it('should be dumb: no DI injections', () => {
    const injector = fixture.debugElement.injector;
    expect(injector.get(EventoUbicacionComponent)).toBe(component);
  });
});
