import { Routes } from '@angular/router';
import { EventosListPageComponent } from '../pages/eventos-list-page.component';
import { EventoDetailPageComponent } from '../pages/evento-detail-page.component';
import { EventoFormPageComponent } from '../pages/evento-form-page.component';
import { EventosMapaComponent } from '../pages/eventos-mapa.component';

/**
 * Eventos child routes — lazy-loaded via `loadChildren` from app.routes.ts.
 *
 * Route order matters:
 *   1. ''            → list page (public)
 *   2. 'nuevo'       → create form (requires auth — TODO: add guard in auth MVP)
 *   3. 'mapa'        → map view (public)
 *   4. ':slug'       → detail page by slug (public)
 *   5. ':id/editar'  → edit form by id (requires auth — TODO: add guard in auth MVP)
 *
 * NOTE: literal paths ('nuevo', 'mapa') MUST be declared BEFORE ':slug'
 * so they are not captured as a slug. ':id/editar' is a two-segment path
 * and does not conflict with the single-segment ':slug'.
 */
export default [
  {
    path: '',
    component: EventosListPageComponent,
  },
  {
    path: 'nuevo',
    component: EventoFormPageComponent,
    // TODO(auth-mvp): add canActivate: [authGuard]
  },
  {
    path: 'mapa',
    component: EventosMapaComponent,
  },
  {
    path: ':slug',
    component: EventoDetailPageComponent,
  },
  {
    path: ':id/editar',
    component: EventoFormPageComponent,
    // TODO(auth-mvp): add canActivate: [authGuard]
  },
] as Routes;
