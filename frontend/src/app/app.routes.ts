import { Routes } from '@angular/router';

/**
 * Application routes (Angular 20 standalone, lazy `loadComponent` / `loadChildren`).
 *
 * Routes registered here:
 *   - `/`              → HomePageComponent (smart hero + search form)
 *   - `/directorio`    → DirectorioPageComponent (skeleton; real listing in future change)
 *   - `/eventos/*`     → Eventos feature module (lazy child routes)
 *   - `/mis-eventos`   → MisEventosPageComponent (stub; real in Task 16)
 *   - `/admin/eventos` → AdminEventosPageComponent (stub; real in Task 16)
 *   - `/contacto`      → ContactoPageComponent (skeleton; future change)
 *   - `/registrate`    → RegistratePageComponent (skeleton; future change)
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
    loadChildren: () =>
      import('./features/eventos/routes/eventos.routes'),
  },
  {
    path: 'mis-eventos',
    loadComponent: () =>
      import(
        './features/eventos/pages/mis-eventos-page.component'
      ).then((m) => m.MisEventosPageComponent),
    // TODO(auth-mvp): add canActivate: [authGuard]
  },
  {
    path: 'admin/eventos',
    loadComponent: () =>
      import(
        './features/eventos/pages/admin-eventos-page.component'
      ).then((m) => m.AdminEventosPageComponent),
    // TODO(auth-mvp): add canActivate: [authGuard, adminGuard]
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
