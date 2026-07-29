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

const COLLECTION = "eventos";

// ---------------------------------------------------------------------------
// Firestore document shape (all Date fields stored as Firestore Timestamp)
// ---------------------------------------------------------------------------

interface EventoFirestoreDoc {
  id: string;
  nombre: string;
  slug: string;
  descripcionCorta: string;
  descripcion: string;
  categoriaId: string;
  subcategoriaId?: string;
  barrioId: string;
  organizador: string;
  organizadorContacto?: string;
  organizadorWeb?: string;
  ubicacionNombre?: string;
  ubicacionDireccion: string;
  coordenadas: { lat: number; lng: number };
  fechaInicio: unknown;
  fechaFin: unknown;
  precioTipo: string;
  precioValor: number;
  precioMoneda: string;
  capacidadMaxima?: number;
  publicoObjetivo: string[];
  nivelRuido: string;
  portada?: string;
  accesibilidad?: string[];
  status: string;
  estado: string;
  destacado: boolean;
  verificado: boolean;
  placeId?: string;
  usuarioId: string;
  vistasTotales: number;
  createdAt: unknown;
  updatedAt: unknown;
  fechaPublicacion?: unknown;
}

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
    return this.toDomain(doc.id, doc.data() as EventoFirestoreDoc);
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
    return this.toDomain(doc.id, doc.data() as EventoFirestoreDoc);
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
      this.toDomain(doc.id, doc.data() as EventoFirestoreDoc),
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
      this.toDomain(doc.id, doc.data() as EventoFirestoreDoc),
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
      ...this.toPersistence(evento as unknown as Evento),
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await this.firebase.createDocument(COLLECTION, data);
    return this.toDomain(docRef.id, {
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

    const persistencePatch = this.toPersistence(patch as Evento);
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

  // -------------------------------------------------------------------------
  // Mapping helpers
  // -------------------------------------------------------------------------

  private toDomain(id: string, doc: EventoFirestoreDoc): Evento {
    return {
      id,
      nombre: doc.nombre,
      slug: doc.slug,
      descripcionCorta: doc.descripcionCorta,
      descripcion: doc.descripcion,
      categoriaId: doc.categoriaId,
      subcategoriaId: doc.subcategoriaId,
      barrioId: doc.barrioId,
      organizador: doc.organizador,
      organizadorContacto: doc.organizadorContacto,
      organizadorWeb: doc.organizadorWeb,
      ubicacionNombre: doc.ubicacionNombre,
      ubicacionDireccion: doc.ubicacionDireccion,
      coordenadas: doc.coordenadas,
      fechaInicio: this.firebase.timestampToDate(
        doc.fechaInicio as FirebaseFirestore.Timestamp,
      )!,
      fechaFin: this.firebase.timestampToDate(
        doc.fechaFin as FirebaseFirestore.Timestamp,
      )!,
      precioTipo: doc.precioTipo as Evento["precioTipo"],
      precioValor: doc.precioValor,
      precioMoneda: doc.precioMoneda as Evento["precioMoneda"],
      capacidadMaxima: doc.capacidadMaxima,
      publicoObjetivo: doc.publicoObjetivo as Evento["publicoObjetivo"],
      nivelRuido: doc.nivelRuido as Evento["nivelRuido"],
      portada: doc.portada,
      accesibilidad: doc.accesibilidad as Evento["accesibilidad"],
      status: doc.status as Evento["status"],
      estado: doc.estado as Evento["estado"],
      destacado: doc.destacado,
      verificado: doc.verificado,
      placeId: doc.placeId,
      usuarioId: doc.usuarioId,
      vistasTotales: doc.vistasTotales ?? 0,
      createdAt: this.firebase.timestampToDate(
        doc.createdAt as FirebaseFirestore.Timestamp,
      )!,
      updatedAt: this.firebase.timestampToDate(
        doc.updatedAt as FirebaseFirestore.Timestamp,
      )!,
      fechaPublicacion: this.firebase.timestampToDate(
        doc.fechaPublicacion as FirebaseFirestore.Timestamp,
      ),
    };
  }

  private toPersistence(evt: Partial<Evento>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    const fieldMap: Array<[keyof Evento, string]> = [
      ["nombre", "nombre"],
      ["slug", "slug"],
      ["descripcionCorta", "descripcionCorta"],
      ["descripcion", "descripcion"],
      ["categoriaId", "categoriaId"],
      ["subcategoriaId", "subcategoriaId"],
      ["barrioId", "barrioId"],
      ["organizador", "organizador"],
      ["organizadorContacto", "organizadorContacto"],
      ["organizadorWeb", "organizadorWeb"],
      ["ubicacionNombre", "ubicacionNombre"],
      ["ubicacionDireccion", "ubicacionDireccion"],
      ["coordenadas", "coordenadas"],
      ["precioTipo", "precioTipo"],
      ["precioValor", "precioValor"],
      ["precioMoneda", "precioMoneda"],
      ["capacidadMaxima", "capacidadMaxima"],
      ["publicoObjetivo", "publicoObjetivo"],
      ["nivelRuido", "nivelRuido"],
      ["portada", "portada"],
      ["accesibilidad", "accesibilidad"],
      ["status", "status"],
      ["estado", "estado"],
      ["destacado", "destacado"],
      ["verificado", "verificado"],
      ["placeId", "placeId"],
      ["usuarioId", "usuarioId"],
      ["vistasTotales", "vistasTotales"],
    ];

    for (const [domainKey, firestoreKey] of fieldMap) {
      const value = evt[domainKey];
      if (value !== undefined) {
        result[firestoreKey] = value;
      }
    }

    // Convert Date fields to Timestamps
    if (evt.fechaInicio) {
      result.fechaInicio = this.firebase.dateToTimestamp(evt.fechaInicio);
    }
    if (evt.fechaFin) {
      result.fechaFin = this.firebase.dateToTimestamp(evt.fechaFin);
    }
    if (evt.fechaPublicacion) {
      result.fechaPublicacion = this.firebase.dateToTimestamp(
        evt.fechaPublicacion,
      );
    }
    if (evt.createdAt) {
      result.createdAt = this.firebase.dateToTimestamp(evt.createdAt);
    }
    if (evt.updatedAt) {
      result.updatedAt = this.firebase.dateToTimestamp(evt.updatedAt);
    }

    return result;
  }
}
