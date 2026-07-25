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

  it('should render brand text', () => {
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Directorio Concón');
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
