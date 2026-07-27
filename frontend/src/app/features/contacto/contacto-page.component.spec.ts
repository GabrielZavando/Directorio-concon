import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ContactoPageComponent } from './contacto-page.component';

/**
 * ContactoPageComponent — skeleton SPA page for the `/contacto` route.
 *
 * Dumb skeleton: heading "Contacto" + "Próximamente". Real content belongs to
 * a future OpenSpec change. Per `frontend-spa-navigation` spec: standalone,
 * OnPush, no `@Input`/`@Output`, no data services.
 */
describe('ContactoPageComponent', () => {
  let fixture: ComponentFixture<ContactoPageComponent>;
  let component: ContactoPageComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactoPageComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ContactoPageComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render an <h1> with the exact text "Contacto"', () => {
    fixture.detectChanges();
    const h1 = fixture.nativeElement.querySelector(
      'h1',
    ) as HTMLHeadingElement | null;
    expect(h1).withContext('<h1> heading is rendered').not.toBeNull();
    expect(h1!.textContent?.trim()).toBe('Contacto');
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
    expect(searchContainer).toBeNull();
  });
});
