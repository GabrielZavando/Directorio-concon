import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { EventosMapaComponent } from './eventos-mapa.component';
import { EventoMapDataItem } from '../../../shared/data-access/eventos/evento.types';

const stubPoints: EventoMapDataItem[] = [
  {
    id: 'evt-1',
    slug: 'concierto-verano',
    nombre: 'Concierto de Verano',
    coordenadas: { lat: -32.921, lng: -71.515 },
    subcategoriaId: 'conciertos',
    barrioId: 'centro',
    fechaInicio: '2026-08-15T20:00:00.000Z',
  },
  {
    id: 'evt-2',
    slug: 'feria-gastronomica',
    nombre: 'Feria Gastronómica',
    coordenadas: { lat: -32.932, lng: -71.510 },
    subcategoriaId: 'ferias-gastronomicas',
    barrioId: 'centro',
    fechaInicio: '2026-08-20T10:00:00.000Z',
  },
  {
    id: 'evt-3',
    slug: 'taller-pintura',
    nombre: 'Taller de Pintura',
    coordenadas: { lat: -32.915, lng: -71.520 },
    subcategoriaId: 'conciertos',
    barrioId: 'bosques',
    fechaInicio: '2026-08-22T15:00:00.000Z',
  },
];

describe('EventosMapaComponent', () => {
  let component: EventosMapaComponent;
  let fixture: ComponentFixture<EventosMapaComponent>;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeAll(() => {
    /** Minimal MVCObject that Google Maps components expect for event handling. */
    class MVCObject {
      addListener(_eventName: string, _handler: Function) {
        return { remove: () => {} };
      }
      bindTo() { /* noop */ }
      get(key: string) { return undefined; }
      set(key: string, value: unknown) { /* noop */ }
      setValues(_values: Record<string, unknown>) { /* noop */ }
      unbind(_key: string) { /* noop */ }
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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventosMapaComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(EventosMapaComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    httpMock.verify();
  });

  /** Helper: call loadMapData and flush HTTP response. */
  function loadData(data?: EventoMapDataItem[], status = 200) {
    fixture.detectChanges(); // triggers ngOnInit → mapData()
    const req = httpMock.expectOne('/api/v1/eventos/map-data');
    expect(req.request.method).toBe('GET');
    if (data) {
      req.flush(data);
    } else if (status === 500) {
      req.flush('Server Error', { status: 500, statusText: 'Server Error' });
    } else {
      req.flush([]);
    }
    fixture.detectChanges();
  }

  // ── Initial state ─────────────────────────────────────────────────

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should start with loading true', () => {
    fixture.detectChanges();
    expect((component as any).loading()).toBeTrue();
    expect((component as any).allPoints()).toEqual([]);
    // Clean up pending HTTP request
    httpMock.expectOne('/api/v1/eventos/map-data').flush([]);
  });

  // ── Loading skeleton ──────────────────────────────────────────────

  it('should show loading skeleton initially', () => {
    fixture.detectChanges(); // loading=true triggers HTTP req, before flush
    const skeletons = fixture.nativeElement.querySelectorAll('ngx-skeleton-loader');
    expect(skeletons.length).withContext('skeleton visible during loading').toBeGreaterThan(0);
    // Flush to clean up
    httpMock.expectOne('/api/v1/eventos/map-data').flush([]);
  });

  // ── Markers rendering ─────────────────────────────────────────────

  it('should render map-marker elements after loading data', () => {
    loadData(stubPoints);
    // Wait for view to render
    fixture.detectChanges();
    const markers = fixture.nativeElement.querySelectorAll('map-marker');
    expect(markers.length).toBe(3);
  });

  // ── Filter chips ─────────────────────────────────────────────────

  it('should show filter chip for "todas" and one per subcategoria', () => {
    loadData(stubPoints);
    const chips = fixture.nativeElement.querySelectorAll('[data-testid="filter-chip"]');
    // "Todas" + conciertos + ferias-gastronomicas = 3
    expect(chips.length).toBe(3);
    const texts = Array.from(chips).map((c) => (c as Element).textContent?.trim());
    expect(texts).toContain('Todas');
    expect(texts).toContain('Conciertos');
    expect(texts).toContain('Ferias gastronómicas');
  });

  it('should highlight selected filter chip', () => {
    loadData(stubPoints);
    // Find "Conciertos" chip and click it
    const chips = fixture.nativeElement.querySelectorAll('[data-testid="filter-chip"]');
    const conciertosChip = Array.from(chips).find(
      (c) => (c as Element).textContent?.trim() === 'Conciertos',
    ) as HTMLButtonElement;
    expect(conciertosChip).withContext('conciertos chip found').toBeTruthy();
    conciertosChip.click();
    fixture.detectChanges();

    // Should have 2 markers (conciertos has 2 of 3 events)
    const markers = fixture.nativeElement.querySelectorAll('map-marker');
    expect(markers.length).toBe(2);
  });

  it('should show all markers when "Todas" chip is selected', () => {
    loadData(stubPoints);
    // First filter to conciertos
    const allChips = fixture.nativeElement.querySelectorAll('[data-testid="filter-chip"]');
    (Array.from(allChips).find((c) => (c as Element).textContent?.trim() === 'Conciertos') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('map-marker').length).toBe(2);

    // Now click "Todas"
    (Array.from(allChips).find((c) => (c as Element).textContent?.trim() === 'Todas') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('map-marker').length).toBe(3);
  });

  // ── Marker click / InfoWindow ────────────────────────────────────

  it('should show selected point details on marker click', () => {
    loadData(stubPoints);
    // Simulate marker click programmatically
    (component as any).onMarkerClick(stubPoints[0]);
    fixture.detectChanges();
    expect((component as any).selectedPoint()).toEqual(stubPoints[0]);
    // The info window should now have content with the marker name
    const infoContent = fixture.nativeElement.querySelector('[data-testid="info-window-content"]');
    expect(infoContent).withContext('info window content rendered').toBeTruthy();
    const text = infoContent?.textContent ?? '';
    expect(text).toContain('Concierto de Verano');
  });

  it('should navigate to slug on "Ver detalle" click', async () => {
    loadData(stubPoints);
    const navigateSpy = spyOn(router, 'navigate');
    // Set both selected point and coords (as onMarkerClick would)
    (component as any).onMarkerClick(stubPoints[1]);
    fixture.detectChanges();

    const detailLink = fixture.nativeElement.querySelector('[data-testid="ver-detalle-btn"]');
    expect(detailLink).withContext('ver detalle button').toBeTruthy();
    detailLink.click();
    expect(navigateSpy).toHaveBeenCalledWith(['/eventos', 'feria-gastronomica']);
  });

  // ── Empty state ──────────────────────────────────────────────────

  it('should show empty message when no events returned', () => {
    loadData([]);
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('No hay eventos');
  });

  // ── Error state ──────────────────────────────────────────────────

  it('should show error message on HTTP failure', () => {
    loadData(undefined, 500);
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Error');
    expect(text).toContain('Reintentar');
  });

  it('should retry loading after error', () => {
    // First request fails
    loadData(undefined, 500);

    // Click retry button
    const retryBtn: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="retry-btn"]');
    expect(retryBtn).withContext('retry button visible').toBeTruthy();
    retryBtn.click();
    fixture.detectChanges();

    // New HTTP request should be made
    const retryReq = httpMock.expectOne('/api/v1/eventos/map-data');
    retryReq.flush(stubPoints);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('map-marker').length).toBe(3);
  });
});
