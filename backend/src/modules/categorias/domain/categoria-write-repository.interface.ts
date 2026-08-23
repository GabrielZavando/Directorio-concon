/**
 * CategoriaWriteRepository — Operaciones de mutación sobre categorías.
 *
 * Separada de `CategoriaReadRepository` por ISP. Las operaciones sobre el
 * array `subcategorias` son atómicas (Firestore transaction en el adapter).
 */

import { Categoria } from "../domain/categoria.entity";
import { Subcategoria } from "../domain/subcategoria.vo";

export const CATEGORIA_WRITE_REPOSITORY = Symbol("CATEGORIA_WRITE_REPOSITORY");

export interface CategoriaWriteRepository {
  /** Crea una nueva categoría. Lanza `ConflictException` si slug u orden duplicados. */
  create(categoria: Categoria): Promise<Categoria>;
  /** Actualiza campos de una categoría existente. Lanza `NotFoundException` si no existe. */
  updateById(
    id: string,
    patch: Partial<
      Pick<Categoria, "nombre" | "icono" | "orden" | "descripcion" | "color">
    >,
  ): Promise<Categoria>;
  /** Reactiva una categoría desactivada (alias de updateById con activo=true). */
  activate(id: string): Promise<Categoria>;
  /** Desactiva una categoría sin borrarla. */
  deactivate(id: string): Promise<Categoria>;
  /** Agrega subcategoría al array embebido, atómicamente. */
  addSubcategoria(categoriaId: string, sub: Subcategoria): Promise<Categoria>;
  /** Cambia `activo` de una subcategoría específica, sin tocar otras. */
  setSubcategoriaActivo(
    categoriaId: string,
    subSlug: string,
    activo: boolean,
  ): Promise<Categoria>;
}
