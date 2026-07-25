import { TestBed } from '@angular/core/testing';
import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(HeaderComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render brand logo with descriptive alt and responsive sizing', () => {
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const logo = compiled.querySelector('img[alt="Directorio Concón"]');
    expect(logo).not.toBeNull();
    expect(logo?.getAttribute('src')).toBe('/assets/logo-transparente.webp');
    expect(logo?.classList.contains('h-10')).toBeTrue();
    expect(logo?.classList.contains('w-auto')).toBeTrue();
  });

  it('should wrap logo in accessible link with aria-label', () => {
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const link = compiled.querySelector('a[aria-label*="Directorio Concón"]');
    expect(link).not.toBeNull();
    const img = link?.querySelector('img');
    expect(img).not.toBeNull();
  });

  it('should render all 5 nav links', () => {
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const text = compiled.textContent ?? '';
    expect(text).toContain('Inicio');
    expect(text).toContain('Directorio');
    expect(text).toContain('Eventos');
    expect(text).toContain('Contacto');
    expect(text).toContain('Registrate');
  });

  it('should use M3 tokens on root <header> element', () => {
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();
    const header = fixture.nativeElement.querySelector('header');
    expect(header.classList.contains('bg-surface-container-lowest')).toBeTrue();
    expect(header.classList.contains('border-outline-variant')).toBeTrue();
    expect(header.classList.contains('sticky')).toBeTrue();
  });
});
