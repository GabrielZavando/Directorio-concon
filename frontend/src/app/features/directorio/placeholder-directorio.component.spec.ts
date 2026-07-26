import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { PlaceholderDirectorioComponent } from './placeholder-directorio.component';
import { SearchCriteria } from '../../shared/ui/search-bar/interfaces/search-criteria.interface';
import {
  DirectorioOpcionesPort,
  DIRECTORIO_OPCIONES_PORT,
} from '../../shared/data-access/directorio-opciones.port';

/** Minimal stub port for the placeholder spec. */
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

describe('PlaceholderDirectorioComponent', () => {
  let navigateSpy: jasmine.Spy;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlaceholderDirectorioComponent],
      providers: [
        provideRouter([]),
        { provide: DIRECTORIO_OPCIONES_PORT, useValue: stubPort },
      ],
    }).compileComponents();

    const router = TestBed.inject(Router);
    navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);
  });

  it('should render an <h1> containing "Próximamente" (case-insensitive)', () => {
    const fixture = TestBed.createComponent(PlaceholderDirectorioComponent);
    fixture.detectChanges();
    const h1 = fixture.nativeElement.querySelector('h1') as HTMLHeadingElement;
    expect(h1.textContent?.toLowerCase()).toContain('próximamente');
  });

  it('should render text mentioning "directorio"', () => {
    const fixture = TestBed.createComponent(PlaceholderDirectorioComponent);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text.toLowerCase()).toContain('directorio');
  });

  it('should render the SearchBarContainerComponent', () => {
    const fixture = TestBed.createComponent(PlaceholderDirectorioComponent);
    fixture.detectChanges();
    const container = fixture.nativeElement.querySelector(
      'app-search-bar-container',
    );
    expect(container)
      .withContext('<app-search-bar-container> is present')
      .toBeTruthy();
  });

  it('should navigate with merge when searchSubmit fires', () => {
    const fixture = TestBed.createComponent(PlaceholderDirectorioComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    const criteria: SearchCriteria = {
      q: 'pizzería',
      categoriaId: '',
      barrioId: '',
    };
    (component as { onSearchSubmit: (c: SearchCriteria) => void }).onSearchSubmit(criteria);

    expect(navigateSpy).toHaveBeenCalledTimes(1);
    const [commands, extras] = navigateSpy.calls.mostRecent().args;
    expect(commands).toEqual(['/directorio']);
    expect(extras?.queryParams).toEqual({ q: 'pizzería' });
    expect(extras?.queryParamsHandling).toBe('merge');
  });

  it('should handle existing query params via merge (regression)', () => {
    const fixture = TestBed.createComponent(PlaceholderDirectorioComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    const criteria: SearchCriteria = {
      q: '',
      categoriaId: 'gastronomia',
      barrioId: 'higuerillas',
    };
    (component as { onSearchSubmit: (c: SearchCriteria) => void }).onSearchSubmit(criteria);

    expect(navigateSpy).toHaveBeenCalledTimes(1);
    const [, extras] = navigateSpy.calls.mostRecent().args;
    expect(extras?.queryParams).toEqual({
      categoriaId: 'gastronomia',
      barrioId: 'higuerillas',
    });
    expect(extras?.queryParamsHandling).toBe('merge');
  });
});
