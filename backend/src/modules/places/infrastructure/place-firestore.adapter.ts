/**
 * Firestore adapter for PlaceRepositoryInterface.
 * Converts between domain types (Date) and Firestore types (Timestamp).
 * Uses cursor-based pagination (no offset).
 */
import { Injectable, Logger } from "@nestjs/common";
import { FirebaseService } from "@/common/services/firebase.service";
import type {
  PlaceRepositoryInterface,
  PlaceSearchFilters,
  PaginatedPlaces,
} from "../domain/place-repository.interface";
import type { Place } from "../domain/place.entity";
import type { Query, DocumentData } from "firebase-admin/firestore";

const COLLECTION = "places";

// ---------------------------------------------------------------------------
// Firestore document shape (all Date fields stored as Firestore Timestamp)
// ---------------------------------------------------------------------------

interface PlaceFirestoreDoc {
  id: string;
  nombre: string;
  slug: string;
  descripcionCorta: string;
  descripcion: string;
  categoriaId: string;
  subcategoriaId?: string;
  barrioId: string;
  direccion: string;
  coordenadas?: { lat: number; lng: number };
  telefono?: string;
  whatsapp?: string;
  email?: string;
  sitioWeb?: string;
  redesSociales?: { plataforma: string; url: string }[];
  imagenes: { logo?: string; portada?: string; galeria: string[] };
  planId: "gratuito" | "premium";
  horarios?: unknown[];
  horariosEspeciales?: unknown[];
  abierto24x7: boolean;
  servicios?: string[];
  metodosPago?: string[];
  idiomas?: string[];
  vistasTotales: number;
  valoracionGoogle?: { rating: number; reviewsCount: number; mapsLink: string };
  status: string;
  verificado: boolean;
  fechaVerificacion?: unknown;
  destacado: boolean;
  usuarioId?: string;
  fechaPublicacion?: unknown;
  createdAt: unknown;
  updatedAt: unknown;
}

@Injectable()
export class PlaceFirestoreAdapter implements PlaceRepositoryInterface {
  private readonly logger = new Logger(PlaceFirestoreAdapter.name);

  constructor(private readonly firebase: FirebaseService) {}

  // -------------------------------------------------------------------------
  // findById
  // -------------------------------------------------------------------------

  async findById(id: string): Promise<Place | null> {
    const doc = await this.firebase.getDocument(COLLECTION, id);
    if (!doc.exists) return null;
    return this.toDomain(doc.id, doc.data() as PlaceFirestoreDoc);
  }

  // -------------------------------------------------------------------------
  // findBySlug
  // -------------------------------------------------------------------------

  async findBySlug(slug: string): Promise<Place | null> {
    const snapshot = await this.firebase.getDocuments(
      COLLECTION,
      [{ field: "slug", operator: "==", value: slug }],
      undefined,
      1,
    );
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return this.toDomain(doc.id, doc.data() as PlaceFirestoreDoc);
  }

  // -------------------------------------------------------------------------
  // search (cursor-based pagination)
  // -------------------------------------------------------------------------

  async search(filters: PlaceSearchFilters): Promise<PaginatedPlaces> {
    const { q, categoriaId, barrioId, status, page = 1, limit = 20 } = filters;

    let query: Query<DocumentData> = this.firebase
      .getFirestore()
      .collection(COLLECTION);

    // Filters
    if (status) {
      query = query.where("status", "==", status);
    } else {
      // Default: only approved places for public queries
      query = query.where("status", "==", "aprobado");
    }
    if (categoriaId) {
      query = query.where("categoriaId", "==", categoriaId);
    }
    if (barrioId) {
      query = query.where("barrioId", "==", barrioId);
    }

    // Ordering
    query = query.orderBy("destacado", "desc").orderBy("createdAt", "desc");

    // Cursor-based pagination
    const offset = (page - 1) * limit;
    if (offset > 0) {
      // Get the last document of the previous page as cursor
      const cursorSnapshot = await query.limit(offset).get();
      if (!cursorSnapshot.empty) {
        const lastDoc = cursorSnapshot.docs[cursorSnapshot.docs.length - 1];
        query = query.startAfter(lastDoc);
      }
    }

    query = query.limit(limit + 1); // +1 to detect if there's a next page

    const snapshot = await query.get();
    const hasNextPage = snapshot.docs.length > limit;
    const docs = snapshot.docs.slice(0, limit);

    let data = docs.map((doc) =>
      this.toDomain(doc.id, doc.data() as PlaceFirestoreDoc),
    );

    // Text search filter (client-side for MVP — Firestore doesn't support full-text)
    if (q) {
      const lowerQ = q.toLowerCase();
      data = data.filter(
        (p) =>
          p.nombre.toLowerCase().includes(lowerQ) ||
          p.descripcion.toLowerCase().includes(lowerQ) ||
          p.descripcionCorta.toLowerCase().includes(lowerQ),
      );
    }

    return {
      data,
      nextCursor: hasNextPage ? String(page + 1) : undefined,
      total: data.length,
    };
  }

  // -------------------------------------------------------------------------
  // save (create)
  // -------------------------------------------------------------------------

