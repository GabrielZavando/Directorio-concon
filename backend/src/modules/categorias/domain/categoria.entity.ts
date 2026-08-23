/**
 * Categoria — Entity root del módulo categorias.
 *
 * Persistida en la colección Firestore `categorias`. Es inmutable: métodos
 * como `deactivate`, `activate` o `addSubcategoria` devuelven una nueva
 * instancia (mismo patrón que `Subcategoria`). Las subcategorías viven
 * embebidas como array dentro del documento de la categoría (decisión
 * documentada en design.md, decisión #2).
 *
 * TypeScript puro: cero imports de firebase-admin o class-validator (DIP).
 */

import { Subcategoria } from "./subcategoria.vo";

export interface CategoriaProps {
  id: string;
  nombre: string;
  slug: string;
  icono: string;
  orden: number;
  descripcion?: string;
  color?: string;
  activo?: boolean;
  subcategorias?: Subcategoria[];
  createdAt?: Date;
  updatedAt?: Date;
}

const SLUG_REGEX = /^[a-z0-9-]+$/;

export class Categoria {
  readonly id: string;
  readonly nombre: string;
  readonly slug: string;
  readonly icono: string;
  readonly orden: number;
  readonly descripcion?: string;
  readonly color?: string;
  readonly activo: boolean;
  readonly subcategorias: Subcategoria[];
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: CategoriaProps) {
    Categoria.assertValidProps(props);

    const now = new Date();
    this.id = props.id;
    this.nombre = props.nombre;
    this.slug = props.slug;
    this.icono = props.icono;
    this.orden = props.orden;
    this.descripcion = props.descripcion;
    this.color = props.color;
    this.activo = props.activo ?? true;
    this.subcategorias = props.subcategorias ?? [];
    this.createdAt = props.createdAt ?? now;
    this.updatedAt = props.updatedAt ?? now;
  }

  private static assertValidProps(props: CategoriaProps): void {
    if (typeof props.id !== "string" || props.id.length === 0) {
      throw new Error("Categoria.id must be a non-empty string");
    }
    if (typeof props.nombre !== "string" || props.nombre.trim().length === 0) {
      throw new Error("Categoria.nombre must be a non-empty string");
    }
    if (typeof props.icono !== "string" || props.icono.trim().length === 0) {
      throw new Error("Categoria.icono must be a non-empty string");
    }
    Categoria.assertValidSlug(props.slug);
    Categoria.assertValidOrden(props.orden);
  }

  private static assertValidSlug(slug: string): void {
    if (typeof slug !== "string" || !SLUG_REGEX.test(slug)) {
      throw new Error(`Categoria.slug must match ${SLUG_REGEX.toString()}`);
    }
  }

  private static assertValidOrden(orden: number): void {
    if (!Number.isInteger(orden) || orden < 1) {
      throw new Error("Categoria.orden must be a positive integer");
    }
  }

  /** Marca la categoría como inactiva. Devuelve una nueva instancia con `updatedAt` actualizado. */
  deactivate(): Categoria {
    return new Categoria({
      ...this.toProps(),
      activo: false,
      updatedAt: new Date(),
    });
  }

  /** Reactiva la categoría. Devuelve una nueva instancia. */
  activate(): Categoria {
    return new Categoria({
      ...this.toProps(),
      activo: true,
      updatedAt: new Date(),
    });
  }

  /** Agrega una subcategoría. Lanza si ya existe por slug. */
  addSubcategoria(sub: Subcategoria): Categoria {
    if (this.subcategorias.some((s) => s.slug === sub.slug)) {
      throw new Error(
        `Subcategoría con slug "${sub.slug}" ya existe en la categoría "${this.slug}"`,
      );
    }
    return new Categoria({
      ...this.toProps(),
      subcategorias: [...this.subcategorias, sub],
      updatedAt: new Date(),
    });
  }

  /** Busca subcategoría por slug. `onlyActive=true` filtra inactivas. */
  findSubcategoriaBySlug(
    slug: string,
    onlyActive: boolean = false,
  ): Subcategoria | undefined {
    return this.subcategorias.find(
      (s) => s.slug === slug && (!onlyActive || s.activo),
    );
  }

  /** Helper público para clonar pasando props. Útil para serialización / listPublic. */
  toProps(): CategoriaProps {
    return {
      id: this.id,
      nombre: this.nombre,
      slug: this.slug,
      icono: this.icono,
      orden: this.orden,
      descripcion: this.descripcion,
      color: this.color,
      activo: this.activo,
      subcategorias: this.subcategorias,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
