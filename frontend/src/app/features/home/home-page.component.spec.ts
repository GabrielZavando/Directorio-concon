import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { HomePageComponent } from './home-page.component';
import { SearchCriteria } from './hero/hero.types';
import {
  DirectorioOpcionesPort,
  DIRECTORIO_OPCIONES_PORT,
} from '../../shared/data-access/directorio-opciones.port';

/** Minimal stub port — the home page spec only tests navigation, not data rendering. */
const stubPort: DirectorioOpcionesPort = {
  getOpciones: () => of({
    categorias: [
      { id: 'gastronomia', nombre: 'Gastronomía', icono: 'utensils', orden: 1, activa: true },
    ],
    barrios: [
      { id: 'higuerillas', nombre: 'Higuerillas', tipo: 'urbano' as const },
    ],
  }),
};

describe('HomePageComponent', () => {
  let fixture: ComponentFixture<HomePageComponent>;
  let component: HomePageComponent;
  let router: Router;
  let navigateSpy: jasmine.Spy;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePageComponent],
      providers: [
        provideRouter([]),
        { provide: DIRECTORIO_OPCIONES_PORT, useValue: stubPort },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomePageComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);
  });

  it('should create the home page component', () => {
    expect(component).toBeTruthy();
  });

  it('should render <app-home-hero> without hardcoded categorias/barrios inputs', () => {
    fixture.detectChanges();
    const heroEl = fixture.nativeElement.querySelector(
      'app-home-hero',
    ) as HTMLElement | null;
    expect(heroEl).not.toBeNull();

    // The hero no longer receives [categorias] or [barrios] as inputs
    const heroAttrs = heroEl!.getAttributeNames();
    expect(heroAttrs).not.toContain('categorias');
    expect(heroAttrs).not.toContain('barrios');
  });

  it('should navigate to /directorio with canonical query params on full SearchCriteria', () => {
    const criteria: SearchCriteria = {
      q: 'pizzería',
      categoriaId: 'gastronomia',
      barrioId: 'higuerillas',
    };

    component.onSearchSubmit(criteria);

    expect(navigateSpy).toHaveBeenCalledTimes(1);
    const [commands, extras] = navigateSpy.calls.mostRecent().args;
    expect(commands).toEqual(['/directorio']);
    expect(extras?.queryParams).toEqual({
      q: 'pizzería',
      categoriaId: 'gastronomia',
      barrioId: 'higuerillas',
    });
  });

  it('should omit empty filters from the /directorio query params', () => {
    const criteria: SearchCriteria = {
      q: '',
      categoriaId: '',
      barrioId: 'higuerillas',
    };

    component.onSearchSubmit(criteria);

    expect(navigateSpy).toHaveBeenCalledTimes(1);
    const [, extras] = navigateSpy.calls.mostRecent().args;
    expect(extras?.queryParams).toEqual({ barrioId: 'higuerillas' });
    expect(extras?.queryParams).not.toContain('q');
    expect(extras?.queryParams).not.toContain('categoriaId');
  });

  it('should import buildQueryParams from shared utils (not a local method)', async () => {
    // The onSearchSubmit method delegates to the imported buildQueryParams.
    // Verify by checking that the function is NOT a method on the component class.
    const proto = Object.getPrototypeOf(component) as Record<string, unknown>;
    // buildQueryParams should not be a method on the component prototype
    // (it was a private method before; now it's imported)
    expect(proto['buildQueryParams']).toBeUndefined();
  });
});
