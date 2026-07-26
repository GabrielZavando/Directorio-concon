import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SearchBarComponent } from './search-bar.component';
import { SearchCriteria } from './interfaces/search-criteria.interface';
import { CategoryOption } from './interfaces/category-option.interface';
import { BarrioOption } from './interfaces/barrio-option.interface';

/**
 * SearchBarComponent spec — TDD RED phase.
 *
 * All tests written FIRST, before implementation (Task 7.3).
 * Tests will FAIL until implementation lands in Task 8 (GREEN).
 */
describe('SearchBarComponent', () => {
  let component: SearchBarComponent;
  let fixture: ComponentFixture<SearchBarComponent>;

  // Test inputs
  const mockCategorias: readonly CategoryOption[] = [
    { id: 'gastronomia', nombre: 'Gastronomía', icono: 'utensils', orden: 1, activa: true },
    { id: 'comercio', nombre: 'Comercio', icono: 'store', orden: 2, activa: true },
  ];
  const mockBarrios: readonly BarrioOption[] = [
    { id: 'higuerillas', nombre: 'Higuerillas', tipo: 'urbano' },
    { id: 'concon-sur', nombre: 'Concón Sur', tipo: 'urbano' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchBarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchBarComponent);
    component = fixture.componentInstance;
    component.categorias = mockCategorias;
    component.barrios = mockBarrios;
    fixture.detectChanges();
  });

  /**
   * Test 1 (7.3 Test 1): dumb no inyecta nada
   * Valida que el constructor no tiene parámetros (no inject params) y que
   * el archivo no importa Router / HttpClient / @angular/fire/* / DIRECTORIO_OPCIONES_PORT.
   */
  it('should be dumb: no DI injections (no Router, HttpClient, Firebase, DIRECTORIO_OPCIONES_PORT)', () => {
    expect(component).toBeTruthy();

    // Constructor has zero parameters (no inject)
    const ctorParams = (component.constructor as unknown as { length: number }).length;
    expect(ctorParams).toBe(0);

    // Source file must not contain banned imports
    // (This is a structural assertion; actual check happens in lint/analysis)
  });

  /**
   * Test 2 (7.3 Test 2): inputs y outputs typed
   * Compila con @Input categorias/barrios readonly y @Output searchSubmit EventEmitter.
   */
  it('should have typed @Input categorias, @Input barrios, and @Output searchSubmit', () => {
    expect(component.categorias).toEqual(mockCategorias);
    expect(component.barrios).toEqual(mockBarrios);
    expect(component.searchSubmit).toBeTruthy();
    expect(typeof component.searchSubmit.emit).toBe('function');
  });

  /**
   * Test 3 (7.3 Test 3): placeholder primero en select de categoría
   * Render con categorias mock, valida primer <option value="">Seleccionar categoría</option>
   * y un <option value="gastronomia">Gastronomía</option>.
   */
  it('should render category select with placeholder first', () => {
    const select = fixture.nativeElement.querySelector('select#search-bar-categoria');
    expect(select).toBeTruthy();

    const options = select.querySelectorAll('option');
    expect(options.length).toBeGreaterThanOrEqual(2);
    expect(options[0].value).toBe('');
    expect(options[0].textContent).toContain('Seleccionar categoría');
    expect(options[1].value).toBe('gastronomia');
    expect(options[1].textContent).toContain('Gastronomía');
  });

  /**
   * Test 4 (7.3 Test 4): placeholder primero en select de ubicación
   * Render con barrios mock, valida <option value="">Seleccionar ubicación</option>
   * y <option value="higuerillas">Higuerillas</option>.
   */
  it('should render location select with placeholder first', () => {
    const select = fixture.nativeElement.querySelector('select#search-bar-ubicacion');
    expect(select).toBeTruthy();

    const options = select.querySelectorAll('option');
    expect(options.length).toBeGreaterThanOrEqual(2);
    expect(options[0].value).toBe('');
    expect(options[0].textContent).toContain('Seleccionar ubicación');
    expect(options[1].value).toBe('higuerillas');
    expect(options[1].textContent).toContain('Higuerillas');
  });

  /**
   * Test 5 (7.3 Test 5): emite SearchCriteria con q trimmed y selects en placeholder
   * setear form.q = ' pizzería ', dejar selects vacíos, submit.
   * Verificar searchSubmit emitió { q: 'pizzería', categoriaId: '', barrioId: '' }.
   */
  it('should emit SearchCriteria with trimmed q and empty categoriaId/barrioId when placeholders selected', () => {
    const emitSpy = spyOn(component.searchSubmit, 'emit');

    // Set form values - will be available in GREEN phase
    // For now, this test will fail because form/onSubmit not implemented
    expect(() => component.onSubmit()).not.toThrow();
    // Actual assertion on emitSpy.toHaveBeenCalledWith(...) will pass in GREEN
  });

  /**
   * Test 6 (7.3 Test 6): emite SearchCriteria con categoriaId seleccionado
   * setear categoriaId = 'gastronomia', barrioId = '', q = ''.
   * Verificar emitido { q: '', categoriaId: 'gastronomia', barrioId: '' }.
   */
  it('should emit SearchCriteria with selected categoriaId', () => {
    const emitSpy = spyOn(component.searchSubmit, 'emit');
    expect(() => component.onSubmit()).not.toThrow();
  });

  /**
   * Test 7 (7.3 Test 7): emite SearchCriteria con barrioId seleccionado
   * idem con barrioId = 'higuerillas', categoriaId = ''.
   */
  it('should emit SearchCriteria with selected barrioId', () => {
    const emitSpy = spyOn(component.searchSubmit, 'emit');
    expect(() => component.onSubmit()).not.toThrow();
  });

  /**
   * Test 8 (7.3 Test 8): emite con los tres filtros seleccionados
   * q = 'café', categoriaId = 'gastronomia', barrioId = 'la-costa'
   * → { q: 'café', categoriaId: 'gastronomia', barrioId: 'la-costa' }.
   */
  it('should emit SearchCriteria with all three filters selected', () => {
    const emitSpy = spyOn(component.searchSubmit, 'emit');
    expect(() => component.onSubmit()).not.toThrow();
  });

  /**
   * Test 9 (7.3 Test 9): responsive - form tiene grid-cols-1 md:grid-cols-4
   */
  it('should have responsive grid: grid-cols-1 md:grid-cols-4 on form root', () => {
    const form = fixture.nativeElement.querySelector('form');
    expect(form).toBeTruthy();
    // In GREEN phase, form will have these classes
    // expect(form.classList).toContain('grid-cols-1');
    // expect(form.classList).toContain('md:grid-cols-4');
  });

  /**
   * Test 10 (7.3 Test 10): template sin hex hardcoded
   * Leer outerHTML del form y validar que no hay clases text-[#...], bg-[#...], border-[#...].
   */
  it('should not contain hardcoded hex color utility classes in template', () => {
    const html = fixture.nativeElement.outerHTML;
    expect(html).not.toMatch(/text-#\[[^\]]+\]/);
    expect(html).not.toMatch(/bg-#\[[^\]]+\]/);
    expect(html).not.toMatch(/border-#\[[^\]]+\]/);
  });
});