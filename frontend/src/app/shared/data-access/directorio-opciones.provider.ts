import { Provider } from '@angular/core';
import { DIRECTORIO_OPCIONES_PORT } from './directorio-opciones.port';
import { LocalDirectorioOpcionesService } from './local/local-directorio-opciones.service';

/**
 * Provides the DI binding for DirectorioOpcionesPort → LocalDirectorioOpcionesService.
 * Called in app.config.ts to register the port globally.
 *
 * Future: when RemoteDirectorioOpcionesService exists (http/ folder),
 * swap useClass to that implementation and keep the fallback logic inside it.
 * The DI swap is a single-line edit here (Decision 5 of design.md).
 */
export function provideDirectorioOpciones(): Provider[] {
  return [
    { provide: DIRECTORIO_OPCIONES_PORT, useClass: LocalDirectorioOpcionesService },
  ];
}