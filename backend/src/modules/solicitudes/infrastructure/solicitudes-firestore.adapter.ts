/**
 * Firestore adapter for the Solicitudes aggregate.
 * Implements SolicitudesRepositoryInterface.
 */
import { Injectable } from "@nestjs/common";
import type {
  SolicitudesRepositoryInterface,
  CreateSolicitudInput,
} from "../domain/solicitudes-repository.interface";
import type { Solicitud } from "../domain/solicitud.entity";
import type { FirebaseService } from "@/common/services/firebase.service";

const COLLECTION = "solicitudes";

/**
 * Converts a raw Firestore document to a Solicitud domain entity.
 */
function toDomain(id: string, data: Record<string, unknown>): Solicitud {
  return {
    id,
    placeId: (data.placeId as string) ?? undefined,
    eventoId: (data.eventoId as string) ?? undefined,
    usuarioId: data.usuarioId as string,
    tipo: data.tipo as Solicitud["tipo"],
    status: data.status as Solicitud["status"],
    proposal: (data.proposal as Record<string, unknown>) ?? undefined,
    comentarios: (data.comentarios as string) ?? undefined,
    solicitanteUid: (data.solicitanteUid as string) ?? undefined,
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

    const docData: Record<string, unknown> = {
      ...input,
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

  async existsPendingByEventoId(eventoId: string): Promise<boolean> {
    const db = this.firebase.getFirestore();
    const snapshot = await db
      .collection(COLLECTION)
      .where("eventoId", "==", eventoId)
      .where("status", "==", "pendiente")
      .get();
    return !snapshot.empty;
  }

  async findPendingReclamosByPlaceId(placeId: string): Promise<Solicitud[]> {
    const db = this.firebase.getFirestore();
    const snapshot = await db
      .collection(COLLECTION)
      .where("placeId", "==", placeId)
      .where("tipo", "==", "reclamo-place")
      .where("status", "==", "pendiente")
      .get();
    return snapshot.docs.map((doc) => toDomain(doc.id, doc.data()));
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
