/**
 * DirectorioOpcionesPort — DIP boundary between the SearchBarContainerComponent
 * (smart) and the data source (local JSON today, remote HTTP tomorrow).
 *
 * Honors `frontend-standards.md` DIP rule: services depend on abstract
 * interfaces (injection tokens), not on concrete implementations. The current
 * LocalDirectorioOpcionesService reads the bundled JSON seeds synchronously;
 * a future RemoteDirectorioOpcionesService will call /api/v1/categorias and
 * /api/v1/barrios and FALL BACK to the local service on network failure
 * (graceful degradation, Decision 2b of design.md). The DI swap is a one-line
 * edit in provideDirectorioOpciones() in directorio-opciones.provider.ts.
 */
import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { DirectorioOpciones } from './directorio-opciones.types';

/**
 * Contract that every data source for the SearchBarContainerComponent must
 * implement. Today: LocalDirectorioOpcionesService. Tomorrow: a remote
 * HTTP-based service wrapping /api/v1/categorias + /api/v1/barrios.
 */
export interface DirectorioOpcionesPort {
  /**
   * Emits the canonical categorias and barrios exactly once. The local
   * implementation emits synchronously via `of(...)`; a future remote
   * implementation SHOULD emit on first HTTP response and fall back to the
   * local service on network failure.
   */
  getOpciones(): Observable<DirectorioOpciones>;
}

// TODO(future): RemoteDirectorioOpcionesService (http/ folder) SHALL call
// /api/v1/categorias + /api/v1/barrios and FALL BACK to the
// LocalDirectorioOpcionesService on network failure (graceful degradation,
// Decision 2b of design.md). The DI swap is a one-line edit in
// provideDirectorioOpciones() in directorio-opciones.provider.ts.
export const DIRECTORIO_OPCIONES_PORT =
  new InjectionToken<DirectorioOpcionesPort>('DIRECTORIO_OPCIONES_PORT');
