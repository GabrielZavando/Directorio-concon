/**
 * Repository interface for Solicitudes.
 * Provides persistence operations needed by SolicitudesService.
 *
 * CH-05: Reduced to only `reclamo-place` type.
 * ISP: ≤5 methods as required by the project's backend-standards.
 *
 * `existsByPlaceId` was removed from THIS interface after CH-05: its only
 * runtime consumer is the places module, which binds its own local interface
 * (see `places/domain/solicitudes-repository.interface.ts`). The concrete
 * adapter still exposes it to satisfy that consumer.
 */
import type { Solicitud } from "./solicitud.entity";

export interface CreateSolicitudInput {
  placeId: string; // REQUIRED - only for reclamo-place type
  usuarioId: string;
  tipo: Solicitud["tipo"]; // only 'reclamo-place' after CH-05
  status: "pendiente";
  solicitanteUid: string; // REQUIRED
  createdAt: Date;
}

/** Paginated result from the admin queue query. */
export interface PaginatedSolicitudes {
  items: Solicitud[];
  total: number;
}

export interface SolicitudesRepositoryInterface {
  create(input: CreateSolicitudInput): Promise<Solicitud>;
  findById(id: string): Promise<Solicitud | null>;
  findPendingReclamosByPlaceId(placeId: string): Promise<Solicitud[]>;
  findPendingQueue(
    status: Solicitud["status"],
    page: number,
    limit: number,
  ): Promise<PaginatedSolicitudes>;
  update(id: string, patch: Partial<Solicitud>): Promise<Solicitud>;
}
