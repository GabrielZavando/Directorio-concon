import { TestBed, ComponentFixture } from '@angular/core/testing';
import { HomeHeroComponent } from './home-hero.component';
import { CategoryOption, BarrioOption, SearchCriteria } from './hero.types';

/**
 * Reads the rendered hero outerHTML so static design-token assertions can be
 * enforced at test time (no literal hex utilities, canonical rounded/shadow
 * tokens, responsive grid, scalable padding). We query the live DOM rather
 * than reading the .html file because the esbuild-based Karma runner bundles
 * for the browser and cannot import `node:fs`. See tasks 1.2.11 / 1.2.12 / 1.2.13.
 */
function readHeroRenderedOuterHtml(
  fixture: ComponentFixture<HomeHeroComponent>,
): string {
  fixture.detectChanges();
  const section = fixture.nativeElement.querySelector(
    'section[data-purpose="hero-search"]',
  ) as HTMLElement | null;
  return section?.outerHTML ?? '';
}

describe('HomeHeroComponent', () => {
  let fixture: ComponentFixture<HomeHeroComponent>;
  let component: HomeHeroComponent;

  const sampleCategorias: readonly CategoryOption[] = [
    { id: 'cat-1', nombre: 'Restaurantes' },
  ];
  const sampleBarrios: readonly BarrioOption[] = [
    { id: 'b-1', nombre: 'Centro' },
  ];

  beforeEach(async () => {
    // The dumb hero must not require Router or any data service: the TestBed
    // setup intentionally only imports the standalone component and zero
    // providers. If the hero tried to inject Router / HttpClient / Firestore,
    // TestBed would throw here (see scenario 1.2.9 "hero does not navigate").
    await TestBed.configureTestingModule({
      imports: [HomeHeroComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(HomeHeroComponent);
    component = fixture.componentInstance;
  });

  // 1.2.1 — sanity
  it('should create the hero component', () => {
    expect(component).toBeTruthy();
  });

  // 1.2.2 — hero section renders the hero background root element + overlay
  it('should render a <section> with data-purpose="hero-search" and the Concón background image', () => {
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement;
    const section = host.querySelector('section[data-purpose="hero-search"]');
    expect(section).not.toBeNull();

    const styleAttr = section?.getAttribute('style') ?? '';
    // Browsers may serialize the url() with single OR double quotes.
    // Accept both: url(/assets/...), url('...'), url("...")
    const backgroundImageMatch =
      /url\(['"]?\/assets\/panoramica-concon\.jpg['"]?\)/.test(styleAttr);
    expect(backgroundImageMatch)
      .withContext('hero background image is the Concón panoramic asset')
      .toBeTrue();
    expect(styleAttr).toContain('linear-gradient(');
  });

  it('should keep a primary-blue Tailwind class on the hero section as image-load fallback', () => {
    fixture.detectChanges();
    const section = fixture.nativeElement.querySelector(
      'section[data-purpose="hero-search"]',
    ) as HTMLElement | null;
    expect(section?.classList.contains('bg-primary')).toBeTrue();
  });

  // 1.2.3 — free-text query input
  it('should render exactly one <input type="text"> with placeholder "¿Qué estás buscando?" and an accessible name', () => {
    fixture.detectChanges();
    const inputs = fixture.nativeElement.querySelectorAll(
      'input[type="text"]',
    ) as NodeListOf<HTMLInputElement>;
    expect(inputs.length).toBe(1);
    expect(inputs[0].getAttribute('placeholder')).toContain(
      '¿Qué estás buscando?',
    );

    // Accessible name: either aria-label on the input OR <label for="<id>">
    const ariaLabel = inputs[0].getAttribute('aria-label');
    const inputId = inputs[0].getAttribute('id');
    const hasLabel =
      ariaLabel !== null && ariaLabel.trim().length > 0 ||
      (inputId !== null &&
        fixture.nativeElement.querySelector(`label[for="${inputId}"]`) !==
          null);
    expect(hasLabel).toBeTrue();
  });

  // 1.2.4 — category select with placeholder option first and "categoría" label
  it('should render a category <select> with placeholder option first and the supplied options', () => {
    component.categorias = sampleCategorias;
    fixture.detectChanges();

    const selects = fixture.nativeElement.querySelectorAll(
      'select',
    ) as NodeListOf<HTMLSelectElement>;

    // Identify the category select by its label/aria-label mentioning "categoría"
    const categorySelect = Array.from(selects).find((sel) => {
      const id = sel.getAttribute('id');
      const labelledBy = sel.getAttribute('aria-labelledby');
      const ariaLabel = (sel.getAttribute('aria-label') ?? '').toLowerCase();
      const idLabelMatched =
        id !== null &&
        fixture.nativeElement
          .querySelector(`label[for="${id}"]`)
          ?.textContent?.toLowerCase()
          .includes('categor');
      const labelledByMatched =
        labelledBy !== null &&
        fixture.nativeElement
          .querySelector(`#${labelledBy}`)
          ?.textContent?.toLowerCase()
          .includes('categor');
      return ariaLabel.includes('categor') || idLabelMatched || labelledByMatched;
    });
    expect(categorySelect).withContext('a select labelled with "categoría"').toBeTruthy();

    const options = categorySelect!.querySelectorAll('option');
    expect(options.length).toBeGreaterThanOrEqual(2);
    expect(options[0].value).toBe('');
    expect(options[0].textContent?.trim()).toContain('Seleccionar categoría');

    const restaurantOption = Array.from(options).find(
      (o) => o.value === 'cat-1',
    );
    expect(restaurantOption).withContext('option cat-1 Restaurantes').toBeTruthy();
    expect(restaurantOption?.textContent?.trim()).toContain('Restaurantes');
  });

  // 1.2.5 — location select with placeholder option first and "ubicación" label
  it('should render a location <select> with placeholder option first and the supplied options', () => {
    component.barrios = sampleBarrios;
    fixture.detectChanges();

    const selects = fixture.nativeElement.querySelectorAll(
      'select',
    ) as NodeListOf<HTMLSelectElement>;
    const locationSelect = Array.from(selects).find((sel) => {
      const ariaLabel = (sel.getAttribute('aria-label') ?? '').toLowerCase();
      const id = sel.getAttribute('id');
      const idLabelMatched =
        id !== null &&
        fixture.nativeElement
          .querySelector(`label[for="${id}"]`)
          ?.textContent?.toLowerCase()
          .includes('ubicaci');
      return ariaLabel.includes('ubicaci') || idLabelMatched;
    });
    expect(locationSelect).withContext('a select labelled with "ubicación"').toBeTruthy();

    const options = locationSelect!.querySelectorAll('option');
    expect(options.length).toBeGreaterThanOrEqual(2);
    expect(options[0].value).toBe('');
    expect(options[0].textContent?.trim()).toContain('Seleccionar ubicación');

    const centroOption = Array.from(options).find((o) => o.value === 'b-1');
    expect(centroOption).withContext('option b-1 Centro').toBeTruthy();
    expect(centroOption?.textContent?.trim()).toContain('Centro');
  });

  // 1.2.6 — submit button "Buscar" with M3 token classes
  it('should render a <button type="submit"> with text "Buscar" and M3 token classes', () => {
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement | null;
    expect(button).not.toBeNull();
    expect(button!.textContent ?? '').toContain('Buscar');
    expect(button!.classList.contains('bg-secondary-container')).toBeTrue();
    expect(button!.classList.contains('text-primary')).toBeTrue();
  });

  // 1.2.7 — emits SearchCriteria with trimmed q
  it('should emit SearchCriteria with trimmed q and selected categoriaId / barrioId on submit', () => {
    component.categorias = sampleCategorias;
    component.barrios = sampleBarrios;
    fixture.detectChanges();

    const emitted: SearchCriteria[] = [];
    component.searchSubmit.subscribe((c: SearchCriteria) => emitted.push(c));

    component.form.controls.q.setValue(' pizzería ');
    component.form.controls.categoriaId.setValue('cat-1');
    component.form.controls.barrioId.setValue('b-1');

    fixture.detectChanges();
    component.onSubmit();

    expect(emitted.length).toBe(1);
    expect(emitted[0].q).toBe('pizzería');
    expect(emitted[0].categoriaId).toBe('cat-1');
    expect(emitted[0].barrioId).toBe('b-1');
  });

  // 1.2.8 — emits empty categoriaId when placeholder selected
  it('should emit SearchCriteria with empty categoriaId when the placeholder option is selected', () => {
    component.categorias = sampleCategorias;
    fixture.detectChanges();

    const emitted: SearchCriteria[] = [];
    component.searchSubmit.subscribe((c: SearchCriteria) => emitted.push(c));

    component.form.controls.q.setValue('');
    component.form.controls.categoriaId.setValue('');
    component.form.controls.barrioId.setValue('b-1');

    fixture.detectChanges();
    component.onSubmit();

    expect(emitted.length).toBe(1);
    expect(emitted[0].categoriaId).toBe('');
    expect(emitted[0].q).toBe('');
    expect(emitted[0].barrioId).toBe('b-1');
  });

  // 1.2.9 — hero does not inject Router or data services (dumb contract)
  it('should NOT inject Router, HttpClient nor any @angular/fire service (dumb contract)', () => {
    // The dumb hero must take no constructor parameters: an injected Router /
    // HttpClient / Firestore would appear as a ctor param and TestBed would
    // throw in the beforeEach because no providers were registered for them.
    const ctorParams = (component.constructor as unknown as { length?: number }).length ?? 0;
    expect(ctorParams)
      .withContext('dumb hero constructor takes no parameters')
      .toBe(0);

    // Belt-and-braces: re-creating the component through TestBed would throw
    // if the hero had to inject something we did not provide.
    expect(() => TestBed.createComponent(HomeHeroComponent)).not.toThrow();
  });

  // 1.2.11 — rendered hero: no literal hex utility classes; canonical rounded/shadow tokens
  it('should not use arbitrary-value hex-color utilities and should use canonical rounded/shadow tokens in the rendered hero', () => {
    const rendered = readHeroRenderedOuterHtml(fixture);
    const hexArbitrary =
      /\b(?:text|bg|border|ring|shadow|from|to|via)-\[#[0-9a-fA-F]{3,8}\]/;
    expect(hexArbitrary.test(rendered))
      .withContext('no [#...] hex utilities in rendered hero')
      .toBeFalse();

    const roundedMatches = rendered.match(/\brounded-([a-z0-9]+)\b/g) ?? [];
    const allowedRounded = new Set(['sm', 'lg', 'xl', 'full', 'custom', 'default']);
    for (const cls of roundedMatches) {
      const tok = cls.replace('rounded-', '');
      expect(allowedRounded.has(tok) || tok === '')
        .withContext(`rounded token "${tok}" should be in tailwind config`)
        .toBeTrue();
    }
    const shadowMatches = rendered.match(/\bshadow-([a-z0-9]+)\b/g) ?? [];
    const allowedShadow = new Set(['sm', 'lg', 'md', 'none', 'default']);
    for (const cls of shadowMatches) {
      const tok = cls.replace('shadow-', '');
      expect(allowedShadow.has(tok) || tok === '')
        .withContext(`shadow token "${tok}" should be in tailwind config`)
        .toBeTrue();
    }
  });

  // 1.2.12 — responsive grid: single column mobile, 4 columns md+
  it('should define a responsive search form grid: grid-cols-1 on mobile and md:grid-cols-4 on tablets+', () => {
    const rendered = readHeroRenderedOuterHtml(fixture);
    expect(rendered).toContain('grid-cols-1');
    expect(rendered).toContain('md:grid-cols-4');
  });

  // 1.2.13 — scalable vertical padding: py-<N> + md:py-<M> with M > N
  it('should define scalable vertical padding on the hero section: py-<N> + md:py-<M> with M > N', () => {
    const rendered = readHeroRenderedOuterHtml(fixture);
    expect(rendered.length)
      .withContext('hero <section data-purpose="hero-search"> is rendered')
      .toBeGreaterThan(0);

    const pyMobileMatch = rendered.match(/\bpy-(\d+)\b/);
    expect(pyMobileMatch).withContext('section has py-<N>').toBeTruthy();
    const pyMdMatch = rendered.match(/\bmd:py-(\d+)\b/);
    expect(pyMdMatch).withContext('section has md:py-<M>').toBeTruthy();

    const mobile = Number(pyMobileMatch![1]);
    const md = Number(pyMdMatch![1]);
    expect(md).withContext(`md:py-${md} must be > py-${mobile}`).toBeGreaterThan(mobile);
  });
});
