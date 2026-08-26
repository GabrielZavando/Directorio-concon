import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EventoOrganizadorComponent } from './evento-organizador.component';
import { Evento } from '../../../shared/data-access/eventos/evento.types';

const stubEvento: Evento = {
  id: 'evt-1',
  slug: 'concierto-verano',
  nombre: 'Concierto de Verano',
  descripcionCorta: 'Disfruta la mejor música',
  descripcion: 'Descripción larga…',
  categoriaId: 'eventos',
  subcategoriaId: 'conciertos',
  barrioId: 'centro',
  organizador: 'Municipalidad de Concón',
  organizadorContacto: 'contacto@municipalidad.cl',
  organizadorWeb: 'https://www.municipalidad.cl',
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

describe('EventoOrganizadorComponent', () => {
  let component: EventoOrganizadorComponent;
  let fixture: ComponentFixture<EventoOrganizadorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventoOrganizadorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EventoOrganizadorComponent);
    component = fixture.componentInstance;
    component.evento = stubEvento;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render organizador name', () => {
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Municipalidad de Concón');
  });

  it('should render organizadorContacto as a link', () => {
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a[href^="mailto:"]');
    expect(link).withContext('email link').toBeTruthy();
    expect(link.textContent).toContain('contacto@municipalidad.cl');
  });

  it('should render organizadorWeb as a link', () => {
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a[href^="https://www.municipalidad.cl"]');
    expect(link).withContext('web link').toBeTruthy();
  });

  it('should hide contact section when null', () => {
    fixture.componentRef.setInput('evento', { ...stubEvento, organizadorContacto: null, organizadorWeb: null });
    fixture.detectChanges();
    const links = fixture.nativeElement.querySelectorAll('a');
    expect(links.length).withContext('no links when both null').toBe(0);
  });
});
