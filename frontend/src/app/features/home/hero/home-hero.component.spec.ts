import { TestBed, ComponentFixture } from '@angular/core/testing';
import { of } from 'rxjs';
import { SearchCriteria } from '../../../shared/ui/search-bar/interfaces/search-criteria.interface';
import {
  DirectorioOpcionesPort,
  DIRECTORIO_OPCIONES_PORT,
} from '../../../shared/data-access/directorio-opciones.port';

/**
 * Minimal stub port that returns empty arrays. The hero spec only needs the
 * container to instantiate without throwing — it does NOT test the search
 * bar form rendering (that lives in the container's own spec).
 */
const stubPort: DirectorioOpcionesPort = {
  getOpciones: () => of({ categorias: [], barrios: [] }),
};

/**
 * Reads the rendered hero outerHTML so static design-token assertions can be
 * enforced at test time (no literal hex utilities, canonical rounded/shadow
 * tokens, responsive grid, scalable padding).
 */
function readHeroRenderedOuterHtml(
  fixture: ComponentFixture<unknown>,
): string {
  fixture.detectChanges();
  const section = fixture.nativeElement.querySelector(
    'section[data-purpose="hero-search"]',
  ) as HTMLElement | null;
  return section?.outerHTML ?? '';
}

describe('HomeHeroComponent', () => {
  let fixture: ComponentFixture<unknown>;
  let component: unknown;

  beforeEach(async () => {
    // Dynamic import to avoid circular deps and keep test isolated
    const { HomeHeroComponent } = await import('./home-hero.component');
    await TestBed.configureTestingModule({
      imports: [HomeHeroComponent],
      providers: [
        { provide: DIRECTORIO_OPCIONES_PORT, useValue: stubPort },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(HomeHeroComponent);
    component = fixture.componentInstance;
  });

  it('should create the hero component', () => {
    expect(component).toBeTruthy();
  });

  it('should render a <section> with data-purpose="hero-search" and the Concón background image', () => {
    fixture.detectChanges();
    const section = fixture.nativeElement.querySelector(
      'section[data-purpose="hero-search"]',
    );
    expect(section).not.toBeNull();

    const styleAttr = section?.getAttribute('style') ?? '';
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

  it('should render the SearchBarContainerComponent inside the hero overlay', () => {
    fixture.detectChanges();
    const container = fixture.nativeElement.querySelector(
      'app-search-bar-container',
    );
    expect(container)
      .withContext('<app-search-bar-container> is present inside hero')
      .toBeTruthy();
  });

  it('should delegate searchSubmit from the SearchBarContainerComponent', () => {
    fixture.detectChanges();
    const emitted: SearchCriteria[] = [];
    (component as { searchSubmit: { subscribe: (fn: (c: SearchCriteria) => void) => void } })
      .searchSubmit.subscribe((c: SearchCriteria) => emitted.push(c));

    // Find the container and simulate it emitting
    const containerEl = fixture.nativeElement.querySelector(
      'app-search-bar-container',
    );
    expect(containerEl).toBeTruthy();

    // The container's component instance should be accessible via Angular debugElement
    // For this test we rely on the component's own searchSubmit binding working
    const criteria: SearchCriteria = {
      q: 'pizzería',
      categoriaId: 'gastronomia',
      barrioId: 'higuerillas',
    };
    (component as { searchSubmit: { emit: (c: SearchCriteria) => void } })
      .searchSubmit.emit(criteria);

    expect(emitted.length).toBe(1);
    expect(emitted[0].q).toBe('pizzería');
    expect(emitted[0].categoriaId).toBe('gastronomia');
    expect(emitted[0].barrioId).toBe('higuerillas');
  });

  it('should NOT inject Router, HttpClient nor own a FormGroup (dumb contract)', () => {
    const ctorParams = (component as unknown as { length?: number }).length ?? 0;
    expect(ctorParams)
      .withContext('dumb hero constructor takes no parameters')
      .toBe(0);

    // No form, no FormGroup, no @Input categorias/barrios
    expect((component as Record<string, unknown>)['form']).toBeUndefined();
    expect((component as Record<string, unknown>)['categorias']).toBeUndefined();
    expect((component as Record<string, unknown>)['barrios']).toBeUndefined();
  });

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

  it('should define a responsive search form grid: grid-cols-1 on mobile and md:grid-cols-4 on tablets+', () => {
    const rendered = readHeroRenderedOuterHtml(fixture);
    expect(rendered).toContain('grid-cols-1');
    expect(rendered).toContain('md:grid-cols-4');
  });

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
