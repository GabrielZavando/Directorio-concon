import { Routes } from '@angular/router';

/**
 * Application routes (Angular 20 standalone, lazy `loadComponent`).
 *
 * Routes registered here:
 *   - `/`            → HomePageComponent (smart hero + search form)
 *   - `/directorio`  → PlaceholderDirectorioComponent (placeholder until the
 *                     directory listing page is implemented in a future change)
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
      import('./features/directorio/placeholder-directorio.component').then(
        (m) => m.PlaceholderDirectorioComponent,
      ),
  },
];
