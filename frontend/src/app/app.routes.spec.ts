import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { routes } from './app.routes';
import {
  DirectorioOpcionesPort,
  DIRECTORIO_OPCIONES_PORT,
} from './shared/data-access/directorio-opciones.port';
import { HomePageComponent } from './features/home/home-page.component';
import { DirectorioPageComponent } from './features/directorio/directorio-page.component';
import { EventosPageComponent } from './features/eventos/eventos-page.component';
import { ContactoPageComponent } from './features/contacto/contacto-page.component';
import { RegistratePageComponent } from './features/registrate/registrate-page.component';

/**
 * app.routes.ts — routing contract for the public SPA.
 *
 * Asserts that the canonical 5 SPA routes resolve to the expected lazy-loaded
 * page components. Each route uses `loadComponent` so the test must wait for
 * the dynamic import to resolve (via `RouterTestingHarness.navigateByUrl`).
 *
 * Why the `DIRECTORIO_OPCIONES_PORT` stub?
 *   `/` lazy-loads `HomePageComponent`, which embeds `HomeHeroComponent`, which
 *   embeds the shared `SearchBarContainerComponent`. Without the port provided,
 *   navigating to `/` throws NG0201 (No provider found). This stub is the same
 *   shape used in `home-page.component.spec.ts`. It does NOT affect the other
 *   4 routes (their nested page components are dumb skeletons — no providers).
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
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        { provide: DIRECTORIO_OPCIONES_PORT, useValue: stubDirectorioOpciones },
      ],
    });
  });

  it('should navigate to "/" and resolve to HomePageComponent', async () => {
    const harness = await RouterTestingHarness.create('');
    const component = await harness.navigateByUrl('', HomePageComponent);
    expect(component)
      .withContext('" /" resolves to HomePageComponent')
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

  it('should navigate to "/eventos" and resolve to EventosPageComponent', async () => {
    const harness = await RouterTestingHarness.create('/eventos');
    const component = await harness.navigateByUrl(
      '/eventos',
      EventosPageComponent,
    );
    expect(component)
      .withContext('"/eventos" resolves to EventosPageComponent')
      .toBeInstanceOf(EventosPageComponent);
  });

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

  // --- Verify phase (Task 3.3) ---
  // NOTE: `RouterTestingHarness.create()` can only be called once per test.
  // Each of the verify tests below creates exactly one harness and reuses it
  // across `navigateByUrl` calls inside the same test.

  it('should render the skeleton heading per route (one harness, multiple navigations)', async () => {
    const harness = await RouterTestingHarness.create();

    const skeletonCases: Array<[string, string]> = [
      ['/directorio', 'Directorio'],
      ['/eventos', 'Eventos'],
      ['/contacto', 'Contacto'],
      ['/registrate', 'Registrate'],
    ];

    for (const [url, expectedHeading] of skeletonCases) {
      await harness.navigateByUrl(url);
      const native = harness.routeNativeElement;
      expect(native)
        .withContext(`RouterOutlet for ${url} is rendered`)
        .not.toBeNull();
      const h1 = native!.querySelector('h1') as HTMLHeadingElement | null;
      expect(h1).withContext(`an <h1> exists for ${url}`).not.toBeNull();
      expect(h1!.textContent?.trim())
        .withContext(`heading on ${url} equals "${expectedHeading}"`)
        .toBe(expectedHeading);
    }
  });

  it('should not render the legacy <app-placeholder-directorio> on /directorio', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/directorio');
    await harness.detectChanges();
    const native = harness.routeNativeElement;
    expect(native).not.toBeNull();

    // The new skeleton selector is not expected AT the <router-outlet>:
    // routed components are inserted as the host element of their own view
    // (not wrapped by the component selector). Presence of the skeleton is
    // therefore confirmed via its internal <h1>.
    const h1 = native!.querySelector('h1') as HTMLHeadingElement | null;
    expect(h1)
      .withContext('the new skeleton <h1> is rendered')
      .not.toBeNull();
    expect(h1!.textContent?.trim())
      .withContext('<h1> text is "Directorio" — skeleton, not placeholder')
      .toBe('Directorio');

    // The OLD legacy PlaceholderDirectorioComponent embedded the
    // <app-search-bar-container>; the new skeleton does NOT. This is the
    // discriminator that proves the legacy markup is gone.
    const legacySearchBar = native!.querySelector('app-search-bar-container');
    expect(legacySearchBar)
      .withContext('legacy embedded <app-search-bar-container> must NOT appear')
      .toBeNull();
  });

  it('should render the "Próximamente" message on every skeleton route (one harness, multiple navigations)', async () => {
    const harness = await RouterTestingHarness.create();

    for (const url of ['/directorio', '/eventos', '/contacto', '/registrate']) {
      await harness.navigateByUrl(url);
      const native = harness.routeNativeElement;
      const text = (native!.textContent ?? '').toLowerCase();
      expect(text)
        .withContext(`"${url}" contains "Próximamente"`)
        .toContain('próximamente');
    }
  });
});

