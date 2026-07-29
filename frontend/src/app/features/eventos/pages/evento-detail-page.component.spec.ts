import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { EventoDetailPageComponent } from './evento-detail-page.component';
import { ApiResponse, Evento } from '../../../shared/data-access/eventos/evento.types';

const stubEvento: Evento = {
  id: 'evt-1',
  slug: 'concierto-verano',
  nombre: 'Concierto de Verano',
  descripcionCorta: 'Disfruta la mejor música',
  descripcion: 'Una noche inolvidable.',
  categoriaId: 'eventos',
  subcategoriaId: 'conciertos',
  barrioId: 'centro',
  organizador: 'Municipalidad de Concón',
  organizadorContacto: 'contacto@muni.cl',
  organizadorWeb: 'https://www.muni.cl',
  ubicacionNombre: 'Plaza de la Cultura',
  ubicacionDireccion: 'Av. Concón 123',
  coordenadas: { lat: -32.921, lng: -71.515 },
  fechaInicio: '2026-08-15T20:00:00.000Z',
  fechaFin: '2026-08-15T23:00:00.000Z',
  precioTipo: 'pago',
  precioValor: 5000,
  precioMoneda: 'CLP',
  capacidadMaxima: 500,
  publicoObjetivo: ['todos'],
  nivelRuido: 'alto',
  portada: null,
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
  fechaPublicacion: null,
};

describe('EventoDetailPageComponent', () => {
  let component: EventoDetailPageComponent;
  let fixture: ComponentFixture<EventoDetailPageComponent>;
  let httpMock: HttpTestingController;

  beforeAll(() => {
    // Mock google.maps for @angular/google-maps components
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
      imports: [EventoDetailPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(EventoDetailPageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    httpMock.verify();
  });

  /** Helper: set slug, call loadEvento, flush the HTTP response. */
  function loadWithSlug(slug: string, data?: Evento, status = 200) {
    (component as any).slug = slug;
    (component as any).loadEvento();
    fixture.detectChanges();

    const req = httpMock.expectOne(
      (r) => r.url.includes('/api/v1/eventos/slug/') && r.method === 'GET',
    );
    if (status === 200 && data) {
      req.flush({
        success: true,
        statusCode: 200,
        data,
      } satisfies ApiResponse<Evento>);
    } else if (status === 404) {
      req.flush(
        { success: false, statusCode: 404, message: 'Not found', data: null },
        { status: 404, statusText: 'Not Found' },
      );
    } else {
      req.flush('Server Error', { status: 500, statusText: 'Server Error' });
    }
    fixture.detectChanges();
  }

  // ── Initial state ─────────────────────────────────────────────────

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should start with loading true and no evento when no slug (initial state)', () => {
    fixture.detectChanges();
    // Without a slug, loadEvento() is never called, so loading stays true
    expect((component as any).loading()).toBeTrue();
    expect((component as any).evento()).toBeNull();
  });

  // ── Successful load ───────────────────────────────────────────────

  it('should render sub-components after successful load', () => {
    loadWithSlug('concierto-verano', stubEvento);

    const info = fixture.nativeElement.querySelector('app-evento-info');
    const org = fixture.nativeElement.querySelector('app-evento-organizador');
    const precio = fixture.nativeElement.querySelector('app-evento-precio');
    const ubicacion = fixture.nativeElement.querySelector('app-evento-ubicacion');

    expect(info).withContext('info component rendered').toBeTruthy();
    expect(org).withContext('organizador component rendered').toBeTruthy();
    expect(precio).withContext('precio component rendered').toBeTruthy();
    expect(ubicacion).withContext('ubicacion component rendered').toBeTruthy();
  });

  it('should render the evento nombre as heading', () => {
    loadWithSlug('concierto-verano', stubEvento);
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Concierto de Verano');
  });

  // ── Error states ──────────────────────────────────────────────────

  it('should show error on HTTP failure', () => {
    loadWithSlug('concierto-verano', undefined, 500);
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Error');
    expect(text).toContain('Reintentar');
  });

  it('should show 404 message when backend returns 404', () => {
    loadWithSlug('non-existent', undefined, 404);
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('no encontrado');
  });

  // ── Navigation & retry ────────────────────────────────────────────

  it('should render "Volver al listado" link', () => {
    loadWithSlug('concierto-verano', stubEvento);
    const backLink: HTMLAnchorElement = fixture.nativeElement.querySelector(
      '[data-testid="volver-link"]',
    );
    expect(backLink).withContext('volver link').toBeTruthy();
    expect(backLink.getAttribute('href')).toContain('/eventos');
  });

  it('should retry loading after error', () => {
    loadWithSlug('concierto-verano', undefined, 500);

    // Click retry
    const retryBtn: HTMLButtonElement =
      fixture.nativeElement.querySelector('[data-testid="retry-btn"]');
    expect(retryBtn).withContext('retry button visible').toBeTruthy();
    retryBtn.click();
    fixture.detectChanges();

    // New HTTP request should be made
    const retryReq = httpMock.expectOne(
      (r) => r.url.includes('/api/v1/eventos/slug/') && r.method === 'GET',
    );
    expect(retryReq).withContext('retry request made').toBeTruthy();
    retryReq.flush({
      success: true,
      statusCode: 200,
      data: stubEvento,
    } satisfies ApiResponse<Evento>);
    fixture.detectChanges();

    const info = fixture.nativeElement.querySelector('app-evento-info');
    expect(info).withContext('info rendered after retry').toBeTruthy();
  });
});
