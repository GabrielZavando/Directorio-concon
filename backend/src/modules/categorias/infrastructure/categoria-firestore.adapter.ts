/**
 * Firestore adapter for CategoriaReadRepository + CategoriaWriteRepository.
 * Implements both interfaces (ISP-friendly — single Firestore-backed impl
 * covers both). Uses `runTransaction` for subcategoria mutations to avoid
 * lost updates when two admins edit the same categoria simultaneously.
 */
import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { FirebaseService } from "@/common/services/firebase.service";
import type { Timestamp } from "firebase-admin/firestore";
import { Categoria } from "../domain/categoria.entity";
import { Subcategoria } from "../domain/subcategoria.vo";
import type { CategoriaReadRepository } from "../domain/categoria-read-repository.interface";
import type { CategoriaWriteRepository } from "../domain/categoria-write-repository.interface";

const COLLECTION = "categorias";

interface CategoriaFirestoreDoc {
  id: string;
  nombre: string;
  slug: string;
  icono: string;
  orden: number;
  descripcion?: string;
  color?: string;
  activo: boolean;
  subcategorias: Array<{ slug: string; nombre: string; activo: boolean }>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

@Injectable()
export class CategoriaFirestoreAdapter
  implements CategoriaReadRepository, CategoriaWriteRepository
{
  private readonly logger = new Logger(CategoriaFirestoreAdapter.name);

  constructor(private readonly firebase: FirebaseService) {}

  // -------------------------------------------------------------------------
  // READ
  // -------------------------------------------------------------------------

  async findById(id: string): Promise<Categoria | undefined> {
    const doc = await this.firebase.getDocument(COLLECTION, id);
    if (!doc.exists) return undefined;
    return this.toDomain(doc.id, doc.data() as CategoriaFirestoreDoc);
  }

  async findBySlug(slug: string): Promise<Categoria | undefined> {
    const snapshot = await this.firebase.getDocuments(COLLECTION, [
      { field: "slug", operator: "==" as const, value: slug },
    ]);
    if (snapshot.empty) return undefined;
    const first = snapshot.docs[0];
    return this.toDomain(first.id, first.data() as CategoriaFirestoreDoc);
  }

  async list(filter?: { onlyActive?: boolean }): Promise<Categoria[]> {
    const filters = filter?.onlyActive
      ? [{ field: "activo", operator: "==" as const, value: true }]
      : undefined;
    const snapshot = await this.firebase.getDocuments(COLLECTION, filters, {
      field: "orden",
      direction: "asc",
    });
    return snapshot.docs.map((d) =>
      this.toDomain(d.id, d.data() as CategoriaFirestoreDoc),
    );
  }

  async existsBySlug(slug: string): Promise<boolean> {
    const found = await this.findBySlug(slug);
    return found !== undefined;
  }

  async existsByOrden(orden: number, excludeId?: string): Promise<boolean> {
    const snapshot = await this.firebase.getDocuments(COLLECTION, [
      { field: "orden", operator: "==" as const, value: orden },
    ]);
    if (snapshot.empty) return false;
    if (!excludeId) return true;
    return snapshot.docs.some((d) => d.id !== excludeId);
  }

  // -------------------------------------------------------------------------
  // WRITE
  // -------------------------------------------------------------------------

  async create(categoria: Categoria): Promise<Categoria> {
    if (await this.existsBySlug(categoria.slug)) {
      throw new ConflictException(`Slug duplicado: ${categoria.slug}`);
    }
    if (await this.existsByOrden(categoria.orden)) {
      throw new ConflictException(`Orden duplicado: ${categoria.orden}`);
    }
    await this.firebase.createDocument(
      COLLECTION,
      this.toFirestore(categoria),
      categoria.id,
    );
    const stored = await this.findById(categoria.id);
    if (!stored) {
      throw new Error(`Categoria ${categoria.id} disappeared post-create`);
    }
    return stored;
  }

  async updateById(
    id: string,
    patch: Partial<
      Pick<Categoria, "nombre" | "icono" | "orden" | "descripcion" | "color">
    >,
  ): Promise<Categoria> {
    const existing = await this.findById(id);
    if (!existing)
      throw new NotFoundException(`Categoría no encontrada: ${id}`);

    await this.assertOrdenFree(patch.orden, existing.orden, id);

    const updates = this.buildUpdates(patch);
    if (Object.keys(updates).length > 0) {
      await this.firebase.updateDocument(COLLECTION, id, updates);
    }
    const updated = await this.findById(id);
    if (!updated) throw new Error(`Categoria ${id} disappeared post-update`);
    return updated;
  }

  private async assertOrdenFree(
    patchOrden: number | undefined,
    currentOrden: number,
    excludeId: string,
  ): Promise<void> {
    if (patchOrden === undefined || patchOrden === currentOrden) return;
    if (await this.existsByOrden(patchOrden, excludeId)) {
      throw new ConflictException(`Orden duplicado: ${patchOrden}`);
    }
  }

  private buildUpdates(
    patch: Partial<
      Pick<Categoria, "nombre" | "icono" | "orden" | "descripcion" | "color">
    >,
  ): Record<string, unknown> {
    const updates: Record<string, unknown> = {};
    if (patch.nombre !== undefined) updates.nombre = patch.nombre;
    if (patch.icono !== undefined) updates.icono = patch.icono;
    if (patch.orden !== undefined) updates.orden = patch.orden;
    if (patch.descripcion !== undefined)
      updates.descripcion = patch.descripcion;
    if (patch.color !== undefined) updates.color = patch.color;
    return updates;
  }

  async activate(id: string): Promise<Categoria> {
    const existing = await this.findById(id);
    if (!existing)
      throw new NotFoundException(`Categoría no encontrada: ${id}`);
    await this.firebase.updateDocument(COLLECTION, id, { activo: true });
    return (await this.findById(id))!;
  }

  async deactivate(id: string): Promise<Categoria> {
    const existing = await this.findById(id);
    if (!existing)
      throw new NotFoundException(`Categoría no encontrada: ${id}`);
    await this.firebase.updateDocument(COLLECTION, id, { activo: false });
    return (await this.findById(id))!;
  }

  async addSubcategoria(
    categoriaId: string,
    sub: Subcategoria,
  ): Promise<Categoria> {
    const result = await this.firebase.runTransaction(async (tx) => {
      const ref = this.firebase
        .getFirestore()
        .collection(COLLECTION)
        .doc(categoriaId);
      const doc = await tx.get(ref);
      if (!doc.exists) {
        throw new NotFoundException(`Categoría no encontrada: ${categoriaId}`);
      }
      const data = doc.data() as CategoriaFirestoreDoc;
      const existingSubs = data.subcategorias ?? [];
      if (existingSubs.some((s) => s.slug === sub.slug)) {
        throw new ConflictException(
          `Subcategoría duplicada en esta categoría: ${sub.slug}`,
        );
      }
      const updatedSubs = [
        ...existingSubs,
        { slug: sub.slug, nombre: sub.nombre, activo: sub.activo },
      ];
      tx.update(ref, {
        subcategorias: updatedSubs,
        updatedAt: this.firebase.getCurrentTimestamp(),
      });
      return { ...data, subcategorias: updatedSubs } as CategoriaFirestoreDoc;
    });
    return this.toDomain(categoriaId, result);
  }

  async setSubcategoriaActivo(
    categoriaId: string,
    subSlug: string,
    activo: boolean,
  ): Promise<Categoria> {
    const result = await this.firebase.runTransaction(async (tx) => {
      const ref = this.firebase
        .getFirestore()
        .collection(COLLECTION)
        .doc(categoriaId);
      const doc = await tx.get(ref);
      if (!doc.exists) {
        throw new NotFoundException(`Categoría no encontrada: ${categoriaId}`);
      }
      const data = doc.data() as CategoriaFirestoreDoc;
      const subs = data.subcategorias ?? [];
      const idx = subs.findIndex((s) => s.slug === subSlug);
      if (idx === -1) {
        throw new NotFoundException(
          `Subcategoría no encontrada: ${subSlug} en ${categoriaId}`,
        );
      }
      const updatedSubs = [...subs];
      updatedSubs[idx] = { ...updatedSubs[idx], activo };
      tx.update(ref, {
        subcategorias: updatedSubs,
        updatedAt: this.firebase.getCurrentTimestamp(),
      });
      return { ...data, subcategorias: updatedSubs } as CategoriaFirestoreDoc;
    });
    return this.toDomain(categoriaId, result);
  }

  // -------------------------------------------------------------------------
  // Mapping helpers
  // -------------------------------------------------------------------------

  private toDomain(id: string, doc: CategoriaFirestoreDoc): Categoria {
    const subs = (doc.subcategorias ?? []).map(
      (s) =>
        new Subcategoria({ slug: s.slug, nombre: s.nombre, activo: s.activo }),
    );
    return new Categoria({
      id,
      nombre: doc.nombre,
      slug: doc.slug,
      icono: doc.icono,
      orden: doc.orden,
      descripcion: doc.descripcion,
      color: doc.color,
      activo: doc.activo,
      subcategorias: subs,
      createdAt: doc.createdAt?.toDate?.() ?? new Date(),
      updatedAt: doc.updatedAt?.toDate?.() ?? new Date(),
    });
  }

  private toFirestore(cat: Categoria): Record<string, unknown> {
    return {
      nombre: cat.nombre,
      slug: cat.slug,
      icono: cat.icono,
      orden: cat.orden,
      descripcion: cat.descripcion,
      color: cat.color,
      activo: cat.activo,
      subcategorias: cat.subcategorias.map((s) => ({
        slug: s.slug,
        nombre: s.nombre,
        activo: s.activo,
      })),
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt,
    };
  }
}