  async save(
    place: Omit<Place, "id" | "createdAt" | "updatedAt">,
  ): Promise<Place> {
    const now = this.firebase.getCurrentTimestamp();
    const data = {
      ...this.toPersistence(place as unknown as Place),
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await this.firebase.createDocument(COLLECTION, data);
    return this.toDomain(docRef.id, {
      ...data,
      id: docRef.id,
    } as PlaceFirestoreDoc);
  }

  // -------------------------------------------------------------------------
  // update
  // -------------------------------------------------------------------------

  async update(id: string, patch: Partial<Place>): Promise<Place> {
    const existing = await this.findById(id);
    if (!existing) throw new Error(`Place ${id} not found`);

    const persistencePatch = this.toPersistence(patch as Place);
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
  // findForMap
  // -------------------------------------------------------------------------

  async findForMap(): Promise<
    Pick<Place, "id" | "nombre" | "slug" | "coordenadas" | "categoriaId">[]
  > {
    const snapshot = await this.firebase.getDocuments(COLLECTION, [
      { field: "status", operator: "==", value: "aprobado" },
    ]);

    return snapshot.docs
      .map((doc) => {
        const data = doc.data() as PlaceFirestoreDoc;
        return {
          id: doc.id,
          nombre: data.nombre,
          slug: data.slug,
          coordenadas: data.coordenadas,
          categoriaId: data.categoriaId,
        };
      })
      .filter((item) => item.coordenadas !== undefined);
  }

  // -------------------------------------------------------------------------
  // Mapping helpers
  // -------------------------------------------------------------------------

  private toDomain(id: string, doc: PlaceFirestoreDoc): Place {
    return {
      id,
      nombre: doc.nombre,
      slug: doc.slug,
      descripcionCorta: doc.descripcionCorta,
      descripcion: doc.descripcion,
      categoriaId: doc.categoriaId,
      subcategoriaId: doc.subcategoriaId,
      barrioId: doc.barrioId,
      direccion: doc.direccion,
      coordenadas: doc.coordenadas,
      telefono: doc.telefono,
      whatsapp: doc.whatsapp,
      email: doc.email,
      sitioWeb: doc.sitioWeb,
      redesSociales: doc.redesSociales as Place["redesSociales"],
      imagenes: doc.imagenes,
      planId: doc.planId as Place["planId"],
      horarios: doc.horarios as Place["horarios"],
      horariosEspeciales: doc.horariosEspeciales as Place["horariosEspeciales"],
      abierto24x7: doc.abierto24x7,
      servicios: doc.servicios as Place["servicios"],
      metodosPago: doc.metodosPago as Place["metodosPago"],
      idiomas: doc.idiomas,
      vistasTotales: doc.vistasTotales ?? 0,
      valoracionGoogle: doc.valoracionGoogle as Place["valoracionGoogle"],
      status: doc.status as Place["status"],
      verificado: doc.verificado,
      fechaVerificacion: this.firebase.timestampToDate(
        doc.fechaVerificacion as import("firebase-admin/firestore").Timestamp,
      ),
      destacado: doc.destacado,
      usuarioId: doc.usuarioId,
      fechaPublicacion: this.firebase.timestampToDate(
        doc.fechaPublicacion as import("firebase-admin/firestore").Timestamp,
      ),
      createdAt: this.firebase.timestampToDate(
        doc.createdAt as import("firebase-admin/firestore").Timestamp,
      ),
      updatedAt: this.firebase.timestampToDate(
        doc.updatedAt as import("firebase-admin/firestore").Timestamp,
      ),
    };
  }

  private toPersistence(place: Partial<Place>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    // Only include defined fields
    const fieldMap: Array<[keyof Place, string]> = [
      ["nombre", "nombre"],
      ["slug", "slug"],
      ["descripcionCorta", "descripcionCorta"],
      ["descripcion", "descripcion"],
      ["categoriaId", "categoriaId"],
      ["subcategoriaId", "subcategoriaId"],
      ["barrioId", "barrioId"],
      ["direccion", "direccion"],
      ["coordenadas", "coordenadas"],
      ["telefono", "telefono"],
      ["whatsapp", "whatsapp"],
      ["email", "email"],
      ["sitioWeb", "sitioWeb"],
      ["redesSociales", "redesSociales"],
      ["imagenes", "imagenes"],
      ["planId", "planId"],
      ["horarios", "horarios"],
      ["horariosEspeciales", "horariosEspeciales"],
      ["abierto24x7", "abierto24x7"],
      ["servicios", "servicios"],
      ["metodosPago", "metodosPago"],
      ["idiomas", "idiomas"],
      ["vistasTotales", "vistasTotales"],
      ["valoracionGoogle", "valoracionGoogle"],
      ["status", "status"],
      ["verificado", "verificado"],
      ["destacado", "destacado"],
      ["usuarioId", "usuarioId"],
    ];

    for (const [domainKey, firestoreKey] of fieldMap) {
      const value = place[domainKey];
      if (value !== undefined) {
        result[firestoreKey] = value;
      }
    }

    // Convert Date fields to Timestamps
    if (place.fechaVerificacion) {
      result.fechaVerificacion = this.firebase.dateToTimestamp(
        place.fechaVerificacion,
      );
    }
    if (place.fechaPublicacion) {
      result.fechaPublicacion = this.firebase.dateToTimestamp(
        place.fechaPublicacion,
      );
    }
    if (place.createdAt) {
      result.createdAt = this.firebase.dateToTimestamp(place.createdAt);
    }
    if (place.updatedAt) {
      result.updatedAt = this.firebase.dateToTimestamp(place.updatedAt);
    }

    return result;
  }
}
