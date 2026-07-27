import { TestBed, ComponentFixture } from '@angular/core/testing';
import { RegistratePageComponent } from './registrate-page.component';

/**
 * RegistratePageComponent — skeleton SPA page for the `/registrate` route.
 *
 * Dumb skeleton: heading "Registrate" + "Próximamente". Real signup form /
 * Firebase Auth integration belongs to a future OpenSpec change. Per
 * `frontend-spa-navigation` spec: standalone, OnPush, no `@Input`/`@Output`,
 * no data services.
 */
describe('RegistratePageComponent', () => {
  let fixture: ComponentFixture<RegistratePageComponent>;
  let component: RegistratePageComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegistratePageComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RegistratePageComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render an <h1> with the exact text "Registrate"', () => {
    fixture.detectChanges();
    const h1 = fixture.nativeElement.querySelector(
      'h1',
    ) as HTMLHeadingElement | null;
    expect(h1).withContext('<h1> heading is rendered').not.toBeNull();
    expect(h1!.textContent?.trim()).toBe('Registrate');
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
