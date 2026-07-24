import { Injectable, Logger } from "@nestjs/common";
import { FirebaseService } from "@/common/services/firebase.service";
import type {
  Firestore,
  CollectionReference,
  DocumentSnapshot,
  Query,
} from "firebase-admin/firestore";
import type {
  EmpresaRepository,
  CreateEmpresaData,
  EmpresaFilter,
  PaginatedResult,
} from "../domain/empresa-repository.interface";
import type { Empresa } from "../domain/empresa.entity";

/**
 * Firestore implementation of EmpresaRepository.
 *
 * Responsibilities:
 * - Map Firestore DocumentSnapshot ↔ domain Empresa (Timestamp → Date)
 * - Execute Firestore queries with filters and ordering
 * - Persist / retrieve / delete empresa documents
 *
 * Does NOT handle:
 * - Slug generation (application layer)
 * - Business rule validation (application layer)
 * - NotFoundException throwing (application layer)
 */
@Injectable()
export class EmpresaFirestoreAdapter implements EmpresaRepository {
  private readonly logger = new Logger(EmpresaFirestoreAdapter.name);
  private readonly COLLECTION = "empresas";

  constructor(private readonly firebaseService: FirebaseService) {}

  private get firestore(): Firestore {
    return this.firebaseService.getFirestore();
  }

  private get collection(): CollectionReference {
    return this.firestore.collection(this.COLLECTION);
  }

  /**
   * Convert a Firestore DocumentSnapshot to a domain Empresa.
   * Converts firebase-admin Timestamp → plain Date.
   */
  private toEmpresa(doc: DocumentSnapshot): Empresa {
    const data = doc.data()!;
    return {
      id: doc.id,
      nombre: data.nombre,
      slug: data.slug,
      descripcion: data.descripcion,
      categoriaId: data.categoriaId,
      barrioId: data.barrioId,
      direccion: data.direccion,
      telefono: data.telefono,
      email: data.email,
      sitioWeb: data.sitioWeb,
      redesSociales: data.redesSociales,
      planId: data.planId,
      horarios: data.horarios,
      servicios: data.servicios,
      coordenadas: data.coordenadas,
      logoUrl: data.logoUrl,
      destacado: data.destacado,
      verificado: data.verificado,
      status: data.status,
      usuarioId: data.usuarioId,
      createdAt: data.createdAt?.toDate?.() ?? new Date(data.createdAt),
      updatedAt: data.updatedAt?.toDate?.() ?? new Date(data.updatedAt),
    };
  }

  async create(data: CreateEmpresaData): Promise<Empresa> {
    const docRef = this.collection.doc();
    const now = this.firebaseService.getCurrentTimestamp();

    const firestoreData = {
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    await docRef.set(firestoreData);
    this.logger.log(`Empresa created: ${data.slug} (${docRef.id})`);

    return this.toEmpresa(await docRef.get());
  }

  async findById(id: string): Promise<Empresa | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    return this.toEmpresa(doc);
  }

  async findBySlug(slug: string): Promise<Empresa | null> {
    const snapshot = await this.collection
      .where("slug", "==", slug)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    return this.toEmpresa(snapshot.docs[0]);
  }

  async findAll(
    filter: EmpresaFilter,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<Empresa>> {
    let query: Query = this.collection;

    if (filter.categoriaId) {
      query = query.where("categoriaId", "==", filter.categoriaId);
    }
    if (filter.barrioId) {
      query = query.where("barrioId", "==", filter.barrioId);
    }
    if (filter.status) {
      query = query.where("status", "==", filter.status);
    }

    query = query.orderBy("createdAt", "desc");

    const allSnapshot = await query.get();
    let docs = allSnapshot.docs.map((d) => this.toEmpresa(d));

    // Text search is in-memory (Firestore has no native full-text search)
    if (filter.q) {
      const q = filter.q.toLowerCase();
      docs = docs.filter((e) => e.nombre.toLowerCase().includes(q));
    }

    const total = docs.length;
    const start = (page - 1) * limit;
    const paged = docs.slice(start, start + limit);

    return {
      data: paged,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async update(id: string, data: Partial<CreateEmpresaData>): Promise<Empresa> {
    const docRef = this.collection.doc(id);
    const now = this.firebaseService.getCurrentTimestamp();

    const updatePayload: Record<string, unknown> = { ...data, updatedAt: now };
    await docRef.update(updatePayload);

    return this.toEmpresa(await docRef.get());
  }

  async delete(id: string): Promise<void> {
    await this.collection.doc(id).delete();
    this.logger.log(`Empresa deleted: ${id}`);
  }

  async slugExists(slug: string): Promise<boolean> {
    const snapshot = await this.collection
      .where("slug", "==", slug)
      .limit(1)
      .get();
    return !snapshot.empty;
  }
}
