import { TestBed } from '@angular/core/testing';
import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { EventosService } from './eventos.service';
import {
  Evento,
  CreateEvento,
  UpdateEvento,
  EventoMapDataItem,
  ApiResponse,
} from './evento.types';

describe('EventosService', () => {
  let service: EventosService;
  let httpMock: HttpTestingController;

  const API_BASE = '/api/v1/eventos';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(EventosService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // no pending requests
  });

  // ── Helper to build a fake Evento ─────────────────────────────────
  function makeEvento(overrides: Partial<Evento> = {}): Evento {
    return {
      id: 'evt-1',
      slug: 'feria-gastronomica',
      nombre: 'Feria Gastronómica',
      descripcionCorta: 'Degustación de platos típicos',
      descripcion: 'Una feria con más de 30 stands de comida típica.',
      categoriaId: 'eventos',
      subcategoriaId: 'ferias-gastronomicas',
      barrioId: 'centro',
      organizador: 'Municipalidad',
      organizadorContacto: null,
      organizadorWeb: null,
      ubicacionNombre: null,
      ubicacionDireccion: 'Av. Borgoño 1234',
      coordenadas: { lat: -32.998, lng: -71.518 },
      fechaInicio: '2026-08-15T10:00:00.000Z',
      fechaFin: '2026-08-17T22:00:00.000Z',
      precioTipo: 'gratis',
      precioValor: 0,
      precioMoneda: 'CLP',
      capacidadMaxima: null,
      publicoObjetivo: ['familia'],
      nivelRuido: 'medio',
      portada: null,
      accesibilidad: [],
      status: 'aprobado',
      estado: 'programado',
      destacado: false,
      verificado: false,
      placeId: null,
      usuarioId: 'user-abc',
      vistasTotales: 0,
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
      fechaPublicacion: '2026-07-01T00:00:00.000Z',
      ...overrides,
    };
  }

  // ── list() ────────────────────────────────────────────────────────

  describe('list()', () => {
    it('should GET /api/v1/eventos with default query params', () => {
      const mockResponse: ApiResponse<Evento[]> = {
        success: true,
        statusCode: 200,
        data: [makeEvento()],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };

      service.list({}).subscribe((res: ApiResponse<Evento[]>) => {
        expect(res.data.length).toBe(1);
        expect(res.data[0].nombre).toBe('Feria Gastronómica');
        expect(res.meta?.total).toBe(1);
      });

      const req = httpMock.expectOne(API_BASE + '?page=1&limit=20');
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should pass query filters as params', () => {
      service
        .list({ subcategoriaId: 'talleres', barrioId: 'montemar', q: 'taller' })
        .subscribe();

      const req = httpMock.expectOne(
        (r) =>
          r.url === API_BASE &&
          r.params.get('subcategoriaId') === 'talleres' &&
          r.params.get('barrioId') === 'montemar' &&
          r.params.get('q') === 'taller' &&
          r.params.get('page') === '1' &&
          r.params.get('limit') === '20',
      );
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, statusCode: 200, data: [], meta: {} });
    });
  });

  // ── getById() ─────────────────────────────────────────────────────

  describe('getById()', () => {
    it('should GET /api/v1/eventos/{id}', () => {
      const evento = makeEvento();

      service.getById('evt-1').subscribe((res: ApiResponse<Evento>) => {
        expect(res.data.id).toBe('evt-1');
      });

      const req = httpMock.expectOne(`${API_BASE}/evt-1`);
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, statusCode: 200, data: evento });
    });
  });

  // ── getBySlug() ───────────────────────────────────────────────────

  describe('getBySlug()', () => {
    it('should GET /api/v1/eventos/slug/{slug}', () => {
      const evento = makeEvento();

      service.getBySlug('feria-gastronomica').subscribe((res: ApiResponse<Evento>) => {
        expect(res.data.slug).toBe('feria-gastronomica');
      });

      const req = httpMock.expectOne(
        `${API_BASE}/slug/feria-gastronomica`,
      );
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, statusCode: 200, data: evento });
    });
  });

  // ── mapData() ─────────────────────────────────────────────────────

  describe('mapData()', () => {
    it('should GET /api/v1/eventos/map-data', () => {
      const mapItems: EventoMapDataItem[] = [
        {
          id: 'evt-1',
          slug: 'feria-gastronomica',
          nombre: 'Feria Gastronómica',
          coordenadas: { lat: -32.998, lng: -71.518 },
          subcategoriaId: 'ferias-gastronomicas',
          barrioId: 'centro',
          fechaInicio: '2026-08-15T10:00:00.000Z',
        },
      ];

      service.mapData().subscribe((items: EventoMapDataItem[]) => {
        expect(items.length).toBe(1);
        expect(items[0].nombre).toBe('Feria Gastronómica');
      });

      const req = httpMock.expectOne(`${API_BASE}/map-data`);
      expect(req.request.method).toBe('GET');
      req.flush(mapItems);
    });
  });

  // ── create() ──────────────────────────────────────────────────────

  describe('create()', () => {
    it('should POST /api/v1/eventos with dto body', () => {
      const dto: CreateEvento = {
        nombre: 'Nuevo Evento',
        descripcionCorta: 'Short desc',
        descripcion: 'Longer description for the event.',
        subcategoriaId: 'talleres',
        barrioId: 'centro',
        organizador: 'Yo',
        ubicacionDireccion: 'Calle 123',
        coordenadas: { lat: -33.0, lng: -71.5 },
        fechaInicio: '2026-09-01T10:00:00.000Z',
        fechaFin: '2026-09-01T18:00:00.000Z',
        precioTipo: 'gratis',
        precioValor: 0,
        publicoObjetivo: ['familia'],
        nivelRuido: 'bajo',
      };
      const created = makeEvento({ id: 'evt-new', nombre: 'Nuevo Evento' });

      service.create(dto).subscribe((res: ApiResponse<Evento>) => {
        expect(res.data.id).toBe('evt-new');
        expect(res.success).toBeTrue();
      });

      const req = httpMock.expectOne(API_BASE);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush({ success: true, statusCode: 201, data: created });
    });
  });

  // ── update() ──────────────────────────────────────────────────────

  describe('update()', () => {
    it('should PUT /api/v1/eventos/{id} with partial dto', () => {
      const dto: UpdateEvento = { nombre: 'Nombre Actualizado' };
      const updated = makeEvento({ nombre: 'Nombre Actualizado' });

      service.update('evt-1', dto).subscribe((res: ApiResponse<Evento>) => {
        expect(res.data.nombre).toBe('Nombre Actualizado');
      });

      const req = httpMock.expectOne(`${API_BASE}/evt-1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(dto);
      req.flush({ success: true, statusCode: 200, data: updated });
    });
  });

  // ── remove() ──────────────────────────────────────────────────────

  describe('remove()', () => {
    it('should DELETE /api/v1/eventos/{id}', () => {
      service.remove('evt-1').subscribe((res: ApiResponse<void>) => {
        expect(res.success).toBeTrue();
      });

      const req = httpMock.expectOne(`${API_BASE}/evt-1`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ success: true, statusCode: 200 });
    });
  });

  // ── misEventos() ──────────────────────────────────────────────────

  describe('misEventos()', () => {
    it('should GET /api/v1/eventos with usuarioId query param', () => {
      const mockResponse: ApiResponse<Evento[]> = {
        success: true,
        statusCode: 200,
        data: [makeEvento()],
        meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
      };

      service.misEventos('user-abc').subscribe((res: ApiResponse<Evento[]>) => {
        expect(res.data.length).toBe(1);
      });

      const req = httpMock.expectOne(
        (r) =>
          r.url === API_BASE &&
          r.params.get('usuarioId') === 'user-abc' &&
          r.params.get('page') === '1' &&
          r.params.get('limit') === '100',
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  // ── adminList() ───────────────────────────────────────────────────

  describe('adminList()', () => {
    it('should GET /api/v1/eventos with all statuses', () => {
      const eventos = [
        makeEvento({ id: 'evt-1', status: 'aprobado' }),
        makeEvento({ id: 'evt-2', status: 'pendiente' }),
      ];
      const mockResponse: ApiResponse<Evento[]> = {
        success: true,
        statusCode: 200,
        data: eventos,
        meta: { total: 2, page: 1, limit: 50, totalPages: 1 },
      };

      service.adminList().subscribe((res: ApiResponse<Evento[]>) => {
        expect(res.data.length).toBe(2);
      });

      const req = httpMock.expectOne(
        (r) =>
          r.url === API_BASE &&
          r.params.get('page') === '1' &&
          r.params.get('limit') === '50',
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  // ── Error handling ────────────────────────────────────────────────

  describe('error handling', () => {
    it('should propagate HTTP errors', () => {
      service.getById('not-found').subscribe({
        next: () => fail('Expected error'),
        error: (err: { status: number }) => {
          expect(err.status).toBe(404);
        },
      });

      const req = httpMock.expectOne(`${API_BASE}/not-found`);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });
  });
});
