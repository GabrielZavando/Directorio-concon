import { TestBed, ComponentFixture } from '@angular/core/testing';
import { DirectorioPageComponent } from './directorio-page.component';

/**
 * DirectorioPageComponent — skeleton spec.
 *
 * This is the SPA replacement for the previous `PlaceHolderDirectorioComponent`.
 * The skeleton renders only a heading ("Directorio") and a "Próximamente"
 * message; it does NOT embed the shared SearchBarContainerComponent (search
 * logic lives exclusively in `shared/ui/search-bar/` and is consumed by the
 * home hero; a future change will re-plug it into the real directory listing).
 */
describe('DirectorioPageComponent', () => {
  let fixture: ComponentFixture<DirectorioPageComponent>;
  let component: DirectorioPageComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DirectorioPageComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DirectorioPageComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render an <h1> with the exact text "Directorio"', () => {
    fixture.detectChanges();
    const h1 = fixture.nativeElement.querySelector(
      'h1',
    ) as HTMLHeadingElement | null;
    expect(h1).withContext('<h1> heading is rendered').not.toBeNull();
    // Exact text — trim whitespace, exact match (not "contains").
    expect(h1!.textContent?.trim()).toBe('Directorio');
  });

  it('should render the "Próximamente" message (case-insensitive)', () => {
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text.toLowerCase()).toContain('próximamente');
  });

  it('should NOT embed the SearchBarContainerComponent', () => {
    fixture.detectChanges();
    const searchContainer = fixture.nativeElement.querySelector(
      'app-search-bar-container',
    ) as HTMLElement | null;
    expect(searchContainer)
      .withContext('the skeleton must not embed <app-search-bar-container>')
      .toBeNull();
  });

  it('should NOT use the legacy placeholder selector', () => {
    fixture.detectChanges();
    const legacyPlaceholder = fixture.nativeElement.querySelector(
      'app-placeholder-directorio',
    ) as HTMLElement | null;
    expect(legacyPlaceholder)
      .withContext('the placeholder selector must not be used')
      .toBeNull();
  });
});
