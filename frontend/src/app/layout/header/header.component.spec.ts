import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { HeaderComponent } from './header.component';
import { routes } from '../../app.routes';

describe('HeaderComponent', () => {
  let fixture: ComponentFixture<HeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      // RouterLink / RouterLinkActive need an active router to handle clicks.
      // We use the real app.routes so the router can recognize all 5 paths
      // and `routerLink` triggers an actual navigation.
      providers: [provideRouter(routes)],
    }).compileComponents();
    fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render brand logo with descriptive alt and responsive sizing', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const logo = compiled.querySelector('img[alt="Directorio Concón"]');
    expect(logo).not.toBeNull();
    expect(logo?.getAttribute('src')).toBe('/assets/logo-transparente.webp');
    expect(logo?.classList.contains('h-10')).toBeTrue();
    expect(logo?.classList.contains('w-auto')).toBeTrue();
  });

  it('should wrap logo in accessible link with aria-label', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const link = compiled.querySelector('a[aria-label*="Directorio Concón"]');
    expect(link).not.toBeNull();
    const img = link?.querySelector('img');
    expect(img).not.toBeNull();
  });

  it('should render all 5 nav links', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const text = compiled.textContent ?? '';
    expect(text).toContain('Inicio');
    expect(text).toContain('Directorio');
    expect(text).toContain('Eventos');
    expect(text).toContain('Contacto');
    expect(text).toContain('Registrate');
  });

  it('should use M3 tokens on root <header> element', () => {
    const header = fixture.nativeElement.querySelector('header');
    expect(header.classList.contains('bg-surface-container-lowest')).toBeTrue();
    expect(header.classList.contains('border-outline-variant')).toBeTrue();
    expect(header.classList.contains('sticky')).toBeTrue();
  });

  describe('Desktop CTA styling', () => {
    it('should render CTA "Registrate" as a button-styled element, not plain text', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const ctaLink = Array.from(compiled.querySelectorAll('a')).find(
        (el) => el.textContent?.trim() === 'Registrate'
      );
      expect(ctaLink).not.toBeNull();
      expect(ctaLink?.classList.contains('bg-primary')).toBeTrue();
    });

    it('should have white text on CTA', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const ctaLink = Array.from(compiled.querySelectorAll('a')).find(
        (el) => el.textContent?.trim() === 'Registrate'
      );
      expect(ctaLink?.classList.contains('text-white')).toBeTrue();
    });

    it('should have correct padding on CTA (px-6 py-2.5)', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const ctaLink = Array.from(compiled.querySelectorAll('a')).find(
        (el) => el.textContent?.trim() === 'Registrate'
      );
      expect(ctaLink?.classList.contains('px-6')).toBeTrue();
      expect(ctaLink?.classList.contains('py-2.5')).toBeTrue();
    });

    it('should have rounded-custom border radius on CTA', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const ctaLink = Array.from(compiled.querySelectorAll('a')).find(
        (el) => el.textContent?.trim() === 'Registrate'
      );
      expect(ctaLink?.classList.contains('rounded-custom')).toBeTrue();
    });

    it('should have font-semibold on CTA', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const ctaLink = Array.from(compiled.querySelectorAll('a')).find(
        (el) => el.textContent?.trim() === 'Registrate'
      );
      expect(ctaLink?.classList.contains('font-semibold')).toBeTrue();
    });

    it('should have transition-colors on CTA', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const ctaLink = Array.from(compiled.querySelectorAll('a')).find(
        (el) => el.textContent?.trim() === 'Registrate'
      );
      expect(ctaLink?.classList.contains('transition-colors')).toBeTrue();
    });

    it('should have hover:bg-primary-container on CTA', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const ctaLink = Array.from(compiled.querySelectorAll('a')).find(
        (el) => el.textContent?.trim() === 'Registrate'
      );
      expect(ctaLink?.classList.contains('hover:bg-primary-container')).toBeTrue();
    });
  });

  describe('Mobile hamburger button', () => {
    it('should render a hamburger toggle button', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const hamburgerButton = compiled.querySelector('button[aria-label="Toggle menu"]');
      expect(hamburgerButton).not.toBeNull();
    });

    it('should have md:hidden class to show only on mobile', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const hamburgerButton = compiled.querySelector('button[aria-label="Toggle menu"]');
      expect(hamburgerButton?.classList.contains('md:hidden')).toBeTrue();
    });

    it('should have aria-expanded="false" by default', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const hamburgerButton = compiled.querySelector('button[aria-label="Toggle menu"]');
      expect(hamburgerButton?.getAttribute('aria-expanded')).toBe('false');
    });

    it('should have accessible aria-label', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const hamburgerButton = compiled.querySelector('button[aria-label="Toggle menu"]');
      const ariaLabel = hamburgerButton?.getAttribute('aria-label');
      expect(ariaLabel).toBe('Toggle menu');
    });

    it('should have aria-controls pointing to panel ID', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const hamburgerButton = compiled.querySelector('button[aria-label="Toggle menu"]');
      const ariaControls = hamburgerButton?.getAttribute('aria-controls');
      expect(ariaControls).toBeTruthy();
      const panel = compiled.querySelector(`#${ariaControls}`);
      expect(panel).not.toBeNull();
    });

    it('should render lucide Menu icon inside the button when menu is closed', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const hamburgerButton = compiled.querySelector('button[aria-label="Toggle menu"]');
      const svgIcon = hamburgerButton?.querySelector('svg');
      expect(svgIcon).not.toBeNull();
      // Menu icon should be present (lucide adds lucide-menu class)
      expect(svgIcon?.classList.contains('lucide-menu') || svgIcon?.getAttribute('data-lucide') === 'menu').toBeTrue();
    });
  });

  describe('Mobile menu panel', () => {
    it('should have panel element in DOM', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const panel = compiled.querySelector('#mobile-menu-panel');
      expect(panel).not.toBeNull();
    });

    it('should have role="dialog" on panel', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const panel = compiled.querySelector('#mobile-menu-panel');
      expect(panel?.getAttribute('role')).toBe('dialog');
    });

    it('should have aria-modal="true" on panel', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const panel = compiled.querySelector('#mobile-menu-panel');
      expect(panel?.getAttribute('aria-modal')).toBe('true');
    });

    it('should NOT have open class when menu is closed', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const panel = compiled.querySelector('#mobile-menu-panel');
      expect(panel?.classList.contains('mobile-menu-panel--open')).toBeFalse();
    });

    it('should show panel when menu is opened', () => {
      fixture.componentInstance.isMenuOpen.set(true);
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const panel = compiled.querySelector('#mobile-menu-panel');
      expect(panel?.classList.contains('mobile-menu-panel--open')).toBeTrue();
    });

    it('should have mobile-menu-panel class with sizing/positioning styles', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const panel = compiled.querySelector('#mobile-menu-panel');
      expect(panel?.classList.contains('mobile-menu-panel')).toBeTrue();
      // CSS rule .mobile-menu-panel sets width:85%, height:calc(100vh - 4rem), position:fixed, top:4rem, right:0
    });

    it('should hide panel when menu is closed and show when open', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const panel = compiled.querySelector('#mobile-menu-panel');
      // Closed: no open modifier class
      expect(panel?.classList.contains('mobile-menu-panel--open')).toBeFalse();
      // Open: has open modifier class
      fixture.componentInstance.isMenuOpen.set(true);
      fixture.detectChanges();
      expect(panel?.classList.contains('mobile-menu-panel--open')).toBeTrue();
    });
  });

  describe('Panel animation', () => {
    it('should have mobile-menu-panel class that applies transition via CSS', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const panel = compiled.querySelector('#mobile-menu-panel');
      // CSS rule .mobile-menu-panel applies: transition: transform 300ms ease-out
      expect(panel?.classList.contains('mobile-menu-panel')).toBeTrue();
    });

    it('should not have open class when closed (transform: translateX(100%))', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const panel = compiled.querySelector('#mobile-menu-panel');
      // CSS .mobile-menu-panel sets transform: translateX(100%)
      expect(panel?.classList.contains('mobile-menu-panel--open')).toBeFalse();
    });

    it('should have open class when open (transform: translateX(0))', () => {
      fixture.componentInstance.isMenuOpen.set(true);
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const panel = compiled.querySelector('#mobile-menu-panel');
      // CSS .mobile-menu-panel--open overrides to transform: translateX(0)
      expect(panel?.classList.contains('mobile-menu-panel--open')).toBeTrue();
    });
  });

  describe('Icon crossfade', () => {
    it('should show Menu icon when menu is closed', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const hamburgerButton = compiled.querySelector('button[aria-label="Toggle menu"]');
      const svgIcon = hamburgerButton?.querySelector('svg');
      expect(svgIcon?.classList.contains('lucide-menu') || svgIcon?.getAttribute('data-lucide') === 'menu').toBeTrue();
    });

    it('should show X icon when menu is open', () => {
      fixture.componentInstance.isMenuOpen.set(true);
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const hamburgerButton = compiled.querySelector('button[aria-label="Toggle menu"]');
      const svgIcon = hamburgerButton?.querySelector('svg');
      expect(svgIcon?.classList.contains('lucide-x') || svgIcon?.getAttribute('data-lucide') === 'x').toBeTrue();
    });

    it('should have icon-crossfade class for transition', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const hamburgerButton = compiled.querySelector('button[aria-label="Toggle menu"]');
      const svgIcon = hamburgerButton?.querySelector('svg');
      expect(svgIcon?.classList.contains('icon-crossfade')).toBeTrue();
    });
  });

  describe('Close behavior', () => {
    it('should close menu when pressing Escape', () => {
      fixture.componentInstance.isMenuOpen.set(true);
      fixture.detectChanges();
      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      document.dispatchEvent(event);
      fixture.detectChanges();
      expect(fixture.componentInstance.isMenuOpen()).toBeFalse();
    });

    it('should close menu when clicking a link in the panel', () => {
      fixture.componentInstance.isMenuOpen.set(true);
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const panel = compiled.querySelector('#mobile-menu-panel');
      const firstLink = panel?.querySelector('a');
      expect(firstLink).not.toBeNull();
      firstLink?.dispatchEvent(new Event('click'));
      fixture.detectChanges();
      expect(fixture.componentInstance.isMenuOpen()).toBeFalse();
    });

    it('should set aria-expanded to false after closing', () => {
      fixture.componentInstance.isMenuOpen.set(true);
      fixture.detectChanges();
      fixture.componentInstance.closeMenu();
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const hamburgerButton = compiled.querySelector('button[aria-label="Toggle menu"]');
      expect(hamburgerButton?.getAttribute('aria-expanded')).toBe('false');
    });
  });

  describe('Toggle behavior', () => {
    it('should toggle menu open when clicking hamburger', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const hamburgerButton = compiled.querySelector('button[aria-label="Toggle menu"]');
      hamburgerButton?.dispatchEvent(new Event('click'));
      fixture.detectChanges();
      expect(fixture.componentInstance.isMenuOpen()).toBeTrue();
    });

    it('should toggle menu closed when clicking hamburger again', () => {
      fixture.componentInstance.isMenuOpen.set(true);
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const hamburgerButton = compiled.querySelector('button[aria-label="Toggle menu"]');
      hamburgerButton?.dispatchEvent(new Event('click'));
      fixture.detectChanges();
      expect(fixture.componentInstance.isMenuOpen()).toBeFalse();
    });

    it('should set aria-expanded to true when menu is open', () => {
      fixture.componentInstance.isMenuOpen.set(true);
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const hamburgerButton = compiled.querySelector('button[aria-label="Toggle menu"]');
      expect(hamburgerButton?.getAttribute('aria-expanded')).toBe('true');
    });
  });

  describe('Body scroll lock', () => {
    afterEach(() => {
      // Clean up body overflow after each test
      document.body.style.overflow = '';
    });

    it('should lock body scroll when menu opens', () => {
      fixture.componentInstance.isMenuOpen.set(true);
      fixture.detectChanges();
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should unlock body scroll when menu closes', () => {
      fixture.componentInstance.isMenuOpen.set(true);
      fixture.detectChanges();
      fixture.componentInstance.closeMenu();
      fixture.detectChanges();
      expect(document.body.style.overflow).toBe('');
    });

    it('should unlock body scroll after toggle open then toggle closed', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const hamburgerButton = compiled.querySelector('button[aria-label="Toggle menu"]');
      // Open
      hamburgerButton?.dispatchEvent(new Event('click'));
      fixture.detectChanges();
      expect(document.body.style.overflow).toBe('hidden');
      // Close
      hamburgerButton?.dispatchEvent(new Event('click'));
      fixture.detectChanges();
      expect(document.body.style.overflow).toBe('');
    });
  });

  // ─── SPA navigation (routerLink) — change frontend-spa-routes ──────────────────

  describe('SPA navigation (routerLink)', () => {
    function getAllNavAnchors(): HTMLAnchorElement[] {
      const compiled = fixture.nativeElement as HTMLElement;
      // Includes both the desktop nav block and the mobile panel anchors.
      // We only assert on attributes, not on screen presence, to keep the
      // test independent of the viewport width logic.
      return Array.from(compiled.querySelectorAll('a'));
    }

    it('should NOT have any nav anchor with href="#" (no dead links)', () => {
      const anchors = getAllNavAnchors();
      // Just to be safe, ensure there is at least one anchor rendered.
      expect(anchors.length).toBeGreaterThan(0);
      const deadLinks = anchors.filter(
        (a) => a.getAttribute('href') === '#',
      );
      expect(deadLinks.length)
        .withContext(`no <a href="#"> allowed, got: ${deadLinks.length}`)
        .toBe(0);
    });

    it('should use the routerLink directive on desktop nav links and CTA', () => {
      // RouterLink renders a `ng-reflect-router-link` debug attribute (in
      // non-production builds) plus sets the resolved `href`. Both signals
      // indicate RouterLink is in use.
      const compiled = fixture.nativeElement as HTMLElement;
      const desktopNav = compiled.querySelector(
        'div.hidden.md\\:flex',
      ) as HTMLElement;
      expect(desktopNav).withContext('desktop nav block is rendered').not.toBeNull();

      const desktopAnchors = Array.from(
        desktopNav.querySelectorAll('a'),
      ) as HTMLAnchorElement[];
      expect(desktopAnchors.length)
        .withContext('desktop nav has 5 anchors (4 nav + 1 CTA)')
        .toBe(5);

      for (const a of desktopAnchors) {
        const href = a.getAttribute('href') ?? '';
        expect(href.startsWith('#'))
          .withContext(`desktop anchor should NOT use href="#": got "${href}"`)
          .toBeFalse();
        expect(href)
          .withContext(`desktop anchor should resolve to a real path: got "${href}"`)
          .not.toBe('');
      }
    });

    it('should point the logo link to "/" (NOT "#")', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const logoLink = compiled.querySelector(
        'a[aria-label*="Directorio Concón"]',
      ) as HTMLAnchorElement | null;
      expect(logoLink)
        .withContext('logo <a> with aria-label is rendered')
        .not.toBeNull();
      const href = logoLink!.getAttribute('href') ?? '';
      expect(href)
        .withContext(`logo link href is "/", got "${href}"`)
        .toBe('/');
    });

    it('should map each nav label to its canonical route', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const desktopNav = compiled.querySelector(
        'div.hidden.md\\:flex',
      ) as HTMLElement;
      const desktopAnchors = Array.from(
        desktopNav.querySelectorAll('a'),
      ) as HTMLAnchorElement[];

      const byText: Record<string, string> = {};
      for (const a of desktopAnchors) {
        const txt = a.textContent?.trim() ?? '';
        const href = a.getAttribute('href') ?? '';
        byText[txt] = href;
      }

      expect(byText['Inicio']).toBe('/');
      expect(byText['Directorio']).toBe('/directorio');
      expect(byText['Eventos']).toBe('/eventos');
      expect(byText['Contacto']).toBe('/contacto');
      expect(byText['Registrate']).toBe('/registrate');
    });

    it('should bind RouterLink and RouterLinkActive on every desktop nav anchor (runtime DOM evidence)', () => {
      // Note: in Angular Ivy, `routerLink` is bound as a property binding
      // `[routerLink]="..."`. Property bindings set properties on the host
      // element but DO NOT render them as DOM attributes. Two observable
      // consequences confirm that RouterLink is wired:
      //   (a) The resolved `href` attribute is the Router-parseable URL
      //       (not literal `href="#"`). This proves RouterLink ran its own
      //       `Router.parseUrl()` to compute the final href.
      //   (b) `routerLinkActive` directives, since they ARE written as
      //       attribute bindings (they take a string value, not a property),
      //       DO show up as `routerlinkactive="..."` attributes.
      //
      // The exact import statements in the component source are verified
      // separately as a source-read scenario in Task 5.4.
      const compiled = fixture.nativeElement as HTMLElement;
      const desktopNav = compiled.querySelector(
        'div.hidden.md\\:flex',
      ) as HTMLElement;
      const anchors = Array.from(
        desktopNav.querySelectorAll('a'),
      ) as HTMLAnchorElement[];
      expect(anchors.length)
        .withContext('desktop nav has 5 anchors (4 nav + 1 CTA)')
        .toBe(5);

      // (a) Resolved hrefs are absolute paths (not '#' and not raw relative).
      // RouterLink applies Router.parseUrl → Router.serializeUrl to produce
      // the final href. The serialised URL always starts with '/' (or with
      // a non-stub protocol). We assert no anchor still says `#`.
      const anchorsWithHash = anchors.filter((a) => a.getAttribute('href') === '#');
      expect(anchorsWithHash.length)
        .withContext('no desktop anchor retained href="#" — routerLink rewrote it')
        .toBe(0);

      // (b) 4 nav anchors carry routerLinkActive; the CTA "Registrate" does
      // not (see Header template Decision 3).
      const routerLinkActiveCount = anchors.filter((a) =>
        a.hasAttribute('routerlinkactive'),
      ).length;
      expect(routerLinkActiveCount)
        .withContext(
          'exactly 4 desktop nav anchors carry routerLinkActive (CTA excluded)',
        )
        .toBe(4);
    });

    it('should not embed SearchBarContainerComponent (sanity — header stays dumb)', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const searchBar = compiled.querySelector('app-search-bar-container');
      expect(searchBar).toBeNull();
    });

    // ── Task 4.4 (RED) — routerLinkActive applies the active class after navigation ──

    it('should apply the active class to the matching nav link on /directorio', async () => {
      // The Header fixture already has `provideRouter(routes)` configured in
      // the beforeEach. RouterLinkActive subscribes to Router.events and
      // toggles classes when the URL matches `routerLinkActive`. We drive a
      // real navigation via `router.navigateByUrl('/directorio')` then run
      // change detection on the Header fixture. The directive then applies
      // `text-primary font-semibold` to the matching link only.
      const router = TestBed.inject(Router);
      await router.navigateByUrl('/directorio');
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const desktopNav = fixture.nativeElement.querySelector(
        'div.hidden.md\\:flex',
      ) as HTMLElement;
      const anchors = Array.from(
        desktopNav.querySelectorAll('a'),
      ) as HTMLAnchorElement[];
      const directorio = anchors.find(
        (a) => a.textContent?.trim() === 'Directorio',
      );
      const inicio = anchors.find((a) => a.textContent?.trim() === 'Inicio');
      const eventos = anchors.find((a) => a.textContent?.trim() === 'Eventos');
      const contacto = anchors.find((a) => a.textContent?.trim() === 'Contacto');
      const registrate = anchors.find((a) => a.textContent?.trim() === 'Registrate');
      expect(directorio).withContext('Directorio anchor exists').toBeTruthy();
      expect(inicio).withContext('Inicio anchor exists').toBeTruthy();
      expect(eventos).withContext('Eventos anchor exists').toBeTruthy();
      expect(contacto).withContext('Contacto anchor exists').toBeTruthy();
      expect(registrate).withContext('Registrate anchor exists').toBeTruthy();

      expect(directorio!.classList.contains('text-primary'))
        .withContext('Directorio link has text-primary after nav to /directorio')
        .toBeTrue();
      expect(directorio!.classList.contains('font-semibold'))
        .withContext('Directorio link has font-semibold after nav to /directorio')
        .toBeTrue();

      expect(inicio!.classList.contains('text-primary'))
        .withContext('Inicio link does NOT have text-primary (different route)')
        .toBeFalse();
      expect(eventos!.classList.contains('text-primary'))
        .withContext('Eventos link does NOT have text-primary')
        .toBeFalse();
      expect(contacto!.classList.contains('text-primary'))
        .withContext('Contacto link does NOT have text-primary')
        .toBeFalse();
      expect(registrate!.classList.contains('font-semibold'))
        .withContext('Registrate CTA does NOT carry routerLinkActive (Decision 3 — it is part of its CTA base styling, NOT from routerLinkActive)')
        .toBeTrue(); // font-semibold is part of the CTA's base Tailwind classes.
      // The real check that the CTA does NOT use routerLinkActive is the
      // absence of the `routerlinkactive` attribute on that anchor:
      expect(registrate!.hasAttribute('routerlinkactive'))
        .withContext('Registrate CTA does NOT carry routerLinkActive (Decision 3)')
        .toBeFalse();
    });

    it('should apply the active class ONLY to Inicio on "/" (exact-match)', async () => {
      const router = TestBed.inject(Router);
      await router.navigateByUrl('/');
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const desktopNav = fixture.nativeElement.querySelector(
        'div.hidden.md\\:flex',
      ) as HTMLElement;
      const anchors = Array.from(
        desktopNav.querySelectorAll('a'),
      ) as HTMLAnchorElement[];
      const inicio = anchors.find((a) => a.textContent?.trim() === 'Inicio');
      const directorio = anchors.find(
        (a) => a.textContent?.trim() === 'Directorio',
      );
      expect(inicio!.classList.contains('text-primary'))
        .withContext('Inicio has text-primary on "/" (exact match)')
        .toBeTrue();
      expect(directorio!.classList.contains('text-primary'))
        .withContext('Directorio does NOT have text-primary on "/"')
        .toBeFalse();
    });
  });
});
