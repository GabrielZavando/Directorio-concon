/**
 * Subcategoria — Value Object dentro de Categoria.
 *
 * Una subcategoría no existe fuera de su categoría padre, por eso vive
 * embebida como elemento del array `Categoria.subcategorias`. Es inmutable;
 * mutaciones como `withActivo` retornan una nueva instancia.
 *
 * Igual a otros enums y VOs del proyecto (`Rol`, `PlataformaSocialEnum`),
 * este archivo es TypeScript puro: cero imports de firebase-admin,
 * class-validator o class-transformer (DIP).
 */

export interface SubcategoriaProps {
  slug: string;
  nombre: string;
  activo?: boolean;
}

const SLUG_REGEX = /^[a-z0-9-]+$/;

export class Subcategoria {
  readonly slug: string;
  readonly nombre: string;
  readonly activo: boolean;

  constructor(props: SubcategoriaProps) {
    this.assertSlug(props.slug);
    this.assertNombre(props.nombre);
    if (props.activo !== undefined && typeof props.activo !== "boolean") {
      throw new Error("Subcategoria.activo must be boolean");
    }
    this.slug = props.slug;
    this.nombre = props.nombre;
    this.activo = props.activo ?? true;
  }

  private assertSlug(slug: unknown): asserts slug is string {
    if (typeof slug !== "string" || slug.length === 0) {
      throw new Error("Subcategoria.slug must be a non-empty string");
    }
    if (!SLUG_REGEX.test(slug)) {
      throw new Error(
        `Subcategoria.slug must match ${SLUG_REGEX.toString()} (lowercase, digits, hyphens)`,
      );
    }
  }

  private assertNombre(nombre: unknown): asserts nombre is string {
    if (typeof nombre !== "string" || nombre.trim().length === 0) {
      throw new Error("Subcategoria.nombre must be a non-empty string");
    }
  }

  /** Equivalencia por slug — dos subcategorías son iguales si comparten slug dentro de la misma categoría. */
  equals(other: Subcategoria): boolean {
    return this.slug === other.slug;
  }

  withActivo(activo: boolean): Subcategoria {
    return new Subcategoria({ slug: this.slug, nombre: this.nombre, activo });
  }
}
