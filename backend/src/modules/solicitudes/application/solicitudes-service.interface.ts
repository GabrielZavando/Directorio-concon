/**
 * Interface for solicitudes operations.
 *
 * CH-05: Reduced to only `reclamo-place` type. Removed the legacy
 * `createEventoSolicitud`/`CreateEventoSolicitudInput` and the deprecated
 * `create` member (the places module talks to the repository directly).
 */
import type { Solicitud } from "../domain/solicitud.entity";

/** Filters for the admin queue listing (GET /solicitudes). */
export interface ListarSolicitudesFiltros {
  status?: Solicitud["status"];
  page?: number;
  limit?: number;
}

/** Admin queue listing envelope. */
export interface ListaSolicitudesResult {
  data: Solicitud[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface SolicitudesServiceInterface {
  create(input: {
    placeId: string;
    usuarioId: string;
    tipo: "reclamo-place";
    status: "pendiente";
    solicitanteUid: string;
    createdAt: Date;
  }): Promise<Solicitud>;
  listarSolicitudes(
    filtros: ListarSolicitudesFiltros,
  ): Promise<ListaSolicitudesResult>;
  aprobarSolicitud(id: string, adminUid: string): Promise<Solicitud>;
  rechazarSolicitud(
    id: string,
    adminUid: string,
    comentarios?: string,
  ): Promise<Solicitud>;
}
