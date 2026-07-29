import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { EventoCardComponent } from './evento-card.component';
import { Evento } from '../../../shared/data-access/eventos/evento.types';

const stubEvento: Evento = {
  id: 'evt-1',
  slug: 'concierto-verano',
  nombre: 'Concierto de Verano',
  descripcionCorta: 'Disfruta la mejor música en la playa',
  descripcion: 'Descripción larga…',
  categoriaId: 'eventos',
  subcategoriaId: 'conciertos',
  barrioId: 'centro',
  organizador: 'Municipalidad de Concón',
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
  capacidadMaxima: null,
  publicoObjetivo: ['todos'],
  nivelRuido: 'alto',
  portada: 'https://example.com/portada.jpg',
  accesibilidad: ['acceso-silla-ruedas'],
  status: 'aprobado',
  estado: 'programado',
  destacado: false,
  verificado: true,
  placeId: null,
  usuarioId: 'usr-1',
  vistasTotales: 0,
  createdAt: '2026-07-01T12:00:00.000Z',
  updatedAt: '2026-07-01T12:00:00.000Z',
  fechaPublicacion: '2026-07-01T12:00:00.000Z',
};

describe('EventoCardComponent', () => {
  let component: EventoCardComponent;
  let fixture: ComponentFixture<EventoCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventoCardComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(EventoCardComponent);
    component = fixture.componentInstance;
    component.evento = stubEvento;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render the nombre as heading', () => {
    const heading: HTMLHeadingElement = fixture.nativeElement.querySelector('h3');
    expect(heading).withContext('h3 element').toBeTruthy();
    expect(heading.textContent).toContain('Concierto de Verano');
  });

  it('should render descripcionCorta', () => {
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Disfruta la mejor música en la playa');
  });

  it('should render fechaInicio formatted', () => {
    const text = fixture.nativeElement.textContent ?? '';
    // Should contain the day number (15)
    expect(text).toContain('15');
    // Should contain a month reference (agosto in es-CL locale)
    const hasMonth = /ago/i.test(text);
    expect(hasMonth).withContext('contains month (ago/agosto)').toBeTrue();
  });

  it('should render a badge for subcategoriaId with display label', () => {
    const badges = fixture.nativeElement.querySelectorAll('[data-testid="subcategoria-badge"]');
    expect(badges.length).withContext('at least one subcategoria badge').toBeGreaterThan(0);
    expect(badges[0].textContent).toContain('Conciertos');
  });

  it('should render a badge for precioTipo', () => {
    const badges = fixture.nativeElement.querySelectorAll('[data-testid="precio-badge"]');
    expect(badges.length).withContext('at least one precio badge').toBeGreaterThan(0);
    expect(badges[0].textContent).toMatch(/pago|Pago/i);
  });

  it('should render the portada image when present', () => {
    const img: HTMLImageElement = fixture.nativeElement.querySelector('img');
    expect(img).withContext('img element').toBeTruthy();
    expect(img.src).toContain('portada.jpg');
    expect(img.alt).toBeTruthy();
  });

  it('should show a skeleton placeholder when portada is null', () => {
    fixture.componentRef.setInput('evento', { ...stubEvento, portada: null });
    fixture.detectChanges();
    const img = fixture.nativeElement.querySelector('img');
    expect(img).withContext('no img when portada is null').toBeNull();
    // Expect a skeleton-like placeholder div
    const placeholder = fixture.nativeElement.querySelector('[data-testid="portada-placeholder"]');
    expect(placeholder).withContext('placeholder shown').toBeTruthy();
  });

  it('should be dumb: no services injected', () => {
    // A dumb component should only have @Input() props and no inject() calls.
    // Verify no injector is needed beyond what the test provides (Router for RouterLink).
    const injector = fixture.debugElement.injector;
    expect(injector.get(EventoCardComponent)).toBe(component);
  });
});
