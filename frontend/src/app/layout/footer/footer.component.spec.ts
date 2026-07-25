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

  it('should render current year', () => {
    const fixture = TestBed.createComponent(FooterComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const currentYear = new Date().getFullYear().toString();
    expect(compiled.textContent).toContain(currentYear);
  });
});
