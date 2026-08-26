import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { routes } from './app.routes';
import {
  DirectorioOpcionesPort,
  DIRECTORIO_OPCIONES_PORT,
} from './shared/data-access/directorio-opciones.port';
import { HomePageComponent } from './features/home/home-page.component';
import { DirectorioPageComponent } from './features/directorio/directorio-page.component';
import { EventosListPageComponent } from './features/eventos/pages/eventos-list-page.component';
import { EventoDetailPageComponent } from './features/eventos/pages/evento-detail-page.component';
import { EventoFormPageComponent } from './features/eventos/pages/evento-form-page.component';
import { MisEventosPageComponent } from './features/eventos/pages/mis-eventos-page.component';
import { AdminEventosPageComponent } from './features/eventos/pages/admin-eventos-page.component';
import { EventosMapaComponent } from './features/eventos/pages/eventos-mapa.component';
import { ContactoPageComponent } from './features/contacto/contacto-page.component';
import { RegistratePageComponent } from './features/registrate/registrate-page.component';

/**
 * app.routes.ts — routing contract for the public SPA.
 *
 * Asserts that all SPA routes resolve to the expected lazy-loaded
 * page components. Each route uses `loadComponent` or `loadChildren` so the
 * test must wait for the dynamic import to resolve (via
 * `RouterTestingHarness.navigateByUrl`).
 *
 * Why the `DIRECTORIO_OPCIONES_PORT` stub?
 *   `/` lazy-loads `HomePageComponent`, which embeds `HomeHeroComponent`, which
 *   embeds the shared `SearchBarContainerComponent`. Without the port provided,
 *   navigating to `/` throws NG0201 (No provider found).
 */
const stubDirectorioOpciones: DirectorioOpcionesPort = {
  getOpciones: () =>
    of({
      categorias: [
        {
          id: 'gastronomia',
          nombre: 'Gastronomía',
          icono: 'utensils',
          orden: 1,
          activa: true,
        },
      ],
      barrios: [
        { id: 'higuerillas', nombre: 'Higuerillas', tipo: 'urbano' },
      ],
    }),
};

