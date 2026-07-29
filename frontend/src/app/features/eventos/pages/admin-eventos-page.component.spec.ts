import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { AdminEventosPageComponent } from './admin-eventos-page.component';
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
  fechaPublicacion: '2026-07-01T12:00:00.000Z',
};

const stubEvento2: Evento = {
  ...stubEvento1,
  id: 'evt-2',
  slug: 'feria-gastronomica',
  nombre: 'Feria Gastronómica',
  subcategoriaId: 'ferias-gastronomicas',
  barrioId: 'la-boca',
  precioTipo: 'gratis',
  precioValor: 0,
  status: 'pendiente',
};

const stubEvento3: Evento = {
  ...stubEvento1,
  id: 'evt-3',
  slug: 'taller-arte',
  nombre: 'Taller de Arte',
  status: 'rechazado',
};

describe('AdminEventosPageComponent', () => {
  let component: AdminEventosPageComponent;
  let fixture: ComponentFixture<AdminEventosPageComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminEventosPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AdminEventosPageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    httpMock.verify();
  });

  function flushAdminList(data: Evento[] = [stubEvento1, stubEvento2, stubEvento3]) {
    const req = httpMock.expectOne(
      (r) => r.url.endsWith('/api/v1/eventos') && r.method === 'GET',
    );
    req.flush({
      success: true,
      statusCode: 200,
      data,
      meta: { total: data.length, page: 1, limit: 50, totalPages: 1 },
    } satisfies ApiResponse<Evento[]>);
  }

  // ── Smoke ──────────────────────────────────────────────────────────

  it('creates component', () => {
    expect(component).toBeTruthy();
  });

  // ── Loading state ──────────────────────────────────────────────────

  it('shows skeleton while loading', () => {
    fixture.detectChanges();
    const skeleton = fixture.nativeElement.querySelector('[data-testid="skeleton"]');
    expect(skeleton).toBeTruthy();
    flushAdminList([]);
  });

  // ── Empty state ────────────────────────────────────────────────────

  it('shows empty message when no eventos', () => {
    fixture.detectChanges();
    flushAdminList([]);
    fixture.detectChanges();

    const emptyMsg = fixture.nativeElement.querySelector('[data-testid="empty-message"]');
    expect(emptyMsg).toBeTruthy();
    expect(emptyMsg.textContent).toContain('No hay eventos');
  });

  // ── Renders list with status badges ────────────────────────────────

  it('renders all eventos with status badges', () => {
    fixture.detectChanges();
    flushAdminList();
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('[data-testid="evento-item"]');
    expect(items.length).toBe(3);

    const badges = fixture.nativeElement.querySelectorAll('[data-testid="status-badge"]');
    expect(badges.length).toBe(3);
    expect(badges[0].textContent).toContain('Aprobado');
    expect(badges[1].textContent).toContain('Pendiente');
    expect(badges[2].textContent).toContain('Rechazado');
  });

  // ── Badge colors ───────────────────────────────────────────────────

  it('applies correct color class for each status', () => {
    fixture.detectChanges();
    flushAdminList();
    fixture.detectChanges();

    const badges = fixture.nativeElement.querySelectorAll('[data-testid="status-badge"]');
    expect(badges[0].classList.toString()).toMatch(/green|bg-success|text-success/);
    expect(badges[1].classList.toString()).toMatch(/yellow|amber|bg-warning|text-warning/);
    expect(badges[2].classList.toString()).toMatch(/red|bg-error|text-error/);
  });

  // ── Actions ────────────────────────────────────────────────────────

  it('has ver link for each evento', () => {
    fixture.detectChanges();
    flushAdminList([stubEvento1]);
    fixture.detectChanges();

    const verBtn = fixture.nativeElement.querySelector('[data-testid="ver-btn"]');
    expect(verBtn).toBeTruthy();
    expect(verBtn.getAttribute('href')).toContain('/eventos/concierto-verano');
  });

  it('has editar link for each evento', () => {
    fixture.detectChanges();
    flushAdminList([stubEvento1]);
    fixture.detectChanges();

    const editarBtn = fixture.nativeElement.querySelector('[data-testid="editar-btn"]');
    expect(editarBtn).toBeTruthy();
    expect(editarBtn.getAttribute('href')).toContain('/eventos/evt-1/editar');
  });

  it('calls remove on eliminar with confirm', () => {
    fixture.detectChanges();
    flushAdminList([stubEvento1]);
    fixture.detectChanges();

    spyOn(window, 'confirm').and.returnValue(true);

    const eliminarBtn = fixture.nativeElement.querySelector(
      '[data-testid="eliminar-btn"]',
    );
    eliminarBtn.click();

    expect(window.confirm).toHaveBeenCalled();

    const deleteReq = httpMock.expectOne(
      (r) => r.url.endsWith('/api/v1/eventos/evt-1') && r.method === 'DELETE',
    );
    deleteReq.flush({ success: true, statusCode: 200, data: null } satisfies ApiResponse<null>);
  });

  it('shows solicitudes link', () => {
    fixture.detectChanges();
    flushAdminList();
    fixture.detectChanges();

    const solLink = fixture.nativeElement.querySelector('[data-testid="solicitudes-link"]');
    expect(solLink).toBeTruthy();
  });

  // ── Error state ────────────────────────────────────────────────────

  it('shows error message on HTTP error with retry', () => {
    fixture.detectChanges();
    const req = httpMock.expectOne(
      (r) => r.url.endsWith('/api/v1/eventos') && r.method === 'GET',
    );
    req.flush({ message: 'Error' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    const errorMsg = fixture.nativeElement.querySelector('[data-testid="error-message"]');
    expect(errorMsg).toBeTruthy();

    const retryBtn = fixture.nativeElement.querySelector('[data-testid="retry-btn"]');
    expect(retryBtn).toBeTruthy();

    retryBtn.click();
    flushAdminList([stubEvento1]);
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('[data-testid="evento-item"]');
    expect(items.length).toBe(1);
  });
});
