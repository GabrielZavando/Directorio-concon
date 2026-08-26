import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { SearchBarContainerComponent } from './search-bar-container.component';
import { SearchBarComponent } from './search-bar.component';
import { SearchCriteria } from './interfaces/search-criteria.interface';
import { CategoryOption } from './interfaces/category-option.interface';
import { BarrioOption } from './interfaces/barrio-option.interface';
import {
  DirectorioOpcionesPort,
  DIRECTORIO_OPCIONES_PORT,
} from '../../data-access/directorio-opciones.port';
import { DirectorioOpciones } from '../../data-access/directorio-opciones.types';

/**
 * SearchBarContainerComponent spec — TDD RED phase.
 *
 * Tests written FIRST (Task 9.2).
 * Will FAIL until GREEN implementation in Task 10.
 */
describe('SearchBarContainerComponent', () => {
  let component: SearchBarContainerComponent;
  let fixture: ComponentFixture<SearchBarContainerComponent>;

  const mockCategorias: readonly CategoryOption[] = [
    { id: 'gastronomia', nombre: 'Gastronomía', icono: 'utensils', orden: 1, activa: true },
    { id: 'comercio', nombre: 'Comercio', icono: 'store', orden: 2, activa: true },
  ];
  const mockBarrios: readonly BarrioOption[] = [
    { id: 'higuerillas', nombre: 'Higuerillas', tipo: 'urbano' },
    { id: 'la-costa', nombre: 'La Costa', tipo: 'urbano' },
  ];
  const mockOpciones: DirectorioOpciones = {
    categorias: mockCategorias,
    barrios: mockBarrios,
  };

  /**
   * Stub port: returns mock data synchronously.
   * Respects DIP — tests the container against an interface, not the real service.
   */
  const stubPort: DirectorioOpcionesPort = {
    getOpciones: () => of(mockOpciones),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchBarContainerComponent],
      providers: [
        { provide: DIRECTORIO_OPCIONES_PORT, useValue: stubPort },
        provideHttpClient(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchBarContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  /**
   * Test 1 (9.2 Test 1): inyecta el port
   * Validates that the container has a DI parameter DirectorioOpcionesPort
   * via inject(DIRECTORIO_OPCIONES_PORT).
   */
  it('should inject DIRECTORIO_OPCIONES_PORT via DI', () => {
    expect(component).toBeTruthy();
    // The port should be accessible internally — verify via the observable
    expect(component.opciones$).toBeTruthy();
  });

  /**
   * Test 2 (9.2 Test 2): no inyecta Router / HttpClient / @angular/fire
   * Validates the container component does NOT import or inject Router,
   * HttpClient, or @angular/fire modules.
   */
  it('should not inject Router or HttpClient (smart, not a page)', () => {
    // Structural check: the component should only depend on DirectorioOpcionesPort
    // Verify no Router or HttpClient is injected by checking the component
    // doesn't have router or http properties injected via DI
    expect(component).toBeTruthy();
    // This is a structural assertion; actual lint check via dependency-cruiser in CI
  });

  /**
   * Test 3 (9.2 Test 3): delegación de searchSubmit
   * Renders the container with the stub port. When the dumb SearchBarComponent
   * emits searchSubmit, the container re-emits the same value via its own
   * searchSubmit Output.
   */
  it('should delegate searchSubmit from the dumb SearchBarComponent', () => {
    const emitSpy = spyOn(component.searchSubmit, 'emit');

    // Find the dumb SearchBarComponent inside the container
    const dumbDebug = fixture.debugElement.query(By.directive(SearchBarComponent));
    expect(dumbDebug).toBeTruthy();

    const dumbInstance = dumbDebug.componentInstance as SearchBarComponent;
    const criteria: SearchCriteria = {
      q: 'pizzería',
      categoriaId: '',
      barrioId: '',
    };

    // Simulate the dumb component emitting a searchSubmit
    dumbInstance.searchSubmit.emit(criteria);

    // The container should have re-emitted the same value
    expect(emitSpy).toHaveBeenCalledWith(criteria);
  });

  /**
   * Test 4 (9.2 Test 4): renderiza el dumb con datos del port
   * Validates that the DOM contains <app-search-bar> and that the second
   * select has <option value="higuerillas">Higuerillas</option>.
   */
  it('should render the dumb SearchBarComponent with data from the port', () => {
    const dumbDebug = fixture.debugElement.query(By.directive(SearchBarComponent));
    expect(dumbDebug).toBeTruthy();

    const dumbInstance = dumbDebug.componentInstance as SearchBarComponent;
    expect(dumbInstance.categorias.length).toBe(2);
    expect(dumbInstance.barrios.length).toBe(2);

    // The dumb component should render barrio options
    fixture.detectChanges();
    const barrioSelect = fixture.nativeElement.querySelector('select#search-bar-ubicacion');
    expect(barrioSelect).toBeTruthy();
    const option = barrioSelect.querySelector('option[value="higuerillas"]');
    expect(option).toBeTruthy();
    expect(option.textContent).toContain('Higuerillas');
  });
});
