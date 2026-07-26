import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
  let fixture: ComponentFixture<HeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
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
});
