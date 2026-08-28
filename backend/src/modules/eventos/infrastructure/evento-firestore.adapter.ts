/**
 * Firestore adapter for EventoRepositoryInterface.
 * Converts between domain types (Date) and Firestore types (Timestamp).
 * Uses cursor-based pagination (no offset).
 */
import { Injectable, Logger } from "@nestjs/common";
import { FirebaseService } from "@/common/services/firebase.service";
import type {
  EventoMapDataItem,
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
  // findBySlugAdmin (includes inactive/unverified — admin only)
  // -------------------------------------------------------------------------

  async findBySlugAdmin(slug: string): Promise<Evento | null> {
    return this.findBySlug(slug);
  }

  // -------------------------------------------------------------------------
  // findAllPublic (cursor-based pagination, only active + verified)
  // -------------------------------------------------------------------------

  async findAllPublic(filters: EventoSearchFilters): Promise<PaginatedEventos> {
    const {
      subcategoriaId,
      barrioId,
      precioTipo,
      estado = "programado",
      estadoVerificacion,
      fechaDesde,
      fechaHasta,
      destacado,
      page = 1,
      limit = 20,
    } = filters;

    let query: Query<DocumentData> = this.firebase
      .getFirestore()
      .collection(COLLECTION);

    // Public queries only expose active eventos (any estadoVerificacion).
    query = query.where("activo", "==", true);

    // The verification-state filter is applied only when explicitly requested
    // (e.g. the admin queue `?estadoVerificacion=pendiente`).
    if (estadoVerificacion) {
      query = query.where("estadoVerificacion", "==", estadoVerificacion);
    }

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
    if (fechaDesde) {
      query = query.where("fechaInicio", ">=", new Date(fechaDesde));
    }
    if (fechaHasta) {
      query = query.where("fechaInicio", "<=", new Date(fechaHasta));
    }
    if (typeof destacado === "boolean") {
      query = query.where("destacado", "==", destacado);
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
  // findAllAdmin (no activo/verificacion restriction by default)
  // -------------------------------------------------------------------------

  async findAllAdmin(filters: EventoSearchFilters): Promise<PaginatedEventos> {
    const {
      categoriaId,
      subcategoriaId,
      barrioId,
      estado,
      estadoVerificacion,
      activo,
      page = 1,
      limit = 20,
    } = filters;

    let query: Query<DocumentData> = this.firebase
      .getFirestore()
      .collection(COLLECTION);

    // Optional filters (admin sees all states unless explicitly scoped)
    if (typeof activo === "boolean") {
      query = query.where("activo", "==", activo);
    }
    if (estadoVerificacion) {
      query = query.where("estadoVerificacion", "==", estadoVerificacion);
    }
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
      activo: evento.activo ?? true,
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
  // delete (hard delete — kept for administrative purge; removal is via soft
  // delete in the service layer using update({ activo: false }))
  // -------------------------------------------------------------------------

  async delete(id: string): Promise<void> {
    await this.firebase.deleteDocument(COLLECTION, id);
  }

  // -------------------------------------------------------------------------
  // listMapData (active eventos with lightweight marker fields)
  // -------------------------------------------------------------------------

  async listMapData(): Promise<EventoMapDataItem[]> {
    const snapshot = await this.firebase.getDocuments(COLLECTION, [
      { field: "activo", operator: "==", value: true },
    ]);

    return snapshot.docs
      .map((doc) => {
        const data = doc.data() as EventoFirestoreDoc;
        const evento = toEventoDomain(this.firebase, doc.id, data);
        return {
          id: evento.id,
          nombre: evento.nombre,
          slug: evento.slug,
          // Online eventos have no `ubicacion` → `coordenadas` undefined → filtered out.
          coordenadas: evento.ubicacion?.coordenadas,
          subcategoriaId: evento.subcategoriaId,
          barrioId: evento.barrioId,
          fechaInicio: evento.fechaInicio,
        };
      })
      .filter((item) => item.coordenadas !== undefined);
  }
}
