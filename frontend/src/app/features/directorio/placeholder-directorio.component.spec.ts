import { TestBed } from '@angular/core/testing';
import { PlaceholderDirectorioComponent } from './placeholder-directorio.component';

describe('PlaceholderDirectorioComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlaceholderDirectorioComponent],
    }).compileComponents();
  });

  it('should render an <h1> containing "Próximamente" (case-insensitive)', () => {
    const fixture = TestBed.createComponent(PlaceholderDirectorioComponent);
    fixture.detectChanges();
    const h1 = fixture.nativeElement.querySelector('h1') as HTMLHeadingElement;
    expect(h1.textContent?.toLowerCase()).toContain('próximamente');
  });

  it('should render text mentioning "directorio"', () => {
    const fixture = TestBed.createComponent(PlaceholderDirectorioComponent);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text.toLowerCase()).toContain('directorio');
  });
});
