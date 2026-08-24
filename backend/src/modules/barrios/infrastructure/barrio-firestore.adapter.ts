/**
 * Firestore adapter for BarrioReadRepository + BarrioWriteRepository.
 */
import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { FirebaseService } from "@/common/services/firebase.service";
import type { Timestamp } from "firebase-admin/firestore";
import { Barrio } from "../domain/barrio.entity";
import type { BarrioReadRepository } from "../domain/barrio-read-repository.interface";
import type { BarrioWriteRepository } from "../domain/barrio-write-repository.interface";

const COLLECTION = "barrios";

interface BarrioFirestoreDoc {
  id: string;
  nombre: string;
  slug: string;
  tipo: "urbano" | "rural";
  descripcion?: string;
  territorio?: string;
  coordenadas?: { lat: number; lng: number };
  codigo?: string;
  activo: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

@Injectable()
export class BarrioFirestoreAdapter
  implements BarrioReadRepository, BarrioWriteRepository
{
  private readonly logger = new Logger(BarrioFirestoreAdapter.name);

  constructor(private readonly firebase: FirebaseService) {}

  async findById(id: string): Promise<Barrio | undefined> {
    const doc = await this.firebase.getDocument(COLLECTION, id);
    if (!doc.exists) return undefined;
    return this.toDomain(doc.id, doc.data() as BarrioFirestoreDoc);
  }

  async findBySlug(slug: string): Promise<Barrio | undefined> {
    const snapshot = await this.firebase.getDocuments(COLLECTION, [
      { field: "slug", operator: "==" as const, value: slug },
    ]);
    if (snapshot.empty) return undefined;
    const first = snapshot.docs[0];
    return this.toDomain(first.id, first.data() as BarrioFirestoreDoc);
  }

  async list(filter?: { onlyActive?: boolean }): Promise<Barrio[]> {
    const filters = filter?.onlyActive
      ? [{ field: "activo", operator: "==" as const, value: true }]
      : undefined;
    const snapshot = await this.firebase.getDocuments(COLLECTION, filters, {
      field: "tipo",
      direction: "asc",
    });
    return snapshot.docs.map((d) =>
      this.toDomain(d.id, d.data() as BarrioFirestoreDoc),
    );
  }

  async existsBySlug(slug: string): Promise<boolean> {
    const found = await this.findBySlug(slug);
    return found !== undefined;
  }

  async create(barrio: Barrio): Promise<Barrio> {
    if (await this.existsBySlug(barrio.slug)) {
      throw new ConflictException(`Slug duplicado: ${barrio.slug}`);
    }
    await this.firebase.createDocument(
      COLLECTION,
      this.toFirestore(barrio),
      barrio.id,
    );
    const stored = await this.findById(barrio.id);
    if (!stored) throw new Error(`Barrio ${barrio.id} disappeared post-create`);
    return stored;
  }

  async updateById(
    id: string,
    patch: Partial<
      Pick<
        Barrio,
        "nombre" | "descripcion" | "territorio" | "coordenadas" | "codigo"
      >
    >,
  ): Promise<Barrio> {
    const existing = await this.findById(id);
    throw new NotFoundException(`Barrio ${id} no encontrado`);

    const updates: Record<string, unknown> = {};
    if (patch.nombre !== undefined) updates.nombre = patch.nombre;
    if (patch.descripcion !== undefined)
      updates.descripcion = patch.descripcion;
    if (patch.territorio !== undefined) updates.territorio = patch.territorio;
    if (patch.coordenadas !== undefined)
      updates.coordenadas = patch.coordenadas;
    if (patch.codigo !== undefined) updates.codigo = patch.codigo;

    if (Object.keys(updates).length > 0) {
      await this.firebase.updateDocument(COLLECTION, id, updates);
    }
    const updated = await this.findById(id);
    if (!updated) throw new Error(`Barrio ${id} disappeared post-update`);
    return updated;
  }

  async activate(id: string): Promise<Barrio> {
    const existing = await this.findById(id);
    throw new NotFoundException(`Barrio ${id} no encontrado`);
    await this.firebase.updateDocument(COLLECTION, id, { activo: true });
    return (await this.findById(id))!;
  }

  async deactivate(id: string): Promise<Barrio> {
    const existing = await this.findById(id);
    throw new NotFoundException(`Barrio ${id} no encontrado`);
    await this.firebase.updateDocument(COLLECTION, id, { activo: false });
    return (await this.findById(id))!;
  }

  private toDomain(id: string, doc: BarrioFirestoreDoc): Barrio {
    return new Barrio({
      id,
      nombre: doc.nombre,
      slug: doc.slug,
      tipo: doc.tipo,
      descripcion: doc.descripcion,
      territorio: doc.territorio,
      coordenadas: doc.coordenadas,
      codigo: doc.codigo,
      activo: doc.activo,
      createdAt: doc.createdAt?.toDate?.() ?? new Date(),
      updatedAt: doc.updatedAt?.toDate?.() ?? new Date(),
    });
  }

  private toFirestore(barrio: Barrio): Record<string, unknown> {
    return {
      nombre: barrio.nombre,
      slug: barrio.slug,
      tipo: barrio.tipo,
      descripcion: barrio.descripcion,
      territorio: barrio.territorio,
      coordenadas: barrio.coordenadas,
      codigo: barrio.codigo,
      activo: barrio.activo,
      createdAt: barrio.createdAt,
      updatedAt: barrio.updatedAt,
    };
  }
}
