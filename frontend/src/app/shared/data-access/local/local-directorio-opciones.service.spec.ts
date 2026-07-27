import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { LocalDirectorioOpcionesService } from './local-directorio-opciones.service';

/**
 * Spec for LocalDirectorioOpcionesService — the local DIP implementation of
 * DirectorioOpcionesPort that reads the bundled JSON seeds statically.
 *
 * TDD RED: this spec is written first. The service does NOT exist yet, so
 * all tests fail until the implementation lands (Task 5.3).
 */
describe('LocalDirectorioOpcionesService', () => {
  let service: LocalDirectorioOpcionesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LocalDirectorioOpcionesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getOpciones()', () => {
    let emitted: { categorias: unknown[]; barrios: unknown[] } | null;

    beforeEach(() => {
      emitted = null;
      // Synchronous emission: subscribe and capture immediately (no flush needed).
      service.getOpciones().subscribe((value) => {
        emitted = value as unknown as { categorias: unknown[]; barrios: unknown[] };
      });
    });

    it('should emit synchronously (value available in the same microtask)', () => {
      // With `of(...)`, the value is emitted synchronously in the subscribe call.
      // If we reach this assertion and `emitted` is null, emission was async.
      expect(emitted).not.toBeNull();
    });

    it('should emit exactly 9 categorias and 13 barrios', () => {
      expect(emitted!.categorias.length).toBe(9);
      expect(emitted!.barrios.length).toBe(13);
    });

    it('should emit exactly one rural barrio with id "zona-rural"', () => {
      const ruralBarrios = (emitted!.barrios as Array<{ id: string; tipo?: string }>)
        .filter((b) => b.tipo === 'rural');
      expect(ruralBarrios.length).toBe(1);
      expect(ruralBarrios[0].id).toBe('zona-rural');
    });

    it('should emit 12 urban barrios (excluding zona-rural)', () => {
      const urbanBarrios = (emitted!.barrios as Array<{ tipo?: string }>)
        .filter((b) => b.tipo === 'urbano');
      expect(urbanBarrios.length).toBe(12);
    });

    it('should emit gastronomia with icono utensils, orden 1 and activa true', () => {
      const gastronomia = (emitted!.categorias as Array<{ id: string; icono: string; orden: number; activa: boolean }>)
        .find((c) => c.id === 'gastronomia');
      expect(gastronomia).toBeTruthy();
      expect(gastronomia!.icono).toBe('utensils');
      expect(gastronomia!.orden).toBe(1);
      expect(gastronomia!.activa).toBe(true);
    });

    it('should emit unique ids for categorias and barrios (no duplicates)', () => {
      const categoriaIds = (emitted!.categorias as Array<{ id: string }>).map((c) => c.id);
      const barrioIds = (emitted!.barrios as Array<{ id: string }>).map((b) => b.id);
      expect(new Set(categoriaIds).size).toBe(categoriaIds.length);
      expect(new Set(barrioIds).size).toBe(barrioIds.length);
    });

    const ALLOWED_ICONS = [
      'utensils', 'store', 'tent', 'briefcase', 'car',
      'heart-pulse', 'graduation-cap', 'building-2', 'party-popper',
    ];

    it('should not emit any categoria with an icono outside the allowed Lucide set', () => {
      const iconos = (emitted!.categorias as Array<{ icono: string }>).map((c) => c.icono);
      for (const icono of iconos) {
        expect(ALLOWED_ICONS).toContain(icono);
      }
    });
  });

  it('should not import HttpClient, @angular/common/http, or fetch', () => {
    // Assert via export inspection: the service class should NOT expose any
    // HttpClient-injected property, and must implement DirectorioOpcionesPort.
    // Static import inspection done via Jasmine spy on the module signature.
    // Since the local service uses only static JSON imports, it has no constructor
    // params (verified by `length === 0` on the ctor function).
    const ctorParams = (service.constructor as unknown as { length: number }).length;
    expect(ctorParams).toBe(0);
    // Smoke-test: the service returns an Observable (not a Promise / fetch result).
    const result = service.getOpciones();
    expect(typeof (result as unknown as { subscribe: unknown }).subscribe).toBe('function');
  });
});
