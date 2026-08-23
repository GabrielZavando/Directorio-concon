/**
 * Shared test helpers for CategoriasController E2E specs.
 * Kept in a separate file so the controller spec stays under the 300-line CI limit.
 */
import { Categoria } from "../domain/categoria.entity";
import { Subcategoria } from "../domain/subcategoria.vo";

export function makeCat(
  overrides: Partial<ConstructorParameters<typeof Categoria>[0]> = {},
): Categoria {
  return new Categoria({
    id: "g",
    nombre: "G",
    slug: "g",
    icono: "utensils",
    orden: 1,
    ...overrides,
  });
}

export function makeSubcat(
  slug: string,
  nombre: string,
  activo = true,
): Subcategoria {
  return new Subcategoria({ slug, nombre, activo });
}
