/**
 * Minimal repository interface for Solicitudes, consumed by PlacesService.
 *
 * The full Solicitudes module will be implemented separately. This interface
 * defines only the methods needed by the places feature (DIP: places depends
 * on this abstraction, not on a concrete solicitudes implementation).
 *
 * Updated by places-refactor (CH-03): added `reclamo-place` tipo,
 * `solicitanteUid` field, and `findPendingReclamosByPlaceId` method.
 */
export interface Solicitud {
  id: string;
  placeId?: string;
  usuarioId: string;
  tipo: "registro" | "actualizacion" | "reclamo-place";
  status: "pendiente" | "aprobado" | "rechazado";
  comentarios?: string;
  solicitanteUid?: string;
  revisadoPor?: string;
  createdAt: Date;
  revisadoAt?: Date;
}

export interface CreateSolicitudInput {
  placeId: string;
  usuarioId: string;
  tipo: "registro" | "actualizacion" | "reclamo-place";
  status: "pendiente";
  solicitanteUid?: string;
  createdAt: Date;
}

export interface SolicitudesRepositoryInterface {
  create(input: CreateSolicitudInput): Promise<Solicitud>;
  update(
    id: string,
    patch: Partial<Pick<Solicitud, "status" | "comentarios" | "revisadoPor" | "revisadoAt">>,
  ): Promise<Solicitud>;
  existsByPlaceId(placeId: string): Promise<boolean>;
  findPendingReclamosByPlaceId(placeId: string): Promise<Solicitud[]>;
}