describe('app.routes (SPA routing contract)', () => {
  beforeAll(() => {
    /** Minimal MVCObject that Google Maps components expect for event handling. */
    class MVCObject {
      addListener() { return { remove: () => {} }; }
      bindTo() { /* noop */ }
      get() { return undefined; }
      set() { /* noop */ }
      setValues() { /* noop */ }
      unbind() { /* noop */ }
      unbindAll() { /* noop */ }
    }
    const MockMap = class MockMap extends MVCObject {
      constructor() { super(); }
      setCenter() { /* noop */ }
      setZoom() { /* noop */ }
      getBounds() { return null; }
      fitBounds() { /* noop */ }
      panTo() { /* noop */ }
      controls: unknown[] = [];
      data: unknown = null;
    };
    const MockMarker = class MockMarker extends MVCObject {
      constructor() { super(); }
      setMap() { /* noop */ }
      getPosition() { return null; }
      setPosition() { /* noop */ }
      setTitle() { /* noop */ }
      getTitle() { return ''; }
      setIcon() { /* noop */ }
      setLabel() { /* noop */ }
      setAnimation() { /* noop */ }
      setDraggable() { /* noop */ }
      setVisible() { /* noop */ }
      setZIndex() { /* noop */ }
    };
    const MockInfoWindow = class MockInfoWindow extends MVCObject {
      constructor() { super(); }
      open() { /* noop */ }
      close() { /* noop */ }
      setContent() { /* noop */ }
      setPosition() { /* noop */ }
      setOptions() { /* noop */ }
    };
    (window as any).google = {
      maps: {
        Map: MockMap,
        Marker: MockMarker,
        InfoWindow: MockInfoWindow,
        LatLng: class LatLng {
          private _lat: number;
          private _lng: number;
          constructor(lat: number, lng: number) { this._lat = lat; this._lng = lng; }
          lat() { return this._lat; }
          lng() { return this._lng; }
          toString() { return `(${this._lat},${this._lng})`; }
          toUrlValue() { return ''; }
          equals() { return false; }
        },
        event: {
          clearInstanceListeners() { /* noop */ },
          addListener() { return { remove: () => {} }; },
          addListenerOnce() { return { remove: () => {} }; },
          removeListener() { /* noop */ },
          trigger() { /* noop */ },
          clearListeners() { /* noop */ },
        },
        MapTypeId: { ROADMAP: 'roadmap' },
      } as any,
    };
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: DIRECTORIO_OPCIONES_PORT, useValue: stubDirectorioOpciones },
      ],
    });
  });

  it('should navigate to "/" and resolve to HomePageComponent', async () => {
    const harness = await RouterTestingHarness.create('');
    const component = await harness.navigateByUrl('', HomePageComponent);
    expect(component)
      .withContext('"/" resolves to HomePageComponent')
      .toBeInstanceOf(HomePageComponent);
  });

  it('should navigate to "/directorio" and resolve to DirectorioPageComponent', async () => {
    const harness = await RouterTestingHarness.create('/directorio');
    const component = await harness.navigateByUrl(
      '/directorio',
      DirectorioPageComponent,
    );
    expect(component)
      .withContext('"/directorio" resolves to DirectorioPageComponent')
      .toBeInstanceOf(DirectorioPageComponent);
  });

  // ── Eventos routes (now using loadChildren) ──────────────────────

  it('should navigate to "/eventos" and resolve to EventosListPageComponent', async () => {
    const harness = await RouterTestingHarness.create('/eventos');
    const component = await harness.navigateByUrl(
      '/eventos',
      EventosListPageComponent,
    );
    expect(component)
      .withContext('"/eventos" resolves to EventosListPageComponent')
      .toBeInstanceOf(EventosListPageComponent);
  });

  it('should navigate to "/eventos/nuevo" and resolve to EventoFormPageComponent', async () => {
    const harness = await RouterTestingHarness.create('/eventos');
    const component = await harness.navigateByUrl(
      '/eventos/nuevo',
      EventoFormPageComponent,
    );
    expect(component)
      .withContext('"/eventos/nuevo" resolves to EventoFormPageComponent')
      .toBeInstanceOf(EventoFormPageComponent);
  });

  it('should navigate to "/eventos/test-slug" and resolve to EventoDetailPageComponent', async () => {
    const harness = await RouterTestingHarness.create('/eventos');
    const component = await harness.navigateByUrl(
      '/eventos/test-slug',
      EventoDetailPageComponent,
    );
    expect(component)
      .withContext('"/eventos/:slug" resolves to EventoDetailPageComponent')
      .toBeInstanceOf(EventoDetailPageComponent);
  });

  it('should navigate to "/eventos/evt-1/editar" and resolve to EventoFormPageComponent', async () => {
    const harness = await RouterTestingHarness.create('/eventos');
    const component = await harness.navigateByUrl(
      '/eventos/evt-1/editar',
      EventoFormPageComponent,
    );
    expect(component)
      .withContext('"/eventos/:id/editar" resolves to EventoFormPageComponent')
      .toBeInstanceOf(EventoFormPageComponent);
  });

  it('should navigate to "/eventos/mapa" and resolve to EventosMapaComponent', async () => {
    const httpMock = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create('/eventos');
    const component: EventosMapaComponent = await harness.navigateByUrl(
      '/eventos/mapa',
      EventosMapaComponent,
    );
    expect(component)
      .withContext('"/eventos/mapa" resolves to EventosMapaComponent')
      .toBeInstanceOf(EventosMapaComponent);

    // Flush all pending HTTP requests; ignore cancelled ones
    for (const req of httpMock.match((_) => true)) {
      try {
        req.flush([]);
      } catch {
        // request was cancelled (component destroyed during navigation)
      }
    }
    httpMock.verify();
  });

  // ── Mis eventos ──────────────────────────────────────────────────

  it('should navigate to "/mis-eventos" and resolve to MisEventosPageComponent', async () => {
    const harness = await RouterTestingHarness.create('/mis-eventos');
    const component = await harness.navigateByUrl(
      '/mis-eventos',
      MisEventosPageComponent,
    );
    expect(component)
      .withContext('"/mis-eventos" resolves to MisEventosPageComponent')
      .toBeInstanceOf(MisEventosPageComponent);
  });

  // ── Admin eventos ─────────────────────────────────────────────────

  it('should navigate to "/admin/eventos" and resolve to AdminEventosPageComponent', async () => {
    const harness = await RouterTestingHarness.create('/admin/eventos');
    const component = await harness.navigateByUrl(
      '/admin/eventos',
      AdminEventosPageComponent,
    );
    expect(component)
      .withContext('"/admin/eventos" resolves to AdminEventosPageComponent')
      .toBeInstanceOf(AdminEventosPageComponent);
  });

  // ── Other public routes ──────────────────────────────────────────

  it('should navigate to "/contacto" and resolve to ContactoPageComponent', async () => {
    const harness = await RouterTestingHarness.create('/contacto');
    const component = await harness.navigateByUrl(
      '/contacto',
      ContactoPageComponent,
    );
    expect(component)
      .withContext('"/contacto" resolves to ContactoPageComponent')
      .toBeInstanceOf(ContactoPageComponent);
  });

  it('should navigate to "/registrate" and resolve to RegistratePageComponent', async () => {
    const harness = await RouterTestingHarness.create('/registrate');
    const component = await harness.navigateByUrl(
      '/registrate',
      RegistratePageComponent,
    );
    expect(component)
      .withContext('"/registrate" resolves to RegistratePageComponent')
      .toBeInstanceOf(RegistratePageComponent);
  });

  // ── Verify phase skeleton headings ───────────────────────────────

  it('should render real content on mis-eventos and admin/eventos pages', async () => {
    const harness = await RouterTestingHarness.create();

    // Mis Eventos page has real content (Task 16)
    await harness.navigateByUrl('/mis-eventos');
    {
      // Flush the pending HTTP request from ngOnInit
      const httpMock = TestBed.inject(HttpTestingController);
      const req = httpMock.expectOne(
        (r) => r.url.endsWith('/api/v1/eventos') && r.method === 'GET',
      );
      req.flush({ success: true, statusCode: 200, data: [] });
    }
    const misText = (harness.routeNativeElement!.textContent ?? '').toLowerCase();
    expect(misText)
      .withContext('"/mis-eventos" contains "Mis Eventos"')
      .toContain('mis eventos');
    expect(misText)
      .withContext('"/mis-eventos" contains "Nuevo Evento"')
      .toContain('nuevo evento');

    // Admin Eventos page has real content (Task 16)
    await harness.navigateByUrl('/admin/eventos');
    {
      // Flush the pending HTTP request from ngOnInit
      const httpMock = TestBed.inject(HttpTestingController);
      const req = httpMock.expectOne(
        (r) => r.url.endsWith('/api/v1/eventos') && r.method === 'GET',
      );
      req.flush({ success: true, statusCode: 200, data: [] });
    }
    const adminText = (harness.routeNativeElement!.textContent ?? '').toLowerCase();
    expect(adminText)
      .withContext('"/admin/eventos" contains "Administrar Eventos"')
      .toContain('administrar eventos');
    expect(adminText)
      .withContext('"/admin/eventos" contains "Solicitudes"')
      .toContain('solicitudes');
  });
});
