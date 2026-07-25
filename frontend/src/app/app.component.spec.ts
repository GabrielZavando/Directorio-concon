import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { routes } from './app.routes';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render header', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-header')).toBeTruthy();
  });

  it('should render footer', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-footer')).toBeTruthy();
  });

  // MODIFIED scenario: main hosts router-outlet; placeholder removed.
  it('should render a <main> with min-h-screen and bg-background that hosts a <router-outlet>', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const main = compiled.querySelector('main');
    expect(main).toBeTruthy();
    expect(main?.classList.contains('min-h-screen'))
      .withContext('main has min-h-screen')
      .toBeTrue();
    expect(main?.classList.contains('bg-background'))
      .withContext('main uses M3 background token')
      .toBeTrue();
    expect(main?.querySelector('router-outlet')).withContext('main hosts router-outlet').toBeTruthy();
  });

  // MODIFIED scenario: the previously hardcoded placeholder paragraph is gone.
  it('should NO LONGER render the hardcoded "Contenido pendiente" placeholder paragraph', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const text = compiled.textContent ?? '';
    expect(text).not.toContain('Contenido pendiente');
  });

  // Integration: the default route renders the home page with the dumb hero.
  it('should render the home page (and its hero) for the default route "/"', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/');
    const fixture = TestBed.createComponent(AppComponent);
    await router.navigateByUrl('/');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const homePage = compiled.querySelector('app-home-page');
    expect(homePage).withContext('home page renders at /').toBeTruthy();
    expect(homePage?.querySelector('app-home-hero'))
      .withContext('hero renders inside home page')
      .toBeTruthy();
  });

  // Integration: the /directorio route renders the placeholder.
  it('should render the <app-placeholder-directorio> at /directorio?q=foo', async () => {
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    await router.navigate(['/directorio'], { queryParams: { q: 'foo' } });
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const placeholder = compiled.querySelector('app-placeholder-directorio');
    expect(placeholder).withContext('placeholder renders at /directorio').toBeTruthy();
    const h1 = placeholder?.querySelector('h1')?.textContent ?? '';
    expect(h1.toLowerCase()).toContain('próximamente');
  });
});
