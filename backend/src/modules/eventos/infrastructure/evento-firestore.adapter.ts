/**
 * Firestore adapter for EventoRepositoryInterface.
 * Converts between domain types (Date) and Firestore types (Timestamp).
 * Uses cursor-based pagination (no offset).
 */
import { Injectable, Logger } from "@nestjs/common";
import { FirebaseService } from "@/common/services/firebase.service";
import type {
  EventoRepositoryInterface,
  EventoReadRepositoryInterface,
  EventoWriteRepositoryInterface,
  EventoSearchFilters,
  PaginatedEventos,
} from "../domain/evento-repository.interface";
import type { Evento } from "../domain/evento.entity";
import type { Query, DocumentData } from "firebase-admin/firestore";
import {
  EventoFirestoreDoc,
  toEventoDomain,
  toEventoPersistence,
} from "./evento.mapper";

const COLLECTION = "eventos";

@Injectable()
export class EventoFirestoreAdapter
  implements
    EventoRepositoryInterface,
    EventoReadRepositoryInterface,
    EventoWriteRepositoryInterface
{
  private readonly logger = new Logger(EventoFirestoreAdapter.name);

  constructor(private readonly firebase: FirebaseService) {}

  // -------------------------------------------------------------------------
  // findById
  // -------------------------------------------------------------------------

  async findById(id: string): Promise<Evento | null> {
    const doc = await this.firebase.getDocument(COLLECTION, id);
    if (!doc.exists) return null;
    return toEventoDomain(
      this.firebase,
      doc.id,
      doc.data() as EventoFirestoreDoc,
    );
  }

  // -------------------------------------------------------------------------
  // findBySlug
  // -------------------------------------------------------------------------

  async findBySlug(slug: string): Promise<Evento | null> {
    const snapshot = await this.firebase.getDocuments(
      COLLECTION,
      [{ field: "slug", operator: "==", value: slug }],
      undefined,
      1,
    );
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return toEventoDomain(
      this.firebase,
      doc.id,
      doc.data() as EventoFirestoreDoc,
    );
  }

  // -------------------------------------------------------------------------
  // findAllPublic (cursor-based pagination, only approved)
  // -------------------------------------------------------------------------

  async findAllPublic(filters: EventoSearchFilters): Promise<PaginatedEventos> {
    const {
      subcategoriaId,
      barrioId,
      precioTipo,
      estado = "programado",
      page = 1,
      limit = 20,
    } = filters;

    let query: Query<DocumentData> = this.firebase
      .getFirestore()
      .collection(COLLECTION);

    // Always filter by approved status for public queries
    query = query.where("status", "==", "aprobado");

    // Estado filter (defaults to "programado")
    query = query.where("estado", "==", estado);

    // Optional filters
    if (subcategoriaId) {
      query = query.where("subcategoriaId", "==", subcategoriaId);
    }
    if (barrioId) {
      query = query.where("barrioId", "==", barrioId);
    }
    if (precioTipo) {
      query = query.where("precioTipo", "==", precioTipo);
    }

    // Ordering by fechaInicio ascending
    query = query.orderBy("fechaInicio", "asc");

    // Cursor-based pagination
    const offset = (page - 1) * limit;
    if (offset > 0) {
      const cursorSnapshot = await query.limit(offset).get();
      if (!cursorSnapshot.empty) {
        const lastDoc = cursorSnapshot.docs[cursorSnapshot.docs.length - 1];
        query = query.startAfter(lastDoc);
      }
    }

    query = query.limit(limit + 1); // +1 to detect next page

    const snapshot = await query.get();
    const hasNextPage = snapshot.docs.length > limit;
    const docs = snapshot.docs.slice(0, limit);

    let data = docs.map((doc) =>
      toEventoDomain(this.firebase, doc.id, doc.data() as EventoFirestoreDoc),
    );

    // Text search filter (client-side for MVP)
    const q = filters.q;
    if (q) {
      const lowerQ = q.toLowerCase();
      data = data.filter(
        (e) =>
          e.nombre.toLowerCase().includes(lowerQ) ||
          e.descripcion.toLowerCase().includes(lowerQ) ||
          e.descripcionCorta.toLowerCase().includes(lowerQ),
      );
    }

    return {
      data,
      nextCursor: hasNextPage ? String(page + 1) : undefined,
      total: data.length,
    };
  }

  // -------------------------------------------------------------------------
  // findAllAdmin (no status restriction)
  // -------------------------------------------------------------------------

  async findAllAdmin(filters: EventoSearchFilters): Promise<PaginatedEventos> {
    const {
      categoriaId,
      subcategoriaId,
      barrioId,
      estado,
      page = 1,
      limit = 20,
    } = filters;

    let query: Query<DocumentData> = this.firebase
      .getFirestore()
      .collection(COLLECTION);

    // Optional filters (no status default — admin sees all)
    if (categoriaId) {
      query = query.where("categoriaId", "==", categoriaId);
    }
    if (subcategoriaId) {
      query = query.where("subcategoriaId", "==", subcategoriaId);
    }
    if (barrioId) {
      query = query.where("barrioId", "==", barrioId);
    }
    if (estado) {
      query = query.where("estado", "==", estado);
    }

    // Ordering
    query = query.orderBy("createdAt", "desc");

    // Cursor-based pagination
    const offset = (page - 1) * limit;
    if (offset > 0) {
      const cursorSnapshot = await query.limit(offset).get();
      if (!cursorSnapshot.empty) {
        const lastDoc = cursorSnapshot.docs[cursorSnapshot.docs.length - 1];
        query = query.startAfter(lastDoc);
      }
    }

    query = query.limit(limit + 1);

    const snapshot = await query.get();
    const hasNextPage = snapshot.docs.length > limit;
    const docs = snapshot.docs.slice(0, limit);

    const data = docs.map((doc) =>
      toEventoDomain(this.firebase, doc.id, doc.data() as EventoFirestoreDoc),
    );

    return {
      data,
      nextCursor: hasNextPage ? String(page + 1) : undefined,
      total: data.length,
    };
  }

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------

  async create(
    evento: Omit<Evento, "id" | "createdAt" | "updatedAt">,
  ): Promise<Evento> {
    const now = this.firebase.getCurrentTimestamp();
    const data = {
      ...toEventoPersistence(this.firebase, evento as unknown as Evento),
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await this.firebase.createDocument(COLLECTION, data);
    return toEventoDomain(this.firebase, docRef.id, {
      ...data,
      id: docRef.id,
    } as EventoFirestoreDoc);
  }

  // -------------------------------------------------------------------------
  // update
  // -------------------------------------------------------------------------

  async update(id: string, patch: Partial<Evento>): Promise<Evento> {
    const existing = await this.findById(id);
    if (!existing) throw new Error(`Evento ${id} not found`);

    const persistencePatch = toEventoPersistence(
      this.firebase,
      patch as Evento,
    );
    await this.firebase.updateDocument(COLLECTION, id, persistencePatch);

    const updated = await this.findById(id);
    return updated!;
  }

  // -------------------------------------------------------------------------
  // delete
  // -------------------------------------------------------------------------

  async delete(id: string): Promise<void> {
    await this.firebase.deleteDocument(COLLECTION, id);
  }

  // -------------------------------------------------------------------------
  // listMapData
  // -------------------------------------------------------------------------

  async listMapData(): Promise<
    Pick<
      Evento,
      "id" | "nombre" | "slug" | "coordenadas" | "categoriaId" | "fechaInicio"
    >[]
  > {
    const snapshot = await this.firebase.getDocuments(COLLECTION, [
      { field: "status", operator: "==", value: "aprobado" },
    ]);

    return snapshot.docs
      .map((doc) => {
        const data = doc.data() as EventoFirestoreDoc;
        return {
          id: doc.id,
          nombre: data.nombre,
          slug: data.slug,
          coordenadas: data.coordenadas,
          categoriaId: data.categoriaId,
          fechaInicio: this.firebase.timestampToDate(
            data.fechaInicio as FirebaseFirestore.Timestamp,
          )!,
        };
      })
      .filter((item) => item.coordenadas !== undefined);
  }
}
