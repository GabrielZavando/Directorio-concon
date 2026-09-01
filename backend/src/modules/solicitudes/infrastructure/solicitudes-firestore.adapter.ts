/**
 * Firestore adapter for the Solicitudes aggregate.
 * Implements SolicitudesRepositoryInterface.
 *
 * CH-05: Removed eventoId and proposal fields from the entity.
 * Only `reclamo-place` type is supported.
 */
import { Injectable } from "@nestjs/common";
import type {
  SolicitudesRepositoryInterface,
  CreateSolicitudInput,
  PaginatedSolicitudes,
} from "../domain/solicitudes-repository.interface";
import {
  SOLICITUD_TIPO_RECLAMO_PLACE,
  type Solicitud,
} from "../domain/solicitud.entity";
import type { FirebaseService } from "@/common/services/firebase.service";

const COLLECTION = "solicitudes";

/**
 * Converts a raw Firestore document to a Solicitud domain entity.
 * CH-05: Removed eventoId and proposal fields.
 */
function toDomain(id: string, data: Record<string, unknown>): Solicitud {
  return {
    id,
    placeId: (data.placeId as string) ?? "",
    usuarioId: data.usuarioId as string,
    tipo: SOLICITUD_TIPO_RECLAMO_PLACE, // CH-05: only valid type
    status: data.status as Solicitud["status"],
    solicitanteUid: (data.solicitanteUid as string) ?? "",
    comentarios: (data.comentarios as string) ?? undefined,
    revisadoPor: (data.revisadoPor as string) ?? undefined,
    createdAt:
      (data.createdAt as { toDate: () => Date })?.toDate() ?? new Date(),
    revisadoAt:
      (data.revisadoAt as { toDate: () => Date })?.toDate() ?? undefined,
  };
}

@Injectable()
export class SolicitudesFirestoreAdapter
  implements SolicitudesRepositoryInterface
{
  constructor(private readonly firebase: FirebaseService) {}

  async create(input: CreateSolicitudInput): Promise<Solicitud> {
    const now =
      input.createdAt ??
      this.firebase.getCurrentTimestamp()?.toDate() ??
      new Date();

    // CH-05: Only placeId and solicitanteUid are required, no eventoId/proposal
    const docData: Record<string, unknown> = {
      placeId: input.placeId,
      usuarioId: input.usuarioId,
      tipo: input.tipo,
      status: input.status,
      solicitanteUid: input.solicitanteUid,
      createdAt: this.firebase.dateToTimestamp?.(now) ?? now,
    };

    const docRef = await this.firebase.createDocument(COLLECTION, docData);
    const saved = await this.firebase.getDocument(COLLECTION, docRef.id);
    const data = saved.data?.() as Record<string, unknown> | undefined;

    return toDomain(saved.id, data ?? docData);
  }

  async findById(id: string): Promise<Solicitud | null> {
    const doc = await this.firebase.getDocument(COLLECTION, id);
    if (!doc.exists) {
      return null;
    }
    const data = doc.data() as Record<string, unknown>;
    return toDomain(doc.id, data);
  }

  async existsByPlaceId(placeId: string): Promise<boolean> {
    const db = this.firebase.getFirestore();
    const snapshot = await db
      .collection(COLLECTION)
      .where("placeId", "==", placeId)
      .where("status", "==", "pendiente")
      .get();
    return !snapshot.empty;
  }

  async findPendingReclamosByPlaceId(placeId: string): Promise<Solicitud[]> {
    const db = this.firebase.getFirestore();
    const snapshot = await db
      .collection(COLLECTION)
      .where("placeId", "==", placeId)
      .where("tipo", "==", SOLICITUD_TIPO_RECLAMO_PLACE)
      .where("status", "==", "pendiente")
      .get();
    return snapshot.docs.map((doc) => toDomain(doc.id, doc.data()));
  }

  /**
   * CH-05: paginated admin queue — only `reclamo-place` solicitudes, filtered
   * by status, ordered by `createdAt DESC`. Backed by the composite index
   * `tipo + status + createdAt`.
   */
  async findPendingQueue(
    status: Solicitud["status"],
    page: number,
    limit: number,
  ): Promise<PaginatedSolicitudes> {
    const db = this.firebase.getFirestore();
    const col = db.collection(COLLECTION);
    const offset = (page - 1) * limit;

    const countSnap = await col
      .where("tipo", "==", SOLICITUD_TIPO_RECLAMO_PLACE)
      .where("status", "==", status)
      .count()
      .get();
    const total = countSnap.data()?.count ?? 0;

    const dataSnap = await col
      .where("tipo", "==", SOLICITUD_TIPO_RECLAMO_PLACE)
      .where("status", "==", status)
      .orderBy("createdAt", "desc")
      .offset(offset)
      .limit(limit)
      .get();

    return {
      items: dataSnap.docs.map((doc) => toDomain(doc.id, doc.data())),
      total,
    };
  }

  async update(id: string, patch: Partial<Solicitud>): Promise<Solicitud> {
    const now = this.firebase.getCurrentTimestamp?.()?.toDate() ?? new Date();

    const updateData: Record<string, unknown> = {
      ...patch,
      updatedAt: this.firebase.dateToTimestamp?.(now) ?? now,
    };

    // Convert Date fields to Firestore timestamps
    if (patch.createdAt) {
      updateData.createdAt =
        this.firebase.dateToTimestamp?.(patch.createdAt) ?? patch.createdAt;
    }
    if (patch.revisadoAt) {
      updateData.revisadoAt =
        this.firebase.dateToTimestamp?.(patch.revisadoAt) ?? patch.revisadoAt;
    }

    await this.firebase.updateDocument(COLLECTION, id, updateData);

    // Fetch the updated document
    const doc = await this.firebase.getDocument(COLLECTION, id);
    const data = doc.data() as Record<string, unknown>;
    return toDomain(doc.id, data);
  }
}
