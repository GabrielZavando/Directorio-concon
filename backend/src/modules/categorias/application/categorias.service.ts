/**
 * CategoriasService — application layer for categorias.
 * Orchestrates domain entities + repository interfaces (DIP).
 * No direct Firestore imports — uses injected repositories.
 */
import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { Categoria } from "../domain/categoria.entity";
import { Subcategoria } from "../domain/subcategoria.vo";
import type { CategoriaReadRepository } from "../domain/categoria-read-repository.interface";
import type { CategoriaWriteRepository } from "../domain/categoria-write-repository.interface";
import { CATEGORIA_READ_REPOSITORY } from "../domain/categoria-read-repository.interface";
import { CATEGORIA_WRITE_REPOSITORY } from "../domain/categoria-write-repository.interface";

@Injectable()
export class CategoriasService {
  constructor(
    @Inject(CATEGORIA_READ_REPOSITORY)
    private readonly readRepo: CategoriaReadRepository,
    @Inject(CATEGORIA_WRITE_REPOSITORY)
    private readonly writeRepo: CategoriaWriteRepository,
  ) {}

  async create(input: {
    nombre: string;
    slug: string;
    icono: string;
    orden: number;
    descripcion?: string;
    color?: string;
  }): Promise<Categoria> {
    // El DTO ya validó formato, pero el dominio también valida invariantes
    const cat = new Categoria({
      id: input.slug,
      nombre: input.nombre,
      slug: input.slug,
      icono: input.icono,
      orden: input.orden,
      descripcion: input.descripcion,
      color: input.color,
      activo: true,
    });

    if (await this.readRepo.existsBySlug(cat.slug)) {
      throw new ConflictException(`Slug duplicado: ${cat.slug}`);
    }
    if (await this.readRepo.existsByOrden(cat.orden)) {
      throw new ConflictException(`Orden duplicado: ${cat.orden}`);
    }
    return this.writeRepo.create(cat);
  }

  async updateById(
    id: string,
    patch: Partial<
      Pick<Categoria, "nombre" | "icono" | "orden" | "descripcion" | "color">
    >,
  ): Promise<Categoria> {
    const existing = await this.readRepo.findById(id);
    if (!existing)
      throw new NotFoundException(`Categoría no encontrada: ${id}`);

    if (
      patch.orden !== undefined &&
      patch.orden !== existing.orden &&
      (await this.readRepo.existsByOrden(patch.orden, id))
    ) {
      throw new ConflictException(`Orden duplicado: ${patch.orden}`);
    }
    return this.writeRepo.updateById(id, patch);
  }

  async addSubcategoria(
    categoriaId: string,
    subInput: { slug: string; nombre: string },
  ): Promise<Categoria> {
    const existing = await this.readRepo.findById(categoriaId);
    if (!existing)
      throw new NotFoundException(`Categoría no encontrada: ${categoriaId}`);

    const sub = new Subcategoria({
      slug: subInput.slug,
      nombre: subInput.nombre,
      activo: true,
    });
    return this.writeRepo.addSubcategoria(categoriaId, sub);
  }

  async setSubcategoriaActivo(
    categoriaId: string,
    subSlug: string,
    activo: boolean,
  ): Promise<Categoria> {
    const existing = await this.readRepo.findById(categoriaId);
    if (!existing)
      throw new NotFoundException(`Categoría no encontrada: ${categoriaId}`);

    const sub = existing.findSubcategoriaBySlug(subSlug, false);
    if (!sub) {
      throw new NotFoundException(
        `Subcategoría no encontrada: ${subSlug} en ${categoriaId}`,
      );
    }
    return this.writeRepo.setSubcategoriaActivo(categoriaId, subSlug, activo);
  }

  async activate(id: string): Promise<Categoria> {
    const existing = await this.readRepo.findById(id);
    if (!existing)
      throw new NotFoundException(`Categoría no encontrada: ${id}`);
    return this.writeRepo.activate(id);
  }

  async deactivate(id: string): Promise<Categoria> {
    const existing = await this.readRepo.findById(id);
    if (!existing)
      throw new NotFoundException(`Categoría no encontrada: ${id}`);
    return this.writeRepo.deactivate(id);
  }

  async list(filter?: { onlyActive?: boolean }): Promise<Categoria[]> {
    return this.readRepo.list(filter);
  }

  async listPublic(): Promise<Categoria[]> {
    const all = await this.readRepo.list({ onlyActive: true });
    // Filtrar subcategorías inactivas para respuesta pública
    return all
      .filter((c) => c.activo)
      .map((c) => {
        const activeSubs = c.subcategorias.filter((s) => s.activo);
        return new Categoria({
          ...(c.toProps?.() ?? {
            id: c.id,
            nombre: c.nombre,
            slug: c.slug,
            icono: c.icono,
            orden: c.orden,
            descripcion: c.descripcion,
            color: c.color,
            activo: c.activo,
            subcategorias: activeSubs,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
          }),
          subcategorias: activeSubs,
        });
      });
  }
}
