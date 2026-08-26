import { TestBed } from '@angular/core/testing';
import { FooterComponent } from './footer.component';

describe('FooterComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterComponent],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(FooterComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render copyright', () => {
    const fixture = TestBed.createComponent(FooterComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Todos los derechos reservados');
  });

  it('should render 4 column titles', () => {
    const fixture = TestBed.createComponent(FooterComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const text = compiled.textContent ?? '';
    expect(text).toContain('Nosotros');
    expect(text).toContain('Directorio');
    expect(text).toContain('Soporte');
    expect(text).toContain('Síguenos');
  });

  it('should render brand logo with descriptive alt and responsive sizing', () => {
    const fixture = TestBed.createComponent(FooterComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const logo = compiled.querySelector('img[alt="Directorio Concón"]');
    expect(logo).not.toBeNull();
    expect(logo?.getAttribute('src')).toBe('/assets/logo-transparente.webp');
    expect(logo?.classList.contains('h-10')).toBeTrue();
  });

  it('should render current year', () => {
    const fixture = TestBed.createComponent(FooterComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const currentYear = new Date().getFullYear().toString();
    expect(compiled.textContent).toContain(currentYear);
  });

  it('should use M3 tokens on root <footer> element', () => {
    const fixture = TestBed.createComponent(FooterComponent);
    fixture.detectChanges();
    const footer = fixture.nativeElement.querySelector('footer');
    expect(footer.classList.contains('bg-surface-container-lowest')).toBeTrue();
    expect(footer.classList.contains('border-outline-variant')).toBeTrue();
  });

  it('should render at least 2 lucide-angular social icons', () => {
    const fixture = TestBed.createComponent(FooterComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const lucideIcons = compiled.querySelectorAll('svg[class*="lucide"], svg[lucideShare2], svg[lucideGlobe]');
    expect(lucideIcons.length).toBeGreaterThanOrEqual(2);
  });
});
