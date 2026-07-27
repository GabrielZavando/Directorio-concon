import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { DirectorioOpcionesPort } from '../directorio-opciones.port';
import { DirectorioOpciones } from '../directorio-opciones.types';
import { CategoryOption } from '../../ui/search-bar/interfaces/category-option.interface';
import { BarrioOption } from '../../ui/search-bar/interfaces/barrio-option.interface';

// Static JSON imports via resolveJsonModule (Decision 4 of design.md).
// The inferred literal type stays private inside this service; consumers see
// only the boundary types CategoryOption[] and BarrioOption[] via the
// DirectorioOpciones interface exposed by getOpciones().
import { categorias as categoriasSeed } from './data/categorias.json';
import barriosSeed from './data/barrios.json';

/**
 * LocalDirectorioOpcionesService — the local DIP implementation of
 * DirectorioOpcionesPort.
 *
 * Reads the bundled JSON seeds statically (Decision H2 — `id` is the Firestore
 * slug, not a `zona_xx`/`cat_xx` code) and exposes them synchronously via
 * `of(...)`. No `HttpClient`, no `fetch`, no async loader (Test 7).
 *
 * Today this is the only implementation. The future
 * RemoteDirectorioOpcionesService (TODO documented in
 * directorio-opciones.port.ts) SHALL call /api/v1/categorias + /api/v1/barrios
 * and fall back to this service on network failure (Decision 2b of design.md).
 */
@Injectable({ providedIn: 'root' })
export class LocalDirectorioOpcionesService implements DirectorioOpcionesPort {
  /**
   * Returns the canonical categorias and barrios as a synchronous Observable.
   * The JSON seeds are cast to the boundary interfaces so downstream consumers
   * never observe inferred literal types.
   */
  getOpciones(): Observable<DirectorioOpciones> {
    const directorioOpciones: DirectorioOpciones = {
      categorias: categoriasSeed as readonly CategoryOption[],
      barrios: barriosSeed as readonly BarrioOption[],
    };
    return of(directorioOpciones);
  }
}
