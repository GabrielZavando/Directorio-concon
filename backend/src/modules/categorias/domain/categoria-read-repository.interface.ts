/**
 * CategoriaReadRepository — Operations de lectura sobre categorías.
 *
 * Separada de `CategoriaWriteRepository` por ISP (Interface Segregation):
 * servicios que solo leen (ej. CatalogValidator) no necesitan ver los métodos
 * de mutación del array de subcategorías. Esto mantiene cada interfaz ≤5
 * métodos, conforme a `docs/backend-standards.md`.
 */

import { Categoria } from "../domain/categoria.entity";

export const CATEGORIA_READ_REPOSITORY = Symbol("CATEGORIA_READ_REPOSITORY");

export interface CategoriaReadRepository {
  /** Recupera por id (=slug). Devuelve undefined si no existe. */
  findById(id: string): Promise<Categoria | undefined>;
  /** Recupera por slug. Devuelve undefined si no existe. */
  findBySlug(slug: string): Promise<Categoria | undefined>;
  /**
   * Lista todas las categorías. Si `onlyActive`, aplica `where('activo','==',true)`.
   * Si no, devuelve todas (modo admin).
   */
  list(filter?: { onlyActive?: boolean }): Promise<Categoria[]>;
  /**
   * Verifica si un slug ya está tomado. Usado en `CategoriasService.create`
   * y `CategoriasService.updateById` para detectar conflictos antes de
   * persistir.
   */
  existsBySlug(slug: string): Promise<boolean>;
  /** Verifica si un `orden` ya está tomado por otra categoría con el mismo `orden`. */
  existsByOrden(orden: number, excludeId?: string): Promise<boolean>;
}
