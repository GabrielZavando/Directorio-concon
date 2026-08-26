import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { EventosListPageComponent } from './eventos-list-page.component';
import { ApiResponse, Evento } from '../../../shared/data-access/eventos/evento.types';

const stubEvento1: Evento = {
  id: 'evt-1',
  slug: 'concierto-verano',
  nombre: 'Concierto de Verano',
  descripcionCorta: 'Disfruta la mejor música',
  descripcion: 'Descripción larga…',
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
  capacidadMaxima: null,
  publicoObjetivo: ['todos'],
  nivelRuido: 'alto',
  portada: 'https://example.com/img.jpg',
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

const stubEvento2: Evento = {
  ...stubEvento1,
  id: 'evt-2',
  slug: 'feria-gastronomica',
  nombre: 'Feria Gastronómica',
  descripcionCorta: 'Sabores del mar',
  subcategoriaId: 'ferias-gastronomicas',
  barrioId: 'la-boca',
  precioTipo: 'gratis',
  precioValor: 0,
};

describe('EventosListPageComponent', () => {
  let component: EventosListPageComponent;
  let fixture: ComponentFixture<EventosListPageComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventosListPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(EventosListPageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    httpMock.verify();
  });

  function flushInitialResponse(data: Evento[] = [stubEvento1, stubEvento2]) {
    const req = httpMock.expectOne(
      (r) => r.url.endsWith('/api/v1/eventos') && r.method === 'GET',
    );
    req.flush({
      success: true,
      statusCode: 200,
      data,
      meta: { total: data.length, page: 1, limit: 20, totalPages: 1 },
    } satisfies ApiResponse<Evento[]>);
    fixture.detectChanges();
    return req;
  }

  // ── Initial loading state ─────────────────────────────────────────

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should show skeleton loader while loading', () => {
    fixture.detectChanges();
    const skeleton = fixture.nativeElement.querySelector('ngx-skeleton-loader');
    expect(skeleton).withContext('skeleton visible while loading').toBeTruthy();
    // Flush the pending request to avoid httpMock.verify() failure
    flushInitialResponse([]);
  });

  it('should render cards after data loads', () => {
    fixture.detectChanges();
    flushInitialResponse([stubEvento1, stubEvento2]);
    const cards = fixture.nativeElement.querySelectorAll('app-evento-card');
    expect(cards.length).withContext('two cards rendered').toBe(2);
  });

  it('should show empty state when no eventos', () => {
    fixture.detectChanges();
    flushInitialResponse([]);
    const cards = fixture.nativeElement.querySelectorAll('app-evento-card');
    expect(cards.length).withContext('no cards').toBe(0);
    const emptyMsg = fixture.nativeElement.textContent ?? '';
    expect(emptyMsg).toContain('No hay eventos');
  });

  it('should show error state on HTTP error and allow retry', () => {
    fixture.detectChanges();
    const req = httpMock.expectOne(
      (r) => r.url.endsWith('/api/v1/eventos') && r.method === 'GET',
    );
    req.flush('Network error', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Error');
    expect(text).toContain('Reintentar');

    // Click retry
    const retryBtn: HTMLButtonElement =
      fixture.nativeElement.querySelector('[data-testid="retry-btn"]');
    expect(retryBtn).withContext('retry button visible').toBeTruthy();
    retryBtn.click();
    fixture.detectChanges();

    // After retry, a new HTTP request should be made
    const retryReq = httpMock.expectOne(
      (r) => r.url.endsWith('/api/v1/eventos') && r.method === 'GET',
    );
    retryReq.flush({
      success: true,
      statusCode: 200,
      data: [stubEvento1],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    } satisfies ApiResponse<Evento[]>);
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('app-evento-card');
    expect(cards.length).withContext('card rendered after retry').toBe(1);
  });

  // ── Filter integration via component handlers ───────────────────────────

  it('should re-fetch when subcategoria filter changes', () => {
    fixture.detectChanges();
    flushInitialResponse([stubEvento1, stubEvento2]);

    // Access the handler directly (the component binds it from EventoFiltrosComponent)
    (component as any).onSubcategoriaChange('conciertos');
    fixture.detectChanges();

    const filteredReq = httpMock.expectOne(
      (r) =>
        r.url.endsWith('/api/v1/eventos') &&
        r.method === 'GET' &&
        r.params.get('subcategoriaId') === 'conciertos',
    );
    expect(filteredReq).withContext('filtered request made').toBeTruthy();
    filteredReq.flush({
      success: true,
      statusCode: 200,
      data: [stubEvento1],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    } satisfies ApiResponse<Evento[]>);
    fixture.detectChanges();
  });
});
