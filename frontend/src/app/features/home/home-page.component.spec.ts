import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { HomePageComponent } from './home-page.component';
import { SearchCriteria } from './hero/hero.types';

describe('HomePageComponent', () => {
  let fixture: ComponentFixture<HomePageComponent>;
  let component: HomePageComponent;
  let router: Router;
  let navigateSpy: jasmine.Spy;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePageComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(HomePageComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);
  });

  it('should create the home page component', () => {
    expect(component).toBeTruthy();
  });

  // 3.1.3 — home page renders <app-home-hero> with categories and barrios
  it('should render <app-home-hero> with categorias and barrios containing MVP dummy values', () => {
    fixture.detectChanges();
    const heroEl = fixture.nativeElement.querySelector(
      'app-home-hero',
    ) as HTMLElement | null;
    expect(heroEl).not.toBeNull();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    // Categorías MVP dummy (al menos Restaurantes y Hospedaje)
    expect(text).toContain('Restaurantes');
    expect(text).toContain('Hospedaje');
    // Barrios MVP dummy (al menos Centro y Bosques)
    expect(text).toContain('Centro');
    expect(text).toContain('Bosques');
  });

  // 3.1.4 — home page navigates to /directorio with all query params
  it('should navigate to /directorio with all query params when the hero emits a full SearchCriteria', () => {
    const criteria: SearchCriteria = {
      q: 'pizzería',
      categoriaId: 'cat-1',
      barrioId: 'b-1',
    };

    component.onSearchSubmit(criteria);

    expect(navigateSpy).toHaveBeenCalledTimes(1);
    const [commands, extras] = navigateSpy.calls.mostRecent().args;
    expect(commands).toEqual(['/directorio']);
    expect(extras?.queryParams).toEqual({
      q: 'pizzería',
      categoriaId: 'cat-1',
      barrioId: 'b-1',
    });
  });

  // 3.1.5 — home page omits empty filters from query params
  it('should omit empty filters from the /directorio query params', () => {
    const criteria: SearchCriteria = {
      q: '',
      categoriaId: '',
      barrioId: 'b-1',
    };

    component.onSearchSubmit(criteria);

    expect(navigateSpy).toHaveBeenCalledTimes(1);
    const [, extras] = navigateSpy.calls.mostRecent().args;
    expect(extras?.queryParams).toEqual({ barrioId: 'b-1' });
    expect(extras?.queryParams).not.toContain('q');
    expect(extras?.queryParams).not.toContain('categoriaId');
  });
});
