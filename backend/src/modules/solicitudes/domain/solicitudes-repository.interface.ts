/**
 * Repository interface for Solicitudes.
 * Provides persistence operations needed by SolicitudesService.
 */
import type { Solicitud } from "./solicitud.entity";

export interface CreateSolicitudInput {
  placeId?: string;
  eventoId?: string;
  usuarioId: string;
  tipo: Solicitud["tipo"];
  status: "pendiente";
  proposal?: Record<string, unknown>;
  solicitanteUid?: string;
  createdAt: Date;
}

export interface SolicitudesRepositoryInterface {
  create(input: CreateSolicitudInput): Promise<Solicitud>;
  findById(id: string): Promise<Solicitud | null>;
  existsByPlaceId(placeId: string): Promise<boolean>;
  existsPendingByEventoId(eventoId: string): Promise<boolean>;
  findPendingReclamosByPlaceId(placeId: string): Promise<Solicitud[]>;
  update(id: string, patch: Partial<Solicitud>): Promise<Solicitud>;
}
