import { Routes } from '@angular/router';

/**
 * Application routes (Angular 20 standalone, lazy `loadComponent`).
 *
 * Routes registered here:
 *   - `/`            → HomePageComponent (smart hero + search form)
 *   - `/directorio`  → DirectorioPageComponent (skeleton; real listing in future change)
 *   - `/eventos`     → EventosPageComponent (skeleton; future change)
 *   - `/contacto`    → ContactoPageComponent (skeleton; future change)
 *   - `/registrate`  → RegistratePageComponent (skeleton; future change)
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home-page.component').then(
        (m) => m.HomePageComponent,
      ),
  },
  {
    path: 'directorio',
    loadComponent: () =>
      import('./features/directorio/directorio-page.component').then(
        (m) => m.DirectorioPageComponent,
      ),
  },
  {
    path: 'eventos',
    loadComponent: () =>
      import('./features/eventos/eventos-page.component').then(
        (m) => m.EventosPageComponent,
      ),
  },
  {
    path: 'contacto',
    loadComponent: () =>
      import('./features/contacto/contacto-page.component').then(
        (m) => m.ContactoPageComponent,
      ),
  },
  {
    path: 'registrate',
    loadComponent: () =>
      import('./features/registrate/registrate-page.component').then(
        (m) => m.RegistratePageComponent,
      ),
  },
];
